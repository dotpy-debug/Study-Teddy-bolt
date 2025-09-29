export type ResourceType = 'book' | 'article' | 'video' | 'website' | 'document' | 'tool' | 'other';

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  url?: string;
  description?: string;
  tags: string[];
  category?: string;
  isRequired: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceLink {
  title: string;
  url: string;
  description?: string;
}

export interface SubjectResources {
  resources?: Resource[];
  links?: ResourceLink[];
  notes?: string;
}

export interface CreateResourceData {
  type: ResourceType;
  title: string;
  url?: string;
  description?: string;
  tags: string[];
  category?: string;
  isRequired: boolean;
}

export interface UpdateResourceData extends Partial<CreateResourceData> {
  order?: number;
}

export interface ResourceQueryParams {
  type?: ResourceType;
  category?: string;
  tags?: string[];
  search?: string;
  isRequired?: boolean;
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  resources?: SubjectResources;
  isArchived: boolean;
  totalStudyMinutes: number;
  lastStudiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectData {
  name: string;
  color: string;
  icon?: string;
  description?: string;
  resources?: SubjectResources;
}

export interface UpdateSubjectData extends Partial<CreateSubjectData> {
  isArchived?: boolean;
}

export interface SubjectQueryParams {
  page?: number;
  limit?: number;
  sort?: 'name' | 'createdAt' | 'updatedAt' | 'totalStudyMinutes' | 'lastStudiedAt';
  order?: 'asc' | 'desc';
  search?: string;
  includeArchived?: boolean;
}

export interface SubjectPerformanceMetrics {
  totalFocusedMinutes: number;
  completionRate: number;
  completedTasks: number;
  pendingTasks: number;
  sessionsCount: number;
  averageSessionDuration: number;
  lastStudiedAt: string | null;
  currentStreak: number;
}

export interface SubjectAnalytics {
  metrics: SubjectPerformanceMetrics;
  dailyFocusTime: Array<{ date: string; minutes: number }>;
  weeklyCompletion: Array<{ week: string; completed: number; total: number }>;
  weeklyComparison: {
    thisWeek: number;
    lastWeek: number;
    change: number;
  };
}

export interface SubjectAnalyticsQuery {
  startDate?: string;
  endDate?: string;
  window?: 'week' | 'month' | 'quarter' | 'year';
}

export interface SubjectDistribution {
  subjectName: string;
  color: string;
  minutes: number;
  percentage: number;
}

export interface SubjectListResponse {
  items: Subject[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Component Props
export interface SubjectFormProps {
  subject?: Subject;
  onSubmit: (data: CreateSubjectData | UpdateSubjectData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface SubjectCardProps {
  subject: Subject;
  onEdit: (subject: Subject) => void;
  onDelete: (subject: Subject) => void;
  onView: (subject: Subject) => void;
}

export interface SubjectSelectorProps {
  subjects: Subject[];
  selectedSubjectId?: string;
  onSelect: (subjectId: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}