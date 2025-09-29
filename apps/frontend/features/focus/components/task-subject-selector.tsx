'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Target, Plus, X, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  subject?: string;
  priority: 'low' | 'medium' | 'high';
  estimatedMinutes?: number;
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface TaskSubjectSelectorProps {
  selectedTask?: Task | null;
  selectedSubject?: Subject | null;
  tasks: Task[];
  subjects: Subject[];
  onTaskSelect: (task: Task | null) => void;
  onSubjectSelect: (subject: Subject | null) => void;
  className?: string;
}

const priorityColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function TaskSubjectSelector({
  selectedTask,
  selectedSubject,
  tasks,
  subjects,
  onTaskSelect,
  onSubjectSelect,
  className,
}: TaskSubjectSelectorProps) {
  const [taskPopoverOpen, setTaskPopoverOpen] = useState(false);
  const [subjectPopoverOpen, setSubjectPopoverOpen] = useState(false);

  const handleTaskSelect = (task: Task) => {
    onTaskSelect(task);
    setTaskPopoverOpen(false);

    // Auto-select subject if task has one
    if (task.subject) {
      const subject = subjects.find(s => s.name === task.subject);
      if (subject) {
        onSubjectSelect(subject);
      }
    }
  };

  const handleSubjectSelect = (subject: Subject) => {
    onSubjectSelect(subject);
    setSubjectPopoverOpen(false);
  };

  const clearTask = () => {
    onTaskSelect(null);
  };

  const clearSubject = () => {
    onSubjectSelect(null);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Focus On
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Task Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Task (Optional)
          </label>

          <div className="flex gap-2">
            <Popover open={taskPopoverOpen} onOpenChange={setTaskPopoverOpen}>
              <PopoverTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1"
                >
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto p-3"
                  >
                    {selectedTask ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <div className="text-left">
                            <div className="font-medium truncate">
                              {selectedTask.title}
                            </div>
                            {selectedTask.subject && (
                              <div className="text-xs text-gray-500 truncate">
                                {selectedTask.subject}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className={priorityColors[selectedTask.priority]}>
                          {selectedTask.priority}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-gray-500">Select a task...</span>
                    )}
                    <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
                  </Button>
                </motion.div>
              </PopoverTrigger>

              <PopoverContent className="w-80 p-0" align="start">
                <div className="p-3 border-b">
                  <h4 className="font-medium">Select Task</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Choose a task to focus on during this session
                  </p>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  {tasks.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No tasks available
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <motion.button
                        key={task.id}
                        onClick={() => handleTaskSelect(task)}
                        className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">
                              {task.title}
                            </div>
                            {task.subject && (
                              <div className="text-xs text-gray-500 truncate">
                                {task.subject}
                              </div>
                            )}
                            {task.estimatedMinutes && (
                              <div className="text-xs text-gray-400">
                                Est. {task.estimatedMinutes} min
                              </div>
                            )}
                          </div>
                          <Badge className={priorityColors[task.priority]}>
                            {task.priority}
                          </Badge>
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <AnimatePresence>
              {selectedTask && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearTask}
                    className="px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Subject Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Subject (Optional)
          </label>

          <div className="flex gap-2">
            <Popover open={subjectPopoverOpen} onOpenChange={setSubjectPopoverOpen}>
              <PopoverTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1"
                >
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto p-3"
                  >
                    {selectedSubject ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: selectedSubject.color }}
                        />
                        <span className="font-medium">{selectedSubject.name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500">Select a subject...</span>
                    )}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </motion.div>
              </PopoverTrigger>

              <PopoverContent className="w-64 p-0" align="start">
                <div className="p-3 border-b">
                  <h4 className="font-medium">Select Subject</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Track time spent on this subject
                  </p>
                </div>

                <div className="max-h-48 overflow-y-auto">
                  {subjects.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No subjects available
                    </div>
                  ) : (
                    subjects.map((subject) => (
                      <motion.button
                        key={subject.id}
                        onClick={() => handleSubjectSelect(subject)}
                        className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: subject.color }}
                          />
                          <span className="font-medium truncate">
                            {subject.name}
                          </span>
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <AnimatePresence>
              {selectedSubject && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSubject}
                    className="px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Selected Items Summary */}
        <AnimatePresence>
          {(selectedTask || selectedSubject) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg"
            >
              <div className="text-sm">
                <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Focus Session Summary
                </div>
                {selectedTask && (
                  <div className="text-blue-700 dark:text-blue-300">
                    Task: {selectedTask.title}
                  </div>
                )}
                {selectedSubject && (
                  <div className="text-blue-700 dark:text-blue-300">
                    Subject: {selectedSubject.name}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}