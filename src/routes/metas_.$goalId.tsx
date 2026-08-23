import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Pause,
  Pencil,
  Play,
  PlusCircle,
  Sparkles,
  Trash2,
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArchiveGoalDialog } from "@/components/metas/archive-goal-dialog";
import { ContributionDialog } from "@/components/metas/contribution-dialog";
import { buildMonthlyDepositSeries } from "@/components/metas/goal-chart-utils";
import {
  GOAL_CATEGORY_ICONS,
  GOAL_CATEGORY_LABELS,
  GOAL_PACE_LABELS,
  GOAL_PRIORITY_LABELS,
} from "@/components/metas/financial-goal-category-meta";
import { FinancialGoalFormDialog } from "@/components/metas/financial-goal-form-dialog";
import { WithdrawalDialog } from "@/components/metas/withdrawal-dialog";
import {
  useFinancialGoal,
  useGoalTransactions,
  useLinkGoalInvestment,
  useRemoveGoalTransaction,
  useUnlinkGoalInvestment,
  useUpdateFinancialGoal,
} from "@/hooks/use-financial-goals";
import { useInvestments } from "@/hooks/use-investments";
import { requireAuth } from "@/lib/auth";
import { formatBRL, formatShortDate } from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type { GoalTransaction } from "@/types/financial-goal";

export const Route = createFileRoute("/metas_/$goalId")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Meta financeira | Método Certo" },
      {
        name: "description",
        content: "Detalhe de uma meta: progresso, prazo, projeção e histórico de aportes.",
      },
    ],
  }),
  component: MetaDetailPage,
});

