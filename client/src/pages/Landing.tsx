import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Heart, Shield, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Brain className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-primary">CalmPathAI</h1>
              <p className="text-lg text-gray-600">Memory Care Monitor</p>
            </div>
          </div>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Advanced AI-powered monitoring system for memory care facilities, 
            providing therapeutic support and real-time emotional well-being tracking.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card className="text-center">
            <CardHeader>
              <Heart className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle>Therapeutic AI Assistant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Compassionate AI conversations with voice interaction and mood analysis 
                to provide emotional support and therapeutic engagement.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="w-12 h-12 text-secondary mx-auto mb-4" />
              <CardTitle>Real-time Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Color-coded patient status tracking with instant alerts for mood changes 
                and activity patterns to ensure optimal care.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="w-12 h-12 text-accent mx-auto mb-4" />
              <CardTitle>Staff Coordination</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Comprehensive note-taking system with photo therapy support 
                for seamless communication between care staff.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Login Section */}
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Staff Access</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              Secure login for authorized memory care facility staff members.
            </p>
            <Button 
              onClick={() => window.location.href = "/api/login"}
              className="w-full bg-primary hover:bg-primary/90 text-white"
              size="lg"
            >
              Sign In to CalmPathAI
            </Button>
            <p className="text-sm text-gray-500 mt-4">
              Protected access for healthcare professionals only
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p>&copy; 2024 CalmPathAI. Dedicated to compassionate memory care.</p>
        </div>
      </div>
    </div>
  );
}
