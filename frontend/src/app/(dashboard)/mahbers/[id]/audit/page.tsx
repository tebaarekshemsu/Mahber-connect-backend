'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  UserPlus, 
  Settings, 
  Dices, 
  ShieldBan, 
  AlertCircle, 
  Activity 
} from 'lucide-react';
import { auditService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuditTrailPage({ params }: { params: { id: string } }) {
  const { data: auditResponse, isLoading } = useQuery({
    queryKey: ['mahber-audit', params.id],
    queryFn: () => auditService.getAuditTrail(params.id)
  });

  const logs = auditResponse?.data || [];

  const getActionConfig = (actionType: string) => {
    switch(actionType) {
      case 'MEMBER_ADDED':
      case 'MEMBER_REMOVED':
        return { icon: UserPlus, color: 'text-gold bg-gold/10', border: 'border-gold/20' };
      case 'LOTTERY_DRAWN':
        return { icon: Dices, color: 'text-status-success bg-status-success/10', border: 'border-status-success/20' };
      case 'FINE_WAIVED':
        return { icon: ShieldBan, color: 'text-status-error bg-status-error/10', border: 'border-status-error/20' };
      case 'MAHBER_CREATED':
      case 'ROLE_UPDATED':
      case 'SETTINGS_CHANGED':
        return { icon: Settings, color: 'text-text-primary bg-surface-active', border: 'border-border-glass' };
      default:
        return { icon: Activity, color: 'text-text-secondary bg-surface-active', border: 'border-border-glass' };
    }
  };

  const formatDetails = (details: any) => {
    if (!details) return '';
    try {
      return Object.entries(details)
        .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
        .join(' • ');
    } catch {
      return JSON.stringify(details);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Audit Trail" 
        description="A transparent log of all administrative actions and system events."
      />

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-card" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 glass rounded-card">
          <AlertCircle className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
          <p className="text-text-secondary text-lg">No audit logs found for this Mahber.</p>
        </div>
      ) : (
        <div className="relative border-l border-border-glass ml-6 md:ml-8 space-y-8 py-4">
          {logs.map((log) => {
            const config = getActionConfig(log.action_type);
            const Icon = config.icon;
            
            return (
              <div key={log.id} className="relative pl-8 md:pl-12 group">
                <div className={`absolute -left-5 md:-left-6 p-2 rounded-full border bg-background-dark ${config.border} ${config.color} transition-transform group-hover:scale-110 z-10`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <Card className="hover:border-gold/30 transition-colors">
                  <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-bold text-text-primary">
                          {log.action_type.replace(/_/g, ' ')}
                        </h4>
                        <span className="text-xs text-text-muted">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="text-sm text-text-secondary capitalize">
                        {formatDetails(log.details)}
                      </div>
                      
                      <div className="pt-2 text-xs text-text-muted flex items-center gap-1">
                        By: <span className="font-medium text-text-primary">{log.actor?.name || 'System / Admin'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