function DeleteTransactionDialog({
  goalId,
  transaction,
  onOpenChange,
}: {
  goalId: string;
  transaction: GoalTransaction | null;
  onOpenChange: (open: boolean) => void;
}) {
  const removeTransaction = useRemoveGoalTransaction();

  function handleConfirm() {
    if (!transaction) return;
    removeTransaction.mutate(
      { goalId, transactionId: transaction.id },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={Boolean(transaction)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir lançamento?</DialogTitle>
          <DialogDescription>
            O saldo acumulado da meta será recalculado. Essa ação não poderá ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={removeTransaction.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={removeTransaction.isPending}
          >
            {removeTransaction.isPending ? (
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

function MetaDetailPage() {
  const { goalId } = Route.useParams();
  const navigate = useNavigate();

  const goalQuery = useFinancialGoal(goalId);
  const transactionsQuery = useGoalTransactions(goalId);
  const investmentsQuery = useInvestments();
  const updateGoal = useUpdateFinancialGoal();
  const linkInvestment = useLinkGoalInvestment();
  const unlinkInvestment = useUnlinkGoalInvestment();

  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [contributing, setContributing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GoalTransaction | null>(null);
  const [linkSelection, setLinkSelection] = useState("");

  const goal = goalQuery.data;
  const transactions = transactionsQuery.data ?? [];
  const depositSeries = buildMonthlyDepositSeries(transactions);
  const Icon = goal ? GOAL_CATEGORY_ICONS[goal.category] : null;

  const linkableInvestments = (investmentsQuery.data ?? []).filter(
    (investment) =>
      !(goal?.linkedInvestments ?? []).some((link) => link.investmentId === investment.id),
  );

  return (
    <AppShell>
      <div>
        <Link
          to="/metas"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Metas
        </Link>
      </div>

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {Icon && (
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              )}
              <div>
                {goalQuery.isLoading ? (
                  <Skeleton className="h-7 w-48" />
                ) : (
                  <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{goal?.name}</h1>
                )}
                {goal?.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{goal.description}</p>
                )}
                {goal && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-primary/12 px-2 py-0.5 text-xs font-medium text-primary">
                      {GOAL_CATEGORY_LABELS[goal.category]}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-info/12 px-2 py-0.5 text-xs font-medium text-info">
                      Prioridade {GOAL_PRIORITY_LABELS[goal.priority].toLowerCase()}
                    </span>
                    {goal.status === "PAUSED" && (
                      <span className="inline-flex items-center rounded-full bg-warning/12 px-2 py-0.5 text-xs font-medium text-warning">
                        Pausada
                      </span>
                    )}
                    {goal.status === "COMPLETED" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-xs font-medium text-primary">
                        <CheckCircle2 className="size-3" aria-hidden="true" /> Concluída
                      </span>
                    )}
                    {goal.isOverdue && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/12 px-2 py-0.5 text-xs font-medium text-destructive">
                        <AlertTriangle className="size-3" aria-hidden="true" /> Atrasada
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {goal && goal.status !== "ARCHIVED" && (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" className="rounded-xl" onClick={() => setEditing(true)}>
                  <Pencil className="size-4" aria-hidden="true" />
                  Editar
                </Button>
                {goal.status !== "COMPLETED" && (
                  <Button
                    variant="secondary"
                    className="rounded-xl"
                    disabled={updateGoal.isPending}
                    onClick={() =>
                      updateGoal.mutate({
                        id: goal.id,
                        input: { status: goal.status === "PAUSED" ? "ACTIVE" : "PAUSED" },
                      })
                    }
                  >
                    {goal.status === "PAUSED" ? (
                      <>
                        <Play className="size-4" aria-hidden="true" /> Reativar
                      </>
                    ) : (
                      <>
                        <Pause className="size-4" aria-hidden="true" /> Pausar
                      </>
                    )}
                  </Button>
                )}
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

          {goal && (
            <>
              <Progress value={goal.progressPct} className="h-2" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <p className="text-xs text-muted-foreground">Objetivo</p>
                  <p className="text-lg font-semibold">{formatBRL(goal.targetAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor atual</p>
                  <p className="text-lg font-semibold text-primary">
                    {formatBRL(goal.currentAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Restante</p>
                  <p className="text-lg font-semibold">{formatBRL(goal.remainingAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Progresso</p>
                  <p className="text-lg font-semibold">{goal.progressPct}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {goal.isOverdue ? "Atraso" : "Prazo"}
                  </p>
                  <p className="text-lg font-semibold">
                    {goal.isOverdue
                      ? `${Math.abs(goal.daysRemaining)} dias`
                      : `${goal.daysRemaining} dias`}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {goal?.status === "COMPLETED" && (
        <Card className="rounded-3xl border-primary/30 bg-primary/8 shadow-soft">
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Meta concluída!{" "}
              {goal.exceededAmount > 0 &&
                `Você guardou ${formatBRL(goal.exceededAmount)} acima do objetivo.`}
            </span>
          </CardContent>
        </Card>
      )}
      {goal && goal.isOverdue && (
        <Card className="rounded-3xl border-destructive/30 bg-destructive/8 shadow-soft">
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <AlertTriangle className="size-5 shrink-0 text-destructive" aria-hidden="true" />
            <span>Meta atrasada — faltam {formatBRL(goal.remainingAmount)} para o objetivo.</span>
          </CardContent>
        </Card>
      )}
      {goal &&
        !goal.isOverdue &&
        goal.status === "ACTIVE" &&
        goal.daysRemaining <= 30 &&
        goal.daysRemaining >= 0 && (
          <Card className="rounded-3xl border-warning/30 bg-warning/8 shadow-soft">
            <CardContent className="flex items-center gap-3 p-4 text-sm">
              <AlertTriangle className="size-5 shrink-0 text-warning" aria-hidden="true" />
              <span>Sua meta vence em {goal.daysRemaining} dias.</span>
            </CardContent>
          </Card>
        )}
      {goal && goal.paceStatus === "behind" && (
        <Card className="rounded-3xl border-warning/30 bg-warning/8 shadow-soft">
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <AlertTriangle className="size-5 shrink-0 text-warning" aria-hidden="true" />
            <span>Seu ritmo de aportes está abaixo do necessário para cumprir o prazo.</span>
          </CardContent>
        </Card>
      )}

      {goal && goal.status !== "ARCHIVED" && goal.status !== "COMPLETED" && (
        <div className="flex flex-wrap gap-2">
          <Button
            className="rounded-xl bg-gradient-brand font-semibold"
            onClick={() => setContributing(true)}
          >
            <PlusCircle className="size-4" aria-hidden="true" />
            Adicionar dinheiro
          </Button>
          <Button variant="secondary" className="rounded-xl" onClick={() => setWithdrawing(true)}>
            Retirar dinheiro
          </Button>
        </div>
      )}

      {goal && goal.remainingAmount > 0 && (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Quanto guardar</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Por mês</p>
                <p className="text-sm font-semibold">{formatBRL(goal.monthlyRequiredAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Por semana</p>
                <p className="text-sm font-semibold">{formatBRL(goal.weeklyRequiredAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Por dia</p>
                <p className="text-sm font-semibold">{formatBRL(goal.dailyRequiredAmount)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Projeção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Aporte médio: {formatBRL(goal.averageMonthlyContribution)}/mês
              </p>
              {goal.paceStatus && (
                <p
                  className={cn(
                    "text-sm font-semibold",
                    goal.paceStatus === "ahead" && "text-primary",
                    goal.paceStatus === "behind" && "text-destructive",
                  )}
                >
                  {GOAL_PACE_LABELS[goal.paceStatus]}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {goal.projectedCompletionDate
                  ? `Previsão de conclusão: ${formatShortDate(goal.projectedCompletionDate)}`
                  : "Registre aportes para ver uma previsão de conclusão."}
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Evolução da meta</CardTitle>
          <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={depositSeries}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickFormatter={(v: number) => `${v / 1000}k`}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                formatter={(v: number) => formatBRL(v)}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                }}
              />
              <Bar dataKey="valor" fill="var(--chart-1)" radius={[10, 10, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Histórico</CardTitle>
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
                  <TableHead>Observação</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatShortDate(transaction.transactionDate)}
                    </TableCell>
                    <TableCell>{transaction.type === "DEPOSIT" ? "Aporte" : "Retirada"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {transaction.description ?? "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold whitespace-nowrap",
                        transaction.type === "DEPOSIT" ? "text-primary" : "text-destructive",
                      )}
                    >
                      {transaction.type === "DEPOSIT" ? "+" : "-"}
                      {formatBRL(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg text-destructive hover:text-destructive"
                        aria-label="Excluir lançamento"
                        onClick={() => setDeleteTarget(transaction)}
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

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Investimentos vinculados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(goal?.linkedInvestments ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum investimento vinculado.</p>
          ) : (
            <div className="space-y-2">
              {goal!.linkedInvestments.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-sm"
                >
                  <span className="font-medium">{link.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{formatBRL(link.currentValue)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-destructive hover:text-destructive"
                      aria-label="Remover vínculo"
                      disabled={unlinkInvestment.isPending}
                      onClick={() =>
                        unlinkInvestment.mutate({ goalId, investmentId: link.investmentId })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {linkableInvestments.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Select value={linkSelection} onValueChange={setLinkSelection}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Vincular um investimento" />
                </SelectTrigger>
                <SelectContent>
                  {linkableInvestments.map((investment) => (
                    <SelectItem key={investment.id} value={investment.id}>
                      {investment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                className="rounded-xl"
                disabled={!linkSelection || linkInvestment.isPending}
                onClick={() => {
                  if (!linkSelection) return;
                  linkInvestment.mutate(
                    { goalId, investmentId: linkSelection },
                    { onSuccess: () => setLinkSelection("") },
                  );
                }}
              >
                Vincular
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            O vínculo é apenas informativo — o valor do investimento não é somado ao saldo da meta.
          </p>
        </CardContent>
      </Card>

      {goal && (
        <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
          <CardContent className="flex flex-wrap items-center gap-4 p-5">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <p className="min-w-60 flex-1 text-sm text-muted-foreground">
              <strong className="text-foreground">Certo IA:</strong>{" "}
              {goal.remainingAmount <= 0
                ? "Você já atingiu esta meta — considere criar uma nova ou revisar o objetivo."
                : goal.paceStatus === "ahead"
                  ? `Mantendo o ritmo atual de ${formatBRL(goal.averageMonthlyContribution)}/mês, você deve atingir a meta antes do prazo.`
                  : goal.paceStatus === "behind"
                    ? `No ritmo atual, a meta será atingida após o prazo definido. Tente aumentar o aporte para cerca de ${formatBRL(goal.monthlyRequiredAmount)}/mês.`
                    : `Faltam ${formatBRL(goal.remainingAmount)} para atingir sua meta. Continue guardando ${formatBRL(goal.monthlyRequiredAmount)}/mês para chegar no prazo.`}
            </p>
          </CardContent>
        </Card>
      )}

      <FinancialGoalFormDialog open={editing} onOpenChange={setEditing} goal={goal ?? null} />
      <ContributionDialog goal={goal ?? null} open={contributing} onOpenChange={setContributing} />
      <WithdrawalDialog goal={goal ?? null} open={withdrawing} onOpenChange={setWithdrawing} />
      <DeleteTransactionDialog
        goalId={goalId}
        transaction={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />
      {goal && (
        <ArchiveGoalDialog
          goal={archiving ? goal : null}
          onOpenChange={(open) => setArchiving(open)}
          onArchived={() => navigate({ to: "/metas" })}
        />
      )}
    </AppShell>
  );
}
