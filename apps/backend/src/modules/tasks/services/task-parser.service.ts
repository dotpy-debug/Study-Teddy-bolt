import { Injectable, Logger } from '@nestjs/common';
import { CreateTaskDto, PriorityEnum, TaskStatusEnum } from '../dto/task.dto';

interface ParsedTask {
  title: string;
  subjectId?: string;
  dueDate?: string;
  estimatedMinutes?: number;
  priority?: PriorityEnum;
  status?: TaskStatusEnum;
  description?: string;
}

@Injectable()
export class TaskParserService {
  private readonly logger = new Logger(TaskParserService.name);

  // Common subjects mapping (can be enhanced with actual subject lookup)
  private readonly subjectKeywords = new Map([
    ['math', 'mathematics'],
    ['physics', 'physics'],
    ['chemistry', 'chemistry'],
    ['biology', 'biology'],
    ['english', 'english'],
    ['history', 'history'],
    ['science', 'science'],
    ['computer', 'computer science'],
    ['programming', 'computer science'],
    ['coding', 'computer science'],
  ]);

  // Priority keywords
  private readonly priorityKeywords = new Map([
    ['urgent', PriorityEnum.URGENT],
    ['high', PriorityEnum.HIGH],
    ['important', PriorityEnum.HIGH],
    ['medium', PriorityEnum.MEDIUM],
    ['normal', PriorityEnum.MEDIUM],
    ['low', PriorityEnum.LOW],
    ['later', PriorityEnum.LOW],
  ]);

  // Status keywords
  private readonly statusKeywords = new Map([
    ['todo', TaskStatusEnum.PENDING],
    ['pending', TaskStatusEnum.PENDING],
    ['doing', TaskStatusEnum.IN_PROGRESS],
    ['working', TaskStatusEnum.IN_PROGRESS],
    ['progress', TaskStatusEnum.IN_PROGRESS],
    ['done', TaskStatusEnum.COMPLETED],
    ['completed', TaskStatusEnum.COMPLETED],
    ['finished', TaskStatusEnum.COMPLETED],
  ]);

  // Day abbreviations
  private readonly dayAbbreviations = new Map([
    ['mon', 'monday'],
    ['tue', 'tuesday'],
    ['wed', 'wednesday'],
    ['thu', 'thursday'],
    ['fri', 'friday'],
    ['sat', 'saturday'],
    ['sun', 'sunday'],
    ['today', 'today'],
    ['tomorrow', 'tomorrow'],
    ['tmrw', 'tomorrow'],
  ]);

  /**
   * Parse natural language input into a structured task
   * Examples:
   * - "Study physics Thu 3pm 60m"
   * - "Complete math homework tomorrow urgent"
   * - "Review chemistry notes 2 hours high priority"
   * - "Read chapter 5 for english class Friday at 2pm"
   */
  parseTaskInput(
    input: string,
    availableSubjects?: Array<{ id: string; name: string }>,
  ): ParsedTask {
    this.logger.debug(`Parsing task input: "${input}"`);

    const parsed: ParsedTask = {
      title: input.trim(),
    };

    const words = input.toLowerCase().split(/\s+/);
    const originalWords = input.split(/\s+/);

    // Extract subject
    const subject = this.extractSubject(words, availableSubjects);
    if (subject) {
      parsed.subjectId = subject.id;
      // Remove subject from title
      parsed.title = this.removeWordsFromTitle(parsed.title, subject.matchedWords);
    }

    // Extract priority
    const priority = this.extractPriority(words);
    if (priority) {
      parsed.priority = priority.value;
      parsed.title = this.removeWordsFromTitle(parsed.title, priority.matchedWords);
    }

    // Extract status
    const status = this.extractStatus(words);
    if (status) {
      parsed.status = status.value;
      parsed.title = this.removeWordsFromTitle(parsed.title, status.matchedWords);
    }

    // Extract duration/time estimate
    const duration = this.extractDuration(words);
    if (duration) {
      parsed.estimatedMinutes = duration.value;
      parsed.title = this.removeWordsFromTitle(parsed.title, duration.matchedWords);
    }

    // Extract date/time
    const dateTime = this.extractDateTime(words, originalWords);
    if (dateTime) {
      parsed.dueDate = dateTime.value;
      parsed.title = this.removeWordsFromTitle(parsed.title, dateTime.matchedWords);
    }

    // Clean up title
    parsed.title = this.cleanTitle(parsed.title);

    this.logger.debug(`Parsed result:`, parsed);
    return parsed;
  }

