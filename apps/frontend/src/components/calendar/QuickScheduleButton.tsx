'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import calendarService, {
  ScheduleSessionDto,
  AvailableTimeSlot,
} from '../services/calendar.service';
import { toast } from 'sonner';
import { format, addHours, addDays } from 'date-fns';

interface QuickScheduleButtonProps {
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  estimatedMinutes?: number;
  dueDate?: string;
}

export function QuickScheduleButton({
  taskId,
  taskTitle,
  taskDescription,
  estimatedMinutes = 90,
  dueDate,
}: QuickScheduleButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableTimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableTimeSlot | null>(null);
  const [customTime, setCustomTime] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<ScheduleSessionDto>({
    taskId,
    startTime: '',
    endTime: '',
    title: taskTitle,
    description: taskDescription,
    sendReminders: true,
    reminderMinutes: 15,
  });

  const handleOpenDialog = async () => {
    setOpen(true);
    await findAvailableSlots();
  };

  const findAvailableSlots = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const searchEnd = dueDate ? new Date(dueDate) : addDays(now, 7);

      const response = await calendarService.checkAvailability({
        startTime: now.toISOString(),
        endTime: searchEnd.toISOString(),
        durationMinutes: estimatedMinutes,
        breakMinutes: 15,
      });

      if (response.data) {
        // Get up to 5 available slots
        const slots = response.data.availableSlots.slice(0, 5);
        setAvailableSlots(slots);

        // Pre-select the first slot
        if (slots.length > 0) {
          setSelectedSlot(slots[0]);
          setScheduleForm({
            ...scheduleForm,
            startTime: slots[0].start,
            endTime: slots[0].end,
          });
        }
      }
    } catch (error) {
      console.error('Failed to find available slots:', error);
      toast.error('Failed to find available time slots');
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    try {
      setLoading(true);

      const sessionData: ScheduleSessionDto = customTime
        ? scheduleForm
        : {
            ...scheduleForm,
            startTime: selectedSlot!.start,
            endTime: selectedSlot!.end,
          };

      const response = await calendarService.scheduleSession(sessionData);

      if (response.data) {
        toast.success('Study session scheduled successfully!', {
          description: `Scheduled for ${format(new Date(sessionData.startTime), 'MMM d, h:mm a')}`,
        });
        setOpen(false);
      }
    } catch (error: any) {
      console.error('Failed to schedule session:', error);

      if (error.response?.data?.conflicts) {
        toast.error('Scheduling conflict detected', {
          description: 'Please choose a different time slot',
        });
      } else {
        toast.error('Failed to schedule session');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTimeSlot = (slot: AvailableTimeSlot) => {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    const today = new Date();

    const isToday = start.toDateString() === today.toDateString();
    const isTomorrow = start.toDateString() === addDays(today, 1).toDateString();

    let dayLabel = format(start, 'EEE, MMM d');
    if (isToday) dayLabel = 'Today';
    if (isTomorrow) dayLabel = 'Tomorrow';

    return {
      day: dayLabel,
      time: `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`,
      duration: `${slot.durationMinutes} minutes`,
    };
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenDialog}
        className="gap-2"
      >
        <Calendar className="h-4 w-4" />
        Quick Schedule
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule Study Session</DialogTitle>
            <DialogDescription>
              Schedule "{taskTitle}" in your calendar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loading && availableSlots.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {availableSlots.length > 0 && !customTime ? (
                  <div className="space-y-3">
                    <Label>Select a time slot</Label>
                    <div className="space-y-2">
                      {availableSlots.map((slot, index) => {
                        const formatted = formatTimeSlot(slot);
                        const isSelected = selectedSlot === slot;

                        return (
                          <div
                            key={index}
                            onClick={() => {
                              setSelectedSlot(slot);
                              setScheduleForm({
                                ...scheduleForm,
                                startTime: slot.start,
                                endTime: slot.end,
                              });
                            }}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{formatted.day}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatted.time}
                                </p>
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      variant="link"
                      onClick={() => setCustomTime(true)}
                      className="px-0"
                    >
                      Choose custom time instead
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableSlots.length > 0 && (
                      <Button
                        variant="link"
                        onClick={() => setCustomTime(false)}
                        className="px-0"
                      >
                        ← Back to suggested times
                      </Button>
                    )}

                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="start">Start Time</Label>
                          <Input
                            id="start"
                            type="datetime-local"
                            value={scheduleForm.startTime.slice(0, 16)}
                            onChange={(e) => {
                              const start = new Date(e.target.value);
                              const end = addHours(start, estimatedMinutes / 60);
                              setScheduleForm({
                                ...scheduleForm,
                                startTime: start.toISOString(),
                                endTime: end.toISOString(),
                              });
                            }}
                            min={new Date().toISOString().slice(0, 16)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="end">End Time</Label>
                          <Input
                            id="end"
                            type="datetime-local"
                            value={scheduleForm.endTime.slice(0, 16)}
                            onChange={(e) =>
                              setScheduleForm({
                                ...scheduleForm,
                                endTime: new Date(e.target.value).toISOString(),
                              })
                            }
                            min={scheduleForm.startTime.slice(0, 16)}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="location">Location (optional)</Label>
                        <Input
                          id="location"
                          placeholder="e.g., Library, Home"
                          value={scheduleForm.location || ''}
                          onChange={(e) =>
                            setScheduleForm({
                              ...scheduleForm,
                              location: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {availableSlots.length === 0 && !customTime && !loading && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No available time slots found in the next week. You can choose a custom
                      time or try adjusting your availability.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={loading || (!selectedSlot && !customTime)}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}