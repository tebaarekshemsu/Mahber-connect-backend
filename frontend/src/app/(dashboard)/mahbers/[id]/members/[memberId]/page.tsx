'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User as UserIcon, Wallet, Calendar, Shield, AlertCircle } from 'lucide-react';
import { memberService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';

export default function MemberDetailPage({ params }: { params: { id: string, memberId: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: member, isLoading } = useQuery({
    queryKey: ['mahber-member', params.id, params.memberId],
    queryFn: () => memberService.getMemberById(params.id, params.memberId)
  });

  const suspendMutation = useMutation({
    mutationFn: () => memberService.suspendMember(params.id, params.memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mahber-member', params.id, params.memberId] });
      toast.success('Member suspended successfully');
    },
    onError: () => toast.error('Failed to suspend member')
  });

  const reinstateMutation = useMutation({
    mutationFn: () => memberService.reinstateMember(params.id, params.memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mahber-member', params.id, params.memberId] });
      toast.success('Member reinstated successfully');
    },
    onError: () => toast.error('Failed to reinstate member')
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Card className="h-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="h-32" />
          <Card className="h-32" />
        </div>
      </div>
    );
  }

  if (!member) return <div>Member not found.</div>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Members
      </Button>

      <PageHeader 
        title={member.user?.name || 'Member Detail'} 
        description={member.user?.phone || ''}
      >
        <div className="flex gap-2">
          {member.status === 'Active' ? (
            <Button variant="destructive" onClick={() => suspendMutation.mutate()}>
              Suspend Member
            </Button>
          ) : (
            <Button variant="default" onClick={() => reinstateMutation.mutate()}>
              Reinstate Member
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Avatar className="w-24 h-24 mb-4">
              <UserIcon className="w-12 h-12" />
            </Avatar>
            <h3 className="text-xl font-bold">{member.user?.name}</h3>
            <p className="text-text-secondary text-sm mb-4">{member.user?.phone}</p>
            <div className="flex gap-2">
              <Badge variant="outline">{member.role_name || member.role}</Badge>
              <Badge variant={
                member.status === 'Active' ? 'success' : 
                member.status === 'Suspended' ? 'destructive' : 'warning'
              }>
                {member.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-text-secondary">Balance</CardTitle>
                <Wallet className="h-4 w-4 text-gold" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{parseFloat(member.balance).toLocaleString()} ETB</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-text-secondary">Join Date</CardTitle>
                <Calendar className="h-4 w-4 text-text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium">{new Date(member.created_at).toLocaleDateString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-text-secondary">Equb Status</CardTitle>
                <Shield className="h-4 w-4 text-text-secondary" />
              </CardHeader>
              <CardContent>
                <Badge variant={member.has_won_current_cycle ? 'success' : 'outline'}>
                  {member.has_won_current_cycle ? 'Already Won' : 'Eligible'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-text-secondary">Last Action</CardTitle>
                <AlertCircle className="h-4 w-4 text-text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-sm text-text-secondary">
                  Updated: {new Date(member.updated_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
