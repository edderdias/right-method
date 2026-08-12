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
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Landmark,
  Link2,
  Plus,
  RefreshCw,
  Send,
  Wallet,
} from "lucide-react";

import { AppShell, brl } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/contas")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Contas bancárias | Método Certo" },
      {
        name: "description",
        content:
          "Saldos consolidados, extrato, transferências e PIX das suas contas conectadas via Open Finance.",
      },
      { property: "og:title", content: "Contas bancárias | Método Certo" },
      {
        property: "og:description",
        content: "Acompanhe saldo, extrato e transferências de todas as suas contas em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContasPage,
});

const contas = [
  {
    id: "certo",
    banco: "Banco Certo",
    tipo: "Conta corrente",
    numero: "•••• 4412",
    saldo: 18420,
    cor: "var(--chart-1)",
    icon: Wallet,
  },
  {
    id: "nu",
    banco: "Nubank",
    tipo: "Conta de pagamento",
    numero: "•••• 8890",
    saldo: 6240,
    cor: "var(--chart-2)",
    icon: Building2,
  },
  {
    id: "cef",
    banco: "Caixa",
    tipo: "Conta poupança",
    numero: "•••• 1027",
    saldo: 9310,
    cor: "var(--chart-3)",
    icon: Landmark,
  },
];

const evolucao = [
  { mes: "Mar", saldo: 26800 },
  { mes: "Abr", saldo: 28100 },
  { mes: "Mai", saldo: 27400 },
  { mes: "Jun", saldo: 30200 },
  { mes: "Jul", saldo: 31800 },
  { mes: "Ago", saldo: 33970 },
];

const extrato: Record<
  string,
  { desc: string; data: string; valor: number; canal: string }[]
> = {
  certo: [
    { desc: "Salário Certo Tech", data: "05 ago", valor: 9800, canal: "TED" },
    { desc: "Aluguel apartamento", data: "05 ago", valor: -2400, canal: "Débito" },
    { desc: "PIX Mercado Bom Preço", data: "03 ago", valor: -486, canal: "PIX" },
    { desc: "Reembolso viagem", data: "02 ago", valor: 720, canal: "PIX" },
    { desc: "Energia CPFL", data: "01 ago", valor: -312, canal: "Débito" },
  ],
  nu: [
    { desc: "Transferência recebida", data: "04 ago", valor: 1500, canal: "PIX" },
    { desc: "Assinatura streaming", data: "03 ago", valor: -55, canal: "Débito" },
    { desc: "Farmácia São Paulo", data: "02 ago", valor: -128, canal: "PIX" },
  ],
  cef: [
    { desc: "Rendimento poupança", data: "01 ago", valor: 58, canal: "Crédito" },
    { desc: "Aporte reserva", data: "01 ago", valor: 800, canal: "TED" },
  ],
};

function ContasPage() {
  const [ativa, setAtiva] = useState(contas[0]!.id);
  const conta = contas.find((c) => c.id === ativa) ?? contas[0]!;
  const total = contas.reduce((s, c) => s + c.saldo, 0);
  const lancamentos = extrato[conta.id] ?? [];
  const entradas = lancamentos.filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0);
  const saidas = lancamentos.filter((l) => l.valor < 0).reduce((s, l) => s - l.valor, 0);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Contas bancárias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saldos, extratos e transferências das suas contas conectadas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="rounded-xl">
            <RefreshCw className="size-4" aria-hidden="true" />
            Sincronizar
          </Button>
          <Button className="rounded-xl bg-gradient-brand font-semibold">
            <Plus className="size-4" aria-hidden="true" />
            Nova conta
          </Button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Saldo consolidado</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{brl(total)}</p>
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-1 text-xs font-medium text-primary">
              <ArrowUpRight className="size-3" aria-hidden="true" /> +6,8% no mês
            </span>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Entradas em agosto</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">{brl(12020)}</p>
            <p className="mt-3 text-xs text-muted-foreground">3 contas ativas</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Saídas em agosto</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-destructive">
              {brl(3381)}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">28% das entradas</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-3">
          {contas.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setAtiva(c.id)}
              aria-pressed={ativa === c.id}
              className={cn(
                "flex w-full items-center gap-3 rounded-3xl border p-4 text-left transition-colors",
                ativa === c.id
                  ? "border-primary/40 bg-surface shadow-soft"
                  : "border-border/70 bg-surface-2 hover:bg-surface",
              )}
            >
              <span
                className="grid size-11 shrink-0 place-items-center rounded-2xl text-primary-foreground"
                style={{ backgroundColor: c.cor }}
              >
                <c.icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.banco}</p>
                <p className="text-xs text-muted-foreground">
                  {c.tipo} · {c.numero}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold">{brl(c.saldo)}</span>
            </button>
          ))}

          <Card className="rounded-3xl border-dashed border-border/70 bg-transparent shadow-none">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid size-10 place-items-center rounded-2xl bg-surface-2 text-muted-foreground">
                <Link2 className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Open Finance</p>
                <p className="text-xs text-muted-foreground">Conecte outro banco em 1 minuto</p>
              </div>
              <Button variant="ghost" size="sm" className="rounded-xl">
                Conectar
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-border/70 shadow-soft xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Evolução do saldo</CardTitle>
            <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolucao}>
                <defs>
                  <linearGradient id="contas" x1="0" y1="0" x2="0" y2="1">
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
                  dataKey="saldo"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  fill="url(#contas)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Extrato · {conta.banco}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Entradas {brl(entradas)} · Saídas {brl(saidas)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="rounded-xl">
              <Send className="size-4" aria-hidden="true" />
              Transferir
            </Button>
            <Button variant="secondary" className="rounded-xl">
              PIX
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {lancamentos.map((l) => (
            <div
              key={`${l.desc}-${l.data}`}
              className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3"
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl",
                  l.valor > 0 ? "bg-primary/12 text-primary" : "bg-destructive/12 text-destructive",
                )}
              >
                {l.valor > 0 ? (
                  <ArrowDownLeft className="size-4" aria-hidden="true" />
                ) : (
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{l.desc}</p>
                <p className="text-xs text-muted-foreground">
                  {l.data} · {l.canal}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-sm font-semibold",
                  l.valor > 0 ? "text-primary" : "text-foreground",
                )}
              >
                {l.valor > 0 ? "+" : "-"}
                {brl(Math.abs(l.valor))}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
