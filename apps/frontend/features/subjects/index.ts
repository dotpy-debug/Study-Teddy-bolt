// Components
export { SubjectsOverview } from "./components/subjects-overview";
export { SubjectDetail } from "./components/subject-detail";
export { SubjectTabs } from "./components/subject-tabs";
export { SubjectTasks } from "./components/subject-tasks";
export { SubjectMaterials } from "./components/subject-materials";
export { SubjectProgress } from "./components/subject-progress";
export { SubjectForm } from "./components/subject-form";
export { SubjectSelector, SimpleSubjectSelector } from "./components/subject-selector";

// Types
export type {
  Subject,
  CreateSubjectData,
  UpdateSubjectData,
  SubjectQueryParams,
  SubjectPerformanceMetrics,
  SubjectAnalytics,
  SubjectAnalyticsQuery,
  SubjectDistribution,
  SubjectListResponse,
  SubjectFormProps,
  SubjectCardProps,
  SubjectSelectorProps,
  ResourceLink,
  SubjectResources,
} from "./types";

// Hooks
export {
  useSubjects,
  useSubject,
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
  useSubjectAnalytics,
  useSubjectDistribution,
  useSubjectOperations,
} from "./hooks/useSubjects";