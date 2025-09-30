import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailTemplateData } from '../types/email-job.types';

export interface EmailTemplate {
  html: string;
  text: string;
  subject: string;
}

export interface TemplateVariables {
  [key: string]: any;
  // Common variables available in all templates
  appName: string;
  appUrl: string;
  supportEmail: string;
  unsubscribeUrl: string;
  currentYear: number;
}

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);
  private readonly appUrl: string;
  private readonly appName: string;
  private readonly supportEmail: string;

  constructor(private configService: ConfigService) {
    this.appUrl = this.configService.get<string>('APP_URL', 'https://studyteddy.com');
    this.appName = 'Study Teddy';
    this.supportEmail = this.configService.get<string>('SUPPORT_EMAIL', 'support@studyteddy.com');
  }

  async generateTemplate(
    templateType: string,
    templateData: EmailTemplateData,
  ): Promise<EmailTemplate> {
    try {
      const baseVariables = this.getBaseVariables(templateData);

      switch (templateType) {
        case 'welcome':
          return this.generateWelcomeTemplate(templateData as any, baseVariables);
        case 'verification':
          return this.generateVerificationTemplate(templateData as any, baseVariables);
        case 'password_reset':
          return this.generatePasswordResetTemplate(templateData as any, baseVariables);
        case 'task_reminder':
          return this.generateTaskReminderTemplate(templateData as any, baseVariables);
        case 'focus_session_alert':
          return this.generateFocusSessionAlertTemplate(templateData as any, baseVariables);
        case 'achievement':
          return this.generateAchievementTemplate(templateData as any, baseVariables);
        case 'weekly_digest':
          return this.generateWeeklyDigestTemplate(templateData as any, baseVariables);
        default:
          throw new Error(`Unknown template type: ${templateType}`);
      }
    } catch (error) {
      this.logger.error('Failed to generate email template', {
        error: error.message,
        templateType,
      });
      throw error;
    }
  }

  private getBaseVariables(templateData: any): TemplateVariables {
    return {
      appName: this.appName,
      appUrl: this.appUrl,
      supportEmail: this.supportEmail,
      unsubscribeUrl: `${this.appUrl}/unsubscribe?token=${templateData.unsubscribeToken || ''}`,
      currentYear: new Date().getFullYear(),
      ...templateData,
    };
  }

  private generateWelcomeTemplate(data: any, baseVars: TemplateVariables): EmailTemplate {
    const subject = `Welcome to ${baseVars.appName}! 🎓`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.getCommonStyles()}
      </head>
      <body>
        <div class="email-container">
          ${this.getEmailHeader()}

          <div class="email-content">
            <h1>Welcome to Study Teddy! 🐻📚</h1>

            <p>Hi ${data.userName},</p>

            <p>Welcome to Study Teddy! We're excited to help you organize your study time and achieve your academic goals.</p>

            <div class="feature-highlights">
              <h3>What you can do with Study Teddy:</h3>
              <ul>
                <li>📝 Create and manage study tasks</li>
                <li>⏰ Set up focus sessions with Pomodoro timer</li>
                <li>🎯 Track your study goals and progress</li>
                <li>🤖 Get AI-powered study assistance</li>
                <li>📊 View detailed analytics of your study habits</li>
              </ul>
            </div>

            ${
              data.verificationUrl
                ? `
              <div class="cta-section">
                <p><strong>To get started, please verify your email address:</strong></p>
                <a href="${data.verificationUrl}" class="cta-button">Verify Email Address</a>
              </div>
            `
                : `
              <div class="cta-section">
                <p><strong>Ready to start studying smarter?</strong></p>
                <a href="${baseVars.appUrl}/dashboard" class="cta-button">Go to Dashboard</a>
              </div>
            `
            }

            <p>If you have any questions, don't hesitate to reach out to our support team at <a href="mailto:${baseVars.supportEmail}">${baseVars.supportEmail}</a>.</p>

            <p>Happy studying!</p>
            <p>The Study Teddy Team</p>
          </div>

          ${this.getEmailFooter(baseVars)}
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to Study Teddy! 🐻📚

