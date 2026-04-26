'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CreditCard, Wallet, ArrowUpRight } from 'lucide-react';
import { financialService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PaymentsDashboard({ params }: { params: { id: string } }) {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['mahber-payments', params.id],
    queryFn: () => financialService.getMahberPayments(params.id)
  });

  const totalContributions = payments?.filter(p => p.status === 'COMPLETED' && p.payment_type === 'CONTRIBUTION').reduce((acc, p) => acc + p.amount, 0) || 0;
  const pendingAmount = payments?.filter(p => p.status === 'PENDING').reduce((acc, p) => acc + p.amount, 0) || 0;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Finances" 
        description="Manage your payments, contributions, and fines."
      >
        <Button asChild className="gap-2">
          <Link href={`/mahbers/${params.id}/payments/initiate`}>
            <CreditCard className="w-4 h-4" />
            Make a Payment
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-gold/20 to-background-dark border-gold/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">Total Contributions</CardTitle>
            <Wallet className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gold">{totalContributions.toLocaleString()} ETB</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">Pending Payments</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-status-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-text-primary">{pendingAmount.toLocaleString()} ETB</div>
            <p className="text-xs text-text-muted mt-1">Includes pending fines and unpaid contributions</p>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-lg font-semibold mb-4">Payment History</h3>
      
      {isLoading ? (
        <div className="space-y-4">
          <Card className="h-20 animate-pulse bg-surface-active/50" />
          <Card className="h-20 animate-pulse bg-surface-active/50" />
        </div>
      ) : payments?.length === 0 ? (
        <div className="text-center py-12 glass rounded-card">
          <p className="text-text-secondary">No payment history found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments?.map((payment) => (
            <Card key={payment.id} className="hover:bg-surface-hover/50 transition-colors">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-active flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">
                      {payment.payment_type.charAt(0) + payment.payment_type.slice(1).toLowerCase()}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {new Date(payment.created_at).toLocaleDateString()} • Ref: {payment.tx_ref.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="font-bold">{payment.amount.toLocaleString()} ETB</span>
                  <Badge variant={
                    payment.status === 'COMPLETED' ? 'success' : 
                    payment.status === 'PENDING' ? 'warning' : 'destructive'
                  }>
                    {payment.status}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
