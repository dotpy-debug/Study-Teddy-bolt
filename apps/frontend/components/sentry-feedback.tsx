'use client';

import React, { useState, useCallback } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { MessageSquare, Send, Bug, Lightbulb, AlertTriangle } from 'lucide-react';

interface FeedbackData {
  name: string;
  email: string;
  message: string;
  type: 'bug' | 'feature' | 'general';
}

interface SentryFeedbackProps {
  eventId?: string;
  trigger?: React.ReactNode;
  onFeedbackSent?: () => void;
}

export function SentryFeedback({ eventId, trigger, onFeedbackSent }: SentryFeedbackProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData>({
    name: '',
    email: '',
    message: '',
    type: 'general',
  });

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Send feedback to Sentry
      const user = Sentry.getCurrentHub().getScope()?.getUser();

      const feedbackEvent = {
        event_id: eventId || Sentry.captureMessage('User Feedback', 'info'),
        name: feedback.name || user?.email || 'Anonymous',
        email: feedback.email || user?.email || '',
        comments: feedback.message,
      };

      // Use Sentry's user feedback API
      Sentry.captureUserFeedback(feedbackEvent);

      // Also send as a custom event with additional context
      Sentry.withScope((scope) => {
        scope.setTag('feedback_type', feedback.type);
        scope.setLevel('info');
        scope.setContext('feedback', {
          type: feedback.type,
          name: feedback.name,
          email: feedback.email,
          message: feedback.message,
          eventId: eventId,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        });

        Sentry.captureMessage(`User Feedback: ${feedback.type}`, 'info');
      });

      toast.success('Thank you for your feedback!');
      setIsOpen(false);
      setFeedback({ name: '', email: '', message: '', type: 'general' });
      onFeedbackSent?.();
    } catch (error) {
      console.error('Failed to send feedback:', error);
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [feedback, eventId, onFeedbackSent]);

  const getFeedbackIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <Bug className="h-4 w-4" />;
      case 'feature':
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <MessageSquare className="h-4 w-4 mr-2" />
      Feedback
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Feedback
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="feedback-type">Feedback Type</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { value: 'general', label: 'General', icon: <MessageSquare className="h-4 w-4" /> },
                { value: 'bug', label: 'Bug Report', icon: <Bug className="h-4 w-4" /> },
                { value: 'feature', label: 'Feature Request', icon: <Lightbulb className="h-4 w-4" /> },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFeedback(prev => ({ ...prev, type: type.value as any }))}
                  className={`p-2 rounded-md border text-sm flex flex-col items-center gap-1 transition-colors ${
                    feedback.type === type.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {type.icon}
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="feedback-name">Name (Optional)</Label>
              <Input
                id="feedback-name"
                value={feedback.name}
                onChange={(e) => setFeedback(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="feedback-email">Email (Optional)</Label>
              <Input
                id="feedback-email"
                type="email"
                value={feedback.email}
                onChange={(e) => setFeedback(prev => ({ ...prev, email: e.target.value }))}
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="feedback-message">Message</Label>
            <Textarea
              id="feedback-message"
              value={feedback.message}
              onChange={(e) => setFeedback(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Please share your feedback, report a bug, or suggest a feature..."
              rows={4}
              required
            />
          </div>

          {eventId && (
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              This feedback will be linked to error ID: {eventId.slice(0, 8)}...
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !feedback.message.trim()}>
              {isSubmitting ? (
                'Sending...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Feedback
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easy feedback integration
export function useFeedback() {
  const sendFeedback = useCallback((
    message: string,
    type: 'bug' | 'feature' | 'general' = 'general',
    context?: Record<string, any>
  ) => {
    const eventId = Sentry.captureMessage(`User Feedback: ${type}`, 'info');

    Sentry.withScope((scope) => {
      scope.setTag('feedback_type', type);
      scope.setLevel('info');
      scope.setContext('feedback', {
        type,
        message,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        ...context,
      });

      const feedbackEvent = {
        event_id: eventId,
        name: 'Anonymous User',
        email: '',
        comments: message,
      };

      Sentry.captureUserFeedback(feedbackEvent);
    });

    return eventId;
  }, []);

  const reportBug = useCallback((
    message: string,
    error?: Error,
    context?: Record<string, any>
  ) => {
    let eventId: string;

    if (error) {
      eventId = Sentry.captureException(error);
    } else {
      eventId = sendFeedback(message, 'bug', context);
    }

    return eventId;
  }, [sendFeedback]);

  const suggestFeature = useCallback((
    message: string,
    context?: Record<string, any>
  ) => {
    return sendFeedback(message, 'feature', context);
  }, [sendFeedback]);

  return {
    sendFeedback,
    reportBug,
    suggestFeature,
  };
}

// Component for displaying feedback button in error boundaries
export function ErrorFeedbackButton({ errorId }: { errorId?: string }) {
  return (
    <SentryFeedback
      eventId={errorId}
      trigger={
        <Button variant="outline" size="sm">
          <Bug className="h-4 w-4 mr-2" />
          Report this issue
        </Button>
      }
    />
  );
}