  private extractSubject(
    words: string[],
    availableSubjects?: Array<{ id: string; name: string }>,
  ): { id: string; matchedWords: string[] } | null {
    if (!availableSubjects) {
      // Use keyword matching
      for (const [keyword, subjectName] of this.subjectKeywords) {
        const index = words.findIndex((word) => word.includes(keyword));
        if (index !== -1) {
          return {
            id: subjectName, // In real implementation, this would be the actual subject ID
            matchedWords: [words[index]],
          };
        }
      }
      return null;
    }

    // Use available subjects for matching
    for (const subject of availableSubjects) {
      const subjectWords = subject.name.toLowerCase().split(/\s+/);
      const matchedWords: string[] = [];

      for (const subjectWord of subjectWords) {
        const index = words.findIndex(
          (word) =>
            word === subjectWord || word.includes(subjectWord) || subjectWord.includes(word),
        );
        if (index !== -1) {
          matchedWords.push(words[index]);
        }
      }

      if (matchedWords.length > 0) {
        return {
          id: subject.id,
          matchedWords,
        };
      }
    }

    return null;
  }

  private extractPriority(words: string[]): { value: PriorityEnum; matchedWords: string[] } | null {
    for (const [keyword, priority] of this.priorityKeywords) {
      const index = words.findIndex((word) => word.includes(keyword));
      if (index !== -1) {
        return {
          value: priority,
          matchedWords: [words[index]],
        };
      }
    }

    return null;
  }

  private extractStatus(words: string[]): { value: TaskStatusEnum; matchedWords: string[] } | null {
    for (const [keyword, status] of this.statusKeywords) {
      const index = words.findIndex((word) => word.includes(keyword));
      if (index !== -1) {
        return {
          value: status,
          matchedWords: [words[index]],
        };
      }
    }

    return null;
  }

  private extractDuration(words: string[]): { value: number; matchedWords: string[] } | null {
    const matchedWords: string[] = [];
    let totalMinutes = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // Match patterns like "60m", "2h", "30min", "1.5hr", "90minutes"
      const durationMatch = word.match(/^(\d+(?:\.\d+)?)([hmhrs]+|min|minutes?|hrs?|hours?)$/);
      if (durationMatch) {
        const value = parseFloat(durationMatch[1]);
        const unit = durationMatch[2];

        let minutes = 0;
        if (unit.startsWith('h')) {
          minutes = value * 60;
        } else if (unit.startsWith('m')) {
          minutes = value;
        }

        totalMinutes += minutes;
        matchedWords.push(word);
        continue;
      }

      // Match patterns like "2 hours", "30 minutes"
      if (i < words.length - 1) {
        const nextWord = words[i + 1];
        const numberMatch = word.match(/^(\d+(?:\.\d+)?)$/);

        if (numberMatch) {
          const value = parseFloat(numberMatch[1]);

          if (nextWord.match(/^(hours?|hrs?|h)$/)) {
            totalMinutes += value * 60;
            matchedWords.push(word, nextWord);
            i++; // Skip next word
          } else if (nextWord.match(/^(minutes?|mins?|m)$/)) {
            totalMinutes += value;
            matchedWords.push(word, nextWord);
            i++; // Skip next word
          }
        }
      }
    }

