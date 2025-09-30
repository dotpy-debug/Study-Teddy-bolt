'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  MoreVertical,
  Plus,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isWithinInterval } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import calendarService, { CalendarEvent, ScheduleSessionDto } from '../services/calendar.service';
import tasksService, { Task } from '../services/tasks.service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TimeSlot {
  hour: number;
  events: CalendarEvent[];
}

interface DayColumn {
  date: Date;
  timeSlots: TimeSlot[];
}

export function WeeklyPlanner() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [weekDays, setWeekDays] = useState<DayColumn[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleSessionDto>({
    taskId: '',
    startTime: '',
    endTime: '',
    title: '',
    description: '',
    location: '',
    sendReminders: true,
    reminderMinutes: 15,
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    initializeWeek();
    fetchTasks();
  }, [currentWeek]);

  useEffect(() => {
    if (weekDays.length > 0) {
      fetchEvents();
    }
  }, [weekDays]);

  const initializeWeek = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 0 });
    const days: DayColumn[] = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(start, i);
      days.push({
        date,
        timeSlots: hours.map(hour => ({
          hour,
          events: [],
        })),
      });
    }

    setWeekDays(days);
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const start = weekDays[0].date.toISOString();
      const end = addDays(weekDays[6].date, 1).toISOString();

      const response = await calendarService.getEvents(start, end);
      if (response.data) {
        setEvents(response.data);
        distributeEvents(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await tasksService.getTasks({ status: 'pending' });
      if (response.data) {
        setTasks(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const distributeEvents = (eventsList: CalendarEvent[]) => {
    const updatedDays = [...weekDays];

    eventsList.forEach(event => {
      const eventStart = new Date(event.startTime);
      const eventHour = eventStart.getHours();

      updatedDays.forEach(day => {
        if (isSameDay(day.date, eventStart)) {
          const slot = day.timeSlots.find(s => s.hour === eventHour);
          if (slot) {
            slot.events.push(event);
          }
        }
      });
    });

    setWeekDays(updatedDays);
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Parse the destination to get date and hour
    const [dayIndex, hour] = destination.droppableId.split('-').slice(1).map(Number);
    const targetDate = weekDays[dayIndex].date;

    // Check if dragging a task
    if (draggableId.startsWith('task-')) {
      const taskId = draggableId.replace('task-', '');
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      // Set up schedule form for the task
      const startTime = new Date(targetDate);
      startTime.setHours(hour, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(hour + 1, 30, 0, 0);

      setSelectedTask(task);
      setScheduleForm({
        taskId: task.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        title: task.title,
        description: task.description || '',
        location: '',
        sendReminders: true,
        reminderMinutes: 15,
      });
      setShowScheduleDialog(true);
    }
  };

  const handleScheduleSubmit = async () => {
    try {
      setLoading(true);

      // Check availability first
      const availabilityResponse = await calendarService.checkAvailability({
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        durationMinutes: Math.ceil(
          (new Date(scheduleForm.endTime).getTime() - new Date(scheduleForm.startTime).getTime()) / 60000
        ),
      });

      if (availabilityResponse.data?.busySlots && availabilityResponse.data.busySlots.length > 0) {
        // Show conflict warning
        const conflicts = availabilityResponse.data.busySlots
          .map(slot => `${format(new Date(slot.start), 'h:mm a')} - ${format(new Date(slot.end), 'h:mm a')}`)
          .join(', ');

        const proceed = window.confirm(
          `Time conflict detected: ${conflicts}\n\nDo you want to schedule anyway?`
        );

        if (!proceed) {
          setLoading(false);
          return;
        }
      }

      // Schedule the session
      const response = await calendarService.scheduleSession(scheduleForm);
      if (response.data) {
        toast.success('Study session scheduled successfully!');
        setShowScheduleDialog(false);
        fetchEvents(); // Refresh events
      }
    } catch (error: any) {
      console.error('Failed to schedule session:', error);
      toast.error(error.response?.data?.message || 'Failed to schedule session');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      setLoading(true);
      await calendarService.deleteScheduledSession({ eventId, sendCancellation: false });
      toast.success('Event deleted successfully');
      fetchEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast.error('Failed to delete event');
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour} ${period}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Weekly Planner</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2">
                {format(weekDays[0]?.date || currentWeek, 'MMM d')} -{' '}
                {format(weekDays[6]?.date || addDays(currentWeek, 6), 'MMM d, yyyy')}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex">
              {/* Time column */}
              <div className="w-20 flex-shrink-0 border-r">
                <div className="h-12 border-b" />
                {hours.map(hour => (
                  <div
                    key={hour}
                    className="h-16 border-b text-xs text-muted-foreground px-2 py-1"
                  >
                    {formatHour(hour)}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              <div className="flex-1 flex overflow-x-auto">
                {weekDays.map((day, dayIndex) => (
                  <div key={dayIndex} className="flex-1 min-w-[120px] border-r">
                    {/* Day header */}
                    <div className="h-12 border-b p-2 text-center">
                      <div className="text-xs text-muted-foreground">
                        {format(day.date, 'EEE')}
                      </div>
                      <div
                        className={cn(
                          'text-sm font-medium',
                          isSameDay(day.date, new Date()) && 'text-primary'
                        )}
                      >
                        {format(day.date, 'd')}
                      </div>
                    </div>

                    {/* Time slots */}
                    {day.timeSlots.map((slot, slotIndex) => (
                      <Droppable
                        key={`${dayIndex}-${slot.hour}`}
                        droppableId={`day-${dayIndex}-${slot.hour}`}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              'h-16 border-b p-1',
                              snapshot.isDraggingOver && 'bg-primary/5'
                            )}
                          >
                            {slot.events.map((event, eventIndex) => (
                              <Draggable
                                key={event.id}
                                draggableId={`event-${event.id}`}
                                index={eventIndex}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={cn(
                                      'p-1 rounded text-xs bg-primary/10 border border-primary/20 cursor-pointer',
                                      snapshot.isDragging && 'opacity-50'
                                    )}
                                    onClick={() => setSelectedEvent(event)}
                                  >
                                    <div className="font-medium truncate">
                                      {event.title}
                                    </div>
                                    <div className="text-muted-foreground">
                                      {format(new Date(event.startTime), 'h:mm a')}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks sidebar */}
            <div className="border-t p-4">
              <h3 className="font-medium mb-3">Unscheduled Tasks</h3>
              <Droppable droppableId="tasks">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex flex-wrap gap-2"
                  >
                    {tasks.map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={`task-${task.id}`}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              'px-3 py-1.5 bg-secondary rounded-md text-sm cursor-move',
                              snapshot.isDragging && 'opacity-50'
                            )}
                          >
                            {task.title}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </DragDropContext>
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Study Session</DialogTitle>
            <DialogDescription>
              Set the details for this study session
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={scheduleForm.title}
                onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={scheduleForm.description}
                onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={scheduleForm.location}
                onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
                placeholder="e.g., Library, Home"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">Start Time</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={scheduleForm.startTime.slice(0, 16)}
                  onChange={(e) => setScheduleForm({
                    ...scheduleForm,
                    startTime: new Date(e.target.value).toISOString()
                  })}
                />
              </div>
              <div>
                <Label htmlFor="end">End Time</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={scheduleForm.endTime.slice(0, 16)}
                  onChange={(e) => setScheduleForm({
                    ...scheduleForm,
                    endTime: new Date(e.target.value).toISOString()
                  })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Scheduling...
                </>
              ) : (
                'Schedule'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedEvent?.description && (
              <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {selectedEvent && format(new Date(selectedEvent.startTime), 'MMM d, h:mm a')} -{' '}
                {selectedEvent && format(new Date(selectedEvent.endTime), 'h:mm a')}
              </span>
            </div>
            {selectedEvent?.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{selectedEvent.location}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => selectedEvent && handleDeleteEvent(selectedEvent.id)}
              disabled={loading}
            >
              Delete Event
            </Button>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}