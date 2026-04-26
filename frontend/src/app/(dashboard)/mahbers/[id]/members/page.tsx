'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MoreVertical, Search, UserMinus, UserCheck, ShieldAlert, User as UserIcon } from 'lucide-react';
import { memberService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function MembersPage({ params }: { params: { id: string } }) {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: membersResponse, isLoading } = useQuery({
    queryKey: ['mahber-members', params.id],
    queryFn: () => memberService.getMembers(params.id)
  });

  const suspendMutation = useMutation({
    mutationFn: (memberId: string) => memberService.suspendMember(params.id, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mahber-members', params.id] });
      toast.success('Member suspended successfully');
    },
    onError: () => toast.error('Failed to suspend member')
  });

  const reinstateMutation = useMutation({
    mutationFn: (memberId: string) => memberService.reinstateMember(params.id, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mahber-members', params.id] });
      toast.success('Member reinstated successfully');
    },
    onError: () => toast.error('Failed to reinstate member')
  });

  const filteredMembers = membersResponse?.data.filter(m => 
    m.user?.name.toLowerCase().includes(search.toLowerCase()) ||
    m.user?.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Members" 
        description="View and manage members of this community."
      >
        <Button asChild variant="outline">
          <Link href={`/mahbers/${params.id}/join-requests`}>
            Join Requests
          </Link>
        </Button>
      </PageHeader>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <Input 
          placeholder="Search members by name or phone..." 
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : filteredMembers?.length === 0 ? (
        <div className="text-center py-12 glass rounded-card">
          <p className="text-text-secondary">No members found matching your search.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers?.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <Link 
                    href={`/mahbers/${params.id}/members/${member.member_id}`}
                    className="flex items-center gap-3 hover:text-gold transition-colors"
                  >
                    <Avatar className="w-8 h-8">
                      <UserIcon className="w-4 h-4" />
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.user?.name}</p>
                      <p className="text-xs text-text-secondary">{member.user?.phone}</p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{member.role_name || member.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    member.status === 'Active' ? 'success' : 
                    member.status === 'Suspended' ? 'destructive' : 'warning'
                  }>
                    {member.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-text-secondary">
                  {new Date(member.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu trigger={
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  }>
                    <DropdownMenuItem onClick={() => {}}>
                      <ShieldAlert className="w-4 h-4 mr-2" />
                      Change Role
                    </DropdownMenuItem>
                    {member.status === 'Active' ? (
                      <DropdownMenuItem onClick={() => suspendMutation.mutate(member.member_id)}>
                        <UserMinus className="w-4 h-4 mr-2" />
                        Suspend
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => reinstateMutation.mutate(member.member_id)}>
                        <UserCheck className="w-4 h-4 mr-2" />
                        Reinstate
                      </DropdownMenuItem>
                    )}
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
