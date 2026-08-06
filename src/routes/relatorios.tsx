import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
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
import { Download, FileSpreadsheet, FileText, Table2, TrendingUp } from "lucide-react";

import { AppShell, brl } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios financeiros | Método Certo" },
      {
        name: "description",
        content:
          "Relatórios mensais e anuais das suas finanças: comparativos por categoria, evolução do saldo e exportação em PDF, Excel ou CSV.",
      },
      { property: "og:title", content: "Relatórios financeiros | Método Certo" },
      {
        property: "og:description",
        content: "Comparativos por categoria, evolução do saldo e exportação em PDF, Excel e CSV.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RelatoriosPage,
});

const periodos = [
  { id: "mensal", label: "Mensal" },
  { id: "anual", label: "Anual" },
] as const;

const mensal = [
  { mes: "Mar", receitas: 11800, despesas: 6100 },
  { mes: "Abr", receitas: 12400, despesas: 6900 },
  { mes: "Mai", receitas: 11950, despesas: 6400 },
  { mes: "Jun", receitas: 13100, despesas: 7300 },
  { mes: "Jul", receitas: 12800, despesas: 6800 },
  { mes: "Ago", receitas: 13650, despesas: 7100 },
];

const anual = [
  { mes: "2022", receitas: 108000, despesas: 74200 },
  { mes: "2023", receitas: 126400, despesas: 81600 },
  { mes: "2024", receitas: 141900, despesas: 86300 },
  { mes: "2025", receitas: 152700, despesas: 89100 },
  { mes: "2026", receitas: 75700, despesas: 40600 },
];

const categorias = [
  { nome: "Moradia", valor: 2450, anterior: 2450, cor: "var(--chart-1)" },
  { nome: "Alimentação", valor: 1680, anterior: 1470, cor: "var(--chart-2)" },
  { nome: "Transporte", valor: 890, anterior: 960, cor: "var(--chart-3)" },
  { nome: "Lazer", valor: 720, anterior: 540, cor: "var(--chart-4)" },
  { nome: "Saúde", valor: 640, anterior: 620, cor: "var(--chart-5)" },
  { nome: "Outros", valor: 720, anterior: 810, cor: "var(--chart-1)" },
];

const exportacoes = [
  { label: "PDF", icon: FileText, hint: "Relatório completo formatado" },
  { label: "Excel", icon: FileSpreadsheet, hint: "Planilha com todas as abas" },
  { label: "CSV", icon: Table2, hint: "Lançamentos em texto puro" },
];

function RelatoriosPage() {
  const [periodo, setPeriodo] = useState<(typeof periodos)[number]["id"]>("mensal");
  const dados = periodo === "mensal" ? mensal : anual;

  const totais = useMemo(() => {
    const receitas = dados.reduce((s, d) => s + d.receitas, 0);
    const despesas = dados.reduce((s, d) => s + d.despesas, 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [dados]);

  const taxa = Math.round((totais.saldo / totais.receitas) * 100);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Relatórios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Comparativos, evolução e exportação dos seus dados financeiros.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-surface-2 p-1">
            {periodos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodo(p.id)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
                  periodo === p.id
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button className="rounded-xl bg-gradient-brand font-semibold">
            <Download className="size-4" aria-hidden="true" />
            Exportar
          </Button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Receitas do período</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">
              {brl(totais.receitas)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Despesas do período</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-destructive">
              {brl(totais.despesas)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Saldo acumulado</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{brl(totais.saldo)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Taxa de poupança</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
              {taxa}%
              <TrendingUp className="size-4 text-primary" aria-hidden="true" />
            </p>
            <Progress value={taxa} className="mt-3 h-1.5" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl border-border/70 shadow-soft xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Receitas x Despesas</CardTitle>
            <span className="text-xs text-muted-foreground">
              {periodo === "mensal" ? "Últimos 6 meses" : "Últimos 5 anos"}
            </span>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados}>
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
                  innerRadius={58}
                  outerRadius={90}
                  paddingAngle={3}
                  stroke="none"
                >
                  {categorias.map((c) => (
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
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl border-border/70 shadow-soft xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Comparativo por categoria</CardTitle>
            <span className="text-xs text-muted-foreground">vs. período anterior</span>
          </CardHeader>
          <CardContent className="space-y-4">
            {categorias.map((c) => {
              const variacao = Math.round(((c.valor - c.anterior) / c.anterior) * 100);
              const maior = Math.max(...categorias.map((x) => x.valor));
              return (
                <div key={c.nome}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{c.nome}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-muted-foreground">{brl(c.valor)}</span>
                      <span
                        className={cn(
                          "w-14 text-right text-xs font-semibold",
                          variacao > 0 ? "text-destructive" : "text-primary",
                        )}
                      >
                        {variacao > 0 ? "+" : ""}
                        {variacao}%
                      </span>
                    </span>
                  </div>
                  <Progress value={(c.valor / maior) * 100} className="mt-2 h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Evolução do saldo</CardTitle>
            </CardHeader>
            <CardContent className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dados}>
                  <defs>
                    <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
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
                    dataKey="receitas"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#saldoGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Exportar relatório</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {exportacoes.map((e) => (
                <button
                  key={e.label}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl bg-surface-2 p-3 text-left transition-colors hover:bg-sidebar-accent"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-card text-primary">
                    <e.icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{e.label}</span>
                    <span className="block text-xs text-muted-foreground">{e.hint}</span>
                  </span>
                  <Download className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
