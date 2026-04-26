'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Trophy, Dices, Calendar, Gift, Sparkles } from 'lucide-react';
import { financialService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import toast from 'react-hot-toast';

export default function LotteryPage({ params }: { params: { id: string } }) {
  const queryClient = useQueryClient();
  const [isDrawing, setIsDrawing] = useState(false);
  const [recentWinner, setRecentWinner] = useState<string | null>(null);

  const { data: draws, isLoading } = useQuery({
    queryKey: ['mahber-lottery', params.id],
    queryFn: () => financialService.getLotteryHistory(params.id)
  });

  const drawMutation = useMutation({
    mutationFn: () => financialService.drawLottery(params.id),
    onMutate: () => {
      setIsDrawing(true);
      setRecentWinner(null);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mahber-lottery', params.id] });
      setIsDrawing(false);
      setRecentWinner(data.id);
      toast.success(`Winner drawn: ${data.winner?.name}!`);
      
      // Auto-hide the highlight after 5 seconds
      setTimeout(() => setRecentWinner(null), 5000);
    },
    onError: (err: any) => {
      setIsDrawing(false);
      toast.error(err.message || 'Failed to execute draw');
    }
  });

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Equb Lottery Draw" 
        description="Execute the periodic draw and view the history of past winners."
      />

      <Card className="border-gold/30 bg-gradient-to-br from-background-dark via-background-dark to-gold/10 relative overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.1)]">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Dices className="w-48 h-48 text-gold" />
        </div>
        <CardContent className="p-8 md:p-12 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-3xl font-bold text-text-primary">Next Cycle Draw</h2>
            <p className="text-text-secondary max-w-md">
              Initiate the random selection algorithm to determine the winner of the current Equb cycle. Only members who haven't won yet will be included in the pool.
            </p>
          </div>
          
          <Button 
            size="lg" 
            className="w-full md:w-auto h-16 px-8 text-lg gap-3 font-bold bg-gold text-background-dark hover:bg-gold/90 shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all transform hover:scale-105"
            onClick={() => drawMutation.mutate()}
            disabled={isDrawing || drawMutation.isPending}
          >
            {isDrawing ? (
              <>
                <Dices className="w-6 h-6 animate-spin" />
                Drawing Winner...
              </>
            ) : (
              <>
                <Trophy className="w-6 h-6" />
                Run Next Draw
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2 text-text-primary">
          <Calendar className="w-5 h-5 text-gold" />
          Draw History
        </h3>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-card" />)}
          </div>
        ) : !draws || draws.length === 0 ? (
          <div className="text-center py-12 glass rounded-card">
            <Gift className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
            <p className="text-text-secondary">No lottery draws have been executed yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {draws.map((draw) => {
              const isNewlyDrawn = recentWinner === draw.id;
              
              return (
                <Card 
                  key={draw.id} 
                  className={`overflow-hidden transition-all duration-1000 ${
                    isNewlyDrawn 
                      ? 'border-gold bg-gold/5 shadow-[0_0_30px_rgba(212,175,55,0.2)] transform scale-[1.02]' 
                      : 'hover:border-border-glass'
                  }`}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center p-4 sm:p-6 gap-4 sm:gap-6">
                      <div className={`shrink-0 flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full ${isNewlyDrawn ? 'bg-gold text-background-dark' : 'bg-surface-active text-gold'}`}>
                        {isNewlyDrawn ? <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse" /> : <span className="font-bold text-lg sm:text-2xl">#{draw.cycle_number}</span>}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg sm:text-xl font-bold text-text-primary truncate">
                          {draw.winner?.name || 'Unknown Member'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-text-secondary">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(draw.draw_date).toLocaleDateString()}
                          </span>
                          {!isNewlyDrawn && <span className="hidden sm:inline text-text-muted">•</span>}
                          {!isNewlyDrawn && <span className="text-text-muted">Cycle {draw.cycle_number}</span>}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-sm text-text-secondary mb-1">Payout</div>
                        <div className={`text-xl sm:text-2xl font-bold ${isNewlyDrawn ? 'text-gold' : 'text-text-primary'}`}>
                          {draw.payout_amount.toLocaleString()} <span className="text-sm font-normal text-text-muted">ETB</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
