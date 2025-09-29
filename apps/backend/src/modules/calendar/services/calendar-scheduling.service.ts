import { Injectable, Logger } from '@nestjs/common';
import {
  TimeSlot,
  ConflictCheckResult,
  NextFreeSlotOptions,
  CalendarTokens,
} from '../interfaces/calendar.interfaces';
import { GoogleCalendarService } from './google-calendar.service';

@Injectable()
export class CalendarSchedulingService {
  private readonly logger = new Logger(CalendarSchedulingService.name);

  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  /**
   * Find available time slots in a given range
   */
  async findAvailableSlots(
    tokens: CalendarTokens,
    startTime: Date,
    endTime: Date,
    durationMinutes: number,
    options?: {
      breakMinutes?: number;
      startHour?: number;
      endHour?: number;
      daysOfWeek?: number[];
    },
  ): Promise<TimeSlot[]> {
    try {
      const breakMinutes = options?.breakMinutes || 0;
      const startHour = options?.startHour || 0;
      const endHour = options?.endHour || 24;
      const daysOfWeek = options?.daysOfWeek;

      // Get all busy times
      const busyTimes = await this.googleCalendarService.getAllBusyTimes(
        tokens,
        startTime.toISOString(),
        endTime.toISOString(),
      );

      // Convert busy times to Date objects and merge overlapping slots
      const mergedBusySlots = this.mergeBusySlots(busyTimes);

      // Find gaps between busy slots
      const availableSlots: TimeSlot[] = [];
      let currentTime = new Date(startTime);

      for (const busySlot of mergedBusySlots) {
        const busyStart = new Date(busySlot.start);
        const busyEnd = new Date(busySlot.end);

        // Check if there's a gap before this busy slot
        if (currentTime < busyStart) {
          // Calculate available duration
          const availableDuration =
            (busyStart.getTime() - currentTime.getTime()) / (1000 * 60);

          // Check if the gap is large enough
          if (availableDuration >= durationMinutes) {
            // Split into slots of the requested duration
            let slotStart = new Date(currentTime);
            while (
              slotStart.getTime() + durationMinutes * 60 * 1000 <=
              busyStart.getTime()
            ) {
              const slotEnd = new Date(
                slotStart.getTime() + durationMinutes * 60 * 1000,
              );

              // Check time constraints
              if (
                this.isWithinTimeConstraints(
                  slotStart,
                  slotEnd,
                  startHour,
                  endHour,
                  daysOfWeek,
                )
              ) {
                availableSlots.push({
                  start: slotStart,
                  end: slotEnd,
                  durationMinutes,
                });
              }

              // Move to next potential slot (with break time)
              slotStart = new Date(
                slotEnd.getTime() + breakMinutes * 60 * 1000,
              );
            }
          }
        }

        // Move current time to end of busy slot plus break time
        currentTime = new Date(busyEnd.getTime() + breakMinutes * 60 * 1000);
      }

      // Check for availability after the last busy slot
      if (currentTime < endTime) {
        const remainingDuration =
          (endTime.getTime() - currentTime.getTime()) / (1000 * 60);

        if (remainingDuration >= durationMinutes) {
          let slotStart = new Date(currentTime);
          while (
            slotStart.getTime() + durationMinutes * 60 * 1000 <=
            endTime.getTime()
          ) {
            const slotEnd = new Date(
              slotStart.getTime() + durationMinutes * 60 * 1000,
            );

            if (
              this.isWithinTimeConstraints(
                slotStart,
                slotEnd,
                startHour,
                endHour,
                daysOfWeek,
              )
            ) {
              availableSlots.push({
                start: slotStart,
                end: slotEnd,
                durationMinutes,
              });
            }

            slotStart = new Date(slotEnd.getTime() + breakMinutes * 60 * 1000);
          }
        }
      }

      return availableSlots;
    } catch (error) {
      this.logger.error(`Failed to find available slots: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find the next available free slot
   */
  async findNextFreeSlot(
    tokens: CalendarTokens,
    options: NextFreeSlotOptions,
  ): Promise<TimeSlot | null> {
    try {
      const maxSearchDays = options.maxSearchDays || 14;
      const endSearchAt =
        options.endSearchAt ||
        new Date(
          options.startSearchFrom.getTime() +
            maxSearchDays * 24 * 60 * 60 * 1000,
        );

      let currentSearchStart = new Date(options.startSearchFrom);
      const searchIncrement = 24 * 60 * 60 * 1000; // 1 day

      while (currentSearchStart < endSearchAt) {
        const currentSearchEnd = new Date(
          Math.min(
            currentSearchStart.getTime() + searchIncrement,
            endSearchAt.getTime(),
          ),
        );

        const availableSlots = await this.findAvailableSlots(
          tokens,
          currentSearchStart,
          currentSearchEnd,
          options.durationMinutes,
          {
            breakMinutes: options.breakMinutes,
            startHour: options.preferredTimes?.startHour,
            endHour: options.preferredTimes?.endHour,
            daysOfWeek: options.preferredTimes?.daysOfWeek,
          },
        );

        if (availableSlots.length > 0) {
          // Return the first available slot
          return availableSlots[0];
        }

        currentSearchStart = currentSearchEnd;
      }

      return null; // No available slot found
    } catch (error) {
      this.logger.error(`Failed to find next free slot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check for conflicts with existing events
   */
  async checkConflicts(
    tokens: CalendarTokens,
    startTime: Date,
    endTime: Date,
  ): Promise<ConflictCheckResult> {
    try {
      const busyTimes = await this.googleCalendarService.getAllBusyTimes(
        tokens,
        startTime.toISOString(),
        endTime.toISOString(),
      );

      const conflicts: ConflictCheckResult['conflictingEvents'] = [];
      const requestedStart = startTime.getTime();
      const requestedEnd = endTime.getTime();

      for (const busy of busyTimes) {
        const busyStart = new Date(busy.start).getTime();
        const busyEnd = new Date(busy.end).getTime();

        // Check for overlap
        if (
          (requestedStart >= busyStart && requestedStart < busyEnd) ||
          (requestedEnd > busyStart && requestedEnd <= busyEnd) ||
          (requestedStart <= busyStart && requestedEnd >= busyEnd)
        ) {
          // Try to get event details for better conflict information
          const events = await this.googleCalendarService.listEvents(
            tokens,
            busy.start,
            busy.end,
            busy.calendarId,
          );

          const conflictingEvent = events.find((event) => {
            const eventStart = new Date(
              event.start?.dateTime || event.start?.date || '',
            ).getTime();
            const eventEnd = new Date(
              event.end?.dateTime || event.end?.date || '',
            ).getTime();
            return eventStart === busyStart && eventEnd === busyEnd;
          });

          conflicts.push({
            title: conflictingEvent?.summary || 'Busy',
            start: busy.start,
            end: busy.end,
            calendarName: busy.calendarId,
          });
        }
      }

      return {
        hasConflict: conflicts.length > 0,
        conflictingEvents: conflicts,
      };
    } catch (error) {
      this.logger.error(`Failed to check conflicts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Suggest alternative time slots when there's a conflict
   */
  async suggestAlternativeSlots(
    tokens: CalendarTokens,
    preferredStart: Date,
    durationMinutes: number,
    options?: {
      maxSuggestions?: number;
      searchDays?: number;
      preferredTimes?: {
        startHour?: number;
        endHour?: number;
        daysOfWeek?: number[];
      };
    },
  ): Promise<TimeSlot[]> {
    try {
      const maxSuggestions = options?.maxSuggestions || 3;
      const searchDays = options?.searchDays || 7;

      const searchEnd = new Date(
        preferredStart.getTime() + searchDays * 24 * 60 * 60 * 1000,
      );

      const availableSlots = await this.findAvailableSlots(
        tokens,
        preferredStart,
        searchEnd,
        durationMinutes,
        {
          startHour: options?.preferredTimes?.startHour,
          endHour: options?.preferredTimes?.endHour,
          daysOfWeek: options?.preferredTimes?.daysOfWeek,
        },
      );

      // Sort by proximity to preferred time
      availableSlots.sort((a, b) => {
        const aDiff = Math.abs(a.start.getTime() - preferredStart.getTime());
        const bDiff = Math.abs(b.start.getTime() - preferredStart.getTime());
        return aDiff - bDiff;
      });

      // Return top suggestions
      return availableSlots.slice(0, maxSuggestions);
    } catch (error) {
      this.logger.error(
        `Failed to suggest alternative slots: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Calculate optimal study session times based on task deadlines and availability
   */
  async calculateOptimalStudyTimes(
    tokens: CalendarTokens,
    taskDeadline: Date,
    totalStudyMinutes: number,
    options?: {
      sessionDurationMinutes?: number;
      preferredTimes?: {
        startHour?: number;
        endHour?: number;
        daysOfWeek?: number[];
      };
      breakMinutes?: number;
    },
  ): Promise<TimeSlot[]> {
    try {
      const sessionDuration = options?.sessionDurationMinutes || 90; // Default 90-minute sessions
      const numberOfSessions = Math.ceil(totalStudyMinutes / sessionDuration);

      const now = new Date();
      const daysUntilDeadline = Math.ceil(
        (taskDeadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );

      // Distribute sessions evenly across available days
      const sessionsPerDay = Math.ceil(
        numberOfSessions / Math.max(daysUntilDeadline, 1),
      );

      const studySessions: TimeSlot[] = [];
      const currentDate = new Date(now);
      let sessionsScheduled = 0;

      while (
        sessionsScheduled < numberOfSessions &&
        currentDate < taskDeadline
      ) {
        const dayStart = new Date(currentDate);
        dayStart.setHours(options?.preferredTimes?.startHour || 9, 0, 0, 0);

        const dayEnd = new Date(currentDate);
        dayEnd.setHours(options?.preferredTimes?.endHour || 21, 0, 0, 0);

        const daySlots = await this.findAvailableSlots(
          tokens,
          dayStart,
          dayEnd,
          sessionDuration,
          {
            breakMinutes: options?.breakMinutes || 15,
            startHour: options?.preferredTimes?.startHour,
            endHour: options?.preferredTimes?.endHour,
            daysOfWeek: options?.preferredTimes?.daysOfWeek,
          },
        );

        // Add up to sessionsPerDay from this day
        const slotsToAdd = Math.min(
          sessionsPerDay,
          daySlots.length,
          numberOfSessions - sessionsScheduled,
        );
        studySessions.push(...daySlots.slice(0, slotsToAdd));
        sessionsScheduled += slotsToAdd;

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return studySessions;
    } catch (error) {
      this.logger.error(
        `Failed to calculate optimal study times: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Merge overlapping busy slots
   */
  private mergeBusySlots(
    busySlots: Array<{ start: string; end: string }>,
  ): Array<{ start: string; end: string }> {
    if (busySlots.length === 0) return [];

    // Sort by start time
    const sorted = [...busySlots].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );

    const merged: Array<{ start: string; end: string }> = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const lastMerged = merged[merged.length - 1];

      if (new Date(current.start) <= new Date(lastMerged.end)) {
        // Overlapping or adjacent, merge them
        lastMerged.end =
          new Date(current.end) > new Date(lastMerged.end)
            ? current.end
            : lastMerged.end;
      } else {
        // No overlap, add as new slot
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Check if a time slot meets the specified constraints
   */
  private isWithinTimeConstraints(
    start: Date,
    end: Date,
    startHour?: number,
    endHour?: number,
    daysOfWeek?: number[],
  ): boolean {
    // Check day of week constraint
    if (daysOfWeek && daysOfWeek.length > 0) {
      if (!daysOfWeek.includes(start.getDay())) {
        return false;
      }
    }

    // Check time of day constraints
    if (startHour !== undefined) {
      if (start.getHours() < startHour) {
        return false;
      }
    }

    if (endHour !== undefined) {
      if (
        end.getHours() > endHour ||
        (end.getHours() === endHour && end.getMinutes() > 0)
      ) {
        return false;
      }
    }

    return true;
  }
}
