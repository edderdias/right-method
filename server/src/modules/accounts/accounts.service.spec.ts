import { AccountsService } from "./accounts.service";

function createPrismaMock() {
  return {
    account: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };
}

describe("AccountsService", () => {
  let prisma: any;
  let service: AccountsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AccountsService(prisma as any);
  });

  describe("listForUser", () => {
    it("scopes the query by the given userId", async () => {
      prisma.account.findMany.mockResolvedValue([]);

      await service.listForUser("user-1");

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-1" } }),
      );
    });
  });

  describe("create", () => {
    it("creates an account with balance 0 when initialBalance is omitted", async () => {
      prisma.account.create.mockResolvedValue({ id: "acc-1" });

      await service.create("user-1", { name: "Conta corrente" });

      expect(prisma.account.create).toHaveBeenCalledWith({
        data: { userId: "user-1", name: "Conta corrente", balance: 0 },
      });
    });

    it("creates an account with the given initialBalance", async () => {
      prisma.account.create.mockResolvedValue({ id: "acc-1" });

      await service.create("user-1", { name: "Poupança", initialBalance: 250.5 });

      expect(prisma.account.create).toHaveBeenCalledWith({
        data: { userId: "user-1", name: "Poupança", balance: 250.5 },
      });
    });
  });
});
