import { CardPurchaseType, CreditCardInvoiceStatus, CreditCardSource, Prisma } from "@prisma/client";

/** Nets CREDIT rows (estornos) against PURCHASE rows from a `groupBy(["type"])` result — a credit
 * subtracts from the total instead of adding to it. */
function netAmountByType(rows: { type: CardPurchaseType; _sum: { amount: Prisma.Decimal | null } }[]): Prisma.Decimal {
  return rows.reduce((total, row) => {
    const amount = new Prisma.Decimal(row._sum.amount ?? 0);
    return row.type === CardPurchaseType.CREDIT ? total.minus(amount) : total.plus(amount);
  }, new Prisma.Decimal(0));
}

/**
 * Recomputes `availableLimit` for a MANUAL card as creditLimit minus every purchase whose invoice
 * hasn't been paid yet (current + future committed installments), netting out credits/estornos —
 * never a stored running total, so it can't drift. OPEN_FINANCE cards are skipped: their limit is
 * a snapshot from Pluggy's creditData, refreshed only on sync.
 */
export async function recalculateCardAvailableLimit(
  tx: Prisma.TransactionClient,
  cardId: string,
): Promise<void> {
  const card = await tx.creditCard.findUnique({ where: { id: cardId } });
  if (!card || card.source !== CreditCardSource.MANUAL || card.creditLimit === null) {
    return;
  }

  const grouped = await tx.creditCardPurchase.groupBy({
    by: ["type"],
    where: { cardId, invoice: { status: { not: CreditCardInvoiceStatus.PAID } } },
    _sum: { amount: true },
  });
  const used = netAmountByType(grouped);

  await tx.creditCard.update({
    where: { id: cardId },
    data: { availableLimit: new Prisma.Decimal(card.creditLimit).minus(used) },
  });
}

/** Recomputes an invoice's `totalAmount` as the sum of its purchases minus its credits/estornos.
 * Shared by every write path that adds/removes/moves a purchase (manual create/update/delete and
 * the recurring-purchase scan) so the invoice total never drifts from its entries. */
export async function recalculateInvoiceTotal(
  tx: Prisma.TransactionClient,
  invoiceId: string,
): Promise<void> {
  const grouped = await tx.creditCardPurchase.groupBy({
    by: ["type"],
    where: { invoiceId },
    _sum: { amount: true },
  });
  const total = netAmountByType(grouped);

  await tx.creditCardInvoice.update({
    where: { id: invoiceId },
    data: { totalAmount: total },
  });
}
