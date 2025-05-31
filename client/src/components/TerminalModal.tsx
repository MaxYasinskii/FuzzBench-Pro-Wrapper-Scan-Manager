import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, X } from "lucide-react";

interface TerminalModalProps {
  toolId: number | null;
  toolName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TerminalMessage {
  type: 'start' | 'stdout' | 'stderr' | 'success' | 'error' | 'end' | 'subscribed';
  message: string;
  toolId?: number;
}

export default function TerminalModal({ toolId, toolName, open, onOpenChange }: TerminalModalProps) {
  const [messages, setMessages] = useState<TerminalMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && toolId) {
      connectToTerminal();
    }
    
    return () => {
      disconnectFromTerminal();
    };
  }, [open, toolId]);

  useEffect(() => {
    // Автоматическая прокрутка вниз при новых сообщениях
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const connectToTerminal = () => {
    if (!toolId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Terminal WebSocket connected');
        setIsConnected(true);
        
        // Подписываемся на терминал конкретного инструмента
        ws.send(JSON.stringify({
          type: 'subscribe',
          toolId: toolId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data: TerminalMessage = JSON.parse(event.data);
          setMessages(prev => [...prev, data]);
          
          if (data.type === 'end') {
            setIsComplete(true);
          }
        } catch (error) {
          console.error('Error parsing terminal message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Terminal WebSocket disconnected');
        setIsConnected(false);
      };

      ws.onerror = (error) => {
        console.error('Terminal WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to connect to terminal WebSocket:', error);
    }
  };

  const disconnectFromTerminal = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setMessages([]);
    setIsComplete(false);
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'stderr':
        return 'text-yellow-400';
      case 'start':
        return 'text-blue-400';
      default:
        return 'text-gray-300';
    }
  };

  const clearTerminal = () => {
    setMessages([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Terminal className="w-5 h-5 mr-2" />
            Installing {toolName}
          </DialogTitle>
          <DialogDescription>
            Real-time installation output for {toolName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={clearTerminal}>
              Clear
            </Button>
            {isComplete && (
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            )}
          </div>
        </div>

        <div className="bg-black rounded-lg p-4 font-mono text-sm">
          <ScrollArea className="h-96" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="text-gray-500">
                Waiting for installation to start...
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className={`whitespace-pre-wrap ${getMessageColor(msg.type)}`}>
                  {msg.message}
                </div>
              ))
            )}
          </ScrollArea>
        </div>

        {isComplete && (
          <div className="text-center text-sm text-muted-foreground">
            Installation process completed. You can close this window.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}