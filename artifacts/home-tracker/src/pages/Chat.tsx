import { PageWrapper } from "@/components/layout/page-wrapper";
import { useGetChatMessages, useSendChatMessage, useDeleteChatMessage, useGetMe } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Trash2, MessageSquare } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

export default function Chat() {
  const { data: messages = [], isLoading } = useGetChatMessages({
    query: { refetchInterval: 10000 } // Auto refresh every 10s
  });
  const { data: me } = useGetMe();
  const queryClient = useQueryClient();
  
  const sendMutation = useSendChatMessage();
  const deleteMutation = useDeleteChatMessage();
  
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    sendMutation.mutate({ data: { message: text.trim() } }, {
      onSuccess: () => {
        setText("");
        queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
      }
    });
  };

  return (
    <PageWrapper title="House Chat" description="Messages older than 7 days are automatically cleared.">
      <div className="flex flex-col h-[calc(100vh-12rem)] max-h-[800px] bg-card border rounded-2xl shadow-sm overflow-hidden relative">
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isLoading && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col h-full items-center justify-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
              <p>No recent messages. Start the conversation!</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isMe = msg.userId === me?.id;
                
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {!isMe && (
                      <span className="text-xs font-medium text-muted-foreground mb-1 ml-1">{msg.user.displayName}</span>
                    )}
                    <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%] group">
                      {isMe && (
                        <button 
                          onClick={() => deleteMutation.mutate({ id: msg.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chat"] })})}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-destructive hover:bg-destructive/10 rounded"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                      
                      <div className={`px-4 py-3 rounded-2xl ${
                        isMe 
                          ? 'bg-primary text-primary-foreground rounded-br-sm shadow-md shadow-primary/20' 
                          : 'bg-muted text-foreground rounded-bl-sm border'
                      }`}>
                        <p className="whitespace-pre-wrap break-words text-sm sm:text-base">{msg.message}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 mx-1 opacity-70">
                      {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 sm:p-4 bg-background border-t">
          <form onSubmit={handleSend} className="flex gap-2 relative">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              className="pr-12 rounded-full bg-muted border-transparent focus-visible:bg-background"
              autoComplete="off"
            />
            <Button 
              type="submit" 
              size="icon" 
              className="absolute right-1 top-1 h-9 w-9 rounded-full"
              disabled={!text.trim() || sendMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>

      </div>
    </PageWrapper>
  );
}
