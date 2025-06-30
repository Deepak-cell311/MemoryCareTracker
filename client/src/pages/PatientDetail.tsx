import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Layout from "@/components/Layout";
import StatusBadge from "@/components/StatusBadge";
import AIAssistant from "@/components/AIAssistant";
import StaffNotes from "@/components/StaffNotes";
import PhotoTherapy from "@/components/PhotoTherapy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import { Link } from "wouter";
import type { Patient, MoodLog } from "@shared/schema";

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const patientId = parseInt(id || "0");

  const { data: patient, isLoading: patientLoading } = useQuery<Patient>({
    queryKey: ["/api/patients", patientId],
    enabled: isAuthenticated && !!patientId,
  });

  const { data: moodHistory = [] } = useQuery<MoodLog[]>({
    queryKey: ["/api/patients", patientId, "mood-history"],
    enabled: isAuthenticated && !!patientId,
  });

  if (isLoading || !isAuthenticated || patientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Patient Not Found</h2>
          <p className="text-gray-600 mb-6">The patient you're looking for doesn't exist.</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const formatTime = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden">
              {patient.profileImageUrl ? (
                <img 
                  src={patient.profileImageUrl} 
                  alt={patient.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-bold">
                  {patient.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Age {patient.age}</span>
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {patient.room}
                </span>
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Admitted: {formatDate(patient.admissionDate)}
                </span>
              </div>
            </div>
            <div className="ml-auto">
              <StatusBadge status={patient.status} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Mood Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Mood Trend (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                {moodHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No mood history available</p>
                ) : (
                  <div className="space-y-3">
                    {moodHistory.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {formatTime(log.createdAt)}
                        </span>
                        <StatusBadge status={log.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Assistant */}
            <AIAssistant patient={patient} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Staff Notes */}
            <StaffNotes patientId={patient.id} />

            {/* Photo Therapy */}
            <PhotoTherapy patientId={patient.id} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