Hi ${data.userName},

Welcome to Study Teddy! We're excited to help you organize your study time and achieve your academic goals.

What you can do with Study Teddy:
• Create and manage study tasks
• Set up focus sessions with Pomodoro timer
• Track your study goals and progress
• Get AI-powered study assistance
• View detailed analytics of your study habits

${
  data.verificationUrl
    ? `To get started, please verify your email address: ${data.verificationUrl}`
    : `Ready to start studying smarter? Visit: ${baseVars.appUrl}/dashboard`
}

If you have any questions, don't hesitate to reach out to our support team at ${baseVars.supportEmail}.

Happy studying!
The Study Teddy Team

${baseVars.appUrl}
    `;

    return { html, text, subject };
  }

  private generateVerificationTemplate(data: any, baseVars: TemplateVariables): EmailTemplate {
    const subject = `Verify your ${baseVars.appName} email address`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.getCommonStyles()}
      </head>
      <body>
        <div class="email-container">
          ${this.getEmailHeader()}

          <div class="email-content">
            <h1>Verify Your Email Address</h1>

            <p>Hi ${data.userName},</p>

            <p>To complete your registration and start using Study Teddy, please verify your email address by clicking the button below:</p>

            <div class="cta-section">
              <a href="${data.verificationUrl}" class="cta-button">Verify Email Address</a>
            </div>

            <p>This verification link will expire in ${data.expiryHours} hours for security reasons.</p>

            <p>If you didn't create an account with Study Teddy, you can safely ignore this email.</p>

            <p>If you're having trouble clicking the button, copy and paste the following link into your browser:</p>
            <p class="link-fallback">${data.verificationUrl}</p>

            <p>Best regards,<br>The Study Teddy Team</p>
          </div>

          ${this.getEmailFooter(baseVars)}
        </div>
      </body>
      </html>
    `;

    const text = `
Verify Your Email Address

Hi ${data.userName},

To complete your registration and start using Study Teddy, please verify your email address by visiting the following link:

${data.verificationUrl}

This verification link will expire in ${data.expiryHours} hours for security reasons.

If you didn't create an account with Study Teddy, you can safely ignore this email.

Best regards,
The Study Teddy Team

${baseVars.appUrl}
    `;

    return { html, text, subject };
  }

  private generatePasswordResetTemplate(data: any, baseVars: TemplateVariables): EmailTemplate {
    const subject = `Reset your ${baseVars.appName} password`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.getCommonStyles()}
      </head>
      <body>
        <div class="email-container">
          ${this.getEmailHeader()}

          <div class="email-content">
            <h1>Reset Your Password</h1>

            <p>Hi ${data.userName},</p>

            <p>We received a request to reset the password for your Study Teddy account. Click the button below to create a new password:</p>

            <div class="cta-section">
              <a href="${data.resetUrl}" class="cta-button">Reset Password</a>
            </div>

            <div class="security-info">
              <p><strong>Security Information:</strong></p>
              <ul>
                <li>Request made on: ${data.requestedAt}</li>
                ${data.ipAddress ? `<li>IP Address: ${data.ipAddress}</li>` : ''}
                <li>Link expires in: ${data.expiryHours} hours</li>
              </ul>
            </div>

            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>

            <p>If you're having trouble clicking the button, copy and paste the following link into your browser:</p>
            <p class="link-fallback">${data.resetUrl}</p>

            <p>For security reasons, this link will expire in ${data.expiryHours} hours.</p>

            <p>Best regards,<br>The Study Teddy Team</p>
          </div>

          ${this.getEmailFooter(baseVars)}
        </div>
      </body>
      </html>
    `;

    const text = `
Reset Your Password

Hi ${data.userName},

We received a request to reset the password for your Study Teddy account. Visit the following link to create a new password:

${data.resetUrl}

Security Information:
- Request made on: ${data.requestedAt}
${data.ipAddress ? `- IP Address: ${data.ipAddress}` : ''}
- Link expires in: ${data.expiryHours} hours

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

