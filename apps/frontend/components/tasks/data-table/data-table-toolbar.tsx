'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  MoreVertical,
  Trash2,
  CheckCircle,
  Circle,
  Flag,
  Edit,
  Download,
  Copy,
  Archive,
} from 'lucide-react';
import { UpdateTaskDto } from '@/types/tasks';

interface DataTableToolbarProps {
  selectedCount: number;
  onBatchUpdate: (updateData: Partial<UpdateTaskDto>) => Promise<void>;
  onBatchDelete: () => Promise<void>;
  onExport?: () => void;
  onDeselectAll: () => void;
  isLoading?: boolean;
}

export function DataTableToolbar({
  selectedCount,
  onBatchUpdate,
  onBatchDelete,
  onExport,
  onDeselectAll,
  isLoading = false,
}: DataTableToolbarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleBatchUpdate = async (updateData: Partial<UpdateTaskDto>) => {
    setActionLoading(true);
    try {
      await onBatchUpdate(updateData);
      onDeselectAll();
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    setActionLoading(true);
    try {
      await onBatchDelete();
      onDeselectAll();
      setShowDeleteDialog(false);
    } finally {
      setActionLoading(false);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-muted/30 border-b">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="font-medium">
              {selectedCount} selected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeselectAll}
              disabled={isLoading || actionLoading}
            >
              Clear selection
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBatchUpdate({ status: 'completed' })}
            disabled={isLoading || actionLoading}
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Mark Complete
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBatchUpdate({ status: 'pending' })}
            disabled={isLoading || actionLoading}
            className="gap-2"
          >
            <Circle className="h-4 w-4" />
            Mark Pending
          </Button>

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading || actionLoading}
                className="gap-2"
              >
                <MoreVertical className="h-4 w-4" />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Batch Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Status updates */}
              <DropdownMenuItem
                onClick={() => handleBatchUpdate({ status: 'in_progress' })}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Set In Progress
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleBatchUpdate({ status: 'cancelled' })}
                className="gap-2"
              >
                <Circle className="h-4 w-4" />
                Set Cancelled
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Priority updates */}
              <DropdownMenuItem
                onClick={() => handleBatchUpdate({ priority: 'urgent' })}
                className="gap-2"
              >
                <Flag className="h-4 w-4 text-red-500" />
                Set Urgent Priority
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleBatchUpdate({ priority: 'high' })}
                className="gap-2"
              >
                <Flag className="h-4 w-4 text-orange-500" />
                Set High Priority
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleBatchUpdate({ priority: 'medium' })}
                className="gap-2"
              >
                <Flag className="h-4 w-4 text-yellow-500" />
                Set Medium Priority
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleBatchUpdate({ priority: 'low' })}
                className="gap-2"
              >
                <Flag className="h-4 w-4 text-blue-500" />
                Set Low Priority
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Progress updates */}
              <DropdownMenuItem
                onClick={() => handleBatchUpdate({ progressPercentage: 0 })}
                className="gap-2"
              >
                <Circle className="h-4 w-4" />
                Reset Progress
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleBatchUpdate({ progressPercentage: 50 })}
                className="gap-2"
              >
                <div className="w-4 h-4 border rounded-sm bg-gradient-to-r from-primary to-transparent" />
                Set 50% Progress
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Export/Copy */}
              {onExport && (
                <DropdownMenuItem onClick={onExport} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Selected
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => {
                  // Copy selected task IDs to clipboard
                  navigator.clipboard.writeText(`${selectedCount} tasks selected`);
                }}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Selection Info
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Destructive actions */}
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Tasks</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} selected task{selectedCount > 1 ? 's' : ''}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}