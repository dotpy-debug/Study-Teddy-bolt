import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskCard } from '@/components/tasks/task-card';

const mockTask = {
  id: '1',
  title: 'Complete Math Homework',
  subject: 'math' as const,
  dueDate: '2024-01-20T10:00:00Z',
  priority: 'high' as const,
  completed: false,
  estimatedTime: 60,
  reviewCount: 2,
  lastReviewed: '2024-01-15T10:00:00Z',
};

const mockHandlers = {
  onToggleComplete: jest.fn(),
  onDelete: jest.fn(),
  onEdit: jest.fn(),
};

describe('TaskCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current date to ensure consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render task information correctly', () => {
    render(<TaskCard task={mockTask} {...mockHandlers} />);

    expect(screen.getByText('Complete Math Homework')).toBeInTheDocument();
    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('60min')).toBeInTheDocument();
    expect(screen.getByText('Due in 5 days')).toBeInTheDocument();
  });

  it('should show completion toggle button', () => {
    render(<TaskCard task={mockTask} {...mockHandlers} />);

    const toggleButton = screen.getByRole('button', { name: /toggle completion/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('should call onToggleComplete when completion button is clicked', async () => {
    const user = userEvent.setup();
    render(<TaskCard task={mockTask} {...mockHandlers} />);

    const toggleButton = screen.getByRole('button', { name: /toggle completion/i });
    await user.click(toggleButton);

    expect(mockHandlers.onToggleComplete).toHaveBeenCalledWith('1');
  });

  it('should show completed state correctly', () => {
    const completedTask = { ...mockTask, completed: true };
    render(<TaskCard task={completedTask} {...mockHandlers} />);

    const title = screen.getByText('Complete Math Homework');
    expect(title).toHaveClass('line-through');
    
    // Check for completed icon (CheckCircle2)
    const completedIcon = screen.getByRole('button', { name: /toggle completion/i });
    expect(completedIcon).toHaveClass('text-green-600');
  });

  it('should show overdue status for past due tasks', () => {
    const overdueTask = { ...mockTask, dueDate: '2024-01-10T10:00:00Z' };
    render(<TaskCard task={overdueTask} {...mockHandlers} />);

    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Past Due')).toBeInTheDocument();
  });

  it('should show "Due Today" for tasks due today', () => {
    const todayTask = { ...mockTask, dueDate: '2024-01-15T10:00:00Z' };
    render(<TaskCard task={todayTask} {...mockHandlers} />);

    expect(screen.getByText('Due Today')).toBeInTheDocument();
  });

  it('should show "Due Tomorrow" for tasks due tomorrow', () => {
    const tomorrowTask = { ...mockTask, dueDate: '2024-01-16T10:00:00Z' };
    render(<TaskCard task={tomorrowTask} {...mockHandlers} />);

    expect(screen.getByText('Due Tomorrow')).toBeInTheDocument();
  });

  it('should display priority badges with correct styling', () => {
    const { rerender } = render(<TaskCard task={mockTask} {...mockHandlers} />);
    
    // High priority
    expect(screen.getByText('High')).toHaveClass('bg-red-100', 'text-red-700');

    // Medium priority
    const mediumTask = { ...mockTask, priority: 'medium' as const };
    rerender(<TaskCard task={mediumTask} {...mockHandlers} />);
    expect(screen.getByText('Medium')).toHaveClass('bg-yellow-100', 'text-yellow-700');

    // Low priority
    const lowTask = { ...mockTask, priority: 'low' as const };
    rerender(<TaskCard task={lowTask} {...mockHandlers} />);
    expect(screen.getByText('Low')).toHaveClass('bg-green-100', 'text-green-700');
  });

  it('should display subject badges correctly', () => {
    const { rerender } = render(<TaskCard task={mockTask} {...mockHandlers} />);
    
    expect(screen.getByText('Mathematics')).toBeInTheDocument();

    // Test other subjects
    const scienceTask = { ...mockTask, subject: 'science' as const };
    rerender(<TaskCard task={scienceTask} {...mockHandlers} />);
    expect(screen.getByText('Science')).toBeInTheDocument();

    const languageTask = { ...mockTask, subject: 'language' as const };
    rerender(<TaskCard task={languageTask} {...mockHandlers} />);
    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('should show action menu when onEdit or onDelete are provided', async () => {
    const user = userEvent.setup();
    render(<TaskCard task={mockTask} {...mockHandlers} />);

    const menuButton = screen.getByRole('button', { name: /more options/i });
    expect(menuButton).toBeInTheDocument();

    await user.click(menuButton);

    expect(screen.getByText('Edit Task')).toBeInTheDocument();
    expect(screen.getByText('Delete Task')).toBeInTheDocument();
  });

  it('should not show action menu when onEdit and onDelete are not provided', () => {
    render(<TaskCard task={mockTask} onToggleComplete={mockHandlers.onToggleComplete} />);

    const menuButton = screen.queryByRole('button', { name: /more options/i });
    expect(menuButton).not.toBeInTheDocument();
  });

  it('should call onEdit when edit menu item is clicked', async () => {
    const user = userEvent.setup();
    render(<TaskCard task={mockTask} {...mockHandlers} />);

    const menuButton = screen.getByRole('button', { name: /more options/i });
    await user.click(menuButton);

    const editButton = screen.getByText('Edit Task');
    await user.click(editButton);

    expect(mockHandlers.onEdit).toHaveBeenCalledWith('1', mockTask);
  });

  it('should show delete confirmation dialog', async () => {
    const user = userEvent.setup();
    render(<TaskCard task={mockTask} {...mockHandlers} />);

    const menuButton = screen.getByRole('button', { name: /more options/i });
    await user.click(menuButton);

    const deleteButton = screen.getByText('Delete Task');
    await user.click(deleteButton);

    expect(screen.getByText('Delete Task')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete "Complete Math Homework"? This action cannot be undone.')).toBeInTheDocument();
  });

  it('should call onDelete when delete is confirmed', async () => {
    const user = userEvent.setup();
    render(<TaskCard task={mockTask} {...mockHandlers} />);

    const menuButton = screen.getByRole('button', { name: /more options/i });
    await user.click(menuButton);

    const deleteButton = screen.getByText('Delete Task');
    await user.click(deleteButton);

    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmButton);

    expect(mockHandlers.onDelete).toHaveBeenCalledWith('1');
  });

  it('should not call onDelete when delete is cancelled', async () => {
    const user = userEvent.setup();
    render(<TaskCard task={mockTask} {...mockHandlers} />);

    const menuButton = screen.getByRole('button', { name: /more options/i });
    await user.click(menuButton);

    const deleteButton = screen.getByText('Delete Task');
    await user.click(deleteButton);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(mockHandlers.onDelete).not.toHaveBeenCalled();
  });

  it('should show review variant correctly', () => {
    render(<TaskCard task={mockTask} {...mockHandlers} variant="review" />);

    expect(screen.getByText('Review #2')).toBeInTheDocument();
    
    // Should have review icon
    const reviewIcon = screen.getByTestId('review-icon') || document.querySelector('[data-testid="review-icon"]');
    // Note: Since we can't easily test for the RotateCcw icon, we'll check for the review badge
    expect(screen.getByText('Review #2')).toHaveClass('bg-orange-100', 'text-orange-700');
  });

  it('should show urgent variant correctly', () => {
    render(<TaskCard task={mockTask} {...mockHandlers} variant="urgent" />);

    expect(screen.getByText('High Priority')).toBeInTheDocument();
  });

  it('should apply correct styling for different variants', () => {
    const { rerender } = render(<TaskCard task={mockTask} {...mockHandlers} />);
    
    // Default variant
    const defaultCard = screen.getByText('Complete Math Homework').closest('div');
    expect(defaultCard).toHaveClass('bg-card');

    // Urgent variant
    rerender(<TaskCard task={mockTask} {...mockHandlers} variant="urgent" />);
    const urgentCard = screen.getByText('Complete Math Homework').closest('div');
    expect(urgentCard).toHaveClass('bg-red-50/80');

    // Review variant
    rerender(<TaskCard task={mockTask} {...mockHandlers} variant="review" />);
    const reviewCard = screen.getByText('Complete Math Homework').closest('div');
    expect(reviewCard).toHaveClass('bg-orange-50/80');
  });

  it('should show reduced opacity for completed tasks', () => {
    const completedTask = { ...mockTask, completed: true };
    render(<TaskCard task={completedTask} {...mockHandlers} />);

    const card = screen.getByText('Complete Math Homework').closest('div');
    expect(card).toHaveClass('opacity-60');
  });

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<TaskCard task={mockTask} {...mockHandlers} />);

    const toggleButton = screen.getByRole('button', { name: /toggle completion/i });
    
    // Focus the button and press Enter
    toggleButton.focus();
    await user.keyboard('{Enter}');

    expect(mockHandlers.onToggleComplete).toHaveBeenCalledWith('1');
  });

  it('should handle tasks without review data', () => {
    const taskWithoutReview = { ...mockTask, reviewCount: undefined, lastReviewed: undefined };
    render(<TaskCard task={taskWithoutReview} {...mockHandlers} variant="review" />);

    // Should not show review count if not available
    expect(screen.queryByText(/Review #/)).not.toBeInTheDocument();
  });
});