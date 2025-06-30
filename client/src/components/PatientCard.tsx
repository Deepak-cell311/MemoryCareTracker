import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Eye, StickyNote, MapPin, Clock } from "lucide-react";
import type { Patient } from "@shared/schema";

interface PatientCardProps {
  patient: Patient;
}

export default function PatientCard({ patient }: PatientCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateInteractionMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/patients/${patient.id}/interaction`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
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
        description: "Failed to update interaction time",
        variant: "destructive",
      });
    },
  });

  const formatLastInteraction = (date: string | null) => {
    if (!date) return "Never";
    
    const now = new Date();
    const interactionDate = new Date(date);
    const diffMs = now.getTime() - interactionDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  const getAlertBadge = () => {
    if (!patient.lastInteraction) return null;
    
    const now = new Date();
    const lastInteraction = new Date(patient.lastInteraction);
    const diffHours = (now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60);
    
    if (patient.status === 'anxious') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Status Change
        </span>
      );
    }
    
    if (diffHours > 4) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <Clock className="w-3 h-3 mr-1" />
          No Activity
        </span>
      );
    }
    
    return null;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Patient Avatar */}
          <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
            {patient.profileImageUrl ? (
              <img 
                src={patient.profileImageUrl} 
                alt={patient.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-semibold">
                {patient.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Patient Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">{patient.name}</h3>
                <p className="text-sm text-gray-500">Age {patient.age}</p>
              </div>
              
              <div className="hidden sm:block">
                <StatusBadge status={patient.status} />
              </div>
              
              <div className="hidden md:flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-1" />
                {formatLastInteraction(patient.lastInteraction)}
              </div>
              
              <div className="hidden lg:flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                {patient.room}
              </div>
              
              <div className="hidden xl:block">
                {getAlertBadge()}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Link href={`/patients/${patient.id}`}>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-secondary hover:text-secondary/80"
            onClick={() => updateInteractionMutation.mutate()}
            disabled={updateInteractionMutation.isPending}
          >
            <StickyNote className="w-4 h-4 mr-1" />
            Note
          </Button>
        </div>
      </div>

      {/* Mobile Status and Alert */}
      <div className="sm:hidden mt-3 flex items-center justify-between">
        <StatusBadge status={patient.status} />
        {getAlertBadge()}
      </div>
    </div>
  );
}
