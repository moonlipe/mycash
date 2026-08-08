import { connect } from "cloudflare:sockets";
import type { EmailProvider, EmailMessage } from "./types";

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  fromAddress: string;
  fromName: string;
}

interface SmtpResponse {
  code: number;
  text: string;
}

const encoder = new TextEncoder();

class SmtpConnection {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private buffer = "";
  private decoder = new TextDecoder();

  constructor(socket: Socket) {
    this.reader = socket.readable.getReader() as ReadableStreamDefaultReader<Uint8Array>;
    this.writer = socket.writable.getWriter() as WritableStreamDefaultWriter<Uint8Array>;
  }

  private async readMore(): Promise<void> {
    const { value, done } = await this.reader.read();
    if (done) throw new Error("SMTP connection closed");
    this.buffer += this.decoder.decode(value, { stream: true });
  }

  async readResponse(): Promise<SmtpResponse> {
    const lines: string[] = [];
    let code = 0;

    while (true) {
      while (!this.buffer.includes("\r\n")) {
        await this.readMore();
      }

      while (this.buffer.includes("\r\n")) {
        const idx = this.buffer.indexOf("\r\n");
        const line = this.buffer.substring(0, idx);
        this.buffer = this.buffer.substring(idx + 2);
        lines.push(line);

        if (line.length >= 4 && line[3] === " ") {
          code = parseInt(line.substring(0, 3), 10);
          return { code, text: lines.join("\n") };
        }

        if (line.length === 3 && !line.includes("-")) {
          code = parseInt(line.substring(0, 3), 10);
          return { code, text: lines.join("\n") };
        }
      }
    }
  }

  async sendCommand(cmd: string): Promise<SmtpResponse> {
    await this.writer.write(encoder.encode(cmd + "\r\n"));
    return this.readResponse();
  }

  async writeData(data: string): Promise<void> {
    await this.writer.write(encoder.encode(data));
  }

  async close(): Promise<void> {
    try {
      await this.sendCommand("QUIT");
    } catch {}
    try {
      await this.writer.close();
    } catch {}
    try {
      this.reader.releaseLock();
    } catch {}
  }
}

function encodeSubject(subject: string): string {
  return "=?UTF-8?B?" + btoa(unescape(encodeURIComponent(subject))) + "?=";
}

function base64Encode(str: string): string {
  return btoa(str);
}

export class SmtpProvider implements EmailProvider {
  constructor(private config: SmtpConfig) {}

