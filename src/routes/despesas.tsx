import { createFileRoute } from "@tanstack/react-router";

import { requireAuth } from "@/lib/auth";
import { useMemo, useState } from "react";
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
  Car,
  Filter,
  Home,
  Plus,
  Repeat,
  ShoppingBasket,
  Sparkles,
  Ticket,
} from "lucide-react";

import { AppShell, brl } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/despesas")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Despesas | Método Certo" },
      {
        name: "description",
        content:
          "Controle seus gastos por categoria, veja o orçamento do mês e identifique onde economizar.",
      },
      { property: "og:title", content: "Controle de despesas | Método Certo" },
      {
        property: "og:description",
        content: "Gastos por categoria, orçamento planejado e lançamentos do mês em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DespesasPage,
});

const porMes = [
  { mes: "Mar", valor: 6100 },
  { mes: "Abr", valor: 6900 },
  { mes: "Mai", valor: 6400 },
  { mes: "Jun", valor: 7300 },
  { mes: "Jul", valor: 6800 },
  { mes: "Ago", valor: 7100 },
];

const categorias = [
  { nome: "Moradia", valor: 2400, orcamento: 2500, cor: "var(--chart-2)", icon: Home },
  { nome: "Alimentação", valor: 1840, orcamento: 1600, cor: "var(--chart-1)", icon: ShoppingBasket },
  { nome: "Transporte", valor: 780, orcamento: 900, cor: "var(--chart-3)", icon: Car },
  { nome: "Lazer", valor: 640, orcamento: 600, cor: "var(--chart-4)", icon: Ticket },
  { nome: "Outros", valor: 440, orcamento: 500, cor: "var(--chart-5)", icon: Sparkles },
];

const filtros = ["Todas", "Moradia", "Alimentação", "Transporte", "Lazer", "Outros"] as const;

const lancamentos = [
  { desc: "Aluguel + condomínio", cat: "Moradia", data: "05/08", valor: 2100, recorrente: true },
  { desc: "Supermercado Extra", cat: "Alimentação", data: "07/08", valor: 640, recorrente: false },
  { desc: "Energia elétrica", cat: "Moradia", data: "09/08", valor: 289, recorrente: true },
  { desc: "Combustível", cat: "Transporte", data: "11/08", valor: 380, recorrente: false },
  { desc: "Delivery e restaurantes", cat: "Alimentação", data: "13/08", valor: 520, recorrente: false },
  { desc: "Cinema e streaming", cat: "Lazer", data: "16/08", valor: 240, recorrente: true },
  { desc: "App de transporte", cat: "Transporte", data: "18/08", valor: 400, recorrente: false },
  { desc: "Farmácia", cat: "Outros", data: "21/08", valor: 190, recorrente: false },
];

function DespesasPage() {
  const [filtro, setFiltro] = useState<(typeof filtros)[number]>("Todas");
  const visiveis = useMemo(
    () => (filtro === "Todas" ? lancamentos : lancamentos.filter((l) => l.cat === filtro)),
    [filtro],
  );
  const total = categorias.reduce((s, c) => s + c.valor, 0);
  const orcamento = categorias.reduce((s, c) => s + c.orcamento, 0);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Despesas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Para onde o seu dinheiro foi em agosto.
          </p>
        </div>
        <Button className="rounded-xl bg-gradient-brand font-semibold">
          <Plus className="size-4" aria-hidden="true" />
          Nova despesa
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total do mês</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{brl(total)}</p>
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-1 text-xs font-medium text-warning">
              <ArrowDownRight className="size-3" aria-hidden="true" /> +4,1% vs julho
            </span>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Orçamento planejado</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{brl(orcamento)}</p>
            <Progress value={Math.round((total / orcamento) * 100)} className="mt-3 h-2" />
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Gastos fixos</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{brl(2629)}</p>
            <p className="mt-3 text-xs text-muted-foreground">37% das despesas são recorrentes</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl border-border/70 shadow-soft xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Despesas por mês</CardTitle>
            <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porMes}>
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
                <Bar dataKey="valor" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Divisão por categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categorias}
                  dataKey="valor"
                  nameKey="nome"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {categorias.map((c) => (
                    <Cell key={c.nome} fill={c.cor} stroke="transparent" />
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
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Orçamento por categoria</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {categorias.map((c) => {
            const pct = Math.round((c.valor / c.orcamento) * 100);
            const estourou = pct > 100;
            return (
              <div key={c.nome} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="grid size-8 place-items-center rounded-xl bg-surface-2">
                      <c.icon className="size-4" aria-hidden="true" />
                    </span>
                    {c.nome}
                  </span>
                  <span className={cn(estourou ? "text-warning" : "text-muted-foreground")}>
                    {pct}%
                  </span>
                </div>
                <Progress value={Math.min(pct, 100)} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {brl(c.valor)} de {brl(c.orcamento)}
                  {estourou && <span className="ml-1 text-warning">· acima do planejado</span>}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">Lançamentos</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
            {filtros.map((cat) => (
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
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
                  <ArrowDownRight className="size-4" aria-hidden="true" />
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
              <span className="shrink-0 text-sm font-semibold">−{brl(l.valor)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
