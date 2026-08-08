import type { EmailProvider, EmailMessage } from "./types";

export class SendGridProvider implements EmailProvider {
  constructor(
    private apiKey: string,
    private fromAddress: string,
    private fromName: string
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: this.fromAddress, name: this.fromName },
        subject: message.subject,
        content: [
          { type: "text/plain", value: message.text },
          { type: "text/html", value: message.html },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`SendGrid error: ${response.status} - ${body}`);
    }
  }
}