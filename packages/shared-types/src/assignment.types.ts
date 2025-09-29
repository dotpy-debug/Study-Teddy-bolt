export interface Assignment {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  estimatedTime: number;
  actualTime?: number;
  attachments: Attachment[];
  createdAt: Date;
  updatedAt: Date;
}

export enum AssignmentPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum AssignmentStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  OVERDUE = 'overdue'
}

export interface Attachment {
  id: string;
  assignmentId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  targetGrade?: string;
  weeklyHours?: number;
  createdAt: Date;
  updatedAt: Date;
}