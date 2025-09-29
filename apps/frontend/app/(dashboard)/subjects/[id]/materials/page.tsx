import { Metadata } from "next";
import { SubjectMaterials } from "@/features/subjects/components/subject-materials";

interface SubjectMaterialsPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Study Materials | Study Teddy",
  description: "Manage study materials for this subject",
};

export default async function SubjectMaterialsPage({ params }: SubjectMaterialsPageProps) {
  const { id } = await params;

  return <SubjectMaterials subjectId={id} />;
}