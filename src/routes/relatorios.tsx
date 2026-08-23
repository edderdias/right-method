import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Download,
  Landmark,
  LineChart as LineChartIcon,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { requireAuth } from "@/lib/auth";
import { AppShell, brl } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts, useDashboardSummary, useRevenuesEvolution } from "@/hooks/use-revenues";
import { useExpenseCategories, useExpensesEvolution } from "@/hooks/use-expenses";
import { useCreditCardsSummary } from "@/hooks/use-credit-cards";
import { useFinancialGoalsSummary } from "@/hooks/use-financial-goals";
import { useInvestmentsSummary } from "@/hooks/use-investments";
import {
  useReportCashFlow,
  useReportExpensesByCategory,
  useReportSummary,
  useReportTopExpenses,
} from "@/hooks/use-reports";
import {
  formatMonthKeyShort,
  formatShortDate,
  parseISODateToLocalDate,
  toISODateString,
} from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type { ReportPeriodPreset, ReportsQueryParams } from "@/types/report";

export const Route = createFileRoute("/relatorios")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Relatórios financeiros | Método Certo" },
      {
        name: "description",
        content:
          "Central de relatórios financeiros: receitas, despesas, fluxo de caixa, cartões, investimentos, metas e patrimônio.",
      },
      { property: "og:title", content: "Relatórios financeiros | Método Certo" },
      {
        property: "og:description",
        content: "Analise receitas, despesas, fluxo de caixa e patrimônio com dados reais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RelatoriosPage,
});

type PeriodOption = ReportPeriodPreset | "custom";

const PERIOD_OPTIONS: Array<{ value: PeriodOption; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "this_week", label: "Esta semana" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês anterior" },
  { value: "last_3_months", label: "Últimos 3 meses" },
  { value: "last_6_months", label: "Últimos 6 meses" },
  { value: "this_year", label: "Este ano" },
  { value: "last_year", label: "Ano anterior" },
  { value: "custom", label: "Personalizado" },
];

const CATEGORY_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface FilterState {
  period: PeriodOption;
  from: string;
  to: string;
  accountId: string;
  categoryId: string;
}

const DEFAULT_FILTERS: FilterState = {
  period: "this_month",
  from: "",
  to: "",
  accountId: "all",
  categoryId: "all",
};

function toReportParams(filters: FilterState): ReportsQueryParams {
  const params: ReportsQueryParams = {};
  if (filters.period === "custom") {
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
  } else {
    params.preset = filters.period;
  }
  if (filters.accountId !== "all") params.accountId = filters.accountId;
  if (filters.categoryId !== "all") params.categoryId = filters.categoryId;
  return params;
}

