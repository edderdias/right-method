import { Prisma, RecurrenceType, RevenueStatus } from "@prisma/client";
import {
  FinanceAccountNotFoundException,
  RevenueNotFoundException,
} from "../../common/exceptions/app.exception";
import { RevenuesService } from "./revenues.service";
import type { CreateRevenueDto } from "./dto/create-revenue.dto";

function buildRevenue(overrides: Record<string, unknown> = {}) {
  return {
    id: "rev-1",
    userId: "user-1",
    description: "Salário",
    amount: new Prisma.Decimal(1000),
    categoryId: "cat-1",
    accountId: "acc-1",
    dueDate: new Date("2099-01-01T00:00:00.000Z"),
    receivedAt: null,
    status: RevenueStatus.PENDING,
    notes: null,
    isRecurring: false,
    recurrenceType: null,
    recurrenceEndDate: null,
    parentRevenueId: null,
    installmentGroupId: null,
    installmentNumber: null,
    installmentTotal: null,
    attachmentUrl: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    category: {
      id: "cat-1",
      name: "Salário",
      type: "REVENUE",
      userId: null,
      createdAt: new Date(),
    },
    account: {
      id: "acc-1",
      userId: "user-1",
      name: "Conta corrente",
      balance: new Prisma.Decimal(0),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  };
}

function buildCreateDto(overrides: Partial<CreateRevenueDto> = {}): CreateRevenueDto {
  return {
    description: "Salário",
    amount: 1000,
    categoryId: "cat-1",
    accountId: "acc-1",
    dueDate: "2026-08-05",
    ...overrides,
  } as CreateRevenueDto;
}

function createPrismaMock() {
  const prisma: any = {
    revenue: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    account: {
      update: jest.fn(),
    },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: unknown) => unknown) => callback(prisma));
  return prisma;
}

