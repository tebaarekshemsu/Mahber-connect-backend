'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { financialService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

const paymentSchema = z.object({
  amount: z.number({ error: "Valid amount is required" }).min(10, "Amount must be at least 10 ETB"),
  payment_type: z.enum(['CONTRIBUTION', 'FINE', 'PENALTY']),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function InitiatePaymentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { payment_type: 'CONTRIBUTION', amount: 500 }
  });

  const onSubmit = async (data: PaymentFormValues) => {
    try {
      const result = await financialService.initiatePayment({
        mahber_id: params.id,
        amount: data.amount,
        payment_type: data.payment_type
      });
      
      toast.loading('Redirecting to Chapa...', { duration: 2000 });
      // In a real app, this redirectUrl points to checkout.chapa.co
      // In our mock, it points to /payment/callback
      window.location.href = result.checkoutUrl;
      
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      toast.error(error.response?.data?.message || 'Failed to initiate payment');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader 
        title="Initiate Payment" 
        description="Make a secure contribution or pay a fine via Chapa."
      />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="flex items-center gap-4 p-4 border border-gold/30 bg-gold/5 rounded-input mb-6">
              <CreditCard className="w-8 h-8 text-gold" />
              <div>
                <p className="font-semibold text-text-primary">Secured by Chapa</p>
                <p className="text-xs text-text-secondary">You will be redirected to complete your payment.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Amount (ETB)</label>
              <input 
                type="number" 
                placeholder="500" 
                {...register('amount', { valueAsNumber: true })}
                className={`w-full px-4 py-3 bg-background-dark/50 border ${errors.amount ? 'border-status-error' : 'border-border-glass'} rounded-input text-text-primary focus:outline-none focus:border-gold transition-colors`}
              />
              {errors.amount && <p className="text-status-error text-xs mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Payment Purpose</label>
              <select 
                {...register('payment_type')}
                className="w-full px-4 py-3 bg-background-dark/50 border border-border-glass rounded-input text-text-primary focus:outline-none focus:border-gold transition-colors appearance-none"
              >
                <option value="CONTRIBUTION">Regular Contribution</option>
                <option value="FINE">Late Fine</option>
                <option value="PENALTY">Absence Penalty</option>
              </select>
              {errors.payment_type && <p className="text-status-error text-xs mt-1">{errors.payment_type.message}</p>}
            </div>

            <div className="flex gap-4 justify-end pt-4">
              <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" isLoading={isSubmitting}>Proceed to Checkout</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
