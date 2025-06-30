import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { therapeuticAI } from "./services/openai";
import multer from "multer";
import path from "path";
import { 
  insertPatientSchema, 
  insertStaffNoteSchema,
  insertMoodLogSchema,
  insertConversationSchema,
  insertTherapeuticPhotoSchema,
  insertAlertSchema 
} from "@shared/schema";

// Configure multer for photo uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Patient routes
  app.get("/api/patients", isAuthenticated, async (req, res) => {
    try {
      const patients = await storage.getAllPatients();
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.get("/api/patients/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const patient = await storage.getPatient(id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      console.error("Error fetching patient:", error);
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });

  app.post("/api/patients", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(validatedData);
      res.json(patient);
    } catch (error) {
      console.error("Error creating patient:", error);
      res.status(400).json({ message: "Invalid patient data" });
    }
  });

  app.patch("/api/patients/:id/status", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['anxious', 'ok', 'good'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const patient = await storage.updatePatientStatus(id, status);
      
      // Create alert for status changes to anxious
      if (status === 'anxious') {
        await storage.createAlert({
          patientId: id,
          type: 'status_change',
          message: `${patient.name}'s status changed to Anxious`,
        });
      }

      // Log mood change
      await storage.createMoodLog({
        patientId: id,
        status,
        loggedBy: req.user?.claims?.sub || 'system',
      });

      res.json(patient);
    } catch (error) {
      console.error("Error updating patient status:", error);
      res.status(500).json({ message: "Failed to update patient status" });
    }
  });

  app.patch("/api/patients/:id/interaction", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const patient = await storage.updatePatientInteraction(id);
      res.json(patient);
    } catch (error) {
      console.error("Error updating patient interaction:", error);
      res.status(500).json({ message: "Failed to update patient interaction" });
    }
  });

  // Staff notes routes
  app.get("/api/patients/:id/notes", isAuthenticated, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const notes = await storage.getPatientNotes(patientId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching patient notes:", error);
      res.status(500).json({ message: "Failed to fetch patient notes" });
    }
  });

  app.post("/api/patients/:id/notes", isAuthenticated, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const staffId = req.user?.claims?.sub;
      
      const validatedData = insertStaffNoteSchema.parse({
        ...req.body,
        patientId,
        staffId,
      });
      
      const note = await storage.createStaffNote(validatedData);
      res.json(note);
    } catch (error) {
      console.error("Error creating staff note:", error);
      res.status(400).json({ message: "Invalid note data" });
    }
  });

  // Mood history routes
  app.get("/api/patients/:id/mood-history", isAuthenticated, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const days = parseInt(req.query.days as string) || 7;
      const history = await storage.getPatientMoodHistory(patientId, days);
      res.json(history);
    } catch (error) {
      console.error("Error fetching mood history:", error);
      res.status(500).json({ message: "Failed to fetch mood history" });
    }
  });

  // AI Conversation routes
  app.post("/api/patients/:id/conversation", isAuthenticated, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const { message } = req.body;
      const staffId = req.user?.claims?.sub;
      
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Get recent notes for context
      const recentNotes = await storage.getPatientNotes(patientId);
      const noteTexts = recentNotes.slice(0, 3).map(note => note.content);

      // Get therapeutic photos for context
      const photos = await storage.getPatientPhotos(patientId);
      const photoDescriptions = photos.map(photo => photo.description || photo.category).filter(Boolean);

      const context = {
        patientName: patient.name,
        patientAge: patient.age,
        currentMood: patient.status,
        recentNotes: noteTexts,
        therapeuticPhotos: photoDescriptions,
      };

      const aiResponse = await therapeuticAI.generateResponse(message, context);
      
      // Update patient interaction time
      await storage.updatePatientInteraction(patientId);

      // Log the conversation
      const conversation = await storage.createConversation({
        patientId,
        staffId,
        transcript: `Patient: ${message}\nAI: ${aiResponse.message}`,
        sentiment: aiResponse.sentiment,
      });

      // Update patient status if AI suggests a change
      if (aiResponse.suggestedMood !== patient.status) {
        await storage.updatePatientStatus(patientId, aiResponse.suggestedMood);
        
        // Create alert if mood worsened
        if (aiResponse.suggestedMood === 'anxious') {
          await storage.createAlert({
            patientId,
            type: 'status_change',
            message: `${patient.name}'s mood detected as anxious during AI conversation`,
          });
        }
      }

      res.json({
        response: aiResponse.message,
        sentiment: aiResponse.sentiment,
        needsStaffAttention: aiResponse.needsStaffAttention,
        conversationId: conversation.id,
      });
    } catch (error) {
      console.error("Error processing AI conversation:", error);
      res.status(500).json({ message: "Failed to process conversation" });
    }
  });

  // Therapeutic photos routes
  app.get("/api/patients/:id/photos", isAuthenticated, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const photos = await storage.getPatientPhotos(patientId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching therapeutic photos:", error);
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  app.post("/api/patients/:id/photos", isAuthenticated, upload.single('photo'), async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const uploadedBy = req.user?.claims?.sub;
      
      if (!req.file) {
        return res.status(400).json({ message: "No photo uploaded" });
      }

      // In a real application, you would upload this to a cloud storage service
      // For now, we'll store a placeholder URL
      const photoUrl = `/uploads/${req.file.filename}`;
      
      const validatedData = insertTherapeuticPhotoSchema.parse({
        patientId,
        url: photoUrl,
        description: req.body.description,
        category: req.body.category,
        uploadedBy,
      });
      
      const photo = await storage.createTherapeuticPhoto(validatedData);
      res.json(photo);
    } catch (error) {
      console.error("Error uploading therapeutic photo:", error);
      res.status(400).json({ message: "Failed to upload photo" });
    }
  });

  app.delete("/api/photos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTherapeuticPhoto(id);
      res.json({ message: "Photo deleted successfully" });
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  // Alerts routes
  app.get("/api/alerts", isAuthenticated, async (req, res) => {
    try {
      const alerts = await storage.getUnreadAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.patch("/api/alerts/:id/read", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markAlertAsRead(id);
      res.json({ message: "Alert marked as read" });
    } catch (error) {
      console.error("Error marking alert as read:", error);
      res.status(500).json({ message: "Failed to mark alert as read" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/status-counts", isAuthenticated, async (req, res) => {
    try {
      const counts = await storage.getPatientStatusCounts();
      res.json(counts);
    } catch (error) {
      console.error("Error fetching status counts:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Background task to check for inactive patients
  setInterval(async () => {
    try {
      const inactivePatients = await storage.getPatientsWithNoRecentActivity(4);
      
      for (const patient of inactivePatients) {
        // Check if alert already exists for this patient
        const existingAlerts = await storage.getUnreadAlerts();
        const hasInactivityAlert = existingAlerts.some(
          alert => alert.patientId === patient.id && alert.type === 'no_activity'
        );
        
        if (!hasInactivityAlert) {
          await storage.createAlert({
            patientId: patient.id,
            type: 'no_activity',
            message: `${patient.name} has had no activity for over 4 hours`,
          });
        }
      }
    } catch (error) {
      console.error("Error checking for inactive patients:", error);
    }
  }, 15 * 60 * 1000); // Check every 15 minutes

  const httpServer = createServer(app);
  return httpServer;
}
