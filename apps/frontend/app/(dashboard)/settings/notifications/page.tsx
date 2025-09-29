'use client';

import React from 'react';
import { Bell, Mail, Activity } from 'lucide-react';
import { EmailNotificationCenter } from '@/features/settings/components/email-notification-center';
import { EmailStatusIndicators } from '@/features/settings/components/email-status-indicators';
import { NotificationSettings } from '@/components/notifications/notification-settings';

export default function NotificationSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
        <p className="text-muted-foreground">
          Monitor your email notifications and delivery status
        </p>
      </div>

      {/* Original notification settings */}
      <NotificationSettings />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main notification center taking up 2/3 width */}
        <div className="lg:col-span-2">
          <EmailNotificationCenter />
        </div>

        {/* Status indicators sidebar taking up 1/3 width */}
        <div className="space-y-6">
          <EmailStatusIndicators showDetails={false} />

          {/* Quick stats card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-lg p-6 border">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Email Activity</h3>
                <p className="text-sm text-muted-foreground">Last 24 hours</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Notifications sent</span>
                <span className="font-semibold">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Delivery rate</span>
                <span className="font-semibold text-green-600">98.5%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Open rate</span>
                <span className="font-semibold">75%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed status indicators for larger screens */}
      <div className="mt-8">
        <EmailStatusIndicators showDetails={true} />
      </div>
    </div>
  );
}