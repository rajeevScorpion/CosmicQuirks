'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Wand2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from './loading-spinner';
import { Input } from './ui/input';

export const PredictionFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  date: z.string().regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/, {
    message: "Please use DD-MM-YYYY format for the date.",
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
      name: '',
      date: '',
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Jane Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <Input placeholder="DD-MM-YYYY" {...field} />
              </FormControl>
               <FormDescription>
                Please enter your birthdate in DD-MM-YYYY format.
              </FormDescription>
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
