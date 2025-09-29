import { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubjectDetail } from "@/features/subjects/components/subject-detail";
import { SubjectTabs } from "@/features/subjects/components/subject-tabs";

interface SubjectDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata(
  { params }: SubjectDetailPageProps
): Promise<Metadata> {
  const { id } = await params;

  // In a real app, you would fetch the subject data here
  // const subject = await getSubject(id);

  return {
    title: `Subject Details | Study Teddy`,
    description: "View detailed subject information and manage tasks",
  };
}

export default async function SubjectDetailPage({
  params,
  searchParams
}: SubjectDetailPageProps) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;

  // Validate the ID parameter
  if (!id || isNaN(Number(id))) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <SubjectDetail subjectId={id} />
      <SubjectTabs subjectId={id}  />
    </div>
  );
}