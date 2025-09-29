import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// Types
export interface EmailPreference {
  id: string;
  category: string;
  enabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  userId: string;
}

export interface EmailAddress {
  id: string;
  email: string;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: string;
  userId: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
  isActive: boolean;
}

export interface EmailHistoryItem {
  id: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  sentAt: string;
  category: string;
  templateId: string;
  errorMessage?: string;
}

export interface EmailNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  category: string;
}

export interface TestEmailRequest {
  category: string;
  recipient?: string;
}

export interface EmailStatsResponse {
  totalSent: number;
  totalFailed: number;
  totalPending: number;
  deliveryRate: number;
  categoriesStats: {
    category: string;
    sent: number;
    failed: number;
  }[];
}

// API functions
const emailApi = {
  // Email Preferences
  getEmailPreferences: async (): Promise<EmailPreference[]> => {
    const response = await fetch('/api/email/preferences');
    if (!response.ok) throw new Error('Failed to fetch email preferences');
    return response.json();
  },

  updateEmailPreference: async (preference: Partial<EmailPreference> & { id: string }): Promise<EmailPreference> => {
    const response = await fetch(`/api/email/preferences/${preference.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preference),
    });
    if (!response.ok) throw new Error('Failed to update email preference');
    return response.json();
  },

  disableAllPreferences: async (): Promise<void> => {
    const response = await fetch('/api/email/preferences/disable-all', {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to disable all preferences');
  },

  // Email Addresses
  getEmailAddresses: async (): Promise<EmailAddress[]> => {
    const response = await fetch('/api/email/addresses');
    if (!response.ok) throw new Error('Failed to fetch email addresses');
    return response.json();
  },

  addEmailAddress: async (email: string): Promise<EmailAddress> => {
    const response = await fetch('/api/email/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error('Failed to add email address');
    return response.json();
  },

  deleteEmailAddress: async (id: string): Promise<void> => {
    const response = await fetch(`/api/email/addresses/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete email address');
  },

  setPrimaryEmail: async (id: string): Promise<EmailAddress> => {
    const response = await fetch(`/api/email/addresses/${id}/set-primary`, {
      method: 'PATCH',
    });
    if (!response.ok) throw new Error('Failed to set primary email');
    return response.json();
  },

  verifyEmailAddress: async (id: string, token: string): Promise<EmailAddress> => {
    const response = await fetch(`/api/email/addresses/${id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) throw new Error('Failed to verify email address');
    return response.json();
  },

  resendVerification: async (id: string): Promise<void> => {
    const response = await fetch(`/api/email/addresses/${id}/resend-verification`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to resend verification');
  },

  // Email Templates
  getEmailTemplates: async (): Promise<EmailTemplate[]> => {
    const response = await fetch('/api/email/templates');
    if (!response.ok) throw new Error('Failed to fetch email templates');
    return response.json();
  },

  updateEmailTemplate: async (template: Partial<EmailTemplate> & { id: string }): Promise<EmailTemplate> => {
    const response = await fetch(`/api/email/templates/${template.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    if (!response.ok) throw new Error('Failed to update email template');
    return response.json();
  },

  // Email History
  getEmailHistory: async (limit = 50, offset = 0): Promise<EmailHistoryItem[]> => {
    const response = await fetch(`/api/email/history?limit=${limit}&offset=${offset}`);
    if (!response.ok) throw new Error('Failed to fetch email history');
    return response.json();
  },

  getEmailStats: async (): Promise<EmailStatsResponse> => {
    const response = await fetch('/api/email/stats');
    if (!response.ok) throw new Error('Failed to fetch email stats');
    return response.json();
  },

  // Email Testing
  sendTestEmail: async (request: TestEmailRequest): Promise<void> => {
    const response = await fetch('/api/email/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error('Failed to send test email');
  },

  // Email Notifications
  getEmailNotifications: async (): Promise<EmailNotification[]> => {
    const response = await fetch('/api/email/notifications');
    if (!response.ok) throw new Error('Failed to fetch email notifications');
    return response.json();
  },

  markNotificationAsRead: async (id: string): Promise<void> => {
    const response = await fetch(`/api/email/notifications/${id}/read`, {
      method: 'PATCH',
    });
    if (!response.ok) throw new Error('Failed to mark notification as read');
  },

  markAllNotificationsAsRead: async (): Promise<void> => {
    const response = await fetch('/api/email/notifications/mark-all-read', {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to mark all notifications as read');
  },

  deleteNotification: async (id: string): Promise<void> => {
    const response = await fetch(`/api/email/notifications/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete notification');
  },
};

// Query Keys
export const emailKeys = {
  all: ['email'] as const,
  preferences: () => [...emailKeys.all, 'preferences'] as const,
  addresses: () => [...emailKeys.all, 'addresses'] as const,
  templates: () => [...emailKeys.all, 'templates'] as const,
  history: (limit?: number, offset?: number) => [...emailKeys.all, 'history', { limit, offset }] as const,
  stats: () => [...emailKeys.all, 'stats'] as const,
  notifications: () => [...emailKeys.all, 'notifications'] as const,
};

// Hooks
export function useEmailPreferences() {
  return useQuery({
    queryKey: emailKeys.preferences(),
    queryFn: emailApi.getEmailPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateEmailPreference() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: emailApi.updateEmailPreference,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.preferences() });
      toast({
        title: 'Preference Updated',
        description: 'Your email preference has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDisableAllEmailPreferences() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: emailApi.disableAllPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.preferences() });
      toast({
        title: 'All Preferences Disabled',
        description: 'You have been unsubscribed from all email notifications.',
        variant: 'destructive',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Operation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useEmailAddresses() {
  return useQuery({
    queryKey: emailKeys.addresses(),
    queryFn: emailApi.getEmailAddresses,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAddEmailAddress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: emailApi.addEmailAddress,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: emailKeys.addresses() });
      toast({
        title: 'Email Added',
        description: `Verification email sent to ${data.email}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Add Email',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEmailAddress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: emailApi.deleteEmailAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.addresses() });
      toast({
        title: 'Email Removed',
        description: 'Email address has been removed from your account.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Remove Email',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useSetPrimaryEmail() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: emailApi.setPrimaryEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.addresses() });
      toast({
        title: 'Primary Email Updated',
        description: 'Your primary email address has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Update Primary Email',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useVerifyEmailAddress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) =>
      emailApi.verifyEmailAddress(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.addresses() });
      toast({
        title: 'Email Verified',
        description: 'Your email address has been verified successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useResendVerification() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: emailApi.resendVerification,
    onSuccess: () => {
      toast({
        title: 'Verification Sent',
        description: 'A new verification email has been sent.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Send Verification',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useEmailTemplates() {
  return useQuery({
    queryKey: emailKeys.templates(),
    queryFn: emailApi.getEmailTemplates,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: emailApi.updateEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.templates() });
      toast({
        title: 'Template Updated',
        description: 'Email template has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useEmailHistory(limit = 50, offset = 0) {
  return useQuery({
    queryKey: emailKeys.history(limit, offset),
    queryFn: () => emailApi.getEmailHistory(limit, offset),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useEmailStats() {
  return useQuery({
    queryKey: emailKeys.stats(),
    queryFn: emailApi.getEmailStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSendTestEmail() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: emailApi.sendTestEmail,
    onSuccess: () => {
      toast({
        title: 'Test Email Sent',
        description: 'A test email has been sent successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Send Test Email',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useEmailNotifications() {
  return useQuery({
    queryKey: emailKeys.notifications(),
    queryFn: emailApi.getEmailNotifications,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000, // refetch every 30 seconds
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailApi.markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.notifications() });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: emailApi.markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.notifications() });
      toast({
        title: 'All Notifications Marked as Read',
        description: 'All email notifications have been marked as read.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Operation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailApi.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.notifications() });
    },
  });
}

// Utility hooks
export function useEmailStatus() {
  const { data: notifications } = useEmailNotifications();
  const { data: emailStats } = useEmailStats();

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  const hasUnread = unreadCount > 0;

  const deliveryRate = emailStats?.deliveryRate || 0;
  const isDeliveryHealthy = deliveryRate >= 95; // Consider 95%+ delivery rate as healthy

  return {
    unreadCount,
    hasUnread,
    deliveryRate,
    isDeliveryHealthy,
    totalSent: emailStats?.totalSent || 0,
    totalFailed: emailStats?.totalFailed || 0,
    totalPending: emailStats?.totalPending || 0,
  };
}