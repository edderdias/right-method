import { CreditCardInvoiceStatus, CreditCardSource, Prisma } from "@prisma/client";

/**
 * Recomputes `availableLimit` for a MANUAL card as creditLimit minus every purchase whose invoice
 * hasn't been paid yet (current + future committed installments) — never a stored running total,
 * so it can't drift. OPEN_FINANCE cards are skipped: their limit is a snapshot from Pluggy's
 * creditData, refreshed only on sync.
 */
export async function recalculateCardAvailableLimit(
  tx: Prisma.TransactionClient,
  cardId: string,
): Promise<void> {
  const card = await tx.creditCard.findUnique({ where: { id: cardId } });
  if (!card || card.source !== CreditCardSource.MANUAL || card.creditLimit === null) {
    return;
  }

  const outstanding = await tx.creditCardPurchase.aggregate({
    where: { cardId, invoice: { status: { not: CreditCardInvoiceStatus.PAID } } },
    _sum: { amount: true },
  });
  const used = new Prisma.Decimal(outstanding._sum.amount ?? 0);

  await tx.creditCard.update({
    where: { id: cardId },
    data: { availableLimit: new Prisma.Decimal(card.creditLimit).minus(used) },
  });
}

/** Recomputes an invoice's `totalAmount` as the sum of its purchases. Shared by every write path
 * that adds/removes/moves a purchase (manual create/update/delete and the recurring-purchase scan)
 * so the invoice total never drifts from its purchases. */
export async function recalculateInvoiceTotal(
  tx: Prisma.TransactionClient,
  invoiceId: string,
): Promise<void> {
  const agg = await tx.creditCardPurchase.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  });
  await tx.creditCardInvoice.update({
    where: { id: invoiceId },
    data: { totalAmount: agg._sum.amount ?? 0 },
  });
}
