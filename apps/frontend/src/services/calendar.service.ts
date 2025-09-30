// Calendar Service Stub
export interface CalendarAccount {
  id: string;
  email: string;
  provider: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
}

export interface ScheduleSessionDto {
  taskId: string;
  duration: number;
  preferredTime?: string;
}

class CalendarService {
  async getAuthUrl(): Promise<{ authUrl: string }> {
    throw new Error('Calendar service not implemented');
  }

  async getAccounts(): Promise<CalendarAccount[]> {
    return [];
  }

  async getEvents(): Promise<CalendarEvent[]> {
    return [];
  }

  async scheduleSession(dto: ScheduleSessionDto): Promise<CalendarEvent> {
    throw new Error('Calendar service not implemented');
  }
}

const calendarService = new CalendarService();
export default calendarService;
export { CalendarAccount, CalendarEvent, ScheduleSessionDto };