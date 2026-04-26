'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { mahberService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const createMahberSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name is too long"),
  type: z.enum(['MAHBER', 'EQUB', 'IDDIR']),
  is_public: z.boolean(),
});

type CreateMahberValues = z.infer<typeof createMahberSchema>;

export default function CreateMahberPage() {
  const router = useRouter();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateMahberValues>({
    resolver: zodResolver(createMahberSchema),
    defaultValues: { type: 'MAHBER', is_public: false }
  });

  const onSubmit = async (data: CreateMahberValues) => {
    try {
      const newMahber = await mahberService.createMahber(data);
      toast.success('Mahber created successfully!');
      router.push(`/mahbers/${newMahber.id}`);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      toast.error(error.response?.data?.message || 'Failed to create Mahber');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader 
        title="Create Mahber" 
        description="Initialize a new community, equb, or iddir."
      />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Community Name</label>
              <input 
                type="text" 
                placeholder="e.g. Addis Tech Equb" 
                {...register('name')}
                className={`w-full px-4 py-3 bg-background-dark/50 border ${errors.name ? 'border-status-error' : 'border-border-glass'} rounded-input text-text-primary focus:outline-none focus:border-gold transition-colors`}
              />
              {errors.name && <p className="text-status-error text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Organization Type</label>
              <select 
                {...register('type')}
                className="w-full px-4 py-3 bg-background-dark/50 border border-border-glass rounded-input text-text-primary focus:outline-none focus:border-gold transition-colors appearance-none"
              >
                <option value="MAHBER">Mahber (General Community)</option>
                <option value="EQUB">Equb (Rotating Savings)</option>
                <option value="IDDIR">Iddir (Emergency Fund)</option>
              </select>
              {errors.type && <p className="text-status-error text-xs mt-1">{errors.type.message}</p>}
            </div>

            <div className="flex items-center gap-3 p-4 border border-border-glass rounded-input bg-background-dark/30">
              <input 
                type="checkbox" 
                id="is_public"
                {...register('is_public')}
                className="w-5 h-5 accent-gold bg-surface border-border-glass rounded cursor-pointer"
              />
              <div>
                <label htmlFor="is_public" className="text-sm font-medium text-text-primary cursor-pointer">Make Public</label>
                <p className="text-xs text-text-secondary">If public, anyone can discover and request to join.</p>
              </div>
            </div>

            <div className="flex gap-4 justify-end pt-4">
              <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" isLoading={isSubmitting}>Create Community</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
