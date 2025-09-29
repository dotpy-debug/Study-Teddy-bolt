"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  EditIcon,
  ArchiveIcon,
  ClockIcon,
  TargetIcon,
  TrendingUpIcon,
  BookOpenIcon,
  CalendarIcon
} from "lucide-react";
import { useSubject, useSubjectAnalytics } from "../hooks/useSubjects";
import { SubjectForm } from "./subject-form";
import { format } from 'date-fns';

interface SubjectDetailProps {
  subjectId: string;
}

export const SubjectDetail = ({ subjectId }: SubjectDetailProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: subject, isLoading, error } = useSubject(subjectId);
  const { data: analytics } = useSubjectAnalytics(subjectId, { window: 'week' });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !subject) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-500">Error loading subject details.</p>
        </CardContent>
      </Card>
    );
  }

  const metrics = analytics?.metrics;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: subject.color }}
              />
              <div>
                <CardTitle className="text-3xl">{subject.name}</CardTitle>
                {subject.description && (
                  <CardDescription className="text-lg mt-2">
                    {subject.description}
                  </CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={subject.isArchived ? "secondary" : "default"}>
                {subject.isArchived ? "Archived" : "Active"}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                <EditIcon className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <TargetIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {metrics?.completedTasks || 0}/{(metrics?.completedTasks || 0) + (metrics?.pendingTasks || 0)}
              </div>
              <div className="text-sm text-muted-foreground">Tasks Completed</div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <ClockIcon className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {Math.floor((metrics?.totalFocusedMinutes || 0) / 60)}h {(metrics?.totalFocusedMinutes || 0) % 60}m
              </div>
              <div className="text-sm text-muted-foreground">Focus Time</div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <TrendingUpIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {metrics?.completionRate || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Completion Rate</div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <BookOpenIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {metrics?.sessionsCount || 0}
              </div>
              <div className="text-sm text-muted-foreground">Study Sessions</div>
            </div>
          </div>

          {/* Progress Bar */}
          {metrics && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{metrics.completionRate}%</span>
              </div>
              <Progress value={metrics.completionRate} className="h-2" />
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold">Study Statistics</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average Session:</span>
                  <span>{metrics?.averageSessionDuration || 0} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Streak:</span>
                  <span>{metrics?.currentStreak || 0} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Study Time:</span>
                  <span>{Math.floor((subject.totalStudyMinutes || 0) / 60)}h {(subject.totalStudyMinutes || 0) % 60}m</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Subject Details</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{format(new Date(subject.createdAt), 'MMM dd, yyyy')}</span>
                </div>
                {subject.lastStudiedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Studied:</span>
                    <span>{format(new Date(subject.lastStudiedAt), 'MMM dd, yyyy')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resources:</span>
                  <span>{subject.resources?.links?.length || 0} links</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button size="sm">
              <ClockIcon className="h-4 w-4 mr-2" />
              Start Focus Session
            </Button>
            <Button variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Add Task
            </Button>
            {!subject.isArchived && (
              <Button variant="outline" size="sm">
                <ArchiveIcon className="h-4 w-4 mr-2" />
                Archive
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Subject Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
          </DialogHeader>
          <SubjectForm
            subject={subject}
            onSubmit={() => setIsEditDialogOpen(false)}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};