import { Injectable, Logger } from "@nestjs/common";
import { NotificationType, Prisma, type Notification } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { NotificationNotFoundException } from "../../common/exceptions/app.exception";

const RECENT_LIST_LIMIT = 20;

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  /** Identifies the source record (expense/invoice/goal milestone/investment) so a unique
   * (userId, type, entityId) constraint can silently no-op a repeat notification for the same
   * event instead of the caller needing to track "already notified" state itself. */
  entityId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Never throws — a notification failing to send must never break the flow that triggered it
   * (mirrors AuditLogService.record). Silently no-ops if the user has that category disabled, or
   * if this exact (userId, type, entityId) notification already exists. */
  async create(input: CreateNotificationInput): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          notifyBillDue: true,
          notifyCardInvoice: true,
          notifyGoalProgress: true,
          notifyLowBalance: true,
          notifyInvestment: true,
        },
      });
      if (!user) return;

      const enabled: Record<NotificationType, boolean> = {
        BILL_DUE: user.notifyBillDue,
        CARD_INVOICE_CLOSING: user.notifyCardInvoice,
        CARD_INVOICE_DUE: user.notifyCardInvoice,
        GOAL_MILESTONE: user.notifyGoalProgress,
        LOW_BALANCE: user.notifyLowBalance,
        INVESTMENT_INCOME: user.notifyInvestment,
        INVESTMENT_MATURITY: user.notifyInvestment,
      };
      if (!enabled[input.type]) return;

      await this.prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body,
          link: input.link,
          entityId: input.entityId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return;
      }
      this.logger.error(`Failed to create notification (${input.type})`, error as Error);
    }
  }

  /** Low-balance notifications have no natural entityId to de-dup on (it's a whole-account-balance
   * state, not a single record) — cap re-notification frequency by lookback window instead. */
  async hasRecent(userId: string, type: NotificationType, sinceHours: number): Promise<boolean> {
    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
    const existing = await this.prisma.notification.findFirst({
      where: { userId, type, createdAt: { gte: since } },
      select: { id: true },
    });
    return existing !== null;
  }

  async listRecent(userId: string): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: RECENT_LIST_LIMIT,
      }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);
    return { notifications, unreadCount };
  }

  async markRead(userId: string, id: string): Promise<void> {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true, readAt: new Date() },
    });
    if (result.count === 0) {
      throw new NotificationNotFoundException();
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
  }
}
