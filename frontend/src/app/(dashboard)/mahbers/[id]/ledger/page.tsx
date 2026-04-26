'use client';

import { useQuery } from '@tanstack/react-query';
import { financialService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function LedgerPage({ params }: { params: { id: string } }) {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['mahber-ledger', params.id],
    queryFn: () => financialService.getMahberLedger(params.id)
  });

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Ledger" 
        description="Comprehensive record of all Mahber transactions."
      />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : transactions?.length === 0 ? (
        <div className="text-center py-12 glass rounded-card">
          <p className="text-text-secondary">No transactions recorded yet.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount (ETB)</TableHead>
              <TableHead className="text-right">Balance After</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions?.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="font-medium">
                  {new Date(tx.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>{tx.description}</TableCell>
                <TableCell>
                  <Badge variant={tx.type === 'CREDIT' ? 'success' : 'destructive'}>
                    {tx.type}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right font-bold ${tx.type === 'CREDIT' ? 'text-status-success' : 'text-status-error'}`}>
                  {tx.type === 'CREDIT' ? '+' : '-'}{tx.amount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-text-secondary">
                  {tx.balance_after.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