For security reasons, this link will expire in ${data.expiryHours} hours.

Best regards,
The Study Teddy Team

${baseVars.appUrl}
    `;

    return { html, text, subject };
  }

  private generateTaskReminderTemplate(data: any, baseVars: TemplateVariables): EmailTemplate {
    const urgencyText = data.reminderType === 'overdue' ? 'Overdue' : 'Due Soon';
    const subject = `📋 Task ${urgencyText}: ${data.taskTitle}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.getCommonStyles()}
      </head>
      <body>
        <div class="email-container">
          ${this.getEmailHeader()}

          <div class="email-content">
            <h1>${urgencyText} Task Reminder 📋</h1>

            <p>Hi ${data.userName},</p>

            <p>This is a reminder about your ${data.reminderType === 'overdue' ? 'overdue' : 'upcoming'} task:</p>

            <div class="task-card">
              <h3 class="task-title">${data.taskTitle}</h3>
              ${data.taskDescription ? `<p class="task-description">${data.taskDescription}</p>` : ''}

              <div class="task-details">
                <div class="task-meta">
                  <span class="priority priority-${data.priority}">${data.priority.toUpperCase()}</span>
                  ${data.subjectName ? `<span class="subject">${data.subjectName}</span>` : ''}
                </div>
                <p class="due-date ${data.reminderType === 'overdue' ? 'overdue' : 'due-soon'}">
                  ${data.reminderType === 'overdue' ? 'Was due:' : 'Due:'} ${data.dueDateFormatted}
                </p>
              </div>
            </div>

            <div class="cta-section">
              <a href="${data.taskUrl}" class="cta-button">View Task</a>
              <a href="${data.dashboardUrl}" class="cta-button-secondary">Go to Dashboard</a>
            </div>

            ${
              data.reminderType === 'overdue'
                ? `
              <div class="motivation-message">
                <p>📈 <strong>Don't let it pile up!</strong> Completing overdue tasks will help you stay on track with your study goals.</p>
              </div>
            `
                : `
              <div class="motivation-message">
                <p>🎯 <strong>You've got this!</strong> Stay focused and tackle this task to keep your momentum going.</p>
              </div>
            `
            }

            <p>Keep up the great work!</p>
            <p>The Study Teddy Team</p>
          </div>

          ${this.getEmailFooter(baseVars)}
        </div>
      </body>
      </html>
    `;

    const text = `
${urgencyText} Task Reminder 📋

Hi ${data.userName},

This is a reminder about your ${data.reminderType === 'overdue' ? 'overdue' : 'upcoming'} task:

Task: ${data.taskTitle}
${data.taskDescription ? `Description: ${data.taskDescription}` : ''}
Priority: ${data.priority.toUpperCase()}
${data.subjectName ? `Subject: ${data.subjectName}` : ''}
${data.reminderType === 'overdue' ? 'Was due:' : 'Due:'} ${data.dueDateFormatted}

View task: ${data.taskUrl}
Dashboard: ${data.dashboardUrl}

${
  data.reminderType === 'overdue'
    ? "Don't let it pile up! Completing overdue tasks will help you stay on track with your study goals."
    : "You've got this! Stay focused and tackle this task to keep your momentum going."
}

Keep up the great work!
The Study Teddy Team

