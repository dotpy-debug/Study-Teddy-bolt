import { cn, isValidEmail, formatDate, formatRelativeTime, truncateText } from '@/lib/utils';

describe('Utils', () => {
  describe('cn (className utility)', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional');
    });

    it('should handle undefined and null values', () => {
      expect(cn('base', undefined, null, 'valid')).toBe('base valid');
    });

    it('should handle empty strings', () => {
      expect(cn('base', '', 'valid')).toBe('base valid');
    });

    it('should merge Tailwind classes correctly', () => {
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test..test@example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidEmail('a@b.c')).toBe(true);
      expect(isValidEmail('test@localhost')).toBe(true);
      expect(isValidEmail('test@example')).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('should format dates correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDate(date)).toMatch(/Jan 15, 2024/);
    });

    it('should handle date strings', () => {
      const dateString = '2024-01-15T10:30:00Z';
      expect(formatDate(dateString)).toMatch(/Jan 15, 2024/);
    });

    it('should handle custom format options', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const options = { year: 'numeric' as const, month: 'short' as const };
      expect(formatDate(date, options)).toMatch(/Jan 2024/);
    });

    it('should handle invalid dates', () => {
      expect(formatDate('invalid-date')).toBe('Invalid Date');
      expect(formatDate(null as unknown as Date)).toBe('Invalid Date');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should format recent times correctly', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const fiveMinutesAgo = new Date('2024-01-15T11:55:00Z');
      const oneHourAgo = new Date('2024-01-15T11:00:00Z');
      const yesterday = new Date('2024-01-14T12:00:00Z');

      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
      expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
      expect(formatRelativeTime(yesterday)).toBe('1 day ago');
    });

    it('should handle future dates', () => {
      const tomorrow = new Date('2024-01-16T12:00:00Z');
      expect(formatRelativeTime(tomorrow)).toBe('in 1 day');
    });

    it('should handle "just now" for very recent times', () => {
      const thirtySecondsAgo = new Date('2024-01-15T11:59:30Z');
      expect(formatRelativeTime(thirtySecondsAgo)).toBe('just now');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const longText = 'This is a very long text that should be truncated';
      expect(truncateText(longText, 20)).toBe('This is a very long...');
    });

    it('should not truncate short text', () => {
      const shortText = 'Short text';
      expect(truncateText(shortText, 20)).toBe('Short text');
    });

    it('should handle custom suffix', () => {
      const longText = 'This is a very long text';
      expect(truncateText(longText, 15, ' [more]')).toBe('This is a very [more]');
    });

    it('should handle edge cases', () => {
      expect(truncateText('', 10)).toBe('');
      expect(truncateText('Test', 0)).toBe('...');
      expect(truncateText('Test', -1)).toBe('...');
    });
  });
});