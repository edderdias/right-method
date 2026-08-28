import { createFileRoute } from "@tanstack/react-router";

import { requireAuth } from "@/lib/auth";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Filter,
  Pencil,
  Plus,
  Repeat,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteExpenseDialog } from "@/components/despesas/delete-expense-dialog";
import { ExpenseFormDialog } from "@/components/despesas/expense-form-dialog";
import { PayExpenseDialog } from "@/components/despesas/pay-expense-dialog";
import {
  useExpenseCategories,
  useExpenses,
  useExpensesByCategory,
  useExpensesEvolution,
  useUpdateExpense,
} from "@/hooks/use-expenses";
import { useDashboardSummary } from "@/hooks/use-revenues";
import {
  formatBRL,
  formatMonthKeyShort,
  formatMonthYearLabel,
  formatShortDate,
  getLast30DaysRange,
  getLast6MonthsRange,
  getMonthRange,
} from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type { Expense, ExpenseStatus } from "@/types/finance";

export const Route = createFileRoute("/despesas")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Despesas | Método Certo" },
      {
        name: "description",
        content:
          "Controle seus gastos por categoria, veja o que está pago, a pagar e atrasado em um só lugar.",
      },
      { property: "og:title", content: "Controle de despesas | Método Certo" },
      {
        property: "og:description",
        content: "Gastos por categoria, evolução mensal e lançamentos do mês em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DespesasPage,
});

type PeriodMode = "month" | "last30days" | "last6months";

const STATUS_FILTERS: { key: "all" | ExpenseStatus; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "PENDING", label: "Pendente" },
  { key: "PAID", label: "Paga" },
  { key: "OVERDUE", label: "Atrasada" },
];

const STATUS_META: Record<
  ExpenseStatus,
  { label: string; variant: "default" | "secondary" | "destructive"; icon: typeof CheckCircle2 }
> = {
  PENDING: { label: "Pendente", variant: "secondary", icon: Clock },
  PAID: { label: "Paga", variant: "default", icon: CheckCircle2 },
  OVERDUE: { label: "Atrasada", variant: "destructive", icon: AlertTriangle },
};

function EmptyExpensesState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-warning/12 text-warning">
        <CreditCard className="size-7" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold">Nenhuma despesa cadastrada.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre sua primeira despesa para começar a acompanhar seus gastos.
        </p>
      </div>
      <Button className="rounded-xl bg-gradient-brand font-semibold" onClick={onCreate}>
        <Plus className="size-4" aria-hidden="true" />
        Nova despesa
      </Button>
    </div>
  );
}

