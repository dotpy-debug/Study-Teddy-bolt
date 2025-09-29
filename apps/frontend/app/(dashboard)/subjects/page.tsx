import { Metadata } from "next";
import { SubjectsOverview } from "@/features/subjects/components/subjects-overview";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Subjects | Study Teddy",
  description: "Manage your study subjects and track progress",
};

export default function SubjectsPage() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Subjects"
        description="Manage your study subjects and track your progress"
      />
      <SubjectsOverview />
    </div>
  );
}