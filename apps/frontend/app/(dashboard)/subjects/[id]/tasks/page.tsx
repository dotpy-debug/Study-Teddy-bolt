import { Metadata } from "next";
import { SubjectTasks } from "@/features/subjects/components/subject-tasks";

interface SubjectTasksPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Subject Tasks | Study Teddy",
  description: "Manage tasks for this subject",
};

export default async function SubjectTasksPage({ params }: SubjectTasksPageProps) {
  const { id } = await params;

  return <SubjectTasks subjectId={id} />;
}