${baseVars.appUrl}
    `;

    return { html, text, subject };
  }

  private generateFocusSessionAlertTemplate(data: any, baseVars: TemplateVariables): EmailTemplate {
    const subject = `🎯 Focus Session ${data.sessionType === 'completed' ? 'Completed' : 'Update'}: ${data.durationFormatted}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.getCommonStyles()}
      </head>
      <body>
        <div class="email-container">
          ${this.getEmailHeader()}

          <div class="email-content">
            <h1>🎯 Focus Session ${data.sessionType === 'completed' ? 'Completed!' : 'Update'}</h1>

            <p>Hi ${data.userName},</p>

            <p>${data.sessionSummary}</p>

            <div class="session-stats">
              <h3>Session Summary</h3>
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-label">Duration</span>
                  <span class="stat-value">${data.durationFormatted}</span>
                </div>
                ${
                  data.focusScore
                    ? `
                  <div class="stat-item">
                    <span class="stat-label">Focus Score</span>
                    <span class="stat-value">${data.focusScore}/100</span>
                  </div>
                `
                    : ''
                }
                ${
                  data.pomodoroCount
                    ? `
                  <div class="stat-item">
                    <span class="stat-label">Pomodoros</span>
                    <span class="stat-value">${data.pomodoroCount}</span>
                  </div>
                `
                    : ''
                }
              </div>

              ${data.taskTitle ? `<p><strong>Task:</strong> ${data.taskTitle}</p>` : ''}
              ${data.subjectName ? `<p><strong>Subject:</strong> ${data.subjectName}</p>` : ''}
            </div>

            <div class="cta-section">
              <a href="${data.statsUrl}" class="cta-button">View Detailed Stats</a>
              <a href="${data.dashboardUrl}" class="cta-button-secondary">Go to Dashboard</a>
            </div>

            <div class="motivation-message">
              ${
                data.sessionType === 'completed'
                  ? `
                <p>🌟 <strong>Great job!</strong> Every focused minute brings you closer to your goals.</p>
              `
                  : `
                <p>💪 <strong>Keep going!</strong> You're building excellent study habits.</p>
              `
              }
            </div>

            <p>Keep up the focused work!</p>
            <p>The Study Teddy Team</p>
          </div>

          ${this.getEmailFooter(baseVars)}
        </div>
      </body>
      </html>
    `;

    const text = `
🎯 Focus Session ${data.sessionType === 'completed' ? 'Completed!' : 'Update'}

Hi ${data.userName},

${data.sessionSummary}

Session Summary:
Duration: ${data.durationFormatted}
${data.focusScore ? `Focus Score: ${data.focusScore}/100` : ''}
${data.pomodoroCount ? `Pomodoros: ${data.pomodoroCount}` : ''}

${data.taskTitle ? `Task: ${data.taskTitle}` : ''}
${data.subjectName ? `Subject: ${data.subjectName}` : ''}

View detailed stats: ${data.statsUrl}
Dashboard: ${data.dashboardUrl}

${
  data.sessionType === 'completed'
    ? 'Great job! Every focused minute brings you closer to your goals.'
    : "Keep going! You're building excellent study habits."
}

Keep up the focused work!
The Study Teddy Team

${baseVars.appUrl}
    `;

    return { html, text, subject };
  }

  private generateAchievementTemplate(data: any, baseVars: TemplateVariables): EmailTemplate {
    const subject = `🏆 Achievement Unlocked: ${data.achievementTitle}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.getCommonStyles()}
      </head>
      <body>
        <div class="email-container">
          ${this.getEmailHeader()}

          <div class="email-content">
            <h1>🏆 Achievement Unlocked!</h1>

            <p>Hi ${data.userName},</p>

            <p>${data.celebrationMessage}</p>

            <div class="achievement-card">
              <div class="achievement-icon">${data.achievementIcon}</div>
              <h3 class="achievement-title">${data.achievementTitle}</h3>
              <p class="achievement-description">${data.achievementDescription}</p>
              ${data.relatedStats ? `<p class="achievement-stats">${data.relatedStats}</p>` : ''}
            </div>

            <div class="cta-section">
              <a href="${data.achievementsUrl}" class="cta-button">View All Achievements</a>
              <a href="${data.dashboardUrl}" class="cta-button-secondary">Go to Dashboard</a>
            </div>

            <div class="motivation-message">
              <p>🌟 <strong>Keep it up!</strong> Your dedication to studying is paying off. Every achievement is a step towards mastering your subjects.</p>
            </div>

            <p>Congratulations and keep studying!</p>
            <p>The Study Teddy Team</p>
          </div>

          ${this.getEmailFooter(baseVars)}
        </div>
      </body>
      </html>
    `;

    const text = `
