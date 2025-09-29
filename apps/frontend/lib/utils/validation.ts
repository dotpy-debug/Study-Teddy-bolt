// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation (minimum 8 characters, at least one letter and one number)
export const isValidPassword = (password: string): boolean => {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
};

// Name validation (at least 2 characters, letters and spaces only)
export const isValidName = (name: string): boolean => {
  const nameRegex = /^[A-Za-z\s]{2,}$/;
  return nameRegex.test(name.trim());
};

// Task title validation
export const isValidTaskTitle = (title: string): boolean => {
  return title.trim().length >= 3 && title.trim().length <= 100;
};

// Subject validation
export const isValidSubject = (subject: string): boolean => {
  return subject.trim().length >= 2 && subject.trim().length <= 50;
};

// Priority validation
export const isValidPriority = (priority: string): boolean => {
  return ['low', 'medium', 'high'].includes(priority);
};

// Date validation (must be a valid date)
export const isValidDate = (date: string): boolean => {
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};

// Future date validation (date must be in the future or today)
export const isFutureOrTodayDate = (date: string): boolean => {
  const parsedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsedDate.setHours(0, 0, 0, 0);
  return parsedDate >= today;
};

// Chat message validation
export const isValidChatMessage = (message: string): boolean => {
  return message.trim().length >= 1 && message.trim().length <= 1000;
};