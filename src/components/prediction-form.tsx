'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Wand2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from './loading-spinner';

export const PredictionFormSchema = z.object({
  date: z.date({
    required_error: 'A date of birth is required.',
  }),
  question: z
    .string({ required_error: 'A question is required.' })
    .min(10, { message: 'Your question must be at least 10 characters long.' })
    .max(200, { message: 'Your question must be no longer than 200 characters.' }),
});

type PredictionFormProps = {
  onSubmit: (data: z.infer<typeof PredictionFormSchema>) => void;
  isLoading: boolean;
};

export function PredictionForm({ onSubmit, isLoading }: PredictionFormProps) {
  const form = useForm<z.infer<typeof PredictionFormSchema>>({
    resolver: zodResolver(PredictionFormSchema),
    defaultValues: {
      question: '',
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 rounded-lg border bg-card p-6 shadow-sm"
      >
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Birth</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="question"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Question About the Future</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., Will I finally become a master chef?"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <LoadingSpinner className="mr-2 h-4 w-4" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Reveal My Future
        </Button>
      </form>
    </Form>
  );
}
