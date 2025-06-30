import {
  users,
  patients,
  staffNotes,
  moodLogs,
  conversations,
  therapeuticPhotos,
  alerts,
  type User,
  type UpsertUser,
  type Patient,
  type InsertPatient,
  type StaffNote,
  type InsertStaffNote,
  type MoodLog,
  type InsertMoodLog,
  type Conversation,
  type InsertConversation,
  type TherapeuticPhoto,
  type InsertTherapeuticPhoto,
  type Alert,
  type InsertAlert,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, lt } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Patient operations
  getAllPatients(): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatientStatus(id: number, status: string): Promise<Patient>;
  updatePatientInteraction(id: number): Promise<Patient>;
  
  // Staff notes operations
  getPatientNotes(patientId: number): Promise<(StaffNote & { staffName: string })[]>;
  createStaffNote(note: InsertStaffNote): Promise<StaffNote>;
  
  // Mood log operations
  getPatientMoodHistory(patientId: number, days?: number): Promise<MoodLog[]>;
  createMoodLog(log: InsertMoodLog): Promise<MoodLog>;
  
  // Conversation operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getPatientConversations(patientId: number): Promise<Conversation[]>;
  
  // Photo operations
  getPatientPhotos(patientId: number): Promise<TherapeuticPhoto[]>;
  createTherapeuticPhoto(photo: InsertTherapeuticPhoto): Promise<TherapeuticPhoto>;
  deleteTherapeuticPhoto(id: number): Promise<void>;
  
  // Alert operations
  getUnreadAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: number): Promise<void>;
  
  // Analytics
  getPatientStatusCounts(): Promise<{ status: string; count: number }[]>;
  getPatientsWithNoRecentActivity(hours: number): Promise<Patient[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Patient operations
  async getAllPatients(): Promise<Patient[]> {
    return await db.select().from(patients).orderBy(patients.name);
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [newPatient] = await db.insert(patients).values(patient).returning();
    return newPatient;
  }

  async updatePatientStatus(id: number, status: string): Promise<Patient> {
    const [patient] = await db
      .update(patients)
      .set({ status, updatedAt: new Date() })
      .where(eq(patients.id, id))
      .returning();
    return patient;
  }

  async updatePatientInteraction(id: number): Promise<Patient> {
    const [patient] = await db
      .update(patients)
      .set({ lastInteraction: new Date(), updatedAt: new Date() })
      .where(eq(patients.id, id))
      .returning();
    return patient;
  }

  // Staff notes operations
  async getPatientNotes(patientId: number): Promise<(StaffNote & { staffName: string })[]> {
    const notes = await db
      .select({
        id: staffNotes.id,
        patientId: staffNotes.patientId,
        staffId: staffNotes.staffId,
        content: staffNotes.content,
        createdAt: staffNotes.createdAt,
        staffName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
      })
      .from(staffNotes)
      .leftJoin(users, eq(staffNotes.staffId, users.id))
      .where(eq(staffNotes.patientId, patientId))
      .orderBy(desc(staffNotes.createdAt));
    
    return notes;
  }

  async createStaffNote(note: InsertStaffNote): Promise<StaffNote> {
    const [newNote] = await db.insert(staffNotes).values(note).returning();
    return newNote;
  }

  // Mood log operations
  async getPatientMoodHistory(patientId: number, days: number = 7): Promise<MoodLog[]> {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    
    return await db
      .select()
      .from(moodLogs)
      .where(and(
        eq(moodLogs.patientId, patientId),
        sql`${moodLogs.createdAt} >= ${daysAgo}`
      ))
      .orderBy(desc(moodLogs.createdAt));
  }

  async createMoodLog(log: InsertMoodLog): Promise<MoodLog> {
    const [newLog] = await db.insert(moodLogs).values(log).returning();
    return newLog;
  }

  // Conversation operations
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db.insert(conversations).values(conversation).returning();
    return newConversation;
  }

  async getPatientConversations(patientId: number): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.patientId, patientId))
      .orderBy(desc(conversations.createdAt));
  }

  // Photo operations
  async getPatientPhotos(patientId: number): Promise<TherapeuticPhoto[]> {
    return await db
      .select()
      .from(therapeuticPhotos)
      .where(eq(therapeuticPhotos.patientId, patientId))
      .orderBy(desc(therapeuticPhotos.createdAt));
  }

  async createTherapeuticPhoto(photo: InsertTherapeuticPhoto): Promise<TherapeuticPhoto> {
    const [newPhoto] = await db.insert(therapeuticPhotos).values(photo).returning();
    return newPhoto;
  }

  async deleteTherapeuticPhoto(id: number): Promise<void> {
    await db.delete(therapeuticPhotos).where(eq(therapeuticPhotos.id, id));
  }

  // Alert operations
  async getUnreadAlerts(): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .where(eq(alerts.isRead, false))
      .orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db.insert(alerts).values(alert).returning();
    return newAlert;
  }

  async markAlertAsRead(id: number): Promise<void> {
    await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, id));
  }

  // Analytics
  async getPatientStatusCounts(): Promise<{ status: string; count: number }[]> {
    const counts = await db
      .select({
        status: patients.status,
        count: sql<number>`count(*)`,
      })
      .from(patients)
      .groupBy(patients.status);
    
    return counts;
  }

  async getPatientsWithNoRecentActivity(hours: number): Promise<Patient[]> {
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);
    
    return await db
      .select()
      .from(patients)
      .where(lt(patients.lastInteraction, hoursAgo));
  }
}

export const storage = new DatabaseStorage();
