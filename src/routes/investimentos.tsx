import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, LineChart, Plus, Trash2, Wifi } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArchiveInvestmentDialog } from "@/components/investimentos/archive-investment-dialog";
import { InvestmentFormDialog } from "@/components/investimentos/investment-form-dialog";
import { INVESTMENT_TYPE_LABELS } from "@/components/investimentos/investment-type-meta";
import { useInvestments, useInvestmentsSummary } from "@/hooks/use-investments";
import { requireAuth } from "@/lib/auth";
import { formatBRL } from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type { Investment } from "@/types/investment";

export const Route = createFileRoute("/investimentos")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Investimentos | Método Certo" },
      {
        name: "description",
        content: "Acompanhe sua carteira, aportes, resgates e rendimentos em um só lugar.",
      },
      { property: "og:title", content: "Investimentos | Método Certo" },
      {
        property: "og:description",
        content: "Patrimônio investido, rentabilidade e alocação da sua carteira.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvestimentosPage,
});

const ALLOCATION_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function EmptyInvestmentsState({ onNewInvestment }: { onNewInvestment: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary">
        <LineChart className="size-7" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold">Você ainda não possui investimentos cadastrados.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Comece adicionando seu primeiro investimento manualmente.
        </p>
      </div>
      <Button onClick={onNewInvestment} className="rounded-xl bg-gradient-brand font-semibold">
        <Plus className="size-4" aria-hidden="true" />
        Novo investimento
      </Button>
    </div>
  );
}

function InvestmentTile({
  investment,
  onArchive,
}: {
  investment: Investment;
  onArchive: () => void;
}) {
  const navigate = useNavigate();
  const returnValue = investment.currentValue - investment.investedAmount;
  const returnPct =
    investment.investedAmount > 0 ? (returnValue / investment.investedAmount) * 100 : 0;
  const positive = returnValue >= 0;

  return (
    <Card
      className="cursor-pointer rounded-3xl border-border/70 shadow-soft transition-colors hover:bg-surface"
      onClick={() =>
        navigate({ to: "/investimentos/$investmentId", params: { investmentId: investment.id } })
      }
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
              <LineChart className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{investment.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {INVESTMENT_TYPE_LABELS[investment.type]}
                {investment.institutionName ? ` · ${investment.institutionName}` : ""}
              </p>
            </div>
          </div>
          {investment.source === "MANUAL" && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-lg text-destructive hover:text-destructive"
              aria-label="Excluir investimento"
              onClick={(event) => {
                event.stopPropagation();
                onArchive();
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Valor atual</p>
          <p className="text-lg font-semibold">{formatBRL(investment.currentValue)}</p>
          <p className="mt-1 flex items-center gap-1 text-xs">
            <span
              className={cn(
                "flex items-center gap-1 font-medium",
                positive ? "text-primary" : "text-destructive",
              )}
            >
              {positive ? (
                <ArrowUpRight className="size-3" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="size-3" aria-hidden="true" />
              )}
              {positive ? "+" : ""}
              {returnPct.toFixed(2)}%
            </span>
            <span className="text-muted-foreground">
              de {formatBRL(investment.investedAmount)} aplicados
            </span>
          </p>
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            investment.source === "OPEN_FINANCE"
              ? "bg-primary/12 text-primary"
              : "bg-info/12 text-info",
          )}
        >
          {investment.source === "OPEN_FINANCE" ? (
            <>
              <Wifi className="size-3" aria-hidden="true" /> Open Finance
            </>
          ) : (
            "Cadastro manual"
          )}
        </span>

        <Button variant="secondary" className="w-full rounded-xl">
          Ver investimento
        </Button>
      </CardContent>
    </Card>
  );
}

function InvestimentosPage() {
  const investmentsQuery = useInvestments();
  const summaryQuery = useInvestmentsSummary();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [archiving, setArchiving] = useState<Investment | null>(null);

  const investments = investmentsQuery.data ?? [];
  const summary = summaryQuery.data;

  const allocation = (summary?.byType ?? []).map((item, index) => ({
    ...item,
    label: INVESTMENT_TYPE_LABELS[item.type],
    color: ALLOCATION_CHART_COLORS[index % ALLOCATION_CHART_COLORS.length],
  }));

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Investimentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sua carteira, aportes, resgates e rendimentos em um só lugar.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="rounded-xl bg-gradient-brand font-semibold"
        >
          <Plus className="size-4" aria-hidden="true" />
          Novo investimento
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Patrimônio investido</p>
            {summaryQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {formatBRL(summary?.totalCurrentValue ?? 0)}
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {summary?.investmentCount ?? 0} investimentos ativos
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Valor aplicado</p>
            {summaryQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {formatBRL(summary?.totalInvested ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Rentabilidade</p>
            {summaryQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <p
                className={cn(
                  "mt-1 text-2xl font-semibold tracking-tight",
                  (summary?.totalReturn ?? 0) >= 0 ? "text-primary" : "text-destructive",
                )}
              >
                {(summary?.totalReturn ?? 0) >= 0 ? "+" : ""}
                {formatBRL(summary?.totalReturn ?? 0)}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {(summary?.totalReturnPct ?? 0) >= 0 ? "+" : ""}
              {(summary?.totalReturnPct ?? 0).toFixed(2)}%
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Rendimentos</p>
            {summaryQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {formatBRL(summary?.totalIncome ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {allocation.length > 0 && (
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Carteira por tipo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocation}
                    dataKey="currentValue"
                    nameKey="label"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {allocation.map((item) => (
                      <Cell key={item.type} fill={item.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatBRL(value)}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--popover)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {allocation.map((item) => (
                <div key={item.type} className="flex items-center gap-2 text-sm">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <span className="font-medium">{formatBRL(item.currentValue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <section>
        {investmentsQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-56 w-full rounded-3xl" />
            ))}
          </div>
        ) : investmentsQuery.isError ? (
          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar seus investimentos.
              </p>
              <Button variant="outline" onClick={() => investmentsQuery.refetch()}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : investments.length === 0 ? (
          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardContent>
              <EmptyInvestmentsState onNewInvestment={() => setDialogOpen(true)} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {investments.map((investment) => (
              <InvestmentTile
                key={investment.id}
                investment={investment}
                onArchive={() => setArchiving(investment)}
              />
            ))}
          </div>
        )}
      </section>

      <InvestmentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} investment={null} />
      <ArchiveInvestmentDialog
        investment={archiving}
        onOpenChange={(open) => {
          if (!open) setArchiving(null);
        }}
      />
    </AppShell>
  );
}
