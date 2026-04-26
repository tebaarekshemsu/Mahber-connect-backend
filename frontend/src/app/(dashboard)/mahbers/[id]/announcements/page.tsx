'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Bell, AlertTriangle, Info, Plus } from 'lucide-react';
import { communicationService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/stores/auth-store';
import toast from 'react-hot-toast';

const announcementSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  priority: z.enum(['Normal', 'Important', 'Urgent']),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

export default function AnnouncementsPage({ params }: { params: { id: string } }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const currentUserId = user?.id || 'usr_3';

  const { data: announcementsResponse, isLoading } = useQuery({
    queryKey: ['mahber-announcements', params.id],
    queryFn: () => communicationService.getAnnouncements(params.id)
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { priority: 'Normal' }
  });

  const createMutation = useMutation({
    mutationFn: (data: AnnouncementFormValues) => communicationService.createAnnouncement(params.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mahber-announcements', params.id] });
      toast.success('Announcement broadcasted');
      setShowCreateModal(false);
      reset();
    },
    onError: () => toast.error('Failed to create announcement')
  });

  const readMutation = useMutation({
    mutationFn: (annId: string) => communicationService.markAnnouncementAsRead(params.id, annId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mahber-announcements', params.id] });
    }
  });

  const announcements = announcementsResponse?.data || [];

  const getPriorityIcon = (priority: string) => {
    switch(priority) {
      case 'Urgent': return <AlertTriangle className="w-5 h-5 text-status-error" />;
      case 'Important': return <Bell className="w-5 h-5 text-gold" />;
      default: return <Info className="w-5 h-5 text-text-secondary" />;
    }
  };

  const onSubmit = (data: AnnouncementFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Announcements" 
        description="Important broadcasts and updates from the Mahber leadership."
      >
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Announcement
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-card" />
          <Skeleton className="h-32 w-full rounded-card" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 glass rounded-card">
          <Bell className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
          <p className="text-text-secondary">No announcements have been made yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const hasRead = announcement.reads?.some(r => r.member_id === currentUserId);
            return (
              <Card 
                key={announcement.id} 
                className={`overflow-hidden transition-all ${
                  announcement.priority === 'Urgent' ? 'border-l-4 border-l-status-error border-y-border-glass border-r-border-glass' : 
                  announcement.priority === 'Important' ? 'border-l-4 border-l-gold border-y-border-glass border-r-border-glass' : ''
                } ${!hasRead ? 'bg-surface-active/50' : ''}`}
                onClick={() => {
                  if (!hasRead) readMutation.mutate(announcement.id);
                }}
              >
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="shrink-0 mt-1">
                      {getPriorityIcon(announcement.priority)}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-bold text-lg text-text-primary">{announcement.title}</h3>
                        <div className="flex items-center gap-2">
                          {!hasRead && <Badge variant="default" className="bg-gold text-background-dark">New</Badge>}
                          <span className="text-xs text-text-muted">
                            {new Date(announcement.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">
                        {announcement.content}
                      </p>
                      <div className="pt-2 text-xs text-text-muted flex items-center gap-1">
                        Posted by {announcement.creator?.name || 'Admin'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Dialog 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        title="Broadcast Announcement"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
            <Input 
              {...register('title')} 
              placeholder="e.g., Venue Change"
              className={errors.title ? 'border-status-error' : ''}
            />
            {errors.title && <p className="text-status-error text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Content</label>
            <textarea 
              {...register('content')}
              placeholder="Write your announcement..."
              className={`w-full min-h-[120px] px-4 py-3 bg-background-dark/50 border ${errors.content ? 'border-status-error' : 'border-border-glass'} rounded-input text-text-primary focus:outline-none focus:border-gold transition-colors resize-y`}
            />
            {errors.content && <p className="text-status-error text-xs mt-1">{errors.content.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Priority</label>
            <select 
              {...register('priority')}
              className="w-full px-4 py-3 bg-background-dark/50 border border-border-glass rounded-input text-text-primary focus:outline-none focus:border-gold transition-colors appearance-none"
            >
              <option value="Normal">Normal</option>
              <option value="Important">Important</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Broadcast</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