function RelatoriosPage() {
  const [draftFilters, setDraftFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const reportParams = useMemo(() => toReportParams(appliedFilters), [appliedFilters]);
  const topExpensesParams = useMemo(() => ({ ...reportParams, limit: 8 }), [reportParams]);

  const accountsQuery = useAccounts();
  const expenseCategoriesQuery = useExpenseCategories();

  const summaryQuery = useReportSummary(reportParams);
  const cashFlowQuery = useReportCashFlow(reportParams);
  const expensesByCategoryQuery = useReportExpensesByCategory(reportParams);
  const topExpensesQuery = useReportTopExpenses(topExpensesParams);

  const revenuesEvolutionQuery = useRevenuesEvolution(6);
  const expensesEvolutionQuery = useExpensesEvolution(6);

  const dashboardSummaryQuery = useDashboardSummary({});
  const creditCardsSummaryQuery = useCreditCardsSummary();
  const investmentsSummaryQuery = useInvestmentsSummary();
  const goalsSummaryQuery = useFinancialGoalsSummary();

  const summary = summaryQuery.data;
  const cashFlow = cashFlowQuery.data;
  const creditCardsSummary = creditCardsSummaryQuery.data;
  const investmentsSummary = investmentsSummaryQuery.data;
  const goalsSummary = goalsSummaryQuery.data;

  const expensesByCategory = (expensesByCategoryQuery.data ?? []).map((item, index) => ({
    ...item,
    cor: CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length],
  }));

  const incomeExpenseTrend = (revenuesEvolutionQuery.data ?? []).map((point, index) => ({
    mes: formatMonthKeyShort(point.month),
    receitas: point.total,
    despesas: expensesEvolutionQuery.data?.[index]?.total ?? 0,
  }));

  const netWorthLoading = dashboardSummaryQuery.isLoading || investmentsSummaryQuery.isLoading;
  const totalAssets =
    (dashboardSummaryQuery.data?.currentBalance ?? 0) +
    (investmentsSummary?.totalCurrentValue ?? 0);
  const openInvoices = creditCardsSummary?.openInvoicesTotal ?? 0;
  const netWorth = totalAssets - openInvoices;

  const isCustomIncomplete =
    draftFilters.period === "custom" && (!draftFilters.from || !draftFilters.to);

  function applyFilters() {
    setAppliedFilters(draftFilters);
  }

  function clearFilters() {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Relatórios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe sua evolução financeira e entenda melhor seus hábitos.
          </p>
        </div>
        <Button
          disabled
          title="Exportação em PDF, Excel e CSV chega em breve."
          className="rounded-xl bg-gradient-brand font-semibold"
        >
          <Download className="size-4" aria-hidden="true" />
          Exportar
        </Button>
      </div>

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardContent className="flex flex-wrap items-end gap-3 p-5">
          <div className="min-w-45 flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Período</label>
            <Select
              value={draftFilters.period}
              onValueChange={(value) =>
                setDraftFilters((prev) => ({ ...prev, period: value as PeriodOption }))
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {draftFilters.period === "custom" && (
            <>
              <div className="min-w-40 flex-1 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Data inicial</label>
                <DatePicker
                  value={draftFilters.from ? parseISODateToLocalDate(draftFilters.from) : undefined}
                  onChange={(date) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      from: date ? toISODateString(date) : "",
                    }))
                  }
                />
              </div>
              <div className="min-w-40 flex-1 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Data final</label>
                <DatePicker
                  value={draftFilters.to ? parseISODateToLocalDate(draftFilters.to) : undefined}
                  onChange={(date) =>
                    setDraftFilters((prev) => ({ ...prev, to: date ? toISODateString(date) : "" }))
                  }
                />
              </div>
            </>
          )}

          <div className="min-w-45 flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Conta</label>
            <Select
              value={draftFilters.accountId}
              onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, accountId: value }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {(accountsQuery.data ?? []).map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-45 flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Categoria de despesa
            </label>
            <Select
              value={draftFilters.categoryId}
              onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, categoryId: value }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {(expenseCategoriesQuery.data ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="rounded-xl" onClick={clearFilters}>
              Limpar filtros
            </Button>
            <Button
              type="button"
              disabled={isCustomIncomplete}
              className="rounded-xl bg-gradient-brand font-semibold"
              onClick={applyFilters}
            >
              Aplicar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Receitas do período"
          value={
            summaryQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              brl(summary?.current.income ?? 0)
            )
          }
          icon={TrendingUp}
          deltaNode={<DeltaBadge pct={summary?.variation.incomePct ?? null} />}
          highlight
        />
        <StatCard
          title="Despesas do período"
          value={
            summaryQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              brl(summary?.current.expenses ?? 0)
            )
          }
          icon={ArrowDownRight}
          deltaNode={<DeltaBadge pct={summary?.variation.expensesPct ?? null} invert />}
        />
        <StatCard
          title="Saldo do período"
          value={
            summaryQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              brl(summary?.current.balance ?? 0)
            )
          }
          icon={Wallet}
          deltaNode={<DeltaBadge pct={summary?.variation.balancePct ?? null} />}
        />
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-2xl bg-primary/12 text-primary">
                <TrendingUp className="size-5" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Taxa de economia</p>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              {summaryQuery.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                `${summary?.current.savingsRatePct ?? 0}%`
              )}
            </div>
            <Progress
              value={Math.max(0, Math.min(100, summary?.current.savingsRatePct ?? 0))}
              className="mt-3 h-1.5"
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl border-border/70 shadow-soft xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Receitas x Despesas</CardTitle>
            <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
          </CardHeader>
          <CardContent className="h-72">
            {revenuesEvolutionQuery.isLoading || expensesEvolutionQuery.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeExpenseTrend}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--surface-2)" }}
                    formatter={(v: number) => brl(v)}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--popover)",
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    name="Receitas"
                    dataKey="receitas"
                    fill="var(--chart-1)"
                    radius={[10, 10, 4, 4]}
                  />
                  <Bar
                    name="Despesas"
                    dataKey="despesas"
                    fill="var(--chart-3)"
                    radius={[10, 10, 4, 4]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Fluxo de caixa</CardTitle>
          </CardHeader>
          <CardContent>
            {cashFlowQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Saldo inicial</span>
                  <span className="font-medium">{brl(cashFlow?.openingBalance ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Receitas</span>
                  <span className="font-medium text-primary">+{brl(cashFlow?.income ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Despesas</span>
                  <span className="font-medium text-destructive">
                    -{brl(cashFlow?.expenses ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border/70 pt-3">
                  <span className="font-semibold">Saldo final</span>
                  <span className="text-lg font-semibold tracking-tight">
                    {brl(cashFlow?.closingBalance ?? 0)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Despesas por categoria</CardTitle>
            <Link to="/despesas" className="text-xs text-muted-foreground hover:text-foreground">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent className="h-72">
            {expensesByCategoryQuery.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : expensesByCategory.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <p className="text-sm text-muted-foreground">
                  Não existem despesas pagas neste período.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {expensesByCategory.map((c) => (
                      <Cell key={c.categoryId} fill={c.cor} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => brl(v)}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--popover)",
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70 shadow-soft xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Detalhamento por categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {expensesByCategoryQuery.isLoading ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : expensesByCategory.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Não existem despesas pagas neste período.
              </p>
            ) : (
              expensesByCategory.map((category) => (
                <div key={category.categoryId}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{category.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {category.count} lançamento{category.count === 1 ? "" : "s"}
                      </span>
                      <span className="text-muted-foreground">{brl(category.total)}</span>
                      <span className="w-12 text-right text-xs font-semibold">
                        {category.percentage}%
                      </span>
                    </span>
                  </div>
                  <Progress value={category.percentage} className="mt-2 h-2" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl border-border/70 shadow-soft xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Maiores despesas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topExpensesQuery.isLoading ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : (topExpensesQuery.data ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Não existem despesas pagas neste período.
              </p>
            ) : (
              (topExpensesQuery.data ?? []).map((expense, index) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-xl bg-card text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {expense.categoryName} · {formatShortDate(expense.paidAt)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{brl(expense.amount)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
          <CardHeader className="flex-row items-center gap-2">
            <Landmark className="size-4 text-primary" aria-hidden="true" />
            <CardTitle className="text-base font-semibold">Patrimônio líquido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {netWorthLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Saldo em contas</span>
                  <span className="font-medium">
                    {brl(dashboardSummaryQuery.data?.currentBalance ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Investimentos</span>
                  <span className="font-medium">
                    {brl(investmentsSummary?.totalCurrentValue ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Faturas em aberto</span>
                  <span className="font-medium text-destructive">-{brl(openInvoices)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/70 pt-3">
                  <span className="font-semibold">Patrimônio líquido</span>
                  <span className="text-lg font-semibold tracking-tight">{brl(netWorth)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Cartões</CardTitle>
            <Link to="/cartoes" className="text-xs text-muted-foreground hover:text-foreground">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {creditCardsSummaryQuery.isLoading ? (
              <Skeleton className="h-32 w-full rounded-2xl" />
            ) : !creditCardsSummary || creditCardsSummary.cardCount === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <CreditCard className="size-5" aria-hidden="true" />
                </span>
                <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado ainda.</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Faturas em aberto</p>
                  <p className="text-xl font-semibold tracking-tight">
                    {brl(creditCardsSummary.openInvoicesTotal)}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Limite utilizado</span>
                    <span className="font-medium">
                      {creditCardsSummary.totalLimit > 0
                        ? Math.round(
                            (creditCardsSummary.totalUsed / creditCardsSummary.totalLimit) * 100,
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      creditCardsSummary.totalLimit > 0
                        ? (creditCardsSummary.totalUsed / creditCardsSummary.totalLimit) * 100
                        : 0
                    }
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Disponível {brl(creditCardsSummary.totalAvailable)} de{" "}
                    {brl(creditCardsSummary.totalLimit)}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Investimentos</CardTitle>
            <Link
              to="/investimentos"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Ver todos
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {investmentsSummaryQuery.isLoading ? (
              <Skeleton className="h-32 w-full rounded-2xl" />
            ) : !investmentsSummary || investmentsSummary.investmentCount === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <LineChartIcon className="size-5" aria-hidden="true" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Nenhum investimento cadastrado ainda.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Patrimônio investido</p>
                  <p className="text-xl font-semibold tracking-tight">
                    {brl(investmentsSummary.totalCurrentValue)}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total aportado</span>
                  <span className="font-medium">{brl(investmentsSummary.totalInvested)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rentabilidade</span>
                  <span
                    className={cn(
                      "font-medium",
                      investmentsSummary.totalReturn >= 0 ? "text-primary" : "text-destructive",
                    )}
                  >
                    {investmentsSummary.totalReturn >= 0 ? "+" : ""}
                    {brl(investmentsSummary.totalReturn)} (
                    {investmentsSummary.totalReturnPct.toFixed(2)}%)
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Metas financeiras</CardTitle>
            <Link to="/metas" className="text-xs text-muted-foreground hover:text-foreground">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {goalsSummaryQuery.isLoading ? (
              <Skeleton className="h-32 w-full rounded-2xl" />
            ) : !goalsSummary || goalsSummary.activeCount === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <Target className="size-5" aria-hidden="true" />
                </span>
                <p className="text-sm text-muted-foreground">Você ainda não tem metas ativas.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Metas ativas</span>
                  <span className="font-medium">{goalsSummary.activeCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Objetivo total</span>
                  <span className="font-medium">{brl(goalsSummary.totalTargetAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Acumulado</span>
                  <span className="font-medium">{brl(goalsSummary.totalCurrentAmount)}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progresso geral</span>
                    <span>{goalsSummary.overallProgressPct}%</span>
                  </div>
                  <Progress value={goalsSummary.overallProgressPct} className="h-2" />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  deltaNode,
  highlight,
}: {
  title: string;
  value: ReactNode;
  icon: typeof Wallet;
  deltaNode?: ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card
      className={cn(
        "rounded-3xl border-border/70 shadow-soft transition-transform hover:-translate-y-0.5",
        highlight && "bg-gradient-surface",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/12 text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          {deltaNode}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{title}</p>
        <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function DeltaBadge({ pct, invert }: { pct: number | null; invert?: boolean }) {
  if (pct === null) return null;
  const isGood = invert ? pct <= 0 : pct >= 0;
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
        isGood ? "bg-primary/12 text-primary" : "bg-warning/15 text-warning",
      )}
    >
      {pct >= 0 ? (
        <ArrowUpRight className="size-3" aria-hidden="true" />
      ) : (
        <ArrowDownRight className="size-3" aria-hidden="true" />
      )}
      {pct >= 0 ? "+" : ""}
      {pct}%
    </span>
  );
}
