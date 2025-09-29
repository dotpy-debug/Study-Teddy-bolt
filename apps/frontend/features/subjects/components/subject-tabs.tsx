"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubjectDetail } from "./subject-detail";
import { SubjectTasks } from "./subject-tasks";
import { SubjectResources } from "./subject-resources";
import { SubjectAnalytics } from "./subject-analytics";
import { SubjectQuickActions } from "./subject-quick-actions";
import { useSubject } from "@/hooks/queries";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SubjectTabsProps {
  subjectId: string;
}

export const SubjectTabs = ({ subjectId }: SubjectTabsProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const { data: subject, isLoading } = useSubject(subjectId);

  const handleTabChange = (value: string) => {
    const url = new URL(window.location.href);
    if (value === 'overview') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', value);
    }
    router.push(url.pathname + url.search);
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <Skeleton className="h-10 w-full" />
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!subject) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          Subject not found
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Quick Actions Section - Always Visible */}
      <SubjectQuickActions subject={subject} />

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <SubjectDetail subjectId={subjectId} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <SubjectTasks subjectId={subjectId} />
        </TabsContent>

        <TabsContent value="resources" className="mt-6">
          <SubjectResources subjectId={subjectId} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <SubjectAnalytics subjectId={subjectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};