    return totalMinutes > 0 ? { value: totalMinutes, matchedWords } : null;
  }

  private extractDateTime(
    words: string[],
    originalWords: string[],
  ): { value: string; matchedWords: string[] } | null {
    const matchedWords: string[] = [];
    let date: Date | null = null;

    // Look for day names and abbreviations
    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // Check day abbreviations
      if (this.dayAbbreviations.has(word)) {
        const day = this.dayAbbreviations.get(word)!;

        if (day === 'today') {
          date = new Date();
        } else if (day === 'tomorrow') {
          date = new Date();
          date.setDate(date.getDate() + 1);
        } else {
          // Find next occurrence of this day
          date = this.getNextDayOfWeek(day);
        }

        matchedWords.push(originalWords[i]);
        break;
      }

      // Check full day names
      const dayNames = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ];
      const dayIndex = dayNames.findIndex((day) => word.includes(day));
      if (dayIndex !== -1) {
        date = this.getNextDayOfWeek(dayNames[dayIndex]);
        matchedWords.push(originalWords[i]);
        break;
      }

      // Check date patterns like "12/25", "25-12", "Dec 25"
      const dateMatch = word.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
      if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1; // JavaScript months are 0-indexed
        const day = parseInt(dateMatch[2]);
        date = new Date();
        date.setMonth(month, day);

        // If the date is in the past, assume next year
        if (date < new Date()) {
          date.setFullYear(date.getFullYear() + 1);
        }

        matchedWords.push(originalWords[i]);
        break;
      }
    }

    // Look for time patterns
    let timeSet = false;
    for (let i = 0; i < words.length; i++) {
      const word = originalWords[i]; // Use original case for time parsing

      // Match patterns like "3pm", "10:30am", "14:00", "9:30"
      const timeMatch = word.match(/^(\d{1,2})(?::(\d{2}))?([ap]m)?$/i);
      if (timeMatch) {
        if (!date) {
          date = new Date(); // Default to today if no date specified
        }

        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        const ampm = timeMatch[3]?.toLowerCase();

        if (ampm === 'pm' && hours !== 12) {
          hours += 12;
        } else if (ampm === 'am' && hours === 12) {
          hours = 0;
        }

        date.setHours(hours, minutes, 0, 0);
        matchedWords.push(originalWords[i]);
        timeSet = true;
        break;
      }

      // Look for "at" followed by time
      if (word.toLowerCase() === 'at' && i < words.length - 1) {
        const nextWord = originalWords[i + 1];
        const timeMatch = nextWord.match(/^(\d{1,2})(?::(\d{2}))?([ap]m)?$/i);
        if (timeMatch) {
          if (!date) {
            date = new Date();
          }

          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2] || '0');
          const ampm = timeMatch[3]?.toLowerCase();

          if (ampm === 'pm' && hours !== 12) {
            hours += 12;
          } else if (ampm === 'am' && hours === 12) {
            hours = 0;
          }

          date.setHours(hours, minutes, 0, 0);
          matchedWords.push(originalWords[i], originalWords[i + 1]);
          timeSet = true;
          break;
        }
      }
    }

    // If we have a date but no time was set, set a default time
    if (date && !timeSet) {
      date.setHours(9, 0, 0, 0); // Default to 9 AM
    }

    return date ? { value: date.toISOString(), matchedWords } : null;
  }

  private getNextDayOfWeek(dayName: string): Date {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = dayNames.indexOf(dayName.toLowerCase());

    if (targetDay === -1) {
      return new Date(); // Fallback to today
    }

    const today = new Date();
    const currentDay = today.getDay();

    let daysUntilTarget = targetDay - currentDay;
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7; // Next week
    }

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);

    return targetDate;
  }

  private removeWordsFromTitle(title: string, wordsToRemove: string[]): string {
    let cleanTitle = title;

    for (const word of wordsToRemove) {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      cleanTitle = cleanTitle.replace(regex, '');
    }

    return cleanTitle;
  }

  private cleanTitle(title: string): string {
    // Remove extra whitespace and common connector words
    return title
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\b(at|for|on|in|the|a|an)\b/gi, ' ') // Remove common connector words
      .replace(/\s+/g, ' ') // Clean up spaces again
      .trim();
  }

  /**
   * Convert parsed task data to CreateTaskDto
   */
  convertToCreateTaskDto(parsed: ParsedTask): CreateTaskDto {
    const dto: CreateTaskDto = {
      title: parsed.title,
    };

    if (parsed.subjectId) {
      dto.subjectId = parsed.subjectId;
    }

    if (parsed.dueDate) {
      dto.dueDate = parsed.dueDate;
    }

    if (parsed.estimatedMinutes) {
      dto.estimatedMinutes = parsed.estimatedMinutes;
    }

    if (parsed.priority) {
      dto.priority = parsed.priority;
    }

    if (parsed.status) {
      dto.status = parsed.status;
    }

    if (parsed.description) {
      dto.description = parsed.description;
    }

    return dto;
  }

  /**
   * Get suggestions for auto-completion based on partial input
   */
  getSuggestions(input: string, availableSubjects?: Array<{ id: string; name: string }>): string[] {
    const suggestions: string[] = [];
    const words = input.toLowerCase().split(/\s+/);
    const lastWord = words[words.length - 1];

    // Subject suggestions
    if (availableSubjects) {
      for (const subject of availableSubjects) {
        if (subject.name.toLowerCase().includes(lastWord)) {
          suggestions.push(`${input.slice(0, -lastWord.length)}${subject.name}`);
        }
      }
    }

    // Day suggestions
    for (const [abbrev, fullDay] of this.dayAbbreviations) {
      if (abbrev.startsWith(lastWord) || fullDay.startsWith(lastWord)) {
        suggestions.push(`${input.slice(0, -lastWord.length)}${abbrev}`);
      }
    }

    // Priority suggestions
    for (const priority of this.priorityKeywords.keys()) {
      if (priority.startsWith(lastWord)) {
        suggestions.push(`${input.slice(0, -lastWord.length)}${priority}`);
      }
    }

    // Common time suggestions
    const timePatterns = ['9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm'];
    for (const time of timePatterns) {
      if (time.startsWith(lastWord)) {
        suggestions.push(`${input.slice(0, -lastWord.length)}${time}`);
      }
    }

    // Duration suggestions
    const durationPatterns = ['30m', '1h', '1.5h', '2h', '60m', '90m'];
    for (const duration of durationPatterns) {
      if (duration.startsWith(lastWord)) {
        suggestions.push(`${input.slice(0, -lastWord.length)}${duration}`);
      }
    }

    return suggestions.slice(0, 5); // Limit to top 5 suggestions
  }
}
