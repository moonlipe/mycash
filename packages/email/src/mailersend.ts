import type { EmailProvider, EmailMessage } from "./types";

export class MailersendProvider implements EmailProvider {
  constructor(
    private apiKey: string,
    private fromAddress: string,
    private fromName: string
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const response = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { email: this.fromAddress, name: this.fromName },
        to: [{ email: message.to }],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Mailersend error: ${response.status} - ${body}`);
    }
  }
}