'use client';

import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { communicationService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const pollSchema = z.object({
  question: z.string().min(5, "Question must be at least 5 characters"),
  options: z.array(
    z.object({ text: z.string().min(1, "Option text is required") })
  ).min(2, "At least 2 options are required"),
  voting_deadline: z.string().min(1, "Voting deadline is required"),
});

type PollFormValues = z.infer<typeof pollSchema>;

export default function CreatePollPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<PollFormValues>({
    resolver: zodResolver(pollSchema),
    defaultValues: {
      options: [{ text: '' }, { text: '' }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });

  const onSubmit = async (data: PollFormValues) => {
    try {
      await communicationService.createPoll(params.id, {
        question: data.question,
        options: data.options.map(o => o.text),
        poll_type: 'SINGLE_CHOICE',
        voting_deadline: data.voting_deadline,
      });
      toast.success('Poll created successfully!');
      router.push(`/mahbers/${params.id}/polls`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create poll');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader 
        title="Create Poll" 
        description="Ask a question and let the community vote on it."
      />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Question</label>
              <Input 
                placeholder="e.g., What should we do for the next gathering?" 
                {...register('question')}
                className={errors.question ? 'border-status-error' : ''}
              />
              {errors.question && <p className="text-status-error text-xs mt-1">{errors.question.message}</p>}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-text-secondary">Options</label>
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <div className="flex-1">
                    <Input 
                      placeholder={`Option ${index + 1}`}
                      {...register(`options.${index}.text` as const)}
                      className={errors.options?.[index]?.text ? 'border-status-error' : ''}
                    />
                    {errors.options?.[index]?.text && (
                      <p className="text-status-error text-xs mt-1">{errors.options[index]?.text?.message}</p>
                    )}
                  </div>
                  {fields.length > 2 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      className="shrink-0 text-status-error border-border-glass hover:bg-status-error/10"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {errors.options && !Array.isArray(errors.options) && (
                <p className="text-status-error text-xs">{errors.options.message}</p>
              )}
              
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="w-full mt-2 border-dashed"
                onClick={() => append({ text: '' })}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Voting Deadline</label>
              <Input 
                type="datetime-local" 
                {...register('voting_deadline')}
                className={errors.voting_deadline ? 'border-status-error' : ''}
              />
              {errors.voting_deadline && <p className="text-status-error text-xs mt-1">{errors.voting_deadline.message}</p>}
            </div>

            <div className="flex gap-4 justify-end pt-4 border-t border-border-glass">
              <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" isLoading={isSubmitting}>Publish Poll</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
