export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

export interface EmailConfig {
  driver: "smtp" | "sendgrid" | "mailersend";
  smtp?: {
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
  };
  apiKey?: string;
  fromAddress: string;
  fromName: string;
}

export interface ReminderEmailParams {
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  date: string;
  accountName: string;
  appUrl: string;
}