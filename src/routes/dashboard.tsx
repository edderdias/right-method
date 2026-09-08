import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { requireAuth } from "@/lib/auth";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  CalendarClock,
  CreditCard,
  LineChart,
  PiggyBank,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { AppShell, brl } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaskableAmount } from "@/components/ui/maskable-amount";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAccountsSummary,
  useDashboardInsights,
  useDashboardSummary,
  useRevenuesEvolution,
  useUpcomingBills,
} from "@/hooks/use-revenues";
import { useExpensesByCategory, useExpensesEvolution } from "@/hooks/use-expenses";
import {
  useCardsCurrentInvoices,
  useCreditCards,
  useCreditCardsSummary,
} from "@/hooks/use-credit-cards";
import { useFinancialGoals, useFinancialGoalsSummary } from "@/hooks/use-financial-goals";
import { useInvestmentsSummary } from "@/hooks/use-investments";
import { useCurrentUser } from "@/hooks/use-user-settings";
import { formatMonthKeyShort } from "@/lib/finance-format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Dashboard | Método Certo" },
      {
        name: "description",
        content:
          "Visão geral das suas finanças: saldo, receitas, despesas, metas, cartões e insights da Certo IA.",
      },
      { property: "og:title", content: "Dashboard financeiro | Método Certo" },
      {
        property: "og:description",
        content: "Acompanhe saldo, fluxo de caixa, metas e investimentos em um só lugar.",
      },
    ],
  }),
  component: DashboardPage,
});

const CATEGORY_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function formatDueLabel(dueDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays <= 0) return "Vence hoje";
  if (diffDays === 1) return "Vence amanhã";
  return `Vence em ${diffDays} dias`;
}

