"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  Check,
  X,
  Merge,
  Download,
  Upload,
  SkipForward,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { SyncConflict } from "../types/google-calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ConflictResolverProps {
  conflicts: SyncConflict[];
  onResolveConflict: (conflictId: string, resolution: 'keep_google' | 'keep_local' | 'merge' | 'skip') => void;
  onResolveAllConflicts: (resolution: 'keep_google' | 'keep_local' | 'merge' | 'skip') => void;
  isResolving?: boolean;
  isResolvingAll?: boolean;
  className?: string;
}

type ConflictResolution = 'keep_google' | 'keep_local' | 'merge' | 'skip';

export function ConflictResolver({
  conflicts,
  onResolveConflict,
  onResolveAllConflicts,
  isResolving = false,
  isResolvingAll = false,
  className
}: ConflictResolverProps) {
  const [selectedConflict, setSelectedConflict] = useState<string | null>(
    conflicts.length > 0 ? conflicts[0].id : null
  );
  const [bulkResolution, setBulkResolution] = useState<ConflictResolution>('keep_google');

  const currentConflict = conflicts.find(c => c.id === selectedConflict);
  const resolvedConflicts = conflicts.filter(c => c.resolution);
  const unresolvedConflicts = conflicts.filter(c => !c.resolution);

  const getConflictTypeIcon = (type: string) => {
    switch (type) {
      case 'time_overlap':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'duplicate':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'modified_both':
        return <Merge className="h-4 w-4 text-blue-500" />;
      case 'deleted_both':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'time_overlap':
        return 'Time Overlap';
      case 'duplicate':
        return 'Duplicate Event';
      case 'modified_both':
        return 'Modified in Both';
      case 'deleted_both':
        return 'Deleted in Both';
      default:
        return type;
    }
  };

  const getResolutionIcon = (resolution: string) => {
    switch (resolution) {
      case 'keep_google':
        return <Download className="h-4 w-4" />;
      case 'keep_local':
        return <Upload className="h-4 w-4" />;
      case 'merge':
        return <Merge className="h-4 w-4" />;
      case 'skip':
        return <SkipForward className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getResolutionLabel = (resolution: string) => {
    switch (resolution) {
      case 'keep_google':
        return 'Keep Google Version';
      case 'keep_local':
        return 'Keep Local Version';
      case 'merge':
        return 'Merge Both';
      case 'skip':
        return 'Skip This Conflict';
      default:
        return resolution;
    }
  };

  const formatEventTime = (event: any) => {
    const date = new Date(event.date || event.start?.dateTime || event.start?.date);
    if (event.time || event.start?.dateTime) {
      return format(date, 'MMM d, yyyy \'at\' h:mm a');
    }
    return format(date, 'MMM d, yyyy');
  };

  if (conflicts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            No Conflicts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
            <p>All events are synchronized without conflicts</p>
            <p className="text-sm">No manual intervention required</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Sync Conflicts ({conflicts.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">
              {unresolvedConflicts.length} unresolved
            </Badge>
            {resolvedConflicts.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {resolvedConflicts.length} resolved
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="individual" className="space-y-4">
          <TabsList>
            <TabsTrigger value="individual">Individual</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Conflict List */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Conflicts</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-1 p-3">
                      {conflicts.map((conflict) => (
                        <div
                          key={conflict.id}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-colors",
                            selectedConflict === conflict.id
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted/50",
                            conflict.resolution && "opacity-60"
                          )}
                          onClick={() => setSelectedConflict(conflict.id)}
                        >
                          <div className="flex items-start gap-2">
                            {getConflictTypeIcon(conflict.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {conflict.googleEvent.summary || conflict.localEvent.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getConflictTypeLabel(conflict.type)}
                              </p>
                              {conflict.resolution && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Check className="h-3 w-3 text-green-500" />
                                  <span className="text-xs text-green-600">
                                    {getResolutionLabel(conflict.resolution)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Conflict Details */}
              {currentConflict && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      {getConflictTypeIcon(currentConflict.type)}
                      <CardTitle className="text-base">
                        {getConflictTypeLabel(currentConflict.type)}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Google Calendar Event */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-blue-500" />
                        <Label className="font-medium">Google Calendar Event</Label>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <div className="space-y-2">
                          <p className="font-medium">{currentConflict.googleEvent.summary}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatEventTime(currentConflict.googleEvent)}</span>
                            </div>
                            {currentConflict.googleEvent.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{currentConflict.googleEvent.location}</span>
                              </div>
                            )}
                          </div>
                          {currentConflict.googleEvent.description && (
                            <div className="flex items-start gap-1 mt-2">
                              <FileText className="h-3 w-3 mt-0.5" />
                              <p className="text-sm text-muted-foreground">
                                {currentConflict.googleEvent.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Local Event */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-green-500" />
                        <Label className="font-medium">Study Teddy Event</Label>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <div className="space-y-2">
                          <p className="font-medium">{currentConflict.localEvent.title}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatEventTime(currentConflict.localEvent)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{currentConflict.localEvent.subject}</span>
                            </div>
                            {currentConflict.localEvent.duration && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{currentConflict.localEvent.duration} min</span>
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {currentConflict.localEvent.type}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {!currentConflict.resolution && (
                      <>
                        <Separator />

                        {/* Resolution Options */}
                        <div className="space-y-3">
                          <Label className="font-medium">Choose Resolution</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              onClick={() => onResolveConflict(currentConflict.id, 'keep_google')}
                              disabled={isResolving}
                              className="justify-start h-auto p-3"
                            >
                              <div className="flex items-center gap-2">
                                <Download className="h-4 w-4" />
                                <div className="text-left">
                                  <div className="font-medium">Keep Google</div>
                                  <div className="text-xs text-muted-foreground">
                                    Use Google Calendar version
                                  </div>
                                </div>
                              </div>
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => onResolveConflict(currentConflict.id, 'keep_local')}
                              disabled={isResolving}
                              className="justify-start h-auto p-3"
                            >
                              <div className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                <div className="text-left">
                                  <div className="font-medium">Keep Local</div>
                                  <div className="text-xs text-muted-foreground">
                                    Use Study Teddy version
                                  </div>
                                </div>
                              </div>
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => onResolveConflict(currentConflict.id, 'merge')}
                              disabled={isResolving}
                              className="justify-start h-auto p-3"
                            >
                              <div className="flex items-center gap-2">
                                <Merge className="h-4 w-4" />
                                <div className="text-left">
                                  <div className="font-medium">Merge</div>
                                  <div className="text-xs text-muted-foreground">
                                    Combine both versions
                                  </div>
                                </div>
                              </div>
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => onResolveConflict(currentConflict.id, 'skip')}
                              disabled={isResolving}
                              className="justify-start h-auto p-3"
                            >
                              <div className="flex items-center gap-2">
                                <SkipForward className="h-4 w-4" />
                                <div className="text-left">
                                  <div className="font-medium">Skip</div>
                                  <div className="text-xs text-muted-foreground">
                                    Don't sync this event
                                  </div>
                                </div>
                              </div>
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    {currentConflict.resolution && (
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="font-medium text-green-700 dark:text-green-300">
                            Resolved: {getResolutionLabel(currentConflict.resolution)}
                          </span>
                        </div>
                        {currentConflict.resolvedAt && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Resolved {format(new Date(currentConflict.resolvedAt), 'MMM d, yyyy \'at\' h:mm a')}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bulk Resolution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Apply the same resolution to all unresolved conflicts:</Label>
                  <RadioGroup
                    value={bulkResolution}
                    onValueChange={(value) => setBulkResolution(value as ConflictResolution)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="keep_google" id="bulk_google" />
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        <Label htmlFor="bulk_google">Always keep Google Calendar version</Label>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="keep_local" id="bulk_local" />
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        <Label htmlFor="bulk_local">Always keep Study Teddy version</Label>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="merge" id="bulk_merge" />
                      <div className="flex items-center gap-2">
                        <Merge className="h-4 w-4" />
                        <Label htmlFor="bulk_merge">Try to merge all conflicts</Label>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="skip" id="bulk_skip" />
                      <div className="flex items-center gap-2">
                        <SkipForward className="h-4 w-4" />
                        <Label htmlFor="bulk_skip">Skip all conflicts</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    This will resolve {unresolvedConflicts.length} unresolved conflicts
                  </p>
                  <Button
                    onClick={() => onResolveAllConflicts(bulkResolution)}
                    disabled={isResolvingAll || unresolvedConflicts.length === 0}
                  >
                    {isResolvingAll ? 'Resolving...' : 'Resolve All'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}