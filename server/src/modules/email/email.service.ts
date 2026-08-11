import { Injectable, Logger } from "@nestjs/common";
import { createTransport, type Transporter } from "nodemailer";
import { AppConfigService } from "../../config/app-config.service";
import {
  emailVerificationTemplate,
  newLoginTemplate,
  passwordChangedTemplate,
  passwordResetTemplate,
} from "./templates/email-templates";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly config: AppConfigService) {
    this.from = config.get("SMTP_FROM");
    this.transporter = createTransport({
      host: config.get("SMTP_HOST"),
      port: config.get("SMTP_PORT"),
      secure: config.get("SMTP_SECURE"),
      auth: config.get("SMTP_USER")
        ? { user: config.get("SMTP_USER"), pass: config.get("SMTP_PASSWORD") }
        : undefined,
    });
  }

  private async send(to: string, content: { subject: string; html: string }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: content.subject,
        html: content.html,
      });
    } catch (error) {
      // Email delivery failures must never break the auth flow that triggered them.
      this.logger.error(`Failed to send email to ${to}: ${(error as Error).message}`);
    }
  }

  sendEmailVerification(to: string, name: string, verifyUrl: string): Promise<void> {
    return this.send(to, emailVerificationTemplate(name, verifyUrl));
  }

  sendPasswordReset(to: string, name: string, resetUrl: string): Promise<void> {
    return this.send(to, passwordResetTemplate(name, resetUrl));
  }

  sendPasswordChanged(to: string, name: string): Promise<void> {
    return this.send(to, passwordChangedTemplate(name));
  }

  sendNewLoginAlert(to: string, name: string, ipAddress: string, userAgent: string): Promise<void> {
    return this.send(to, newLoginTemplate(name, ipAddress, userAgent));
  }
}