  async send(message: EmailMessage): Promise<void> {
    const { host, port, user, pass, secure, fromAddress, fromName } = this.config;

    const socket = connect(
      { hostname: host, port },
      secure 
        ? { secureTransport: "on", allowHalfOpen: false }
        : { secureTransport: "starttls", allowHalfOpen: false }
    );

    await socket.opened;

    const reader = socket.readable.getReader() as ReadableStreamDefaultReader<Uint8Array>;
    const writer = socket.writable.getWriter() as WritableStreamDefaultWriter<Uint8Array>;
    const decoder = new TextDecoder();
    let buffer = "";

    async function readMore(): Promise<void> {
      const { value, done } = await reader.read();
      if (done) throw new Error("SMTP connection closed");
      buffer += decoder.decode(value, { stream: true });
    }

    async function readResponse(): Promise<SmtpResponse> {
      const lines: string[] = [];
      let code = 0;

      while (true) {
        while (!buffer.includes("\r\n")) {
          await readMore();
        }

        while (buffer.includes("\r\n")) {
          const idx = buffer.indexOf("\r\n");
          const line = buffer.substring(0, idx);
          buffer = buffer.substring(idx + 2);
          lines.push(line);

          if (line.length >= 4 && line[3] === " ") {
            code = parseInt(line.substring(0, 3), 10);
            return { code, text: lines.join("\n") };
          }

          if (line.length === 3 && !line.includes("-")) {
            code = parseInt(line.substring(0, 3), 10);
            return { code, text: lines.join("\n") };
          }
        }
      }
    }

    async function sendCommand(cmd: string): Promise<SmtpResponse> {
      await writer.write(encoder.encode(cmd + "\r\n"));
      return readResponse();
    }

    let conn: SmtpConnection | null = null;

    try {
      const greeting = await readResponse();
      if (greeting.code !== 220) {
        throw new Error(`SMTP greeting failed: ${greeting.text}`);
      }

      const ehlo = await sendCommand("EHLO mycash.app");
      let supportsStartTls = false;

      if (ehlo.code === 250) {
        for (const line of ehlo.text.split("\n")) {
          const stripped = line.replace(/^\d{3}[\s-]/i, "");
          if (stripped.toUpperCase() === "STARTTLS") {
            supportsStartTls = true;
            break;
          }
        }
      } else {
        const helo = await sendCommand("HELO mycash.app");
        if (helo.code !== 250) {
          throw new Error(`HELO failed: ${helo.text}`);
        }
      }

      if (!secure && supportsStartTls) {
        const startTlsR = await sendCommand("STARTTLS");
        if (startTlsR.code !== 220) {
          throw new Error(`STARTTLS failed: ${startTlsR.text}`);
        }

        reader.releaseLock();
        writer.releaseLock();

        const tlsSocket = socket.startTls();
        conn = new SmtpConnection(tlsSocket);

        const ehloTls = await conn.sendCommand("EHLO mycash.app");
        if (ehloTls.code !== 250) {
          throw new Error(`EHLO after STARTTLS failed: ${ehloTls.text}`);
        }
      } else {
        reader.releaseLock();
        writer.releaseLock();
        conn = new SmtpConnection(socket);
      }

      if (user && pass) {
        let authenticated = false;
        let lastAttempt = "";

        const plainR = await conn.sendCommand(
          "AUTH PLAIN " + base64Encode("\0" + user + "\0" + pass)
        );
        if (plainR.code === 235) {
          authenticated = true;
        } else {
          lastAttempt = `PLAIN(${plainR.code})`;
        }

        if (!authenticated) {
          const loginR1 = await conn.sendCommand("AUTH LOGIN");
          if (loginR1.code === 334) {
            const loginR2 = await conn.sendCommand(base64Encode(user));
            if (loginR2.code === 334) {
              const loginR3 = await conn.sendCommand(base64Encode(pass));
              if (loginR3.code === 235) {
                authenticated = true;
              } else {
                lastAttempt = `LOGIN password(${loginR3.code}): ${loginR3.text.split("\n")[0]}`;
              }
            } else {
              lastAttempt = `LOGIN user(${loginR2.code}): ${loginR2.text.split("\n")[0]}`;
            }
          } else {
            lastAttempt = `LOGIN not supported(${loginR1.code}): ${loginR1.text.split("\n")[0]}`;
          }
        }

        if (!authenticated) {
          throw new Error(
            `SMTP auth failed: attempted ${lastAttempt}. Check EMAIL_SMTP_USER/PASS credentials.`
          );
        }
      }

      const mailFrom = await conn.sendCommand(`MAIL FROM:<${fromAddress}>`);
      if (mailFrom.code !== 250) {
        throw new Error(`MAIL FROM failed: ${mailFrom.text}`);
      }

      const rcptTo = await conn.sendCommand(`RCPT TO:<${message.to}>`);
      if (rcptTo.code !== 250) {
        throw new Error(`RCPT TO failed: ${rcptTo.text}`);
      }

      const dataCmd = await conn.sendCommand("DATA");
      if (dataCmd.code !== 354) {
        throw new Error(`DATA command failed: ${dataCmd.text}`);
      }

      const boundary = "mycash_" + Date.now().toString(36);
      const emailContent = [
        `From: ${fromName} <${fromAddress}>`,
        `To: <${message.to}>`,
        `Subject: ${encodeSubject(message.subject)}`,
        "MIME-Version: 1.0",
        `Content-Type: multipart/alternative; boundary=${boundary}`,
        "",
        `--${boundary}`,
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: 7bit",
        "",
        message.text,
        "",
        `--${boundary}`,
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: 7bit",
        "",
        message.html,
        "",
        `--${boundary}--`,
        "\r\n.",
      ].join("\r\n");

      await conn.writeData(emailContent + "\r\n");
      const sendResult = await conn.readResponse();
      if (sendResult.code !== 250) {
        throw new Error(`Email send failed: ${sendResult.text}`);
      }
    } finally {
      if (conn) {
        await conn.close();
      }
    }
  }
}