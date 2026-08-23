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
