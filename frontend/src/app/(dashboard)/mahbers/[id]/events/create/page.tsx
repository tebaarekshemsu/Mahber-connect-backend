'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { eventService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const eventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  event_type: z.enum(['Meeting', 'Ceremony', 'Fundraiser', 'Social_Gathering']),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  location: z.string().min(3, "Location must be at least 3 characters"),
  is_mandatory: z.boolean().optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

export default function CreateEventPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { 
      event_type: 'Meeting',
      is_mandatory: false,
    }
  });

  const onSubmit = async (data: EventFormValues) => {
    try {
      await eventService.createEvent(params.id, data);
      toast.success('Event created successfully!');
      router.push(`/mahbers/${params.id}/events`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create event');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader 
        title="Create Event" 
        description="Schedule a new gathering for your community."
      />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Event Title</label>
              <Input 
                placeholder="e.g., Monthly General Meeting" 
                {...register('title')}
                className={errors.title ? 'border-status-error' : ''}
              />
              {errors.title && <p className="text-status-error text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
              <textarea 
                placeholder="Details about the event..." 
                {...register('description')}
                className={`w-full min-h-[100px] px-4 py-3 bg-background-dark/50 border ${errors.description ? 'border-status-error' : 'border-border-glass'} rounded-input text-text-primary focus:outline-none focus:border-gold transition-colors resize-y`}
              />
              {errors.description && <p className="text-status-error text-xs mt-1">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Event Type</label>
                <select 
                  {...register('event_type')}
                  className="w-full px-4 py-3 bg-background-dark/50 border border-border-glass rounded-input text-text-primary focus:outline-none focus:border-gold transition-colors appearance-none"
                >
                  <option value="Meeting">Meeting</option>
                  <option value="Ceremony">Ceremony</option>
                  <option value="Fundraiser">Fundraiser</option>
                  <option value="Social_Gathering">Social Gathering</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Location</label>
                <Input 
                  placeholder="Venue or Online Link" 
                  {...register('location')}
                  className={errors.location ? 'border-status-error' : ''}
                />
                {errors.location && <p className="text-status-error text-xs mt-1">{errors.location.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Start Time</label>
                <Input 
                  type="datetime-local" 
                  {...register('start_time')}
                  className={errors.start_time ? 'border-status-error' : ''}
                />
                {errors.start_time && <p className="text-status-error text-xs mt-1">{errors.start_time.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">End Time</label>
                <Input 
                  type="datetime-local" 
                  {...register('end_time')}
                  className={errors.end_time ? 'border-status-error' : ''}
                />
                {errors.end_time && <p className="text-status-error text-xs mt-1">{errors.end_time.message}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-background-dark/30 rounded-input border border-border-glass">
              <input 
                type="checkbox" 
                id="is_mandatory"
                {...register('is_mandatory')}
                className="w-5 h-5 rounded border-border-glass text-gold focus:ring-gold bg-transparent"
              />
              <div className="flex flex-col">
                <label htmlFor="is_mandatory" className="text-sm font-medium text-text-primary cursor-pointer">
                  Mandatory Attendance
                </label>
                <p className="text-xs text-text-muted">Members may be fined for missing this event.</p>
              </div>
            </div>

            <div className="flex gap-4 justify-end pt-4 border-t border-border-glass">
              <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" isLoading={isSubmitting}>Create Event</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
