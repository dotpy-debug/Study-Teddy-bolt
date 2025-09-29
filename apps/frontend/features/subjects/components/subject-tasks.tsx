"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, CheckIcon, ClockIcon } from "lucide-react";

interface SubjectTasksProps {
  subjectId: string;
}

export const SubjectTasks = ({ subjectId }: SubjectTasksProps) => {
  // Mock data - in a real app, you would fetch tasks for this subject
  const tasks = [
    {
      id: "1",
      title: "Complete Chapter 5 exercises",
      description: "Work through integration problems 1-25",
      priority: "high",
      status: "pending",
      dueDate: "2024-01-15",
    },
    {
      id: "2",
      title: "Review linear algebra concepts",
      description: "Go over matrix operations and eigenvalues",
      priority: "medium",
      status: "in_progress",
      dueDate: "2024-01-20",
    },
    {
      id: "3",
      title: "Prepare for midterm exam",
      description: "Study chapters 1-6, create summary notes",
      priority: "high",
      status: "pending",
      dueDate: "2024-01-25",
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckIcon className="h-4 w-4" />;
      case "in_progress":
        return <ClockIcon className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Subject Tasks</h3>
        <Button>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(task.status)}
                    {task.title}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {task.description}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                  <Badge variant="outline">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Status: {task.status.replace("_", " ")}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    Mark Complete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};