describe("RevenuesService", () => {
  let prisma: any;
  let accountsService: any;
  let categoriesService: any;
  let service: RevenuesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    accountsService = { assertOwnership: jest.fn().mockResolvedValue({ id: "acc-1" }) };
    categoriesService = { assertOwnershipOrGlobal: jest.fn().mockResolvedValue({ id: "cat-1" }) };
    service = new RevenuesService(prisma, accountsService, categoriesService);
  });

  describe("create", () => {
    it("creates a PENDING revenue without touching the account balance", async () => {
      prisma.revenue.create.mockResolvedValue(buildRevenue({ status: RevenueStatus.PENDING }));

      const result = await service.create("user-1", buildCreateDto());

      expect(prisma.revenue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: RevenueStatus.PENDING }),
        }),
      );
      expect(prisma.account.update).not.toHaveBeenCalled();
      expect(result.status).toBe(RevenueStatus.PENDING);
    });

    it("creates a RECEIVED revenue and increments the destination account balance", async () => {
      prisma.revenue.create.mockResolvedValue(buildRevenue({ status: RevenueStatus.RECEIVED }));

      await service.create("user-1", buildCreateDto({ status: "RECEIVED" }));

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: "acc-1" },
        data: { balance: { increment: 1000 } },
      });
    });

    it("rejects when the destination account does not belong to the user", async () => {
      accountsService.assertOwnership.mockRejectedValue(new FinanceAccountNotFoundException());

      await expect(service.create("user-1", buildCreateDto())).rejects.toBeInstanceOf(
        FinanceAccountNotFoundException,
      );
      expect(prisma.revenue.create).not.toHaveBeenCalled();
    });
  });

  describe("update — ownership", () => {
    it("throws RevenueNotFoundException for a revenue that does not belong to the user", async () => {
      prisma.revenue.findFirst.mockResolvedValue(null);

      await expect(
        service.update("user-1", "rev-x", { description: "Novo" }),
      ).rejects.toBeInstanceOf(RevenueNotFoundException);
      expect(prisma.revenue.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "rev-x", userId: "user-1" }),
        }),
      );
    });
  });

  describe("update — balance impact", () => {
    it("increments the account balance when a PENDING revenue becomes RECEIVED", async () => {
      const existing = buildRevenue({
        status: RevenueStatus.PENDING,
        amount: new Prisma.Decimal(1000),
      });
      prisma.revenue.findFirst.mockResolvedValueOnce(existing);
      prisma.revenue.update.mockResolvedValue({ ...existing, status: RevenueStatus.RECEIVED });

      const result = await service.update("user-1", "rev-1", { status: "RECEIVED" });

      expect(prisma.account.update).toHaveBeenCalledTimes(1);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: "acc-1" },
        data: { balance: { increment: 1000 } },
      });
      expect(result.status).toBe(RevenueStatus.RECEIVED);
    });

    it("decrements the account balance and clears receivedAt when RECEIVED becomes PENDING", async () => {
      const existing = buildRevenue({
        status: RevenueStatus.RECEIVED,
        amount: new Prisma.Decimal(800),
      });
      prisma.revenue.findFirst.mockResolvedValueOnce(existing);
      prisma.revenue.update.mockResolvedValue({
        ...existing,
        status: RevenueStatus.PENDING,
        receivedAt: null,
      });

      await service.update("user-1", "rev-1", { status: "PENDING" });

      expect(prisma.account.update).toHaveBeenCalledTimes(1);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: "acc-1" },
        data: { balance: { decrement: existing.amount } },
      });
      const updateData = prisma.revenue.update.mock.calls[0][0].data;
      expect(updateData.receivedAt).toBeNull();
    });

    it("applies only the delta when the amount changes but status stays RECEIVED on the same account", async () => {
      const existing = buildRevenue({
        status: RevenueStatus.RECEIVED,
        amount: new Prisma.Decimal(1000),
      });
      prisma.revenue.findFirst.mockResolvedValueOnce(existing);
      prisma.revenue.update.mockResolvedValue({ ...existing, amount: new Prisma.Decimal(1500) });

      await service.update("user-1", "rev-1", { amount: 1500 });

      expect(prisma.account.update).toHaveBeenCalledTimes(1);
      const call = prisma.account.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: "acc-1" });
      expect((call.data.balance.increment as Prisma.Decimal).toNumber()).toBeCloseTo(500);
    });

    it("reverses the old account and applies to the new one when the destination account changes", async () => {
      const existing = buildRevenue({
        status: RevenueStatus.RECEIVED,
        amount: new Prisma.Decimal(1000),
      });
      prisma.revenue.findFirst.mockResolvedValueOnce(existing);
      accountsService.assertOwnership.mockResolvedValue({ id: "acc-2" });
      prisma.revenue.update.mockResolvedValue({ ...existing, accountId: "acc-2" });

      await service.update("user-1", "rev-1", { accountId: "acc-2" });

      expect(accountsService.assertOwnership).toHaveBeenCalledWith("user-1", "acc-2");
      expect(prisma.account.update).toHaveBeenCalledTimes(2);
      expect(prisma.account.update).toHaveBeenNthCalledWith(1, {
        where: { id: "acc-1" },
        data: { balance: { decrement: existing.amount } },
      });
      expect(prisma.account.update).toHaveBeenNthCalledWith(2, {
        where: { id: "acc-2" },
        data: { balance: { increment: 1000 } },
      });
    });

    it("never writes to the balance when a PENDING revenue's amount changes", async () => {
      const existing = buildRevenue({
        status: RevenueStatus.PENDING,
        amount: new Prisma.Decimal(1000),
      });
      prisma.revenue.findFirst.mockResolvedValueOnce(existing);
      prisma.revenue.update.mockResolvedValue({ ...existing, amount: new Prisma.Decimal(1200) });

      await service.update("user-1", "rev-1", { amount: 1200 });

      expect(prisma.account.update).not.toHaveBeenCalled();
    });

    it("does not duplicate the balance impact when RECEIVED stays RECEIVED with nothing relevant changed", async () => {
      const existing = buildRevenue({
        status: RevenueStatus.RECEIVED,
        amount: new Prisma.Decimal(1000),
      });
      prisma.revenue.findFirst.mockResolvedValueOnce(existing);
      prisma.revenue.update.mockResolvedValue(existing);

      await service.update("user-1", "rev-1", { description: "Novo nome" });

      expect(prisma.account.update).not.toHaveBeenCalled();
    });
  });

  describe("update — recurring next occurrence", () => {
    it("generates exactly one next occurrence when a recurring revenue becomes RECEIVED", async () => {
      const existing = buildRevenue({
        status: RevenueStatus.PENDING,
        isRecurring: true,
        recurrenceType: RecurrenceType.MONTHLY,
        dueDate: new Date("2026-08-05T00:00:00.000Z"),
      });
      prisma.revenue.findFirst
        .mockResolvedValueOnce(existing) // ownership lookup
        .mockResolvedValueOnce(null); // no existing child yet
      prisma.revenue.update.mockResolvedValue({ ...existing, status: RevenueStatus.RECEIVED });

      await service.update("user-1", "rev-1", { status: "RECEIVED" });

      expect(prisma.revenue.create).toHaveBeenCalledTimes(1);
      const createData = prisma.revenue.create.mock.calls[0][0].data;
      expect(createData.parentRevenueId).toBe("rev-1");
      expect(createData.status).toBe(RevenueStatus.PENDING);
      expect((createData.dueDate as Date).toISOString().slice(0, 10)).toBe("2026-09-05");
    });

    it("does not create a duplicate occurrence when a child already exists for the parent", async () => {
      const existing = buildRevenue({
        status: RevenueStatus.PENDING,
        isRecurring: true,
        recurrenceType: RecurrenceType.MONTHLY,
      });
      prisma.revenue.findFirst
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ id: "child-1", parentRevenueId: "rev-1" });
      prisma.revenue.update.mockResolvedValue({ ...existing, status: RevenueStatus.RECEIVED });

      await service.update("user-1", "rev-1", { status: "RECEIVED" });

      expect(prisma.revenue.create).not.toHaveBeenCalled();
    });

    it("does not generate an occurrence past the recurrence end date", async () => {
      const existing = buildRevenue({
        status: RevenueStatus.PENDING,
        isRecurring: true,
        recurrenceType: RecurrenceType.MONTHLY,
        dueDate: new Date("2026-08-05T00:00:00.000Z"),
        recurrenceEndDate: new Date("2026-08-20T00:00:00.000Z"),
      });
      prisma.revenue.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(null);
      prisma.revenue.update.mockResolvedValue({ ...existing, status: RevenueStatus.RECEIVED });

      await service.update("user-1", "rev-1", { status: "RECEIVED" });

      expect(prisma.revenue.create).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("reverses the balance impact and deletes when the revenue was RECEIVED", async () => {
      const existing = buildRevenue({
        status: RevenueStatus.RECEIVED,
        amount: new Prisma.Decimal(500),
      });
      prisma.revenue.findFirst.mockResolvedValue(existing);

      await service.remove("user-1", "rev-1");

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: "acc-1" },
        data: { balance: { decrement: existing.amount } },
      });
      expect(prisma.revenue.delete).toHaveBeenCalledWith({ where: { id: "rev-1" } });
    });

    it("deletes without touching the balance when the revenue was PENDING", async () => {
      const existing = buildRevenue({ status: RevenueStatus.PENDING });
      prisma.revenue.findFirst.mockResolvedValue(existing);

      await service.remove("user-1", "rev-1");

      expect(prisma.account.update).not.toHaveBeenCalled();
      expect(prisma.revenue.delete).toHaveBeenCalledWith({ where: { id: "rev-1" } });
    });

    it("throws when the revenue does not belong to the user", async () => {
      prisma.revenue.findFirst.mockResolvedValue(null);

      await expect(service.remove("user-1", "rev-x")).rejects.toBeInstanceOf(
        RevenueNotFoundException,
      );
      expect(prisma.revenue.delete).not.toHaveBeenCalled();
    });
  });
});
