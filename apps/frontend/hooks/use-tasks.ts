'use client';

import { useState, useEffect } from 'react';
import { tasksApi } from '@/lib/api/tasks';
import type { StudyTask, CreateTaskDto, UpdateTaskDto } from '@studyteddy/shared';

export const useTasks = () => {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedTasks = await tasksApi.getTasks();
      setTasks(fetchedTasks);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (data: CreateTaskDto): Promise<StudyTask> => {
    try {
      const newTask = await tasksApi.createTask(data);
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create task';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateTask = async (id: string, data: UpdateTaskDto): Promise<StudyTask> => {
    try {
      const updatedTask = await tasksApi.updateTask(id, data);
      setTasks(prev => prev.map(task =>
        task.id === id ? updatedTask : task
      ));
      return updatedTask;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update task';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const toggleComplete = async (id: string): Promise<void> => {
    try {
      const updatedTask = await tasksApi.toggleComplete(id);
      setTasks(prev => prev.map(task =>
        task.id === id ? updatedTask : task
      ));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle task completion');
      throw err;
    }
  };

  const deleteTask = async (id: string): Promise<void> => {
    try {
      await tasksApi.deleteTask(id);
      setTasks(prev => prev.filter(task => task.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete task');
      throw err;
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const todayTasks = tasks.filter(task => {
    const today = new Date().toISOString().split('T')[0];
    const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
    return taskDate === today && !task.completed;
  });

  const overdueTasks = tasks.filter(task => {
    const today = new Date();
    const taskDate = new Date(task.dueDate);
    return taskDate < today && !task.completed;
  });

  const completedTasks = tasks.filter(task => task.completed);

  return {
    tasks,
    todayTasks,
    overdueTasks,
    completedTasks,
    loading,
    error,
    createTask,
    updateTask,
    toggleComplete,
    deleteTask,
    refreshTasks: fetchTasks,
  };
};