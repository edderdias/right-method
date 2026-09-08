import { CardPurchaseType, CreditCardSource, Prisma } from "@prisma/client";
import { recalculateCardAvailableLimit, recalculateInvoiceTotal } from "./credit-card-limit.util";

function createTxMock() {
  const tx: any = {
    creditCard: { findUnique: jest.fn(), update: jest.fn() },
    creditCardPurchase: { groupBy: jest.fn() },
    creditCardInvoice: { update: jest.fn() },
  };
  return tx;
}

describe("credit-card-limit.util", () => {
  describe("recalculateInvoiceTotal", () => {
    it("nets credits (estornos) against purchases for the invoice total", async () => {
      const tx = createTxMock();
      tx.creditCardPurchase.groupBy.mockResolvedValue([
        { type: CardPurchaseType.PURCHASE, _sum: { amount: new Prisma.Decimal(500) } },
        { type: CardPurchaseType.CREDIT, _sum: { amount: new Prisma.Decimal(120) } },
      ]);

      await recalculateInvoiceTotal(tx, "inv-1");

      const data = tx.creditCardInvoice.update.mock.calls[0][0].data;
      expect(Number(data.totalAmount)).toBe(380);
    });

    it("is zero for an invoice with no entries", async () => {
      const tx = createTxMock();
      tx.creditCardPurchase.groupBy.mockResolvedValue([]);

      await recalculateInvoiceTotal(tx, "inv-1");

      const data = tx.creditCardInvoice.update.mock.calls[0][0].data;
      expect(Number(data.totalAmount)).toBe(0);
    });

    it("can go negative when credits outweigh purchases", async () => {
      const tx = createTxMock();
      tx.creditCardPurchase.groupBy.mockResolvedValue([
        { type: CardPurchaseType.PURCHASE, _sum: { amount: new Prisma.Decimal(100) } },
        { type: CardPurchaseType.CREDIT, _sum: { amount: new Prisma.Decimal(150) } },
      ]);

      await recalculateInvoiceTotal(tx, "inv-1");

      const data = tx.creditCardInvoice.update.mock.calls[0][0].data;
      expect(Number(data.totalAmount)).toBe(-50);
    });
  });

  describe("recalculateCardAvailableLimit", () => {
    it("frees up limit for a credit that offsets an unpaid purchase", async () => {
      const tx = createTxMock();
      tx.creditCard.findUnique.mockResolvedValue({
        id: "card-1",
        source: CreditCardSource.MANUAL,
        creditLimit: new Prisma.Decimal(1000),
      });
      tx.creditCardPurchase.groupBy.mockResolvedValue([
        { type: CardPurchaseType.PURCHASE, _sum: { amount: new Prisma.Decimal(400) } },
        { type: CardPurchaseType.CREDIT, _sum: { amount: new Prisma.Decimal(150) } },
      ]);

      await recalculateCardAvailableLimit(tx, "card-1");

      const data = tx.creditCard.update.mock.calls[0][0].data;
      expect(Number(data.availableLimit)).toBe(750);
    });

    it("skips OPEN_FINANCE cards", async () => {
      const tx = createTxMock();
      tx.creditCard.findUnique.mockResolvedValue({
        id: "card-1",
        source: CreditCardSource.OPEN_FINANCE,
        creditLimit: new Prisma.Decimal(1000),
      });

      await recalculateCardAvailableLimit(tx, "card-1");

      expect(tx.creditCard.update).not.toHaveBeenCalled();
    });

    it("skips a card with no credit limit configured", async () => {
      const tx = createTxMock();
      tx.creditCard.findUnique.mockResolvedValue({
        id: "card-1",
        source: CreditCardSource.MANUAL,
        creditLimit: null,
      });

      await recalculateCardAvailableLimit(tx, "card-1");

      expect(tx.creditCard.update).not.toHaveBeenCalled();
    });
  });
});
