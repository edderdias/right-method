import { formatMonthKeyShort } from "@/lib/finance-format";

interface DepositLikeTransaction {
  type: string;
  amount: number;
  transactionDate: string;
}

export function buildMonthlyDepositSeries(transactions: DepositLikeTransaction[], months = 6) {
  const now = new Date();
  const monthKeys: { key: string; mes: string }[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthKeys.push({ key, mes: formatMonthKeyShort(key) });
  }
  return monthKeys.map(({ key, mes }) => ({
    mes,
    valor: transactions
      .filter((tx) => tx.type === "DEPOSIT" && tx.transactionDate.slice(0, 7) === key)
      .reduce((sum, tx) => sum + tx.amount, 0),
  }));
}
