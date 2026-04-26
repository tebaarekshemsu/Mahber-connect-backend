'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, BarChart2, CheckCircle2, Clock } from 'lucide-react';
import { communicationService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/lib/stores/auth-store';
import toast from 'react-hot-toast';

export default function PollsPage({ params }: { params: { id: string } }) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const currentUserId = user?.id || 'usr_3';
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  const { data: pollsResponse, isLoading } = useQuery({
    queryKey: ['mahber-polls', params.id],
    queryFn: () => communicationService.getPolls(params.id)
  });

  const voteMutation = useMutation({
    mutationFn: ({ pollId, choices }: { pollId: string, choices: string[] }) => 
      communicationService.vote(params.id, pollId, choices),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mahber-polls', params.id] });
      toast.success('Vote submitted successfully');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit vote')
  });

  const polls = pollsResponse?.data || [];

  const handleVote = (pollId: string) => {
    const choice = selectedOptions[pollId];
    if (!choice) return;
    voteMutation.mutate({ pollId, choices: [choice] });
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Polls & Voting" 
        description="Participate in community decisions and view results."
      >
        <Button asChild className="gap-2">
          <Link href={`/mahbers/${params.id}/polls/create`}>
            <Plus className="w-4 h-4" />
            Create Poll
          </Link>
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-card" />
          <Skeleton className="h-48 w-full rounded-card" />
        </div>
      ) : polls.length === 0 ? (
        <div className="text-center py-12 glass rounded-card">
          <BarChart2 className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
          <p className="text-text-secondary">No polls have been created yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {polls.map((poll) => {
            const hasVoted = poll.votes?.some(v => v.member_id === currentUserId);
            const totalVotes = poll.votes?.length || 0;
            const isClosed = poll.is_closed || new Date(poll.voting_deadline) <= new Date();

            return (
              <Card key={poll.id} className={isClosed ? 'opacity-75' : ''}>
                <CardContent className="p-6">
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <h3 className="text-lg font-bold text-text-primary leading-tight">
                        {poll.question}
                      </h3>
                      <Badge variant={isClosed ? 'secondary' : 'default'} className={!isClosed ? 'bg-gold text-background-dark' : ''}>
                        {isClosed ? 'Closed' : 'Active'}
                      </Badge>
                    </div>

                    <div className="space-y-3 mb-6 flex-1">
                      {poll.options.map((option) => {
                        // Calculate percentage if results should be shown
                        const showResults = hasVoted || isClosed;
                        const optionVotes = poll.votes?.filter(v => v.choices.includes(option.id)).length || 0;
                        const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                        const isSelected = selectedOptions[poll.id] === option.id;
                        const votedForThis = poll.votes?.some(v => v.member_id === currentUserId && v.choices.includes(option.id));

                        if (showResults) {
                          return (
                            <div key={option.id} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className={`flex items-center gap-2 ${votedForThis ? 'font-bold text-gold' : 'text-text-secondary'}`}>
                                  {option.text}
                                  {votedForThis && <CheckCircle2 className="w-3 h-3" />}
                                </span>
                                <span className="text-text-muted">{percentage}% ({optionVotes})</span>
                              </div>
                              <div className="h-2 w-full bg-surface-active rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${votedForThis ? 'bg-gold' : 'bg-text-muted/50'} transition-all duration-1000`} 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        }

                        // Voting view
                        return (
                          <label 
                            key={option.id}
                            className={`flex items-center p-3 rounded-input border cursor-pointer transition-colors ${
                              isSelected 
                                ? 'border-gold bg-gold/5 text-text-primary' 
                                : 'border-border-glass bg-background-dark/30 hover:border-text-muted text-text-secondary'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`poll-${poll.id}`}
                              value={option.id}
                              checked={isSelected}
                              onChange={() => setSelectedOptions({ ...selectedOptions, [poll.id]: option.id })}
                              className="w-4 h-4 text-gold border-border-glass focus:ring-gold bg-transparent mr-3"
                            />
                            <span className="text-sm font-medium">{option.text}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border-glass">
                      <div className="text-xs text-text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {isClosed ? 'Ended ' : 'Ends '}
                        {new Date(poll.voting_deadline).toLocaleDateString()}
                        <span className="mx-2">•</span>
                        {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                      </div>

                      {!hasVoted && !isClosed && (
                        <Button 
                          size="sm"
                          disabled={!selectedOptions[poll.id] || voteMutation.isPending}
                          isLoading={voteMutation.isPending && voteMutation.variables?.pollId === poll.id}
                          onClick={() => handleVote(poll.id)}
                        >
                          Submit Vote
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