🏆 Achievement Unlocked!

Hi ${data.userName},

${data.celebrationMessage}

${data.achievementIcon} ${data.achievementTitle}
${data.achievementDescription}
${data.relatedStats ? data.relatedStats : ''}

View all achievements: ${data.achievementsUrl}
Dashboard: ${data.dashboardUrl}

Keep it up! Your dedication to studying is paying off. Every achievement is a step towards mastering your subjects.

Congratulations and keep studying!
The Study Teddy Team

${baseVars.appUrl}
    `;

    return { html, text, subject };
  }

  private generateWeeklyDigestTemplate(data: any, baseVars: TemplateVariables): EmailTemplate {
    const subject = `📊 Your Weekly Study Summary (${data.weekRange})`;

    const subjectBreakdownHtml = data.subjectBreakdown
      .map(
        (subject) => `
      <div class="subject-item">
        <span class="subject-name">${subject.subjectName}</span>
        <span class="subject-time">${subject.studyFormatted}</span>
        <span class="subject-tasks">${subject.tasksCompleted} tasks</span>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${subject.percentage}%"></div>
        </div>
      </div>
    `,
      )
      .join('');

    const achievementsHtml = data.achievements
      .map(
        (achievement) => `
      <div class="achievement-item">
        <span class="achievement-icon">${achievement.icon}</span>
        <div class="achievement-content">
          <strong>${achievement.title}</strong>
          <small>${achievement.earnedAt}</small>
        </div>
      </div>
    `,
      )
      .join('');

    const upcomingTasksHtml = data.upcomingTasks
      .map(
        (task) => `
      <div class="task-item ${task.isOverdue ? 'overdue' : ''}">
        <span class="task-title">${task.title}</span>
        <span class="task-due">${task.dueDateFormatted}</span>
        <span class="task-priority priority-${task.priority.toLowerCase()}">${task.priority}</span>
      </div>
    `,
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.getCommonStyles()}
      </head>
      <body>
        <div class="email-container">
          ${this.getEmailHeader()}

          <div class="email-content">
            <h1>📊 Your Weekly Study Summary</h1>
            <p class="week-range">${data.weekRange}</p>

            <p>Hi ${data.userName},</p>

            <p>Here's a summary of your study activities this week. ${data.motivationalMessage}</p>

            <div class="stats-overview">
              <div class="stat-card">
                <h3>${data.totalStudyFormatted}</h3>
                <p>Total Study Time</p>
              </div>
              <div class="stat-card">
                <h3>${data.tasksCompleted}</h3>
                <p>Tasks Completed</p>
              </div>
              <div class="stat-card">
                <h3>${data.focusSessionsCompleted}</h3>
                <p>Focus Sessions</p>
              </div>
              <div class="stat-card">
                <h3>${data.averageFocusScore}/100</h3>
                <p>Avg. Focus Score</p>
              </div>
            </div>

            ${
              data.weeklyGoalProgress
                ? `
              <div class="goal-progress">
                <h3>Weekly Goal Progress</h3>
                <div class="goal-bar">
                  <div class="goal-fill" style="width: ${data.weeklyGoalProgress.percentage}%"></div>
                </div>
                <p>${data.weeklyGoalProgress.achievedMinutes} / ${data.weeklyGoalProgress.targetMinutes} minutes ${data.weeklyGoalProgress.goalMet ? '🎯 Goal Met!' : ''}</p>
              </div>
            `
                : ''
            }

            <div class="section">
              <h3>📚 Study Time by Subject</h3>
              <div class="subjects-breakdown">
                ${subjectBreakdownHtml}
              </div>
            </div>

            ${
              data.achievements.length > 0
                ? `
              <div class="section">
                <h3>🏆 This Week's Achievements</h3>
                <div class="achievements-list">
                  ${achievementsHtml}
                </div>
              </div>
            `
                : ''
            }

            ${
              data.upcomingTasks.length > 0
                ? `
              <div class="section">
                <h3>📅 Upcoming Tasks</h3>
                <div class="tasks-list">
                  ${upcomingTasksHtml}
                </div>
              </div>
            `
                : ''
            }

            <div class="highlights">
              <p><strong>📈 Highlights:</strong></p>
              <ul>
                <li>Longest study session: ${data.longestStudyFormatted}</li>
                <li>Most productive day: ${data.mostProductiveDay}</li>
                ${data.achievements.length > 0 ? `<li>Achievements earned: ${data.achievements.length}</li>` : ''}
              </ul>
            </div>

            <div class="cta-section">
              <a href="${data.dashboardUrl}" class="cta-button">View Dashboard</a>
              <a href="${data.analyticsUrl}" class="cta-button-secondary">Detailed Analytics</a>
            </div>

            <p>Keep up the excellent work! Here's to another productive week of studying.</p>
            <p>The Study Teddy Team</p>
          </div>

          ${this.getEmailFooter(baseVars)}
        </div>
      </body>
      </html>
    `;

    const text = `
📊 Your Weekly Study Summary (${data.weekRange})

Hi ${data.userName},

Here's a summary of your study activities this week. ${data.motivationalMessage}

OVERVIEW:
• Total Study Time: ${data.totalStudyFormatted}
• Tasks Completed: ${data.tasksCompleted}
• Focus Sessions: ${data.focusSessionsCompleted}
• Average Focus Score: ${data.averageFocusScore}/100

${
  data.weeklyGoalProgress
    ? `
