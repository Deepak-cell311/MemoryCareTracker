import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Send, Bot, Volume2, VolumeX } from "lucide-react";
import type { Patient } from "@shared/schema";

interface AIAssistantProps {
  patient: Patient;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistant({ patient }: AIAssistantProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [conversationActive, setConversationActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  const conversationMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const response = await apiRequest("POST", `/api/patients/${patient.id}/conversation`, {
        message: userMessage,
      });
      return response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };
      
      setConversation(prev => [...prev, assistantMessage]);
      
      // Speak the response
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.response);
        utterance.voice = speechSynthesis.getVoices().find(voice => 
          voice.name.includes('female') || voice.name.includes('Female')
        ) || speechSynthesis.getVoices()[0];
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          // Auto-start listening again if conversation is active
          if (conversationActive) {
            setTimeout(() => startListening(), 1000);
          }
        };
        
        speechSynthesisRef.current = utterance;
        speechSynthesis.speak(utterance);
      }
      
      // Update patient data
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patient.id] });
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
        description: "Failed to process conversation",
        variant: "destructive",
      });
    },
  });

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
        sendMessage(transcript);
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (conversationActive) {
          // Retry listening after error
          setTimeout(() => startListening(), 2000);
        }
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isSpeaking) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || message;
    if (!textToSend.trim()) return;

    const userMessage: ConversationMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setConversation(prev => [...prev, userMessage]);
    setMessage("");

    conversationMutation.mutate(textToSend);
  };

  const startConversation = () => {
    setConversationActive(true);
    setTimeLeft(180); // 3 minutes
    setConversation([]);
    
    // Start with a greeting
    const greeting = `Hello ${patient.name}, I'm here to chat with you. How are you feeling today?`;
    const assistantMessage: ConversationMessage = {
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
    };
    
    setConversation([assistantMessage]);
    
    // Speak the greeting
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(greeting);
      utterance.voice = speechSynthesis.getVoices().find(voice => 
        voice.name.includes('female') || voice.name.includes('Female')
      ) || speechSynthesis.getVoices()[0];
      utterance.rate = 0.8;
      utterance.pitch = 1.1;
      
      utterance.onend = () => {
        setIsSpeaking(false);
        setTimeout(() => startListening(), 1000);
      };
      
      speechSynthesis.speak(utterance);
    }
    
    // Start countdown timer
    timeoutRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endConversation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endConversation = () => {
    setConversationActive(false);
    setTimeLeft(0);
    stopListening();
    
    if (timeoutRef.current) {
      clearInterval(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (speechSynthesisRef.current) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleMute = () => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    initializeSpeechRecognition();
    
    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
      if (speechSynthesisRef.current) {
        speechSynthesis.cancel();
      }
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bot className="w-5 h-5 text-primary mr-2" />
          AI Therapeutic Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Engage with {patient.name} through voice conversations and therapeutic support.
        </p>

        {/* Conversation Display */}
        {conversation.length > 0 && (
          <div className="bg-white rounded-lg p-4 max-h-40 overflow-y-auto space-y-2">
            {conversation.map((msg, index) => (
              <div key={index} className={`text-sm ${
                msg.role === 'user' ? 'text-blue-700' : 'text-gray-700'
              }`}>
                <span className="font-medium">
                  {msg.role === 'user' ? patient.name : 'CalmPathAI'}:
                </span>
                <span className="ml-2">{msg.content}</span>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        {!conversationActive ? (
          <Button 
            onClick={startConversation}
            className="w-full bg-primary text-white py-4 text-lg font-semibold hover:bg-primary/90"
            size="lg"
          >
            <Mic className="w-5 h-5 mr-3" />
            Talk to {patient.name}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Session time: {formatTime(timeLeft)}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMute}
                  disabled={!isSpeaking}
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={endConversation}
                >
                  End Session
                </Button>
              </div>
            </div>

            {/* Voice Status */}
            <div className="flex items-center justify-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                isListening ? 'bg-red-500 animate-pulse' : 
                isSpeaking ? 'bg-blue-500 animate-pulse' : 
                'bg-green-500'
              }`}></div>
              <span className="text-gray-600">
                {isListening ? 'Listening...' : 
                 isSpeaking ? 'Speaking...' : 
                 'Ready to listen'}
              </span>
            </div>

            {/* Manual Input */}
            <div className="flex space-x-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                rows={2}
              />
              <Button 
                onClick={() => sendMessage()}
                disabled={!message.trim() || conversationMutation.isPending}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Voice Support Warning */}
        {!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
            Voice recognition not supported in this browser. Use the text input instead.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
