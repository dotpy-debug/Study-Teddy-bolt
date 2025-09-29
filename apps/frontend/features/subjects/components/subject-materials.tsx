"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  PlusIcon,
  LinkIcon,
  ExternalLinkIcon,
  EditIcon,
  TrashIcon,
  StickyNoteIcon,
  BookOpenIcon
} from "lucide-react";
import { useSubject, useUpdateSubject } from "../hooks/useSubjects";
import { ResourceLink } from '../types';

interface SubjectMaterialsProps {
  subjectId: string;
}

export const SubjectMaterials = ({ subjectId }: SubjectMaterialsProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditNotesOpen, setIsEditNotesOpen] = useState(false);
  const [newResource, setNewResource] = useState<Partial<ResourceLink>>({});
  const [editingNotes, setEditingNotes] = useState('');

  const { data: subject, isLoading } = useSubject(subjectId);
  const updateSubject = useUpdateSubject();

  const resources = subject?.resources?.links || [];
  const notes = subject?.resources?.notes || '';

  const handleAddResource = () => {
    if (!newResource.title || !newResource.url || !subject) return;

    const updatedResources = {
      ...subject.resources,
      links: [...resources, newResource as ResourceLink]
    };

    updateSubject.mutate(
      { id: subjectId, data: { resources: updatedResources } },
      {
        onSuccess: () => {
          setNewResource({});
          setIsAddDialogOpen(false);
        }
      }
    );
  };

  const handleDeleteResource = (index: number) => {
    if (!subject) return;

    const updatedResources = {
      ...subject.resources,
      links: resources.filter((_, i) => i !== index)
    };

    updateSubject.mutate({
      id: subjectId,
      data: { resources: updatedResources }
    });
  };

  const handleUpdateNotes = () => {
    if (!subject) return;

    const updatedResources = {
      ...subject.resources,
      notes: editingNotes
    };

    updateSubject.mutate(
      { id: subjectId, data: { resources: updatedResources } },
      {
        onSuccess: () => {
          setIsEditNotesOpen(false);
        }
      }
    );
  };

  const openEditNotes = () => {
    setEditingNotes(notes);
    setIsEditNotesOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Study Resources</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Study Resource</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Resource title"
                  value={newResource.title || ''}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  placeholder="https://..."
                  value={newResource.url || ''}
                  onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the resource"
                  value={newResource.description || ''}
                  onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddResource}
                  disabled={!newResource.title || !newResource.url || updateSubject.isPending}
                >
                  {updateSubject.isPending ? 'Adding...' : 'Add Resource'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resource Links */}
      {resources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((resource, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      {resource.title}
                    </CardTitle>
                    {resource.description && (
                      <CardDescription className="mt-1">
                        {resource.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(resource.url, '_blank')}
                    >
                      <ExternalLinkIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteResource(index)}
                      disabled={updateSubject.isPending}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground truncate">
                    {resource.url}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(resource.url, '_blank')}
                  >
                    <ExternalLinkIcon className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">No resources yet</h3>
            <p className="text-gray-500 mb-4">
              Add study materials, links, and resources for this subject.
            </p>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Your First Resource
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <StickyNoteIcon className="h-5 w-5" />
              Study Notes
            </CardTitle>
            <Button variant="outline" size="sm" onClick={openEditNotes}>
              <EditIcon className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {notes ? (
            <div className="whitespace-pre-wrap text-sm">{notes}</div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p>No notes yet. Click "Edit" to add study notes and materials information.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Notes Dialog */}
      <Dialog open={isEditNotesOpen} onOpenChange={setIsEditNotesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Study Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Add notes about study materials, textbooks, important concepts, etc."
              value={editingNotes}
              onChange={(e) => setEditingNotes(e.target.value)}
              rows={10}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditNotesOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateNotes}
                disabled={updateSubject.isPending}
              >
                {updateSubject.isPending ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};