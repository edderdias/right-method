import { Injectable, Logger } from "@nestjs/common";
import type { AuditEvent } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import type { RequestMetadata } from "../../common/utils/request-metadata";

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditEvent, metadata: RequestMetadata, userId?: string): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          event,
          userId,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      });
    } catch (error) {
      // Auditing must never break the request flow it's observing.
      this.logger.error(`Failed to record audit event ${event}`, error as Error);
    }
  }
}
