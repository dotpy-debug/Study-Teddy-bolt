'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Bell,
  Eye,
  Send,
  Clock,
  History,
  Settings,
  User,
  Check,
  X,
  AlertCircle,
  Info,
  Plus,
  Trash2,
  Edit3,
  TestTube,
  Save
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useEmailPreferences, useEmailHistory, useEmailTemplates } from '@/hooks/queries/use-email';

interface EmailCategory {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

interface EmailAddress {
  id: string;
  email: string;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
}

interface EmailHistoryItem {
  id: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  sentAt: string;
  category: string;
}

export function EmailPreferences() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('notifications');
  const [isUnsubscribeDialogOpen, setIsUnsubscribeDialogOpen] = useState(false);
  const [isAddEmailDialogOpen, setIsAddEmailDialogOpen] = useState(false);
  const [isTestEmailDialogOpen, setIsTestEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [testEmailCategory, setTestEmailCategory] = useState('');

  // Mock data - replace with actual API calls
  const [emailCategories, setEmailCategories] = useState<EmailCategory[]>([
    {
      id: 'tasks',
      name: 'Task Reminders',
      description: 'Notifications about upcoming deadlines and task updates',
      enabled: true,
      frequency: 'immediate'
    },
    {
      id: 'study',
      name: 'Study Sessions',
      description: 'Reminders for scheduled study sessions and focus time',
      enabled: true,
      frequency: 'daily'
    },
    {
      id: 'progress',
      name: 'Progress Reports',
      description: 'Weekly summaries of your learning progress and achievements',
      enabled: false,
      frequency: 'weekly'
    },
    {
      id: 'system',
      name: 'System Updates',
      description: 'Important system announcements and feature updates',
      enabled: true,
      frequency: 'immediate'
    },
    {
      id: 'social',
      name: 'Social Activity',
      description: 'Notifications about study group activities and collaborations',
      enabled: false,
      frequency: 'daily'
    }
  ]);

  const [emailAddresses, setEmailAddresses] = useState<EmailAddress[]>([
    {
      id: '1',
      email: 'user@example.com',
      isPrimary: true,
      isVerified: true,
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      email: 'backup@example.com',
      isPrimary: false,
      isVerified: false,
      createdAt: '2024-02-10'
    }
  ]);

  const [emailHistory] = useState<EmailHistoryItem[]>([
    {
      id: '1',
      recipient: 'user@example.com',
      subject: 'Task Reminder: Complete Math Assignment',
      status: 'sent',
      sentAt: '2024-09-27 14:30',
      category: 'tasks'
    },
    {
      id: '2',
      recipient: 'user@example.com',
      subject: 'Weekly Progress Report',
      status: 'sent',
      sentAt: '2024-09-25 09:00',
      category: 'progress'
    },
    {
      id: '3',
      recipient: 'backup@example.com',
      subject: 'Study Session Starting Soon',
      status: 'failed',
      sentAt: '2024-09-24 16:15',
      category: 'study'
    }
  ]);

  const [emailTemplates] = useState<EmailTemplate[]>([
    {
      id: '1',
      name: 'Task Reminder',
      subject: 'Task Reminder: {{task_name}}',
      content: 'Hello {{user_name}},\n\nThis is a reminder that your task "{{task_name}}" is due on {{due_date}}.\n\nBest regards,\nStudy Teddy',
      category: 'tasks'
    },
    {
      id: '2',
      name: 'Study Session',
      subject: 'Study Session Starting: {{session_name}}',
      content: 'Hello {{user_name}},\n\nYour study session "{{session_name}}" is starting in {{time_until}}.\n\nGood luck with your studies!\nStudy Teddy',
      category: 'study'
    }
  ]);

  const handleCategoryToggle = (categoryId: string, enabled: boolean) => {
    setEmailCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, enabled } : cat
      )
    );
    toast({
      title: 'Notification Settings Updated',
      description: `Email notifications for ${emailCategories.find(c => c.id === categoryId)?.name} have been ${enabled ? 'enabled' : 'disabled'}.`,
    });
  };

  const handleFrequencyChange = (categoryId: string, frequency: 'immediate' | 'daily' | 'weekly') => {
    setEmailCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, frequency } : cat
      )
    );
    toast({
      title: 'Frequency Updated',
      description: `Email frequency for ${emailCategories.find(c => c.id === categoryId)?.name} has been updated.`,
    });
  };

  const handleUnsubscribeAll = () => {
    setEmailCategories(prev =>
      prev.map(cat => ({ ...cat, enabled: false }))
    );
    setIsUnsubscribeDialogOpen(false);
    toast({
      title: 'Unsubscribed from All',
      description: 'You have been unsubscribed from all email notifications.',
      variant: 'destructive'
    });
  };

  const handleAddEmail = () => {
    if (!newEmail) return;

    const newEmailAddress: EmailAddress = {
      id: Date.now().toString(),
      email: newEmail,
      isPrimary: false,
      isVerified: false,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setEmailAddresses(prev => [...prev, newEmailAddress]);
    setNewEmail('');
    setIsAddEmailDialogOpen(false);
    toast({
      title: 'Email Added',
      description: `Verification email sent to ${newEmail}`,
    });
  };

  const handleDeleteEmail = (emailId: string) => {
    setEmailAddresses(prev => prev.filter(email => email.id !== emailId));
    toast({
      title: 'Email Removed',
      description: 'Email address has been removed from your account.',
    });
  };

  const handleSetPrimary = (emailId: string) => {
    setEmailAddresses(prev =>
      prev.map(email => ({
        ...email,
        isPrimary: email.id === emailId
      }))
    );
    toast({
      title: 'Primary Email Updated',
      description: 'Your primary email address has been updated.',
    });
  };

  const handleSendTestEmail = () => {
    if (!testEmailCategory) return;

    toast({
      title: 'Test Email Sent',
      description: `A test email for ${emailCategories.find(c => c.id === testEmailCategory)?.name} has been sent.`,
    });
    setIsTestEmailDialogOpen(false);
    setTestEmailCategory('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <X className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: 'default',
      failed: 'destructive',
      pending: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Email Preferences</h2>
        <p className="text-muted-foreground">Manage your email notifications and settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Email Notification Categories
              </CardTitle>
              <CardDescription>
                Choose which types of emails you want to receive and how often
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {emailCategories.map((category) => (
                <div key={category.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{category.name}</h4>
                        <Switch
                          checked={category.enabled}
                          onCheckedChange={(enabled) => handleCategoryToggle(category.id, enabled)}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                    </div>
                  </div>

                  {category.enabled && (
                    <div className="ml-6 flex items-center gap-4">
                      <Label htmlFor={`frequency-${category.id}`} className="text-sm">
                        Frequency:
                      </Label>
                      <Select
                        value={category.frequency}
                        onValueChange={(value: 'immediate' | 'daily' | 'weekly') =>
                          handleFrequencyChange(category.id, value)
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="daily">Daily Digest</SelectItem>
                          <SelectItem value="weekly">Weekly Summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {category.id !== emailCategories[emailCategories.length - 1].id && <Separator />}
                </div>
              ))}

              <Separator />

              <div className="flex items-center justify-between pt-4">
                <div>
                  <h4 className="font-medium text-red-600">Unsubscribe from All</h4>
                  <p className="text-sm text-muted-foreground">
                    Disable all email notifications at once
                  </p>
                </div>
                <Dialog open={isUnsubscribeDialogOpen} onOpenChange={setIsUnsubscribeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">Unsubscribe All</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Unsubscribe from All Email Notifications?</DialogTitle>
                      <DialogDescription>
                        This will disable all email notifications. You can re-enable them individually later.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsUnsubscribeDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleUnsubscribeAll}>
                        Unsubscribe All
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Addresses Tab */}
        <TabsContent value="addresses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Email Address Management
              </CardTitle>
              <CardDescription>
                Manage your email addresses for receiving notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {emailAddresses.map((email) => (
                <div key={email.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{email.email}</span>
                        {email.isPrimary && <Badge>Primary</Badge>}
                        {email.isVerified ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Unverified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Added on {email.createdAt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!email.isPrimary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPrimary(email.id)}
                      >
                        Set Primary
                      </Button>
                    )}
                    {!email.isPrimary && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteEmail(email.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <Separator />

              <Dialog open={isAddEmailDialogOpen} onOpenChange={setIsAddEmailDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Email Address
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Email Address</DialogTitle>
                    <DialogDescription>
                      Add a new email address to receive notifications
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="new-email">Email Address</Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddEmailDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddEmail}>Add Email</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Email Templates Preview
              </CardTitle>
              <CardDescription>
                Preview the email templates used for different notification types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {emailTemplates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Category: {emailCategories.find(c => c.id === template.category)?.name}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium">Subject</Label>
                      <div className="p-2 bg-muted rounded text-sm font-mono">
                        {template.subject}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Content</Label>
                      <div className="p-3 bg-muted rounded text-sm whitespace-pre-line">
                        {template.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Email History
              </CardTitle>
              <CardDescription>
                View recent email notifications that have been sent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {emailHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(item.status)}
                      <div>
                        <h4 className="font-medium">{item.subject}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>To: {item.recipient}</span>
                          <span>•</span>
                          <span>{item.sentAt}</span>
                          <span>•</span>
                          <span>{emailCategories.find(c => c.id === item.category)?.name}</span>
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                ))}

                {emailHistory.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No email history available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Email Testing
              </CardTitle>
              <CardDescription>
                Test your email notifications to ensure they're working correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Test emails will be sent to your primary email address: {emailAddresses.find(e => e.isPrimary)?.email}
                </AlertDescription>
              </Alert>

              <Dialog open={isTestEmailDialogOpen} onOpenChange={setIsTestEmailDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Email
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send Test Email</DialogTitle>
                    <DialogDescription>
                      Choose a notification category to test
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="test-category">Notification Category</Label>
                      <Select value={testEmailCategory} onValueChange={setTestEmailCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category to test" />
                        </SelectTrigger>
                        <SelectContent>
                          {emailCategories
                            .filter(cat => cat.enabled)
                            .map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsTestEmailDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSendTestEmail} disabled={!testEmailCategory}>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="space-y-3">
                <h4 className="font-medium">Email Status Indicators</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <Check className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium">Delivered</p>
                      <p className="text-sm text-muted-foreground">Email sent successfully</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="font-medium">Pending</p>
                      <p className="text-sm text-muted-foreground">Email queued for delivery</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <X className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="font-medium">Failed</p>
                      <p className="text-sm text-muted-foreground">Email delivery failed</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}