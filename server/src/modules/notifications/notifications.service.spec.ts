import { Prisma } from "@prisma/client";
import { NotificationsService } from "./notifications.service";

function createPrismaMock() {
  return {
    user: { findUnique: jest.fn() },
    notification: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

describe("NotificationsService", () => {
  let prisma: any;
  let service: NotificationsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new NotificationsService(prisma);
  });

  describe("create", () => {
    it("does not create a notification when the user has that category disabled", async () => {
      prisma.user.findUnique.mockResolvedValue({
        notifyBillDue: false,
        notifyCardInvoice: true,
        notifyGoalProgress: true,
        notifyLowBalance: true,
        notifyInvestment: true,
      });

      await service.create({ userId: "user-1", type: "BILL_DUE", title: "t", body: "b" });

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it("creates a notification when the matching category preference is enabled", async () => {
      prisma.user.findUnique.mockResolvedValue({
        notifyBillDue: true,
        notifyCardInvoice: true,
        notifyGoalProgress: true,
        notifyLowBalance: true,
        notifyInvestment: true,
      });

      await service.create({
        userId: "user-1",
        type: "BILL_DUE",
        title: "Conta a pagar",
        body: "vence em 3 dias",
        entityId: "expense-1",
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          type: "BILL_DUE",
          title: "Conta a pagar",
          body: "vence em 3 dias",
          link: undefined,
          entityId: "expense-1",
        },
      });
    });

    it("silently no-ops a duplicate (userId, type, entityId) instead of throwing", async () => {
      prisma.user.findUnique.mockResolvedValue({
        notifyBillDue: true,
        notifyCardInvoice: true,
        notifyGoalProgress: true,
        notifyLowBalance: true,
        notifyInvestment: true,
      });
      prisma.notification.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("duplicate", {
          code: "P2002",
          clientVersion: "5.22.0",
        }),
      );

      await expect(
        service.create({ userId: "user-1", type: "BILL_DUE", title: "t", body: "b" }),
      ).resolves.toBeUndefined();
    });
  });

  describe("hasRecent", () => {
    it("returns true when a notification of that type exists within the lookback window", async () => {
      prisma.notification.findFirst.mockResolvedValue({ id: "notif-1" });
      const result = await service.hasRecent("user-1", "LOW_BALANCE", 24);
      expect(result).toBe(true);
    });

    it("returns false when nothing matches", async () => {
      prisma.notification.findFirst.mockResolvedValue(null);
      const result = await service.hasRecent("user-1", "LOW_BALANCE", 24);
      expect(result).toBe(false);
    });
  });

  describe("markRead", () => {
    it("throws when the notification does not belong to the user", async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.markRead("user-1", "notif-x")).rejects.toThrow();
    });
  });
});
