import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus, Search, Sparkles, Target, Trash2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  GOAL_CATEGORY_ICONS,
  GOAL_CATEGORY_LABELS,
  goalColorByIndex,
} from "@/components/metas/financial-goal-category-meta";
import { ArchiveGoalDialog } from "@/components/metas/archive-goal-dialog";
import { ContributionDialog } from "@/components/metas/contribution-dialog";
import { FinancialGoalFormDialog } from "@/components/metas/financial-goal-form-dialog";
import { buildMonthlyDepositSeries } from "@/components/metas/goal-chart-utils";
import {
  useFinancialGoals,
  useFinancialGoalsSummary,
  useGoalTransactions,
} from "@/hooks/use-financial-goals";
import { requireAuth } from "@/lib/auth";
import { formatBRL } from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type { FinancialGoal } from "@/types/financial-goal";

export const Route = createFileRoute("/metas")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Metas financeiras | Método Certo" },
      {
        name: "description",
        content:
          "Crie metas, defina prazos e acompanhe o progresso da sua economia mensal com simulações inteligentes.",
      },
      { property: "og:title", content: "Metas financeiras | Método Certo" },
      {
        property: "og:description",
        content: "Progresso das suas metas, aporte mensal necessário e simulação de prazos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MetasPage,
});

type StatusFilter = "all" | "ACTIVE" | "COMPLETED" | "overdue" | "PAUSED";
type SortOption =
  "recent" | "oldest" | "progress_desc" | "progress_asc" | "priority" | "deadline" | "target_desc";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "ACTIVE", label: "Ativas" },
  { value: "COMPLETED", label: "Concluídas" },
  { value: "overdue", label: "Atrasadas" },
  { value: "PAUSED", label: "Pausadas" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigas" },
  { value: "progress_desc", label: "Maior progresso" },
  { value: "progress_asc", label: "Menor progresso" },
  { value: "priority", label: "Maior prioridade" },
  { value: "deadline", label: "Prazo mais próximo" },
  { value: "target_desc", label: "Maior objetivo" },
];

const PRIORITY_WEIGHT: Record<FinancialGoal["priority"], number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

