import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  Loader2,
  Pencil,
  PlusCircle,
  Trash2,
  Wifi,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArchiveInvestmentDialog } from "@/components/investimentos/archive-investment-dialog";
import { ContributionDialog } from "@/components/investimentos/contribution-dialog";
import { IncomeDialog } from "@/components/investimentos/income-dialog";
import { InvestmentFormDialog } from "@/components/investimentos/investment-form-dialog";
import {
  INVESTMENT_INCOME_TYPE_LABELS,
  INVESTMENT_TRANSACTION_TYPE_LABELS,
  INVESTMENT_TYPE_LABELS,
  isFixedIncomeType,
} from "@/components/investimentos/investment-type-meta";
import { WithdrawalDialog } from "@/components/investimentos/withdrawal-dialog";
import {
  useInvestment,
  useInvestmentIncomes,
  useInvestmentTransactions,
  useRemoveIncome,
  useRemoveTransaction,
} from "@/hooks/use-investments";
import { requireAuth } from "@/lib/auth";
import { formatBRL, formatShortDate } from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type { InvestmentIncome, InvestmentTransaction } from "@/types/investment";

export const Route = createFileRoute("/investimentos_/$investmentId")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Investimento | Método Certo" },
      {
        name: "description",
        content: "Detalhe de um investimento: posição, aportes, resgates e rendimentos.",
      },
    ],
  }),
  component: InvestimentoDetailPage,
});

type DeleteTarget =
  | { kind: "transaction"; transaction: InvestmentTransaction }
  | { kind: "income"; income: InvestmentIncome };

