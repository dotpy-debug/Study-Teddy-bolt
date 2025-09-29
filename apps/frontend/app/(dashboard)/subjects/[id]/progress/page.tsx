import { Metadata } from "next";
import { SubjectProgress } from "@/features/subjects/components/subject-progress";

interface SubjectProgressPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Study Progress | Study Teddy",
  description: "Track your progress in this subject",
};

export default async function SubjectProgressPage({ params }: SubjectProgressPageProps) {
  const { id } = await params;

  return <SubjectProgress subjectId={id} />;
}