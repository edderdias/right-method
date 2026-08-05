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
import { CalendarClock, CreditCard, Lock, Plus, ShieldCheck, Wifi } from "lucide-react";

import { AppShell, brl } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cartoes")({
  head: () => ({
    meta: [
      { title: "Cartões | Método Certo" },
      {
        name: "description",
        content:
          "Gerencie faturas, limites e lançamentos dos seus cartões de crédito em um só lugar.",
      },
      { property: "og:title", content: "Cartões de crédito | Método Certo" },
      {
        property: "og:description",
        content: "Fatura atual, limite disponível, melhor dia de compra e gastos por cartão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartoesPage,
});

const cartoes = [
  {
    id: "certo-black",
    nome: "Certo Black",
    bandeira: "Mastercard",
    final: "4821",
    limite: 12000,
    fatura: 3480,
    vencimento: "12/08",
    fechamento: "04/08",
    gradiente: "bg-gradient-brand",
  },
  {
    id: "certo-gold",
    nome: "Certo Gold",
    bandeira: "Visa",
    final: "7702",
    limite: 6000,
    fatura: 1290,
    vencimento: "18/08",
    fechamento: "10/08",
    gradiente: "bg-gradient-to-br from-info to-primary",
  },
  {
    id: "loja-flex",
    nome: "Loja Flex",
    bandeira: "Elo",
    final: "1194",
    limite: 2500,
    fatura: 640,
    vencimento: "22/08",
    fechamento: "15/08",
    gradiente: "bg-gradient-to-br from-warning to-destructive",
  },
];

const faturasHistorico = [
  { mes: "Mar", valor: 4100 },
  { mes: "Abr", valor: 3850 },
  { mes: "Mai", valor: 4620 },
  { mes: "Jun", valor: 4180 },
  { mes: "Jul", valor: 5240 },
  { mes: "Ago", valor: 5410 },
];

const lancamentos: Record<string, { desc: string; cat: string; data: string; valor: number }[]> = {
  "certo-black": [
    { desc: "Supermercado Pão Real", cat: "Mercado", data: "02/08", valor: 612 },
    { desc: "Assinatura streaming", cat: "Lazer", data: "05/08", valor: 55 },
    { desc: "Passagem aérea", cat: "Viagem", data: "08/08", valor: 1290 },
    { desc: "Restaurante Nikkei", cat: "Alimentação", data: "11/08", valor: 268 },
  ],
  "certo-gold": [
    { desc: "Farmácia Bem Estar", cat: "Saúde", data: "03/08", valor: 148 },
    { desc: "Posto Ipiranga", cat: "Transporte", data: "07/08", valor: 320 },
    { desc: "Curso de inglês", cat: "Educação", data: "09/08", valor: 420 },
  ],
  "loja-flex": [
    { desc: "Tênis de corrida", cat: "Vestuário", data: "06/08", valor: 399 },
    { desc: "Utensílios de cozinha", cat: "Casa", data: "13/08", valor: 241 },
  ],
};

function CartoesPage() {
  const [selecionado, setSelecionado] = useState(cartoes[0].id);
  const cartao = useMemo(() => cartoes.find((c) => c.id === selecionado)!, [selecionado]);

  const totalFatura = cartoes.reduce((s, c) => s + c.fatura, 0);
  const totalLimite = cartoes.reduce((s, c) => s + c.limite, 0);
  const disponivel = totalLimite - totalFatura;
  const usoPct = Math.round((totalFatura / totalLimite) * 100);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Cartões</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Faturas, limites e lançamentos de agosto.
          </p>
        </div>
        <Button className="rounded-xl bg-gradient-brand font-semibold">
          <Plus className="size-4" aria-hidden="true" />
          Novo cartão
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Fatura total</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{brl(totalFatura)}</p>
            <p className="mt-3 text-xs text-muted-foreground">{cartoes.length} cartões ativos</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Limite disponível</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">
              {brl(disponivel)}
            </p>
            <Progress value={usoPct} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">{usoPct}% do limite utilizado</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Próximo vencimento</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">12/08</p>
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-1 text-xs font-medium text-warning">
              <CalendarClock className="size-3" aria-hidden="true" /> Certo Black · {brl(3480)}
            </span>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-1">
          {cartoes.map((c) => {
            const pct = Math.round((c.fatura / c.limite) * 100);
            const ativo = c.id === selecionado;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelecionado(c.id)}
                aria-pressed={ativo}
                className={cn(
                  "w-full rounded-3xl p-5 text-left text-primary-foreground shadow-brand transition-transform",
                  c.gradiente,
                  ativo ? "scale-[1.02]" : "opacity-80 hover:opacity-100",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{c.nome}</span>
                  <Wifi className="size-4 rotate-90" aria-hidden="true" />
                </div>
                <p className="mt-6 font-mono text-lg tracking-[0.2em]">•••• {c.final}</p>
                <div className="mt-4 flex items-end justify-between text-xs">
                  <div>
                    <p className="opacity-80">Fatura atual</p>
                    <p className="text-base font-semibold">{brl(c.fatura)}</p>
                  </div>
                  <div className="text-right">
                    <p className="opacity-80">{c.bandeira}</p>
                    <p>{pct}% do limite</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-4 xl:col-span-2">
          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Histórico de faturas</CardTitle>
              <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={faturasHistorico}>
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
                  <Bar dataKey="valor" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold">
                Lançamentos · {cartao.nome}
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                Fecha em {cartao.fechamento} · vence em {cartao.vencimento}
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              {lancamentos[cartao.id].map((l) => (
                <div
                  key={l.desc}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-info/15 text-info">
                      <CreditCard className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.desc}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.cat} · {l.data}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">-{brl(l.valor)}</span>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button variant="secondary" className="rounded-xl">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Pagar fatura
                </Button>
                <Button variant="ghost" className="rounded-xl">
                  <Lock className="size-4" aria-hidden="true" />
                  Bloquear cartão
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
