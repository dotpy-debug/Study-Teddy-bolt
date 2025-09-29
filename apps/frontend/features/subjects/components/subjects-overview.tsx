"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusIcon, SearchIcon, MoreVerticalIcon, BookOpenIcon, EditIcon, TrashIcon, EyeIcon, ArchiveIcon } from "lucide-react";
import { useSubjects } from "../hooks/useSubjects";
import { Subject } from "../types";
import { SubjectForm } from "./subject-form";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export const SubjectsOverview = () => {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);

  const { data: subjectsData, isLoading, error } = useSubjects({
    search: searchTerm || undefined,
    includeArchived,
    limit: 20
  });

  const subjects = subjectsData?.items || [];

  const handleSubjectClick = (subject: Subject) => {
    router.push(`/subjects/${subject.id}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Your Subjects</h2>
          <Button disabled>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Subject
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading subjects. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Subjects</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Subject</DialogTitle>
            </DialogHeader>
            <SubjectForm
              onSubmit={() => setIsCreateDialogOpen(false)}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search subjects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={includeArchived ? "default" : "outline"}
          onClick={() => setIncludeArchived(!includeArchived)}
        >
          <ArchiveIcon className="h-4 w-4 mr-2" />
          {includeArchived ? "Hide Archived" : "Show Archived"}
        </Button>
      </div>

      {/* Subjects Grid */}
      {subjects.length === 0 ? (
        <div className="text-center py-12">
          <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No subjects</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first subject.
          </p>
          <div className="mt-6">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Subject
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Subject</DialogTitle>
                </DialogHeader>
                <SubjectForm
                  onSubmit={() => setIsCreateDialogOpen(false)}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onView={handleSubjectClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface SubjectCardProps {
  subject: Subject;
  onView: (subject: Subject) => void;
}

const SubjectCard = ({ subject, onView }: SubjectCardProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleCardClick = () => {
    onView(subject);
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg ${
        subject.isArchived ? 'opacity-60' : ''
      }`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: subject.color }}
            />
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {subject.name}
                {subject.isArchived && <Badge variant="secondary">Archived</Badge>}
              </CardTitle>
              {subject.description && (
                <CardDescription className="mt-1">
                  {subject.description}
                </CardDescription>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onView(subject);
              }}>
                <EyeIcon className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                setIsEditDialogOpen(true);
              }}>
                <EditIcon className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Study Time</span>
            <span className="font-medium">{Math.floor(subject.totalStudyMinutes / 60)}h {subject.totalStudyMinutes % 60}m</span>
          </div>
          {subject.lastStudiedAt && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Last Studied</span>
              <span className="font-medium">
                {format(new Date(subject.lastStudiedAt), 'MMM dd')}
              </span>
            </div>
          )}
          {subject.resources?.links && subject.resources.links.length > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Resources</span>
              <span className="font-medium">{subject.resources.links.length} links</span>
            </div>
          )}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl" onClick={(e) => e.stopPropagation()}>
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
    </Card>
  );
};