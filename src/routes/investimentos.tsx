import { createFileRoute } from "@tanstack/react-router";

import { requireAuth } from "@/lib/auth";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, Bitcoin, Building2, Landmark, LineChart, Plus, Sparkles } from "lucide-react";

import { AppShell, brl } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/investimentos")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Investimentos | Método Certo" },
      {
        name: "description",
        content:
          "Acompanhe patrimônio, rentabilidade e alocação da sua carteira de renda fixa, ações, FIIs e cripto.",
      },
      { property: "og:title", content: "Carteira de investimentos | Método Certo" },
      {
        property: "og:description",
        content: "Evolução do patrimônio, alocação por classe e desempenho dos seus ativos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvestimentosPage,
});

const patrimonio = [
  { mes: "Mar", valor: 74200 },
  { mes: "Abr", valor: 76800 },
  { mes: "Mai", valor: 79500 },
  { mes: "Jun", valor: 81300 },
  { mes: "Jul", valor: 85100 },
  { mes: "Ago", valor: 89400 },
];

const classes = [
  { nome: "Renda fixa", valor: 38400, cor: "var(--chart-1)", icon: Landmark },
  { nome: "Ações", valor: 24800, cor: "var(--chart-2)", icon: LineChart },
  { nome: "FIIs", valor: 18200, cor: "var(--chart-3)", icon: Building2 },
  { nome: "Cripto", valor: 8000, cor: "var(--chart-4)", icon: Bitcoin },
];

const filtros = ["Todos", "Renda fixa", "Ações", "FIIs", "Cripto"] as const;

const ativos = [
  { nome: "Tesouro Selic 2029", classe: "Renda fixa", valor: 21400, rent: 0.92 },
  { nome: "CDB Banco Certo 118%", classe: "Renda fixa", valor: 17000, rent: 1.04 },
  { nome: "ITSA4", classe: "Ações", valor: 9200, rent: 2.8 },
  { nome: "WEGE3", classe: "Ações", valor: 8400, rent: -1.4 },
  { nome: "BBAS3", classe: "Ações", valor: 7200, rent: 3.6 },
  { nome: "HGLG11", classe: "FIIs", valor: 10200, rent: 1.1 },
  { nome: "MXRF11", classe: "FIIs", valor: 8000, rent: 0.8 },
  { nome: "Bitcoin", classe: "Cripto", valor: 8000, rent: 6.2 },
];

function InvestimentosPage() {
  const [filtro, setFiltro] = useState<(typeof filtros)[number]>("Todos");
  const visiveis = useMemo(
    () => (filtro === "Todos" ? ativos : ativos.filter((a) => a.classe === filtro)),
    [filtro],
  );

  const total = classes.reduce((s, c) => s + c.valor, 0);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Investimentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sua carteira consolidada e a evolução do patrimônio.
          </p>
        </div>
        <Button className="rounded-xl bg-gradient-brand font-semibold">
          <Plus className="size-4" aria-hidden="true" />
          Novo aporte
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Patrimônio investido</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{brl(total)}</p>
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-1 text-xs font-medium text-primary">
              <ArrowUpRight className="size-3" aria-hidden="true" /> +5,1% no mês
            </span>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Rentabilidade 12m</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">+13,4%</p>
            <p className="mt-3 text-xs text-muted-foreground">CDI no período: +10,8%</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Aporte médio mensal</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{brl(2600)}</p>
            <p className="mt-3 text-xs text-muted-foreground">22% da sua renda líquida</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl border-border/70 shadow-soft xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Evolução do patrimônio</CardTitle>
            <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={patrimonio}>
                <defs>
                  <linearGradient id="inv" x1="0" y1="0" x2="0" y2="1">
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
                  formatter={(v: number) => brl(v)}
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
                  fill="url(#inv)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Alocação por classe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={classes}
                    dataKey="valor"
                    nameKey="nome"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {classes.map((c) => (
                      <Cell key={c.nome} fill={c.cor} />
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
            </div>
            <div className="mt-4 space-y-3">
              {classes.map((c) => {
                const pct = Math.round((c.valor / total) * 100);
                return (
                  <div key={c.nome} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: c.cor }}
                          aria-hidden="true"
                        />
                        {c.nome}
                      </span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">Meus ativos</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {filtros.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                aria-pressed={filtro === f}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  filtro === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-2 text-muted-foreground hover:text-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {visiveis.map((a) => (
            <div
              key={a.nome}
              className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.nome}</p>
                <p className="text-xs text-muted-foreground">{a.classe}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold">{brl(a.valor)}</p>
                <p
                  className={cn(
                    "text-xs font-medium",
                    a.rent >= 0 ? "text-primary" : "text-destructive",
                  )}
                >
                  {a.rent >= 0 ? "+" : ""}
                  {a.rent.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}% no mês
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <p className="min-w-60 flex-1 text-sm text-muted-foreground">
            <strong className="text-foreground">Certo IA:</strong> sua carteira está 43% em renda
            fixa. Com o seu perfil moderado, um aporte extra de {brl(1500)} em FIIs melhoraria a
            renda passiva mensal em cerca de {brl(12)}.
          </p>
          <Button variant="secondary" className="rounded-xl">
            Ver sugestão completa
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
