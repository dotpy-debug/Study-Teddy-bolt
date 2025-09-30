'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarConnection } from '../components/calendar/CalendarConnection';
import { WeeklyPlanner } from '../components/calendar/WeeklyPlanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Settings, CalendarDays } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar Integration</h1>
          <p className="text-muted-foreground mt-1">
            Manage your study schedule with Google Calendar
          </p>
        </div>
      </div>

      <Tabs defaultValue="planner" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="planner" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Weekly Planner
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planner" className="space-y-4">
          <WeeklyPlanner />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How to Use the Weekly Planner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Drag tasks from the bottom panel to any time slot to schedule them</p>
              <p>• Click on any event to view details or delete it</p>
              <p>• Navigate between weeks using the arrow buttons</p>
              <p>• Conflicts are automatically detected when scheduling</p>
              <p>• All sessions are synced with your Google Calendar in real-time</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <CalendarConnection />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Calendar Features</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Smart Scheduling
                </h3>
                <p className="text-sm text-muted-foreground">
                  Automatically finds the best time slots for your study sessions based on your availability
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Conflict Detection
                </h3>
                <p className="text-sm text-muted-foreground">
                  Checks all your calendars to prevent double-booking and scheduling conflicts
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Dedicated Calendar
                </h3>
                <p className="text-sm text-muted-foreground">
                  Creates a separate "Study Teddy" calendar to keep your study sessions organized
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Real-time Sync
                </h3>
                <p className="text-sm text-muted-foreground">
                  Changes made in Study Teddy instantly appear in your Google Calendar and vice versa
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}