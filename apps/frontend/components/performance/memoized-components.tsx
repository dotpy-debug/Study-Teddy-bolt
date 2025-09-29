'use client'

import React, { memo, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { cn } from '@/lib/utils'

// Memoized task card component
interface TaskCardProps {
  task: {
    id: string
    title: string
    description?: string
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    dueDate?: string
    subject?: {
      id: string
      name: string
      color: string
    }
  }
  onStatusChange?: (taskId: string, status: string) => void
  onEdit?: (taskId: string) => void
  onDelete?: (taskId: string) => void
  className?: string
}

export const TaskCard = memo<TaskCardProps>(({
  task,
  onStatusChange,
  onEdit,
  onDelete,
  className
}) => {
  const handleStatusChange = useCallback(() => {
    const nextStatus = task.status === 'pending' ? 'in_progress' :
                     task.status === 'in_progress' ? 'completed' : 'pending'
    onStatusChange?.(task.id, nextStatus)
  }, [task.id, task.status, onStatusChange])

  const handleEdit = useCallback(() => {
    onEdit?.(task.id)
  }, [task.id, onEdit])

  const handleDelete = useCallback(() => {
    onDelete?.(task.id)
  }, [task.id, onDelete])

  const priorityColor = useMemo(() => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    }
    return colors[task.priority] || colors.medium
  }, [task.priority])

  const statusColor = useMemo(() => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[task.status] || colors.pending
  }, [task.status])

  return (
    <Card className={cn('transition-shadow hover:shadow-md', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base line-clamp-2">{task.title}</CardTitle>
          <div className="flex gap-1">
            <Badge variant="secondary" className={priorityColor}>
              {task.priority}
            </Badge>
            <Badge variant="outline" className={statusColor}>
              {task.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {task.description}
          </p>
        )}

        {task.subject && (
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: task.subject.color }}
            />
            <span className="text-sm font-medium">{task.subject.name}</span>
          </div>
        )}

        {task.dueDate && (
          <p className="text-xs text-muted-foreground mb-3">
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </p>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleStatusChange}>
            Mark {task.status === 'completed' ? 'Incomplete' : 'Complete'}
          </Button>
          {onEdit && (
            <Button size="sm" variant="ghost" onClick={handleEdit}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="ghost" onClick={handleDelete}>
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.status === nextProps.task.status &&
    prevProps.task.priority === nextProps.task.priority &&
    prevProps.task.dueDate === nextProps.task.dueDate &&
    prevProps.className === nextProps.className
  )
})

TaskCard.displayName = 'TaskCard'

// Memoized subject card component
interface SubjectCardProps {
  subject: {
    id: string
    name: string
    color: string
    description?: string
    totalStudyMinutes: number
    taskCount: number
    lastStudiedAt?: string
  }
  onClick?: (subjectId: string) => void
  className?: string
}

export const SubjectCard = memo<SubjectCardProps>(({
  subject,
  onClick,
  className
}) => {
  const handleClick = useCallback(() => {
    onClick?.(subject.id)
  }, [subject.id, onClick])

  const studyHours = useMemo(() => {
    return Math.floor(subject.totalStudyMinutes / 60)
  }, [subject.totalStudyMinutes])

  const lastStudiedText = useMemo(() => {
    if (!subject.lastStudiedAt) return 'Never studied'

    const lastStudied = new Date(subject.lastStudiedAt)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - lastStudied.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    return lastStudied.toLocaleDateString()
  }, [subject.lastStudiedAt])

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg hover:scale-105',
        className
      )}
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: subject.color }}
          />
          <CardTitle className="text-lg line-clamp-1">{subject.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {subject.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {subject.description}
          </p>
        )}

        <div className="flex justify-between text-sm">
          <div>
            <p className="font-medium">{studyHours}h studied</p>
            <p className="text-muted-foreground">{subject.taskCount} tasks</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Last studied</p>
            <p className="font-medium">{lastStudiedText}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

SubjectCard.displayName = 'SubjectCard'

// Memoized focus session card component
interface FocusSessionCardProps {
  session: {
    id: string
    startTime: string
    endTime?: string
    durationMinutes: number
    subject?: {
      name: string
      color: string
    }
    task?: {
      title: string
    }
    focusScore?: number
    notes?: string
  }
  className?: string
}

export const FocusSessionCard = memo<FocusSessionCardProps>(({
  session,
  className
}) => {
  const duration = useMemo(() => {
    const hours = Math.floor(session.durationMinutes / 60)
    const minutes = session.durationMinutes % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }, [session.durationMinutes])

  const sessionTime = useMemo(() => {
    const start = new Date(session.startTime)
    const end = session.endTime ? new Date(session.endTime) : new Date()

    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }, [session.startTime, session.endTime])

  const focusScoreColor = useMemo(() => {
    if (!session.focusScore) return 'text-muted-foreground'

    if (session.focusScore >= 80) return 'text-green-600'
    if (session.focusScore >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }, [session.focusScore])

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {session.subject && (
              <>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: session.subject.color }}
                />
                <span className="text-sm font-medium">{session.subject.name}</span>
              </>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{duration}</p>
            {session.focusScore && (
              <p className={cn('text-xs', focusScoreColor)}>
                Focus: {session.focusScore}%
              </p>
            )}
          </div>
        </div>

        {session.task && (
          <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
            Task: {session.task.title}
          </p>
        )}

        <p className="text-xs text-muted-foreground">{sessionTime}</p>

        {session.notes && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {session.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
})

FocusSessionCard.displayName = 'FocusSessionCard'

// Memoized avatar component with initials fallback
interface AvatarProps {
  src?: string
  alt: string
  size?: number
  className?: string
}

export const MemoizedAvatar = memo<AvatarProps>(({
  src,
  alt,
  size = 40,
  className
}) => {
  const initials = useMemo(() => {
    return alt
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }, [alt])

  if (src) {
    return (
      <OptimizedImage
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={cn('rounded-full object-cover', className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-primary text-primary-foreground rounded-full font-medium',
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  )
})

MemoizedAvatar.displayName = 'MemoizedAvatar'

export default {
  TaskCard,
  SubjectCard,
  FocusSessionCard,
  MemoizedAvatar
}