import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Eye } from "lucide-react";
import { Link } from "wouter";
import type { Alert } from "@shared/schema";

export default function AlertNotification() {
  const [visibleAlerts, setVisibleAlerts] = useState<Alert[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    refetchInterval: 15000, // Check every 15 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: number) => {
      await apiRequest("PATCH", `/api/alerts/${alertId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
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
    },
  });

  // Show new alerts as notifications
  useEffect(() => {
    const newAlerts = alerts.filter(alert => 
      !visibleAlerts.some(visible => visible.id === alert.id)
    );

    if (newAlerts.length > 0) {
      setVisibleAlerts(prev => [...prev, ...newAlerts]);
      
      // Auto-hide after 10 seconds
      newAlerts.forEach(alert => {
        setTimeout(() => {
          setVisibleAlerts(prev => prev.filter(a => a.id !== alert.id));
        }, 10000);
      });
    }
  }, [alerts, visibleAlerts]);

  const dismissAlert = (alertId: number) => {
    setVisibleAlerts(prev => prev.filter(alert => alert.id !== alertId));
    markAsReadMutation.mutate(alertId);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'no_activity':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'status_change':
        return 'border-red-500';
      case 'no_activity':
        return 'border-orange-500';
      default:
        return 'border-yellow-500';
    }
  };

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`bg-white shadow-lg rounded-lg border-l-4 ${getAlertColor(alert.type)} p-4 max-w-sm animate-in slide-in-from-right`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getAlertIcon(alert.type)}
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium text-gray-900">
                {alert.type === 'status_change' ? 'Patient Status Change' : 'Activity Alert'}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {alert.message}
              </p>
              <div className="mt-2 flex space-x-2">
                <Link href={`/patients/${alert.patientId}`}>
                  <Button size="sm" variant="outline" className="text-xs">
                    <Eye className="w-3 h-3 mr-1" />
                    View Patient
                  </Button>
                </Link>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 p-1 h-6 w-6"
              onClick={() => dismissAlert(alert.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