function DeleteEntryDialog({
  investmentId,
  target,
  onOpenChange,
}: {
  investmentId: string;
  target: DeleteTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const removeTransaction = useRemoveTransaction();
  const removeIncome = useRemoveIncome();
  const pending = removeTransaction.isPending || removeIncome.isPending;

  function handleConfirm() {
    if (!target) return;
    if (target.kind === "transaction") {
      removeTransaction.mutate(
        { investmentId, transactionId: target.transaction.id },
        { onSuccess: () => onOpenChange(false) },
      );
      return;
    }
    removeIncome.mutate(
      { investmentId, incomeId: target.income.id },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {target?.kind === "income" ? "Excluir rendimento?" : "Excluir lançamento?"}
          </DialogTitle>
          <DialogDescription>
            {target?.kind === "transaction"
              ? "A posição do investimento (quantidade, preço médio e valor investido) será recalculada."
              : "Essa ação não poderá ser desfeita."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Excluindo...
              </>
            ) : (
              "Excluir"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvestimentoDetailPage() {
  const { investmentId } = Route.useParams();
  const navigate = useNavigate();

  const investmentQuery = useInvestment(investmentId);
  const transactionsQuery = useInvestmentTransactions(investmentId);
  const incomesQuery = useInvestmentIncomes(investmentId);

  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [contributing, setContributing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [recordingIncome, setRecordingIncome] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const investment = investmentQuery.data;
  const transactions = transactionsQuery.data ?? [];
  const incomes = incomesQuery.data ?? [];

  const returnValue = investment ? investment.currentValue - investment.investedAmount : 0;
  const returnPct =
    investment && investment.investedAmount > 0
      ? (returnValue / investment.investedAmount) * 100
      : 0;
  const positive = returnValue >= 0;

  return (
    <AppShell>
      <div>
        <Link
          to="/investimentos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Investimentos
        </Link>
      </div>

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {investmentQuery.isLoading ? (
                <Skeleton className="h-7 w-48" />
              ) : (
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {investment?.name}
                </h1>
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                {investment ? INVESTMENT_TYPE_LABELS[investment.type] : ""}
                {investment?.ticker ? ` · ${investment.ticker}` : ""}
                {investment?.institutionName ? ` · ${investment.institutionName}` : ""}
              </p>
              <span
                className={cn(
                  "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  investment?.source === "OPEN_FINANCE"
                    ? "bg-primary/12 text-primary"
                    : "bg-info/12 text-info",
                )}
              >
                {investment?.source === "OPEN_FINANCE" ? (
                  <>
                    <Wifi className="size-3" aria-hidden="true" /> Open Finance
                  </>
                ) : (
                  "Cadastro manual"
                )}
              </span>
            </div>

            {investment?.source === "MANUAL" && (
              <div className="flex items-center gap-2">
                <Button variant="secondary" className="rounded-xl" onClick={() => setEditing(true)}>
                  <Pencil className="size-4" aria-hidden="true" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-xl text-destructive"
                  onClick={() => setArchiving(true)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Excluir
                </Button>
              </div>
            )}
          </div>

          {investment && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Valor aplicado</p>
                <p className="text-lg font-semibold">{formatBRL(investment.investedAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor atual</p>
                <p className="text-lg font-semibold">{formatBRL(investment.currentValue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rentabilidade</p>
                <p
                  className={cn(
                    "flex items-center gap-1 text-lg font-semibold",
                    positive ? "text-primary" : "text-destructive",
                  )}
                >
                  {positive ? (
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  ) : (
                    <ArrowDownRight className="size-4" aria-hidden="true" />
                  )}
                  {positive ? "+" : ""}
                  {returnPct.toFixed(2)}%
                </p>
              </div>
            </div>
          )}

          {investment && (
            <p className="text-xs text-muted-foreground">
              Preço atual:{" "}
              {investment.currentPrice !== null
                ? formatBRL(investment.currentPrice)
                : "Não disponível"}
            </p>
          )}
        </CardContent>
      </Card>

      {investment && isFixedIncomeType(investment.type) && (
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Dados de renda fixa</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Emissor</p>
              <p className="text-sm font-medium">{investment.issuer ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Taxa</p>
              <p className="text-sm font-medium">{investment.rate ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Indexador</p>
              <p className="text-sm font-medium">{investment.indexer ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vencimento</p>
              <p className="text-sm font-medium">
                {investment.maturityDate ? formatShortDate(investment.maturityDate) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Liquidez</p>
              <p className="text-sm font-medium">{investment.liquidity ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {investment?.source === "MANUAL" && (
        <div className="flex flex-wrap gap-2">
          <Button
            className="rounded-xl bg-gradient-brand font-semibold"
            onClick={() => setContributing(true)}
          >
            <PlusCircle className="size-4" aria-hidden="true" />
            Registrar aporte
          </Button>
          <Button variant="secondary" className="rounded-xl" onClick={() => setWithdrawing(true)}>
            Registrar resgate
          </Button>
          <Button
            variant="secondary"
            className="rounded-xl"
            onClick={() => setRecordingIncome(true)}
          >
            Registrar rendimento
          </Button>
        </div>
      )}

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Lançamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsQuery.isLoading ? (
            <Skeleton className="h-24 w-full rounded-2xl" />
          ) : transactions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum lançamento ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ganho/perda</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatShortDate(transaction.transactionDate)}
                    </TableCell>
                    <TableCell>{INVESTMENT_TRANSACTION_TYPE_LABELS[transaction.type]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {transaction.quantity ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap">
                      {formatBRL(transaction.amount)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right whitespace-nowrap",
                        transaction.realizedGain === null
                          ? "text-muted-foreground"
                          : transaction.realizedGain >= 0
                            ? "text-primary"
                            : "text-destructive",
                      )}
                    >
                      {transaction.realizedGain !== null
                        ? `${transaction.realizedGain >= 0 ? "+" : ""}${formatBRL(transaction.realizedGain)}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {transaction.source === "MANUAL" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-destructive hover:text-destructive"
                          aria-label="Excluir lançamento"
                          onClick={() => setDeleteTarget({ kind: "transaction", transaction })}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Rendimentos</CardTitle>
        </CardHeader>
        <CardContent>
          {incomesQuery.isLoading ? (
            <Skeleton className="h-24 w-full rounded-2xl" />
          ) : incomes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum rendimento ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatShortDate(income.paymentDate)}
                    </TableCell>
                    <TableCell>{INVESTMENT_INCOME_TYPE_LABELS[income.type]}</TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap text-primary">
                      +{formatBRL(income.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg text-destructive hover:text-destructive"
                        aria-label="Excluir rendimento"
                        onClick={() => setDeleteTarget({ kind: "income", income })}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InvestmentFormDialog
        open={editing}
        onOpenChange={setEditing}
        investment={investment ?? null}
      />
      <ContributionDialog
        investment={investment ?? null}
        open={contributing}
        onOpenChange={setContributing}
      />
      <WithdrawalDialog
        investment={investment ?? null}
        open={withdrawing}
        onOpenChange={setWithdrawing}
      />
      <IncomeDialog
        investment={investment ?? null}
        open={recordingIncome}
        onOpenChange={setRecordingIncome}
      />
      <DeleteEntryDialog
        investmentId={investmentId}
        target={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />
      {investment && (
        <ArchiveInvestmentDialog
          investment={archiving ? investment : null}
          onOpenChange={(open) => setArchiving(open)}
          onArchived={() => navigate({ to: "/investimentos" })}
        />
      )}
    </AppShell>
  );
}
