import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarClock,
  GraduationCap,
  Home,
  Plane,
  Plus,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";

import { AppShell, brl } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/metas")({
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

const metas = [
  {
    id: "reserva",
    nome: "Reserva de emergência",
    icon: Shield,
    alvo: 30000,
    atual: 21400,
    prazo: "Dez 2026",
    mensal: 850,
    cor: "var(--chart-1)",
  },
  {
    id: "viagem",
    nome: "Viagem para Portugal",
    icon: Plane,
    alvo: 18000,
    atual: 7200,
    prazo: "Jul 2027",
    mensal: 620,
    cor: "var(--chart-2)",
  },
  {
    id: "entrada",
    nome: "Entrada do apartamento",
    icon: Home,
    alvo: 90000,
    atual: 28500,
    prazo: "Mar 2029",
    mensal: 1500,
    cor: "var(--chart-3)",
  },
  {
    id: "mba",
    nome: "MBA em finanças",
    icon: GraduationCap,
    alvo: 42000,
    atual: 12600,
    prazo: "Fev 2028",
    mensal: 980,
    cor: "var(--chart-4)",
  },
];

const aportes = [
  { mes: "Mar", valor: 2900 },
  { mes: "Abr", valor: 3200 },
  { mes: "Mai", valor: 2650 },
  { mes: "Jun", valor: 3400 },
  { mes: "Jul", valor: 3800 },
  { mes: "Ago", valor: 3950 },
];

function MetasPage() {
  const [selecionada, setSelecionada] = useState(metas[0]!.id);
  const [aporteExtra, setAporteExtra] = useState(0);
  const meta = metas.find((m) => m.id === selecionada) ?? metas[0]!;

  const totais = useMemo(
    () => ({
      alvo: metas.reduce((s, m) => s + m.alvo, 0),
      atual: metas.reduce((s, m) => s + m.atual, 0),
      mensal: metas.reduce((s, m) => s + m.mensal, 0),
    }),
    [],
  );

  const restante = Math.max(meta.alvo - meta.atual, 0);
  const mensalSimulado = meta.mensal + aporteExtra;
  const mesesRestantes = Math.ceil(restante / mensalSimulado);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Metas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Planeje objetivos, acompanhe o progresso e simule prazos.
          </p>
        </div>
        <Button className="rounded-xl bg-gradient-brand font-semibold">
          <Plus className="size-4" aria-hidden="true" />
          Nova meta
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total guardado</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{brl(totais.atual)}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              de {brl(totais.alvo)} em {metas.length} metas
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Economia mensal planejada</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">
              {brl(totais.mensal)}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">32% da renda líquida</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Progresso geral</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {Math.round((totais.atual / totais.alvo) * 100)}%
            </p>
            <Progress
              value={Math.round((totais.atual / totais.alvo) * 100)}
              className="mt-3 h-1.5"
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {metas.map((m) => {
          const pct = Math.min(Math.round((m.atual / m.alvo) * 100), 100);
          return (
            <Card
              key={m.id}
              className={cn(
                "cursor-pointer rounded-3xl border-border/70 shadow-soft transition-colors",
                selecionada === m.id && "border-primary/40 bg-gradient-surface",
              )}
              onClick={() => setSelecionada(m.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-2xl text-primary-foreground"
                    style={{ backgroundColor: m.cor }}
                  >
                    <m.icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.nome}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock className="size-3" aria-hidden="true" />
                      Prazo {m.prazo} · {brl(m.mensal)}/mês
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{pct}%</span>
                </div>
                <Progress value={pct} className="mt-4 h-2" />
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{brl(m.atual)} guardados</span>
                  <span>faltam {brl(m.alvo - m.atual)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl border-border/70 shadow-soft xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Aportes mensais</CardTitle>
            <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aportes}>
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
                  formatter={(v: number) => brl(v)}
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
              Meta selecionada: <strong className="text-foreground">{meta.nome}</strong>
            </p>
            <div>
              <label
                htmlFor="aporte-extra"
                className="flex items-center justify-between text-sm font-medium"
              >
                Aporte extra mensal
                <span className="text-primary">{brl(aporteExtra)}</span>
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
              <p className="text-xs text-muted-foreground">Guardando {brl(mensalSimulado)}/mês</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {mesesRestantes} {mesesRestantes === 1 ? "mês" : "meses"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                para completar os {brl(restante)} restantes
              </p>
            </div>
            <Button variant="secondary" className="w-full rounded-xl">
              Aplicar simulação
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <p className="min-w-60 flex-1 text-sm text-muted-foreground">
            <strong className="text-foreground">Certo IA:</strong> cortando {brl(280)} em
            delivery por mês você antecipa a reserva de emergência em 4 meses e ainda mantém os
            demais aportes.
          </p>
          <Button variant="secondary" className="rounded-xl">
            Ver plano sugerido
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
