import { Metadata } from "next";
import { StudyCalendar } from "@/features/calendar/components/study-calendar";
import { GoogleCalendarIntegration } from "@/features/calendar/components/google-calendar-integration";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Calendar | Study Teddy",
  description: "View and manage your study schedule with Google Calendar integration",
};

export default function CalendarPage() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Study Calendar"
        description="View your study schedule, upcoming deadlines, and sync with Google Calendar"
      />

      {/* Google Calendar Integration */}
      <GoogleCalendarIntegration />

      {/* Main Calendar View */}
      <StudyCalendar />
    </div>
  );
}