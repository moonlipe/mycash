export { EmailService, createEmailService } from "./factory";
export { SmtpProvider } from "./smtp";
export { SendGridProvider } from "./sendgrid";
export { MailersendProvider } from "./mailersend";
export { passwordResetEmail, reminderEmail } from "./templates";
export type {
  EmailProvider,
  EmailMessage,
  EmailConfig,
  ReminderEmailParams,
} from "./types";
export type { EmailTemplate } from "./templates";