function DashboardPage() {
  const currentUserQuery = useCurrentUser();
  const firstName = currentUserQuery.data?.name.split(" ")[0];
  const summaryQuery = useDashboardSummary({});
  const revenuesEvolutionQuery = useRevenuesEvolution(6);
  const expensesEvolutionQuery = useExpensesEvolution(6);
  const expensesByCategoryQuery = useExpensesByCategory({});
  const creditCardsQuery = useCreditCards();
  const creditCardsSummaryQuery = useCreditCardsSummary();
  const cardsCurrentInvoicesQuery = useCardsCurrentInvoices();
  const creditCardsSummary = creditCardsSummaryQuery.data;
  const creditCards = creditCardsQuery.data ?? [];
  const cardsCurrentInvoices = cardsCurrentInvoicesQuery.data ?? [];
  const creditCardsUsedPct =
    creditCardsSummary && creditCardsSummary.totalLimit > 0
      ? Math.round((creditCardsSummary.totalUsed / creditCardsSummary.totalLimit) * 100)
      : 0;
  const investmentsSummaryQuery = useInvestmentsSummary();
  const investmentsSummary = investmentsSummaryQuery.data;
  const goalsSummaryQuery = useFinancialGoalsSummary();
  const goalsQuery = useFinancialGoals();
  const insightsQuery = useDashboardInsights();
  const upcomingBillsQuery = useUpcomingBills();
  const accountsSummaryQuery = useAccountsSummary({});
  const insights = insightsQuery.data ?? [];
  const upcomingBills = upcomingBillsQuery.data ?? [];
  const accountsSummary = accountsSummaryQuery.data;
  const topGoals = (goalsQuery.data ?? [])
    .filter((goal) => goal.status === "ACTIVE")
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 3);
  const patrimonioLoading = summaryQuery.isLoading || investmentsSummaryQuery.isLoading;
  const patrimonioTotal =
    (summaryQuery.data?.currentBalance ?? 0) + (investmentsSummary?.totalCurrentValue ?? 0);

  const cashFlow = (revenuesEvolutionQuery.data ?? []).map((point, index) => ({
    mes: formatMonthKeyShort(point.month),
    receitas: point.total,
    despesas: expensesEvolutionQuery.data?.[index]?.total ?? 0,
  }));

  const expensesByCategory = (expensesByCategoryQuery.data ?? []).map((item, index) => ({
    ...item,
    cor: CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length],
  }));

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {firstName ? `Olá, ${firstName}` : "Olá"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aqui está o resumo das suas finanças no período.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Saldo atual"
          value={
            summaryQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <MaskableAmount value={brl(summaryQuery.data?.currentBalance ?? 0)} />
            )
          }
          positive
          icon={Wallet}
          highlight
        />
        <StatCard
          title="Receitas do mês"
          value={
            summaryQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <MaskableAmount value={brl(summaryQuery.data?.income.total ?? 0)} />
            )
          }
          positive
          icon={TrendingUp}
        />
        <StatCard
          title="Despesas do mês"
          value={
            summaryQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <MaskableAmount value={brl(summaryQuery.data?.expenses.total ?? 0)} />
            )
          }
          hint={
            creditCardsSummary && creditCardsSummary.currentMonthInvoicesTotal > 0
              ? `+ ${brl(creditCardsSummary.currentMonthInvoicesTotal)} em faturas de cartão a pagar`
              : undefined
          }
          icon={ArrowDownRight}
        />
        <StatCard
          title="Patrimônio"
          value={
            patrimonioLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <MaskableAmount value={brl(patrimonioTotal)} />
            )
          }
          positive
          icon={PiggyBank}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl border-border/70 shadow-soft xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Fluxo de caixa</CardTitle>
            <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlow} barGap={6}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tickFormatter={(v: number) => `${v / 1000}k`}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  formatter={(v: number) => brl(v)}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--popover)",
                  }}
                />
                <Bar dataKey="receitas" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="despesas" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader className="flex-row items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            <CardTitle className="text-base font-semibold">Resumo do Certo IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insightsQuery.isLoading ? (
              <>
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </>
            ) : insights.length === 0 ? (
              <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted-foreground">
                Cadastre suas receitas e despesas para receber análises da Certo IA.
              </p>
            ) : (
              insights.map((item) => (
                <div
                  key={item.text}
                  className={cn(
                    "rounded-2xl p-4 text-sm",
                    item.tone === "warning" && "bg-warning/12 text-foreground",
                    item.tone === "primary" && "bg-primary/12 text-foreground",
                    item.tone === "info" && "bg-info/12 text-foreground",
                  )}
                >
                  {item.text}
                </div>
              ))
            )}
            <Button
              asChild
              className="mt-2 w-full rounded-xl bg-gradient-brand font-semibold"
            >
              <Link to="/certo-ia">Conversar com o Certo IA</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {expensesByCategoryQuery.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : expensesByCategory.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">Nenhuma despesa paga ainda.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {expensesByCategory.map((c) => (
                      <Cell key={c.categoryId} fill={c.cor} stroke="transparent" />
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
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Patrimônio</CardTitle>
          </CardHeader>
          <CardContent className="flex h-64 flex-col justify-center gap-4">
            {patrimonioLoading ? (
              <Skeleton className="h-10 w-40" />
            ) : (
              <div>
                <p className="text-xs text-muted-foreground">Contas + investimentos</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">
                  <MaskableAmount value={brl(patrimonioTotal)} />
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 border-t border-border/70 pt-4">
              <div>
                <p className="text-xs text-muted-foreground">Saldo em contas</p>
                {summaryQuery.isLoading ? (
                  <Skeleton className="mt-1 h-6 w-24" />
                ) : (
                  <p className="text-sm font-semibold">
                    <MaskableAmount value={brl(summaryQuery.data?.currentBalance ?? 0)} />
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Investimentos</p>
                {investmentsSummaryQuery.isLoading ? (
                  <Skeleton className="mt-1 h-6 w-24" />
                ) : (
                  <p className="text-sm font-semibold">
                    <MaskableAmount value={brl(investmentsSummary?.totalCurrentValue ?? 0)} />
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A evolução histórica do patrimônio será exibida aqui assim que houver dados
              suficientes acumulados.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Metas financeiras</CardTitle>
            <Link to="/metas" className="text-xs font-medium text-primary hover:underline">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent className="space-y-5">
            {goalsSummaryQuery.isLoading || goalsQuery.isLoading ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : (goalsSummaryQuery.data?.activeCount ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <p className="text-sm text-muted-foreground">Você ainda não tem metas ativas.</p>
                <Button asChild variant="secondary" className="rounded-xl">
                  <Link to="/metas">Criar meta</Link>
                </Button>
              </div>
            ) : (
              topGoals.map((goal) => (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{goal.name}</span>
                    <span className="text-muted-foreground">{goal.progressPct}%</span>
                  </div>
                  <Progress value={goal.progressPct} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {brl(goal.currentAmount)} de {brl(goal.targetAmount)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Saldo por conta</CardTitle>
            <Link to="/contas" className="text-xs font-medium text-primary hover:underline">
              Gerenciar contas
            </Link>
          </CardHeader>
          <CardContent>
            {accountsSummaryQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full rounded-2xl" />
                <Skeleton className="h-14 w-full rounded-2xl" />
              </div>
            ) : !accountsSummary || accountsSummary.accounts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhuma conta cadastrada. Cadastre uma conta para acompanhar o saldo individual.
                </p>
                <Button asChild variant="secondary" className="rounded-xl">
                  <Link to="/contas">Cadastrar conta</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {accountsSummary.accounts.map((account) => (
                  <div key={account.id} className="rounded-2xl bg-surface-2 p-4">
                    <p className="truncate text-sm font-medium">{account.name}</p>
                    <p className="mt-1 text-lg font-semibold tracking-tight">
                      <MaskableAmount value={brl(account.balance)} />
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-primary">+{brl(account.received)} recebido</span>
                      <span className="text-warning">−{brl(account.spent)} gasto</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Contas a vencer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingBillsQuery.isLoading ? (
              <>
                <Skeleton className="h-14 w-full rounded-2xl" />
                <Skeleton className="h-14 w-full rounded-2xl" />
              </>
            ) : upcomingBills.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma conta ou fatura a vencer nos próximos dias.
              </p>
            ) : (
              upcomingBills.map((bill) => (
                <Link
                  key={`${bill.kind}-${bill.id}`}
                  to={bill.link}
                  className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 transition-colors hover:bg-surface"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-warning/15 text-warning">
                      {bill.kind === "invoice" ? (
                        <CreditCard className="size-4" aria-hidden="true" />
                      ) : (
                        <CalendarClock className="size-4" aria-hidden="true" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{bill.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDueLabel(bill.dueDate)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{brl(bill.amount)}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Cartões</CardTitle>
            <Link to="/cartoes" className="text-xs text-muted-foreground hover:text-foreground">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {creditCardsSummaryQuery.isLoading ||
            creditCardsQuery.isLoading ||
            cardsCurrentInvoicesQuery.isLoading ? (
              <Skeleton className="h-40 w-full rounded-2xl" />
            ) : !creditCardsSummary || creditCardsSummary.cardCount === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <CreditCard className="size-5" aria-hidden="true" />
                </span>
                <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado ainda.</p>
                <Button asChild variant="secondary" className="rounded-xl">
                  <Link to="/cartoes">Cadastrar cartão</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-2xl bg-gradient-brand p-5 text-primary-foreground shadow-brand">
                  <div className="flex items-center justify-between">
                    <CreditCard className="size-6" aria-hidden="true" />
                    <span className="text-xs uppercase tracking-widest opacity-80">Crédito</span>
                  </div>
                  <p className="mt-8 text-sm opacity-80">Fatura do mês por cartão</p>
                  <div className="mt-2 space-y-1.5">
                    {creditCards.map((card) => {
                      const invoiceTotal =
                        cardsCurrentInvoices.find((invoice) => invoice.cardId === card.id)
                          ?.currentInvoiceTotal ?? 0;
                      return (
                        <div
                          key={card.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="truncate opacity-90">
                            {card.institutionName ?? card.name}
                          </span>
                          <span className="shrink-0 font-semibold">
                            <MaskableAmount value={brl(invoiceTotal)} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs opacity-70">
                    Total em aberto (todas as faturas):{" "}
                    <MaskableAmount value={brl(creditCardsSummary.openInvoicesTotal)} />
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Limite utilizado</span>
                    <span className="font-medium">{creditCardsUsedPct}%</span>
                  </div>
                  <Progress value={creditCardsUsedPct} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Disponível <MaskableAmount value={brl(creditCardsSummary.totalAvailable)} /> de{" "}
                    <MaskableAmount value={brl(creditCardsSummary.totalLimit)} />
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
              <Skeleton className="h-40 w-full rounded-2xl" />
            ) : !investmentsSummary || investmentsSummary.investmentCount === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <LineChart className="size-5" aria-hidden="true" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Nenhum investimento cadastrado ainda.
                </p>
                <Button asChild variant="secondary" className="rounded-xl">
                  <Link to="/investimentos">Cadastrar investimento</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-2xl bg-gradient-brand p-5 text-primary-foreground shadow-brand">
                  <div className="flex items-center justify-between">
                    <LineChart className="size-6" aria-hidden="true" />
                    <span className="text-xs uppercase tracking-widest opacity-80">Carteira</span>
                  </div>
                  <p className="mt-8 text-sm opacity-80">Valor atual</p>
                  <p className="text-2xl font-semibold">
                    {brl(investmentsSummary.totalCurrentValue)}
                  </p>
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
                    {investmentsSummary.totalReturnPct.toFixed(2)}%
                  </span>
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
  delta,
  hint,
  positive,
  icon: Icon,
  highlight,
}: {
  title: string;
  value: ReactNode;
  delta?: string;
  hint?: ReactNode;
  positive?: boolean;
  icon: typeof Wallet;
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
          {delta && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                positive ? "bg-primary/12 text-primary" : "bg-warning/15 text-warning",
              )}
            >
              {positive ? (
                <ArrowUpRight className="size-3" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="size-3" aria-hidden="true" />
              )}
              {delta}
            </span>
          )}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{title}</p>
        <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
