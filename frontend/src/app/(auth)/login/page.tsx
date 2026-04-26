'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { authService } from '@/lib/api/service-factory';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';

// Ethiopian phone regex: allows +251, 09, or 07 prefixes
const phoneRegex = /^(?:\+251|0)[79]\d{8}$/;

const loginSchema = z.object({
  phone: z.string().regex(phoneRegex, { message: "Must be a valid Ethiopian phone number (e.g. +251911234567)" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' }
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      // Normalize phone to +251 if it starts with 0
      const formattedPhone = data.phone.startsWith('0') ? `+251${data.phone.slice(1)}` : data.phone;
      
      const response = await authService.login(formattedPhone, data.password);
      setAuth(response.access_token, response.user);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err) {
      const error = err as any;
      toast.error(error.response?.data?.message || error.message || 'Failed to login. Please check your credentials.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">Welcome Back</h2>
        <p className="text-text-secondary mt-1">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Phone Number</label>
          <input 
            type="tel" 
            placeholder="+251 911 234 567" 
            {...register('phone')}
            className={`w-full px-4 py-3 bg-background-dark/50 border ${errors.phone ? 'border-status-error' : 'border-border-glass'} rounded-input text-text-primary focus:outline-none focus:border-gold transition-colors`}
          />
          {errors.phone && <p className="text-status-error text-xs mt-1">{errors.phone.message}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            {...register('password')}
            className={`w-full px-4 py-3 bg-background-dark/50 border ${errors.password ? 'border-status-error' : 'border-border-glass'} rounded-input text-text-primary focus:outline-none focus:border-gold transition-colors`}
          />
          {errors.password && <p className="text-status-error text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-gold hover:text-gold-light">
            Forgot password?
          </Link>
        </div>

        <Button 
          type="submit" 
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          Sign In
        </Button>
      </form>

      <div className="text-center text-sm text-text-secondary pt-4 border-t border-border-glass">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-gold hover:text-gold-light font-medium">
          Sign up
        </Link>
      </div>
    </div>
  );
}
