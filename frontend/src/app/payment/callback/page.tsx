'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { financialService } from '@/lib/api/service-factory';

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const tx_ref = searchParams.get('tx_ref');
  const statusParam = searchParams.get('status');
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [mahberId, setMahberId] = useState<string | null>(null);

  useEffect(() => {
    if (!tx_ref) {
      setStatus('failed');
      return;
    }

    const verify = async () => {
      try {
        const payment = await financialService.verifyPayment(tx_ref);
        setMahberId(payment.mahber_id);
        setStatus(payment.status === 'COMPLETED' ? 'success' : 'failed');
      } catch {
        setStatus('failed');
      }
    };

    if (statusParam === 'success') {
      verify();
    } else {
      setStatus('failed');
    }
  }, [tx_ref, statusParam]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border-glass">
        <CardContent className="pt-10 flex flex-col items-center text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-16 h-16 text-gold animate-spin mb-6" />
              <h2 className="text-2xl font-bold text-text-primary mb-2">Verifying Payment</h2>
              <p className="text-text-secondary">Please wait while we confirm your transaction with Chapa...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-status-success/20 flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-status-success" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Payment Successful!</h2>
              <p className="text-text-secondary">Your contribution has been recorded in the ledger.</p>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="w-16 h-16 rounded-full bg-status-error/20 flex items-center justify-center mb-6">
                <XCircle className="w-10 h-10 text-status-error" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Payment Failed</h2>
              <p className="text-text-secondary">We couldn&apos;t process your transaction. Please try again.</p>
            </>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center pb-8 pt-4">
          <Button 
            onClick={() => router.push(mahberId ? `/mahbers/${mahberId}/payments` : '/dashboard')}
            className="w-full max-w-xs"
            disabled={status === 'verifying'}
          >
            {status === 'success' ? 'Return to Dashboard' : 'Go Back'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center p-4 bg-background">Loading...</div>}>
      <PaymentCallbackContent />
    </Suspense>
  );
}
