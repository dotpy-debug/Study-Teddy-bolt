"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Settings,
  Plus,
  Trash2,
  MapPin,
  Clock,
  Tag,
  BookOpen,
  FileText,
  Users,
  Edit2,
  Save,
  X
} from "lucide-react";
import { EventMapping } from "../types/google-calendar";
import { cn } from "@/lib/utils";

interface EventMapperProps {
  mapping: EventMapping;
  onMappingChange: (mapping: Partial<EventMapping>) => void;
  onSave: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  className?: string;
}

interface MappingRule {
  id: string;
  googlePattern: string;
  studyEventType: 'study' | 'deadline' | 'exam' | 'break' | 'other';
  subject?: string;
  location?: string;
}

export function EventMapper({
  mapping,
  onMappingChange,
  onSave,
  isSaving = false,
  hasUnsavedChanges = false,
  className
}: EventMapperProps) {
  const [activeTab, setActiveTab] = useState("types");
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [newRule, setNewRule] = useState<Partial<MappingRule>>({
    googlePattern: '',
    studyEventType: 'study'
  });

  // Convert subject and location mappings to rules format for easier management
  const [typeRules, setTypeRules] = useState<MappingRule[]>([
    { id: '1', googlePattern: 'Study', studyEventType: 'study' },
    { id: '2', googlePattern: 'Assignment', studyEventType: 'deadline' },
    { id: '3', googlePattern: 'Exam', studyEventType: 'exam' },
    { id: '4', googlePattern: 'Break', studyEventType: 'break' },
  ]);

  const studyEventTypes = [
    { value: 'study', label: 'Study Session', color: 'bg-blue-500' },
    { value: 'deadline', label: 'Assignment/Deadline', color: 'bg-red-500' },
    { value: 'exam', label: 'Exam/Test', color: 'bg-purple-500' },
    { value: 'break', label: 'Break/Rest', color: 'bg-green-500' },
    { value: 'other', label: 'Other', color: 'bg-gray-500' }
  ] as const;

  const handleAddRule = () => {
    if (newRule.googlePattern && newRule.studyEventType) {
      const rule: MappingRule = {
        id: Date.now().toString(),
        googlePattern: newRule.googlePattern,
        studyEventType: newRule.studyEventType,
        subject: newRule.subject,
        location: newRule.location
      };
      setTypeRules([...typeRules, rule]);
      setNewRule({ googlePattern: '', studyEventType: 'study' });
      setIsAddingRule(false);
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    setTypeRules(typeRules.filter(rule => rule.id !== ruleId));
  };

  const handleEditRule = (ruleId: string, updates: Partial<MappingRule>) => {
    setTypeRules(typeRules.map(rule =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ));
    setEditingRule(null);
  };

  const getEventTypeColor = (type: string) => {
    return studyEventTypes.find(t => t.value === type)?.color || 'bg-gray-500';
  };

  const getEventTypeLabel = (type: string) => {
    return studyEventTypes.find(t => t.value === type)?.label || type;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Event Mapping Configuration
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="text-xs">
                Unsaved changes
              </Badge>
            )}
            <Button
              onClick={onSave}
              disabled={isSaving || !hasUnsavedChanges}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Mapping'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="types">Event Types</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <TabsContent value="types" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Event Type Mapping Rules</h3>
                <p className="text-sm text-muted-foreground">
                  Map Google Calendar event patterns to Study Teddy event types
                </p>
              </div>
              <Dialog open={isAddingRule} onOpenChange={setIsAddingRule}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Event Type Mapping Rule</DialogTitle>
                    <DialogDescription>
                      Create a rule to automatically map Google Calendar events to Study Teddy event types
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pattern">Google Calendar Pattern</Label>
                      <Input
                        id="pattern"
                        placeholder="e.g., Study, Assignment, Exam"
                        value={newRule.googlePattern}
                        onChange={(e) => setNewRule({ ...newRule, googlePattern: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Events containing this text will be mapped to the selected type
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Study Event Type</Label>
                      <Select
                        value={newRule.studyEventType}
                        onValueChange={(value) => setNewRule({ ...newRule, studyEventType: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {studyEventTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <div className={cn("w-3 h-3 rounded-full", type.color)} />
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddingRule(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddRule}>Add Rule</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg p-4">
              <div className="space-y-2">
                {typeRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-3 h-3 rounded-full", getEventTypeColor(rule.studyEventType))} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">"{rule.googlePattern}"</span>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="outline" className="text-xs">
                            {getEventTypeLabel(rule.studyEventType)}
                          </Badge>
                        </div>
                        {(rule.subject || rule.location) && (
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {rule.subject && (
                              <div className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                <span>{rule.subject}</span>
                              </div>
                            )}
                            {rule.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{rule.location}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRule(rule.id)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {typeRules.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No event type mapping rules</p>
                    <p className="text-sm">Add rules to automatically categorize events</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-4 mt-6">
            <div>
              <h3 className="font-medium mb-2">Subject Mapping</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Map Google Calendar locations or patterns to Study Teddy subjects
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Default Subject</Label>
                <Select
                  value={mapping.defaultSubject || ''}
                  onValueChange={(value) => onMappingChange({ defaultSubject: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Physics">Physics</SelectItem>
                    <SelectItem value="Chemistry">Chemistry</SelectItem>
                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="History">History</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used when no specific subject mapping is found
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Subject Mapping Rules</Label>
                <div className="border rounded-lg p-4 space-y-3">
                  {Object.entries(mapping.subjectMapping || {}).map(([pattern, subject], index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Google Calendar pattern"
                        value={pattern}
                        className="flex-1"
                        readOnly
                      />
                      <span className="text-muted-foreground">→</span>
                      <Input
                        placeholder="Study Teddy subject"
                        value={subject}
                        className="flex-1"
                        readOnly
                      />
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subject Mapping
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="locations" className="space-y-4 mt-6">
            <div>
              <h3 className="font-medium mb-2">Location Mapping</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Map Google Calendar locations to Study Teddy locations
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Include Location Information</Label>
                  <p className="text-sm text-muted-foreground">
                    Copy location data from Google Calendar events
                  </p>
                </div>
                <Switch
                  checked={mapping.includeLocation}
                  onCheckedChange={(includeLocation) => onMappingChange({ includeLocation })}
                />
              </div>

              {mapping.includeLocation && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Location Mapping Rules</Label>
                    <div className="border rounded-lg p-4 space-y-3">
                      {Object.entries(mapping.locationMapping || {}).map(([googleLocation, localLocation], index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            placeholder="Google Calendar location"
                            value={googleLocation}
                            className="flex-1"
                            readOnly
                          />
                          <span className="text-muted-foreground">→</span>
                          <Input
                            placeholder="Study Teddy location"
                            value={localLocation}
                            className="flex-1"
                            readOnly
                          />
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Location Mapping
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="general" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Include Event Description</Label>
                  <p className="text-sm text-muted-foreground">
                    Copy description/notes from Google Calendar events
                  </p>
                </div>
                <Switch
                  checked={mapping.includeDescription}
                  onCheckedChange={(includeDescription) => onMappingChange({ includeDescription })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Include Attendees Information</Label>
                  <p className="text-sm text-muted-foreground">
                    Copy attendee list from Google Calendar events
                  </p>
                </div>
                <Switch
                  checked={mapping.includeAttendees}
                  onCheckedChange={(includeAttendees) => onMappingChange({ includeAttendees })}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="defaultDuration">Default Event Duration (minutes)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="defaultDuration"
                    type="number"
                    min="15"
                    max="480"
                    step="15"
                    value={mapping.defaultDuration}
                    onChange={(e) => onMappingChange({ defaultDuration: parseInt(e.target.value) || 60 })}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    minutes (used for all-day events)
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Google Event Types to Sync</Label>
                <div className="border rounded-lg p-4 space-y-2">
                  {mapping.googleEventTypes.map((type, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{type}</span>
                      <Button variant="ghost" size="sm">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event Type Filter
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty to sync all event types
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}