function sortGoals(goals: FinancialGoal[], sortBy: SortOption): FinancialGoal[] {
  const sorted = [...goals];
  switch (sortBy) {
    case "oldest":
      return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "progress_desc":
      return sorted.sort((a, b) => b.progressPct - a.progressPct);
    case "progress_asc":
      return sorted.sort((a, b) => a.progressPct - b.progressPct);
    case "priority":
      return sorted.sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
    case "deadline":
      return sorted.sort((a, b) => a.daysRemaining - b.daysRemaining);
    case "target_desc":
      return sorted.sort((a, b) => b.targetAmount - a.targetAmount);
    case "recent":
    default:
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

function buildInsight(goals: FinancialGoal[]): string | null {
  const activeGoals = goals.filter((goal) => goal.status === "ACTIVE" && goal.remainingAmount > 0);
  if (activeGoals.length === 0) return null;
  const nearest = [...activeGoals].sort((a, b) => a.daysRemaining - b.daysRemaining)[0]!;

  if (nearest.daysRemaining < 0) {
    return `Sua meta "${nearest.name}" está com o prazo vencido — faltam ${formatBRL(nearest.remainingAmount)} para o objetivo.`;
  }
  return `Sua meta mais próxima do prazo é "${nearest.name}": faltam ${nearest.daysRemaining} dias e ${formatBRL(nearest.remainingAmount)} para o objetivo, guardando cerca de ${formatBRL(nearest.monthlyRequiredAmount)}/mês.`;
}

function EmptyGoalsState({ onNewGoal }: { onNewGoal: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary">
        <Target className="size-7" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold">Você ainda não possui metas financeiras.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie sua primeira meta e acompanhe sua evolução financeira.
        </p>
      </div>
      <Button onClick={onNewGoal} className="rounded-xl bg-gradient-brand font-semibold">
        <Plus className="size-4" aria-hidden="true" />
        Criar nova meta
      </Button>
    </div>
  );
}

function GoalCard({
  goal,
  index,
  selected,
  onSelect,
  onViewDetails,
  onArchive,
}: {
  goal: FinancialGoal;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
  onArchive: () => void;
}) {
  const Icon = GOAL_CATEGORY_ICONS[goal.category];
  const color = goalColorByIndex(index);

  return (
    <Card
      className={cn(
        "cursor-pointer rounded-3xl border-border/70 shadow-soft transition-colors",
        selected && "border-primary/40 bg-gradient-surface",
      )}
      onClick={onSelect}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-2xl text-primary-foreground"
            style={{ backgroundColor: color }}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{goal.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {GOAL_CATEGORY_LABELS[goal.category]}
              {goal.status === "COMPLETED" && " · Concluída"}
              {goal.status === "PAUSED" && " · Pausada"}
              {goal.isOverdue && " · Atrasada"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-lg text-destructive hover:text-destructive"
            aria-label="Excluir meta"
            onClick={(event) => {
              event.stopPropagation();
              onArchive();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        <Progress value={goal.progressPct} className="mt-4 h-2" />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatBRL(goal.currentAmount)} guardados</span>
          <span className="font-semibold text-foreground">{goal.progressPct}%</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {goal.status === "COMPLETED"
            ? `Meta atingida${goal.exceededAmount > 0 ? ` · +${formatBRL(goal.exceededAmount)} acima do objetivo` : ""}`
            : `faltam ${formatBRL(goal.remainingAmount)} · necessário ${formatBRL(goal.monthlyRequiredAmount)}/mês`}
        </p>

        <Button
          variant="secondary"
          className="mt-4 w-full rounded-xl"
          onClick={(event) => {
            event.stopPropagation();
            onViewDetails();
          }}
        >
          Ver detalhes
        </Button>
      </CardContent>
    </Card>
  );
}

function MetasPage() {
  const navigate = useNavigate();
  const goalsQuery = useFinancialGoals();
  const summaryQuery = useFinancialGoalsSummary();
  const goals = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data]);
  const summary = summaryQuery.data;

  const [formOpen, setFormOpen] = useState(false);
  const [contributionGoal, setContributionGoal] = useState<FinancialGoal | null>(null);
  const [archivingGoal, setArchivingGoal] = useState<FinancialGoal | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [aporteExtra, setAporteExtra] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) ?? goals[0] ?? null;
  const transactionsQuery = useGoalTransactions(selectedGoal?.id ?? "");
  const depositSeries = buildMonthlyDepositSeries(transactionsQuery.data ?? []);

  const activeMonthlyRequired = goals
    .filter((goal) => goal.status === "ACTIVE")
    .reduce((sum, goal) => sum + goal.monthlyRequiredAmount, 0);

  const filteredGoals = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = goals.filter((goal) => {
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "overdue"
            ? goal.isOverdue
            : goal.status === statusFilter;
      if (!matchesStatus) return false;
      if (!term) return true;
      return (
        goal.name.toLowerCase().includes(term) ||
        (goal.description ?? "").toLowerCase().includes(term) ||
        GOAL_CATEGORY_LABELS[goal.category].toLowerCase().includes(term)
      );
    });
    return sortGoals(filtered, sortBy);
  }, [goals, statusFilter, search, sortBy]);

  const insight = buildInsight(goals);
  const restante = selectedGoal?.remainingAmount ?? 0;
  const mensalSimulado = (selectedGoal?.monthlyRequiredAmount ?? 0) + aporteExtra;
  const mesesRestantes = mensalSimulado > 0 ? Math.ceil(restante / mensalSimulado) : 0;

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Metas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Planeje objetivos, acompanhe o progresso e simule prazos.
          </p>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          className="rounded-xl bg-gradient-brand font-semibold"
        >
          <Plus className="size-4" aria-hidden="true" />
          Nova meta
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Metas ativas</p>
            {summaryQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {summary?.activeCount ?? 0}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Objetivo total</p>
            {summaryQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-24" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {formatBRL(summary?.totalTargetAmount ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Já acumulado</p>
            {summaryQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-24" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">
                {formatBRL(summary?.totalCurrentAmount ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Progresso</p>
            {summaryQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {summary?.overallProgressPct ?? 0}%
              </p>
            )}
            <Progress value={summary?.overallProgressPct ?? 0} className="mt-3 h-1.5" />
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Concluídas</p>
            {summaryQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {summary?.completedCount ?? 0}
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {!goalsQuery.isLoading && goals.length > 0 && (
        <section className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter.value}
                size="sm"
                variant={statusFilter === filter.value ? "default" : "outline"}
                className={cn(
                  "rounded-full",
                  statusFilter === filter.value && "bg-gradient-brand font-semibold",
                )}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
          <div className="relative flex-1 min-w-48">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar metas..."
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>
      )}

      <section>
        {goalsQuery.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-44 w-full rounded-3xl" />
            ))}
          </div>
        ) : goalsQuery.isError ? (
          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">Não foi possível carregar suas metas.</p>
              <Button variant="outline" onClick={() => goalsQuery.refetch()}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : goals.length === 0 ? (
          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardContent>
              <EmptyGoalsState onNewGoal={() => setFormOpen(true)} />
            </CardContent>
          </Card>
        ) : filteredGoals.length === 0 ? (
          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma meta encontrada com esses filtros.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredGoals.map((goal, index) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                index={index}
                selected={selectedGoal?.id === goal.id}
                onSelect={() => setSelectedGoalId(goal.id)}
                onViewDetails={() =>
                  navigate({ to: "/metas/$goalId", params: { goalId: goal.id } })
                }
                onArchive={() => setArchivingGoal(goal)}
              />
            ))}
          </div>
        )}
      </section>

      {goals.length > 0 && (
        <section className="grid gap-4 xl:grid-cols-3">
          <Card className="rounded-3xl border-border/70 shadow-soft xl:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Aportes {selectedGoal ? `· ${selectedGoal.name}` : ""}
              </CardTitle>
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
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Target className="size-4 text-primary" aria-hidden="true" />
                Simulador
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Meta selecionada:{" "}
                <strong className="text-foreground">{selectedGoal?.name ?? "-"}</strong>
              </p>
              <div>
                <label
                  htmlFor="aporte-extra"
                  className="flex items-center justify-between text-sm font-medium"
                >
                  Aporte extra mensal
                  <span className="text-primary">{formatBRL(aporteExtra)}</span>
                </label>
                <input
                  id="aporte-extra"
                  type="range"
                  min={0}
                  max={2000}
                  step={50}
                  value={aporteExtra}
                  onChange={(e) => setAporteExtra(Number(e.target.value))}
                  className="mt-3 w-full accent-primary"
                />
              </div>
              <div className="rounded-2xl bg-surface-2 p-4">
                <p className="text-xs text-muted-foreground">
                  Guardando {formatBRL(mensalSimulado)}/mês
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">
                  {mesesRestantes} {mesesRestantes === 1 ? "mês" : "meses"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  para completar os {formatBRL(restante)} restantes
                </p>
              </div>
              <Button
                variant="secondary"
                className="w-full rounded-xl"
                disabled={!selectedGoal}
                onClick={() => setContributionGoal(selectedGoal)}
              >
                Registrar aporte
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      {insight && (
        <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
          <CardContent className="flex flex-wrap items-center gap-4 p-5">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <p className="min-w-60 flex-1 text-sm text-muted-foreground">
              <strong className="text-foreground">Certo IA:</strong> {insight}
            </p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Economia mensal necessária nas metas ativas:{" "}
        <strong>{formatBRL(activeMonthlyRequired)}</strong>
      </p>

      <FinancialGoalFormDialog open={formOpen} onOpenChange={setFormOpen} goal={null} />
      <ContributionDialog
        goal={contributionGoal}
        open={Boolean(contributionGoal)}
        onOpenChange={(open) => {
          if (!open) setContributionGoal(null);
        }}
      />
      <ArchiveGoalDialog
        goal={archivingGoal}
        onOpenChange={(open) => {
          if (!open) setArchivingGoal(null);
        }}
      />
    </AppShell>
  );
}
