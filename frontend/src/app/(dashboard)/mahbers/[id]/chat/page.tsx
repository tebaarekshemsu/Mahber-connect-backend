'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { Send, User as UserIcon } from 'lucide-react';
import { communicationService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/lib/stores/auth-store';
import { ChatMessage } from '@/lib/types';
import toast from 'react-hot-toast';

export default function ChatPage({ params }: { params: { id: string } }) {
  const [newMessage, setNewMessage] = useState('');
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messagesResponse, isLoading } = useQuery({
    queryKey: ['mahber-chat', params.id],
    queryFn: () => communicationService.getChatMessages(params.id),
    refetchInterval: 5000, // Poll for new messages every 5s
  });

  const sendMutation = useMutation<ChatMessage, Error, string>({
    mutationFn: async (content: string) => communicationService.sendChatMessage(params.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mahber-chat', params.id] });
      setNewMessage('');
    },
    onError: () => toast.error('Failed to send message')
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messagesResponse?.data]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMutation.mutate(newMessage.trim());
    }
  };

  // Using a mock current user ID to determine message alignment, fallback to state user
  // Since we use mock users, we'll assume the logged-in user is "usr_3" as defined in the mock data, 
  // or default to the real user ID if not using mock.
  const currentUserId = user?.id || 'usr_3';

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4">
      <PageHeader 
        title="Group Chat" 
        description="Communicate with other members of the Mahber."
      />

      <div className="flex-1 glass rounded-card overflow-hidden flex flex-col border border-border-glass relative">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4 max-w-sm rounded-r-2xl rounded-bl-2xl" />
              <Skeleton className="h-16 w-3/4 max-w-sm rounded-l-2xl rounded-br-2xl ml-auto" />
            </div>
          ) : !messagesResponse?.data?.length ? (
            <div className="h-full flex items-center justify-center text-text-secondary">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messagesResponse.data.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              return (
                <div 
                  key={msg.id} 
                  className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMine && (
                    <Avatar className="w-8 h-8 shrink-0 mb-1">
                      <UserIcon className="w-4 h-4" />
                    </Avatar>
                  )}
                  <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    {!isMine && (
                      <span className="text-xs text-text-muted ml-2 mb-1">{msg.sender?.name}</span>
                    )}
                    <div 
                      className={`px-4 py-2 text-sm ${
                        isMine 
                          ? 'bg-gold text-background-dark rounded-l-2xl rounded-tr-2xl' 
                          : 'bg-surface-active text-text-primary rounded-r-2xl rounded-tl-2xl'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-text-muted mt-1 mx-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-background-dark/80 border-t border-border-glass backdrop-blur-md">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-surface-active"
              disabled={sendMutation.isPending}
            />
            <Button 
              type="submit" 
              disabled={!newMessage.trim() || sendMutation.isPending}
              className="px-4"
              isLoading={sendMutation.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