WEEKLY GOAL PROGRESS:
${data.weeklyGoalProgress.achievedMinutes} / ${data.weeklyGoalProgress.targetMinutes} minutes (${data.weeklyGoalProgress.percentage}%) ${data.weeklyGoalProgress.goalMet ? '🎯 Goal Met!' : ''}
`
    : ''
}

STUDY TIME BY SUBJECT:
${data.subjectBreakdown.map((s) => `• ${s.subjectName}: ${s.studyFormatted} (${s.tasksCompleted} tasks)`).join('\n')}

${
  data.achievements.length > 0
    ? `
THIS WEEK'S ACHIEVEMENTS:
${data.achievements.map((a) => `🏆 ${a.title} (${a.earnedAt})`).join('\n')}
`
    : ''
}

${
  data.upcomingTasks.length > 0
    ? `
UPCOMING TASKS:
${data.upcomingTasks.map((t) => `• ${t.title} - Due: ${t.dueDateFormatted} (${t.priority})`).join('\n')}
`
    : ''
}

HIGHLIGHTS:
• Longest study session: ${data.longestStudyFormatted}
• Most productive day: ${data.mostProductiveDay}
${data.achievements.length > 0 ? `• Achievements earned: ${data.achievements.length}` : ''}

Dashboard: ${data.dashboardUrl}
Detailed Analytics: ${data.analyticsUrl}

Keep up the excellent work! Here's to another productive week of studying.

The Study Teddy Team

Unsubscribe: ${data.unsubscribeUrl}
${baseVars.appUrl}
    `;

    return { html, text, subject };
  }

  private getCommonStyles(): string {
    return `
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
        }

        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }

        .email-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          text-align: center;
        }

        .logo {
          color: white;
          font-size: 24px;
          font-weight: bold;
          text-decoration: none;
        }

        .email-content {
          padding: 30px;
        }

        h1 {
          color: #333;
          margin-top: 0;
          font-size: 28px;
        }

        h2 {
          color: #555;
          font-size: 22px;
        }

        h3 {
          color: #666;
          font-size: 18px;
        }

        .cta-button {
          display: inline-block;
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white !important;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 10px 10px 10px 0;
        }

        .cta-button-secondary {
          display: inline-block;
          padding: 12px 24px;
          background: transparent;
          color: #667eea !important;
          text-decoration: none;
          border: 2px solid #667eea;
          border-radius: 5px;
          font-weight: bold;
          margin: 10px 10px 10px 0;
        }

        .cta-section {
          text-align: center;
          margin: 30px 0;
        }

        .feature-highlights {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }

        .task-card {
          background-color: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 20px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }

        .task-title {
          margin: 0 0 10px 0;
          color: #333;
        }

        .task-description {
          color: #666;
          margin-bottom: 15px;
        }

        .task-meta {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .priority {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .priority-low { background-color: #d1ecf1; color: #0c5460; }
        .priority-medium { background-color: #fff3cd; color: #856404; }
        .priority-high { background-color: #f8d7da; color: #721c24; }
        .priority-urgent { background-color: #f5c6cb; color: #721c24; }

        .subject {
          background-color: #e2e3e5;
          color: #495057;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .due-date {
          font-weight: bold;
        }

        .overdue { color: #dc3545; }
        .due-soon { color: #fd7e14; }

        .session-stats, .achievement-card, .stats-overview {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-label {
          display: block;
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
        }

        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }

        .achievement-icon {
          font-size: 48px;
          text-align: center;
          margin-bottom: 15px;
        }

        .achievement-title {
          text-align: center;
          margin: 0 0 10px 0;
          color: #667eea;
        }

        .achievement-description {
          text-align: center;
          color: #666;
        }

        .security-info {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }

        .motivation-message {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
        }

        .link-fallback {
          word-break: break-all;
          color: #667eea;
          background-color: #f8f9fa;
          padding: 10px;
          border-radius: 5px;
          font-family: monospace;
        }

        .email-footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 12px;
        }

        .email-footer a {
          color: #667eea;
          text-decoration: none;
        }

        /* Weekly digest specific styles */
        .week-range {
          text-align: center;
          color: #666;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 15px;
        }

        .stat-card {
          text-align: center;
          padding: 15px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .stat-card h3 {
          margin: 0;
          font-size: 24px;
          color: #667eea;
        }

        .stat-card p {
          margin: 5px 0 0 0;
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
        }

        .section {
          margin: 30px 0;
        }

        .subjects-breakdown, .achievements-list, .tasks-list {
          margin-top: 15px;
        }

        .subject-item, .achievement-item, .task-item {
          display: flex;
          align-items: center;
          padding: 10px;
          border-bottom: 1px solid #eee;
        }

        .subject-item:last-child,
        .achievement-item:last-child,
        .task-item:last-child {
          border-bottom: none;
        }

        .progress-bar {
          flex: 1;
          height: 8px;
          background-color: #e9ecef;
          border-radius: 4px;
          margin-left: 10px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          transition: width 0.3s ease;
        }

        .goal-progress {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }

        .goal-bar {
          height: 12px;
          background-color: #e9ecef;
          border-radius: 6px;
          overflow: hidden;
          margin: 10px 0;
        }

        .goal-fill {
          height: 100%;
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        }

        .highlights {
          background-color: #e7f3ff;
          border-left: 4px solid #007bff;
          padding: 20px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }

        @media only screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
          }

          .email-content {
            padding: 20px !important;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .stats-overview {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .cta-button, .cta-button-secondary {
            display: block !important;
            margin: 10px 0 !important;
          }
        }
      </style>
    `;
  }

  private getEmailHeader(): string {
    return `
      <div class="email-header">
        <a href="${this.appUrl}" class="logo">🐻 ${this.appName}</a>
      </div>
    `;
  }

  private getEmailFooter(baseVars: TemplateVariables): string {
    return `
      <div class="email-footer">
        <p><strong>${baseVars.appName}</strong> - Your AI-powered study companion</p>
        <p>
          <a href="${baseVars.appUrl}">Dashboard</a> |
          <a href="${baseVars.appUrl}/settings">Settings</a> |
          <a href="${baseVars.unsubscribeUrl}">Unsubscribe</a> |
          <a href="mailto:${baseVars.supportEmail}">Support</a>
        </p>
        <p>&copy; ${baseVars.currentYear} ${baseVars.appName}. All rights reserved.</p>
      </div>
    `;
  }
}
