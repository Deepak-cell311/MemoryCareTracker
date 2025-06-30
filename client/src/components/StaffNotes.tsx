import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, StickyNote } from "lucide-react";

interface StaffNotesProps {
  patientId: number;
}

interface StaffNoteWithAuthor {
  id: number;
  patientId: number;
  staffId: string;
  content: string;
  createdAt: string;
  staffName: string;
}

export default function StaffNotes({ patientId }: StaffNotesProps) {
  const [newNote, setNewNote] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery<StaffNoteWithAuthor[]>({
    queryKey: ["/api/patients", patientId, "notes"],
  });

  const createNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/patients/${patientId}/notes`, { content });
    },
    onSuccess: () => {
      setNewNote("");
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "notes"] });
      toast({
        title: "Success",
        description: "Note saved successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      });
    },
  });

  const handleSaveNote = () => {
    if (!newNote.trim()) return;
    createNoteMutation.mutate(newNote.trim());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <StickyNote className="w-5 h-5 mr-2" />
          Staff Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Note */}
        <div className="bg-gray-50 rounded-lg p-4">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add observation or note about the patient..."
            className="resize-none"
            rows={3}
          />
          <div className="flex justify-end mt-3">
            <Button
              onClick={handleSaveNote}
              disabled={!newNote.trim() || createNoteMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {createNoteMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </div>

        {/* Notes List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No staff notes yet</p>
            <p className="text-sm">Add the first note about this patient</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {notes.map((note) => (
              <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="text-sm font-medium text-gray-900">
                    {note.staffName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(note.createdAt)}
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