function DespesasPage() {
  const today = new Date();
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [monthCursor, setMonthCursor] = useState({
    month: today.getMonth() + 1,
    year: today.getFullYear(),
  });
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ExpenseStatus>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [payingExpense, setPayingExpense] = useState<Expense | null>(null);

  const range =
    periodMode === "last30days"
      ? getLast30DaysRange()
      : periodMode === "last6months"
        ? getLast6MonthsRange()
        : getMonthRange(monthCursor.year, monthCursor.month);

  const categoriesQuery = useExpenseCategories();
  const expensesQuery = useExpenses({
    from: range.from,
    to: range.to,
    pageSize: 50,
    ...(categoryFilter !== "all" ? { categoryId: categoryFilter } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  });
  const summaryQuery = useDashboardSummary(range);
  const evolutionQuery = useExpensesEvolution(6);
  const byCategoryQuery = useExpensesByCategory(range);
  const updateExpense = useUpdateExpense();

  const expenses = expensesQuery.data?.items ?? [];
  const totalCount = expensesQuery.data?.total ?? 0;
  const noFiltersActive = categoryFilter === "all" && statusFilter === "all";
  const byCategory = byCategoryQuery.data ?? [];
  const byCategoryTotal = byCategory.reduce((sum, item) => sum + item.total, 0);

  function openCreateDialog() {
    setEditingExpense(null);
    setFormOpen(true);
  }

  function openEditDialog(expense: Expense) {
    setEditingExpense(expense);
    setFormOpen(true);
  }

  function toggleStatus(expense: Expense) {
    if (expense.status === "PAID") {
      updateExpense.mutate({ id: expense.id, payload: { status: "PENDING" } });
      return;
    }
    setPayingExpense(expense);
  }

  function goToPreviousMonth() {
    setPeriodMode("month");
    setMonthCursor((cursor) =>
      cursor.month === 1
        ? { month: 12, year: cursor.year - 1 }
        : { month: cursor.month - 1, year: cursor.year },
    );
  }

  function goToNextMonth() {
    setPeriodMode("month");
    setMonthCursor((cursor) =>
      cursor.month === 12
        ? { month: 1, year: cursor.year + 1 }
        : { month: cursor.month + 1, year: cursor.year },
    );
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Despesas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Para onde o seu dinheiro foi, com dados reais das suas contas.
          </p>
        </div>
        <Button className="rounded-xl bg-gradient-brand font-semibold" onClick={openCreateDialog}>
          <Plus className="size-4" aria-hidden="true" />
          Nova despesa
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {periodMode === "month" && (
          <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              onClick={goToPreviousMonth}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-36 text-center text-sm font-medium">
              {formatMonthYearLabel(monthCursor.month, monthCursor.year)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              onClick={goToNextMonth}
              aria-label="Próximo mês"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setPeriodMode("month")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            periodMode === "month"
              ? "bg-primary text-primary-foreground"
              : "bg-surface-2 text-muted-foreground hover:text-foreground",
          )}
        >
          Este mês
        </button>
        <button
          type="button"
          onClick={() => setPeriodMode("last30days")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            periodMode === "last30days"
              ? "bg-primary text-primary-foreground"
              : "bg-surface-2 text-muted-foreground hover:text-foreground",
          )}
        >
          Últimos 30 dias
        </button>
        <button
          type="button"
          onClick={() => setPeriodMode("last6months")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            periodMode === "last6months"
              ? "bg-primary text-primary-foreground"
              : "bg-surface-2 text-muted-foreground hover:text-foreground",
          )}
        >
          Últimos 6 meses
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Pago no período</p>
            {summaryQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {formatBRL(summaryQuery.data?.expenses.total ?? 0)}
              </p>
            )}
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-1 text-xs font-medium text-warning">
              <ArrowDownRight className="size-3" aria-hidden="true" /> despesas pagas
            </span>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">A pagar</p>
            {summaryQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {formatBRL(summaryQuery.data?.expenses.pending ?? 0)}
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">Despesas pendentes no período</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Atrasadas</p>
            {summaryQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight text-destructive">
                {formatBRL(summaryQuery.data?.expenses.overdue ?? 0)}
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">Vencidas e ainda não pagas</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl border-border/70 shadow-soft xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Evolução das despesas</CardTitle>
            <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
          </CardHeader>
          <CardContent className="h-72">
            {evolutionQuery.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={(evolutionQuery.data ?? []).map((point) => ({
                    mes: formatMonthKeyShort(point.month),
                    valor: point.total,
                  }))}
                >
                  <defs>
                    <linearGradient id="desp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(v: number) => `${v / 1000}k`}
                  />
                  <Tooltip
                    formatter={(v: number) => formatBRL(v)}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--popover)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="var(--chart-2)"
                    strokeWidth={2.5}
                    fill="url(#desp)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Para onde foi o dinheiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {byCategoryQuery.isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma despesa paga neste período.
              </p>
            ) : (
              byCategory.map((item) => {
                const pct =
                  byCategoryTotal > 0 ? Math.round((item.total / byCategoryTotal) * 100) : 0;
                return (
                  <div key={item.categoryId} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <span className="grid size-8 place-items-center rounded-xl bg-warning/12 text-warning">
                          <ArrowDownRight className="size-4" aria-hidden="true" />
                        </span>
                        {item.name}
                      </span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <p className="text-xs text-muted-foreground">{formatBRL(item.total)}</p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardHeader className="flex-col items-stretch gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold">Lançamentos</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              aria-pressed={categoryFilter === "all"}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                categoryFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-2 text-muted-foreground hover:text-foreground",
              )}
            >
              Todas categorias
            </button>
            {(categoriesQuery.data ?? []).map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryFilter(category.id)}
                aria-pressed={categoryFilter === category.id}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  categoryFilter === category.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-2 text-muted-foreground hover:text-foreground",
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status.key}
                type="button"
                onClick={() => setStatusFilter(status.key)}
                aria-pressed={statusFilter === status.key}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  statusFilter === status.key
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-surface-2 text-muted-foreground hover:text-foreground",
                )}
              >
                {status.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {expensesQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          ) : expensesQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar suas despesas.
              </p>
              <Button variant="outline" onClick={() => expensesQuery.refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : totalCount === 0 && noFiltersActive ? (
            <EmptyExpensesState onCreate={openCreateDialog} />
          ) : expenses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma despesa encontrada para os filtros selecionados.
            </p>
          ) : (
            expenses.map((expense) => {
              const statusMeta = STATUS_META[expense.status];
              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
                      <ArrowDownRight className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{expense.description}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {expense.category.name} · {formatShortDate(expense.dueDate)}
                        {expense.isRecurring && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-info/12 px-2 py-0.5 text-info">
                            <Repeat className="size-3" aria-hidden="true" /> recorrente
                          </span>
                        )}
                        {expense.isInstallment && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-info/12 px-2 py-0.5 text-info">
                            <CreditCard className="size-3" aria-hidden="true" />
                            {expense.installmentNumber}/{expense.installmentTotal}
                          </span>
                        )}
                        <Badge variant={statusMeta.variant} className="gap-1">
                          <statusMeta.icon className="size-3" aria-hidden="true" />
                          {statusMeta.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="mr-1 text-sm font-semibold text-warning">
                      −{formatBRL(expense.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg"
                      aria-label={
                        expense.status === "PAID" ? "Marcar como pendente" : "Marcar como paga"
                      }
                      onClick={() => toggleStatus(expense)}
                    >
                      {expense.status === "PAID" ? (
                        <RotateCcw className="size-4" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg"
                      aria-label="Editar despesa"
                      onClick={() => openEditDialog(expense)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg text-destructive hover:text-destructive"
                      aria-label="Excluir despesa"
                      onClick={() => setDeletingExpense(expense)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <ExpenseFormDialog open={formOpen} onOpenChange={setFormOpen} expense={editingExpense} />
      <DeleteExpenseDialog
        expense={deletingExpense}
        onOpenChange={(open) => {
          if (!open) setDeletingExpense(null);
        }}
      />
      <PayExpenseDialog
        expense={payingExpense}
        onOpenChange={(open) => {
          if (!open) setPayingExpense(null);
        }}
      />
    </AppShell>
  );
}
