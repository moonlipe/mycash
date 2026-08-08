import type { EmailConfig, EmailProvider } from "./types";
import { SmtpProvider } from "./smtp";
import { SendGridProvider } from "./sendgrid";
import { MailersendProvider } from "./mailersend";

export class EmailService {
  private provider: EmailProvider;
  private fromAddress: string;
  private fromName: string;

  constructor(config: EmailConfig) {
    this.fromAddress = config.fromAddress;
    this.fromName = config.fromName;

    switch (config.driver) {
      case "smtp":
        if (!config.smtp) {
          throw new Error("SMTP configuration is required when EMAIL_DRIVER=smtp");
        }
        this.provider = new SmtpProvider({
          ...config.smtp,
          fromAddress: this.fromAddress,
          fromName: this.fromName,
        });
        break;
      case "sendgrid":
        if (!config.apiKey) {
          throw new Error("EMAIL_API_KEY is required when EMAIL_DRIVER=sendgrid");
        }
        this.provider = new SendGridProvider(config.apiKey, this.fromAddress, this.fromName);
        break;
      case "mailersend":
        if (!config.apiKey) {
          throw new Error("EMAIL_API_KEY is required when EMAIL_DRIVER=mailersend");
        }
        this.provider = new MailersendProvider(config.apiKey, this.fromAddress, this.fromName);
        break;
      default:
        throw new Error(`Unknown EMAIL_DRIVER: ${config.driver}`);
    }
  }

  async send(to: string, subject: string, html: string, text: string): Promise<void> {
    await this.provider.send({ to, subject, html, text });
  }
}

export function createEmailService(env: {
  EMAIL_DRIVER: string;
  EMAIL_SMTP_HOST?: string;
  EMAIL_SMTP_PORT?: string;
  EMAIL_SMTP_USER?: string;
  EMAIL_SMTP_PASS?: string;
  EMAIL_SMTP_SECURE?: string;
  EMAIL_API_KEY?: string;
  EMAIL_FROM_ADDRESS: string;
  EMAIL_FROM_NAME: string;
}): EmailService {
  const driver = (env.EMAIL_DRIVER || "smtp") as EmailConfig["driver"];

  const config: EmailConfig = {
    driver,
    fromAddress: env.EMAIL_FROM_ADDRESS || "noreply@mycash.app",
    fromName: env.EMAIL_FROM_NAME || "MyCash App",
  };

  if (driver === "smtp") {
    config.smtp = {
      host: env.EMAIL_SMTP_HOST || "localhost",
      port: parseInt(env.EMAIL_SMTP_PORT || "2525", 10),
      user: env.EMAIL_SMTP_USER || "",
      pass: env.EMAIL_SMTP_PASS || "",
      secure: env.EMAIL_SMTP_SECURE === "true",
    };
  }

  if (driver === "sendgrid" || driver === "mailersend") {
    config.apiKey = env.EMAIL_API_KEY;
  }

  return new EmailService(config);
}