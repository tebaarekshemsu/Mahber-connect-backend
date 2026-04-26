'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Check, X, User as UserIcon, Calendar, MessageSquare } from 'lucide-react';
import { memberService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

export default function JoinRequestsPage({ params }: { params: { id: string } }) {
  const queryClient = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['mahber-join-requests', params.id],
    queryFn: () => memberService.getJoinRequests(params.id)
  });

  const handleActionMutation = useMutation({
    mutationFn: ({ requestId, action, reason }: { requestId: string, action: 'approve' | 'reject', reason?: string }) => 
      memberService.handleJoinRequest(params.id, requestId, { action, rejection_reason: reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mahber-join-requests', params.id] });
      toast.success(`Request ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully`);
      setRejectId(null);
      setRejectionReason('');
    },
    onError: () => toast.error('Failed to process request')
  });

  const pendingRequests = requests?.filter(r => r.status === 'PENDING') || [];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Join Requests" 
        description="Review pending applications to join this community."
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : pendingRequests.length === 0 ? (
        <div className="text-center py-12 glass rounded-card">
          <p className="text-text-secondary">No pending join requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <Card key={request.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <UserIcon className="w-6 h-6" />
                    </Avatar>
                    <div>
                      <h4 className="font-bold text-text-primary">{request.user?.name}</h4>
                      <p className="text-sm text-text-secondary">{request.user?.phone}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                        <Calendar className="w-3 h-3" />
                        {new Date(request.created_at).toLocaleDateString()}
                        {request.invitation_code && (
                          <Badge variant="outline" className="ml-2 py-0 h-4 text-[10px]">
                            Code: {request.invitation_code}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      className="text-status-error hover:bg-status-error/10 border-border-glass"
                      onClick={() => setRejectId(request.id)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button 
                      onClick={() => handleActionMutation.mutate({ requestId: request.id, action: 'approve' })}
                      isLoading={handleActionMutation.isPending && handleActionMutation.variables?.requestId === request.id}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      <Dialog 
        isOpen={!!rejectId} 
        onClose={() => setRejectId(null)}
        title="Reject Join Request"
        description="Please provide a reason for rejecting this application."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Rejection Reason</label>
            <Input 
              placeholder="e.g., Application incomplete, Duplicate request..." 
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button 
              variant="destructive"
              disabled={!rejectionReason.trim()}
              onClick={() => rejectId && handleActionMutation.mutate({ 
                requestId: rejectId, 
                action: 'reject', 
                reason: rejectionReason 
              })}
              isLoading={handleActionMutation.isPending}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
