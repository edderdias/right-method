import { createFileRoute } from "@tanstack/react-router";

import { requireAuth } from "@/lib/auth";
import { useMemo, useState } from "react";
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
  ArrowUpRight,
  Briefcase,
  Building2,
  CircleDollarSign,
  Filter,
  Plus,
  Repeat,
  TrendingUp,
} from "lucide-react";

import { AppShell, brl } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/receitas")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Receitas | Método Certo" },
      {
        name: "description",
        content:
          "Acompanhe salários, freelas, aluguéis e rendimentos: total do mês, evolução e lançamentos recentes.",
      },
      { property: "og:title", content: "Controle de receitas | Método Certo" },
      {
        property: "og:description",
        content: "Veja de onde vem o seu dinheiro e organize suas entradas mês a mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReceitasPage,
});

const evolucao = [
  { mes: "Mar", valor: 9200 },
  { mes: "Abr", valor: 9800 },
  { mes: "Mai", valor: 10400 },
  { mes: "Jun", valor: 9900 },
  { mes: "Jul", valor: 11200 },
  { mes: "Ago", valor: 11800 },
];

const fontes = [
  { nome: "Salário", valor: 7800, icon: Briefcase },
  { nome: "Freelas", valor: 2200, icon: CircleDollarSign },
  { nome: "Aluguel", valor: 1200, icon: Building2 },
  { nome: "Rendimentos", valor: 600, icon: TrendingUp },
];

const categorias = ["Todas", "Salário", "Freelas", "Aluguel", "Rendimentos"] as const;

const lancamentos = [
  { desc: "Salário Agosto", cat: "Salário", data: "05/08", valor: 7800, recorrente: true },
  { desc: "Projeto landing page", cat: "Freelas", data: "08/08", valor: 1400, recorrente: false },
  { desc: "Aluguel Kitnet Centro", cat: "Aluguel", data: "10/08", valor: 1200, recorrente: true },
  { desc: "Consultoria financeira", cat: "Freelas", data: "14/08", valor: 800, recorrente: false },
  { desc: "Dividendos FIIs", cat: "Rendimentos", data: "16/08", valor: 320, recorrente: true },
  { desc: "CDB resgate juros", cat: "Rendimentos", data: "20/08", valor: 280, recorrente: false },
];

function ReceitasPage() {
  const [filtro, setFiltro] = useState<(typeof categorias)[number]>("Todas");
  const visiveis = useMemo(
    () => (filtro === "Todas" ? lancamentos : lancamentos.filter((l) => l.cat === filtro)),
    [filtro],
  );
  const total = fontes.reduce((s, f) => s + f.valor, 0);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Receitas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tudo que entrou no seu bolso em agosto.
          </p>
        </div>
        <Button className="rounded-xl bg-gradient-brand font-semibold">
          <Plus className="size-4" aria-hidden="true" />
          Nova receita
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total do mês</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{brl(total)}</p>
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-1 text-xs font-medium text-primary">
              <ArrowUpRight className="size-3" aria-hidden="true" /> +5,3% vs julho
            </span>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Média mensal (6m)</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {brl(Math.round(evolucao.reduce((s, e) => s + e.valor, 0) / evolucao.length))}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">Base de março a agosto</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Receitas recorrentes</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{brl(9320)}</p>
            <p className="mt-3 text-xs text-muted-foreground">79% da renda é previsível</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl border-border/70 shadow-soft xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Evolução das receitas</CardTitle>
            <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolucao}>
                <defs>
                  <linearGradient id="rec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
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
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  fill="url(#rec)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Fontes de renda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fontes.map((fonte) => {
              const pct = Math.round((fonte.valor / total) * 100);
              return (
                <div key={fonte.nome} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="grid size-8 place-items-center rounded-xl bg-primary/12 text-primary">
                        <fonte.icon className="size-4" aria-hidden="true" />
                      </span>
                      {fonte.nome}
                    </span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-muted-foreground">{brl(fonte.valor)}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">Lançamentos</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
            {categorias.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFiltro(cat)}
                aria-pressed={filtro === cat}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  filtro === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-2 text-muted-foreground hover:text-foreground",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {visiveis.map((l) => (
            <div
              key={l.desc}
              className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.desc}</p>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    {l.cat} · {l.data}
                    {l.recorrente && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-info/12 px-2 py-0.5 text-info">
                        <Repeat className="size-3" aria-hidden="true" /> recorrente
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold text-primary">+{brl(l.valor)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
