"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  BookOpenIcon,
  FileTextIcon,
  PlayIcon,
  LinkIcon,
  FileIcon,
  WrenchIcon,
  MoreHorizontalIcon,
  ExternalLinkIcon,
  EditIcon,
  TrashIcon,
  GripVerticalIcon,
  StarIcon,
} from 'lucide-react';
import { Resource, ResourceType } from '../types';
import { cn } from '@/lib/utils';

interface ResourceItemProps {
  resource: Resource;
  onEdit: (resource: Resource) => void;
  onDelete: (resourceId: string) => void;
  isDragging?: boolean;
  dragHandleProps?: any;
  showActions?: boolean;
}

const RESOURCE_TYPE_CONFIG: Record<ResourceType, { icon: React.ComponentType<any>; color: string; label: string }> = {
  book: { icon: BookOpenIcon, color: 'bg-blue-100 text-blue-700', label: 'Book' },
  article: { icon: FileTextIcon, color: 'bg-green-100 text-green-700', label: 'Article' },
  video: { icon: PlayIcon, color: 'bg-red-100 text-red-700', label: 'Video' },
  website: { icon: LinkIcon, color: 'bg-purple-100 text-purple-700', label: 'Website' },
  document: { icon: FileIcon, color: 'bg-orange-100 text-orange-700', label: 'Document' },
  tool: { icon: WrenchIcon, color: 'bg-gray-100 text-gray-700', label: 'Tool' },
  other: { icon: MoreHorizontalIcon, color: 'bg-slate-100 text-slate-700', label: 'Other' },
};

export const ResourceItem = ({
  resource,
  onEdit,
  onDelete,
  isDragging = false,
  dragHandleProps,
  showActions = true,
}: ResourceItemProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const config = RESOURCE_TYPE_CONFIG[resource.type];
  const IconComponent = config.icon;

  const handleOpenResource = () => {
    if (resource.url) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleEdit = () => {
    onEdit(resource);
  };

  const handleDelete = () => {
    onDelete(resource.id);
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Card
        className={cn(
          "transition-all duration-200 hover:shadow-md",
          isDragging && "opacity-50 rotate-2 shadow-lg",
          resource.isRequired && "border-l-4 border-l-yellow-500"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            {/* Drag Handle */}
            {showActions && (
              <div {...dragHandleProps} className="cursor-grab hover:cursor-grabbing mt-1">
                <GripVerticalIcon className="h-4 w-4 text-gray-400" />
              </div>
            )}

            {/* Resource Type Icon */}
            <div className={cn("rounded-full p-2 flex-shrink-0", config.color)}>
              <IconComponent className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm truncate">{resource.title}</h3>
                  {resource.description && (
                    <p className="text-xs text-muted-foreground mt-1 max-h-8 overflow-hidden">
                      {resource.description}
                    </p>
                  )}
                </div>

                {/* Required Badge */}
                {resource.isRequired && (
                  <div className="flex-shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      <StarIcon className="h-3 w-3 mr-1" />
                      Required
                    </Badge>
                  </div>
                )}
              </div>

              {/* Tags and Category */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {config.label}
                </Badge>

                {resource.category && (
                  <Badge variant="outline" className="text-xs">
                    {resource.category}
                  </Badge>
                )}

                {resource.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between gap-2">
            {/* URL Display */}
            {resource.url && (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {resource.url}
                </p>
              </div>
            )}

            {/* Actions */}
            {showActions && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {resource.url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenResource}
                    className="h-8 w-8 p-0"
                  >
                    <ExternalLinkIcon className="h-3 w-3" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="h-8 w-8 p-0"
                >
                  <EditIcon className="h-3 w-3" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                >
                  <TrashIcon className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete "{resource.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};