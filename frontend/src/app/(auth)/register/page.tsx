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

const phoneRegex = /^(?:\+251|0)[79]\d{8}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  phone: z.string().regex(phoneRegex, { message: "Must be a valid Ethiopian phone number (e.g. +251911234567)" }),
  password: z.string().regex(passwordRegex, { message: "Password must have at least 8 chars, 1 uppercase, 1 lowercase, 1 number" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', phone: '', password: '', confirmPassword: '' }
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const formattedPhone = data.phone.startsWith('0') ? `+251${data.phone.slice(1)}` : data.phone;
      
      // Step 1: Register
      await authService.register(formattedPhone, data.password, data.name);
      
      // Step 2: Auto-login
      const loginResponse = await authService.login(formattedPhone, data.password);
      setAuth(loginResponse.access_token, loginResponse.user);
      
      toast.success('Account created successfully!');
      router.push('/dashboard');
    } catch (err) {
      const error = err as any;
      toast.error(error.response?.data?.message || error.message || 'Registration failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">Create Account</h2>
        <p className="text-text-secondary mt-1">Join MahberConnect today</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Full Name</label>
          <input 
            type="text" 
            placeholder="Abebe Kebede" 
            {...register('name')}
            className={`w-full px-4 py-3 bg-background-dark/50 border ${errors.name ? 'border-status-error' : 'border-border-glass'} rounded-input text-text-primary focus:outline-none focus:border-gold transition-colors`}
          />
          {errors.name && <p className="text-status-error text-xs mt-1">{errors.name.message}</p>}
        </div>

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

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Confirm Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            {...register('confirmPassword')}
            className={`w-full px-4 py-3 bg-background-dark/50 border ${errors.confirmPassword ? 'border-status-error' : 'border-border-glass'} rounded-input text-text-primary focus:outline-none focus:border-gold transition-colors`}
          />
          {errors.confirmPassword && <p className="text-status-error text-xs mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <Button 
          type="submit" 
          isLoading={isSubmitting}
          className="w-full mt-4"
        >
          Sign Up
        </Button>
      </form>

      <div className="text-center text-sm text-text-secondary pt-4 border-t border-border-glass">
        Already have an account?{' '}
        <Link href="/login" className="text-gold hover:text-gold-light font-medium">
          Sign in
        </Link>
      </div>
    </div>
  );
}
