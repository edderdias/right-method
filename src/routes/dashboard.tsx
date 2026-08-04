import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Area,
  AreaChart,
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
  Bell,
  CalendarClock,
  CreditCard,
  LayoutDashboard,
  LineChart,
  Menu,
  PiggyBank,
  Search,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { BrandLockup, BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
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

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const nav = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Receitas", icon: TrendingUp },
  { label: "Despesas", icon: ArrowDownRight },
  { label: "Contas", icon: Wallet },
  { label: "Cartões", icon: CreditCard },
  { label: "Investimentos", icon: LineChart },
  { label: "Metas", icon: Target },
  { label: "Relatórios", icon: CalendarClock },
  { label: "Certo IA", icon: Sparkles },
  { label: "Configurações", icon: Settings },
];

const cashFlow = [
  { mes: "Mar", receitas: 9200, despesas: 6100 },
  { mes: "Abr", receitas: 9800, despesas: 6900 },
  { mes: "Mai", receitas: 10400, despesas: 6400 },
  { mes: "Jun", receitas: 9900, despesas: 7300 },
  { mes: "Jul", receitas: 11200, despesas: 6800 },
  { mes: "Ago", receitas: 11800, despesas: 7100 },
];

const patrimonio = [
  { mes: "Mar", valor: 118000 },
  { mes: "Abr", valor: 122400 },
  { mes: "Mai", valor: 126900 },
  { mes: "Jun", valor: 129100 },
  { mes: "Jul", valor: 134600 },
  { mes: "Ago", valor: 140200 },
];

const categorias = [
  { nome: "Alimentação", valor: 1840, cor: "var(--chart-1)" },
  { nome: "Moradia", valor: 2400, cor: "var(--chart-2)" },
  { nome: "Transporte", valor: 780, cor: "var(--chart-3)" },
  { nome: "Lazer", valor: 640, cor: "var(--chart-4)" },
  { nome: "Outros", valor: 440, cor: "var(--chart-5)" },
];

const metas = [
  { nome: "Reserva de emergência", atual: 18400, alvo: 24000 },
  { nome: "Viagem em família", atual: 6200, alvo: 12000 },
  { nome: "Entrada do apartamento", atual: 41000, alvo: 90000 },
];

const contas = [
  { nome: "Energia elétrica", venc: "Vence em 2 dias", valor: 289 },
  { nome: "Fatura Cartão Certo", venc: "Vence em 5 dias", valor: 2140 },
  { nome: "Internet fibra", venc: "Vence em 8 dias", valor: 129 },
];

const insights = [
  { texto: "Você gastou 14% mais em alimentação neste mês.", tom: "warning" as const },
  { texto: "Dá para economizar R$ 280 revisando assinaturas.", tom: "primary" as const },
  { texto: "Seu patrimônio cresceu 4,2% em 30 dias.", tom: "info" as const },
];

function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-dvh bg-background">
      <div className="flex">
        <aside
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 transition-[width] duration-300 lg:flex",
            sidebarOpen ? "w-64" : "w-20",
          )}
        >
          <div className="mb-8 flex items-center px-1">
            {sidebarOpen ? <BrandLockup /> : <BrandMark />}
          </div>
          <nav className="flex-1 space-y-1" aria-label="Navegação principal">
            {nav.map((item) => (
              <button
                key={item.label}
                type="button"
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  item.active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-5 shrink-0" aria-hidden="true" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            ))}
          </nav>
          <Link
            to="/"
            className="mt-4 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground"
          >
            {sidebarOpen ? "Sair da conta" : "←"}
          </Link>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass sticky top-0 z-20 flex items-center gap-3 px-4 py-3 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              aria-label="Recolher menu"
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <Menu className="size-5" />
            </Button>
            <div className="relative hidden flex-1 sm:block">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                placeholder="Buscar lançamentos, metas, cartões..."
                aria-label="Buscar"
                className="h-10 w-full rounded-xl border border-input bg-surface pl-10 pr-4 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-xl" aria-label="Notificações">
                <Bell className="size-5" />
              </Button>
              <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-1.5">
                <span className="grid size-8 place-items-center rounded-lg bg-gradient-brand text-xs font-semibold text-primary-foreground">
                  MC
                </span>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium leading-none">Marina Costa</p>
                  <p className="text-xs text-muted-foreground">Plano Premium</p>
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Olá, Marina 👋</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Aqui está o resumo das suas finanças em agosto.
              </p>
            </div>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Saldo atual"
                value={brl(14820)}
                delta="+8,4%"
                positive
                icon={Wallet}
                highlight
              />
              <StatCard
                title="Receitas do mês"
                value={brl(11800)}
                delta="+5,3%"
                positive
                icon={TrendingUp}
              />
              <StatCard
                title="Despesas do mês"
                value={brl(7100)}
                delta="+4,1%"
                icon={ArrowDownRight}
              />
              <StatCard
                title="Patrimônio"
                value={brl(140200)}
                delta="+4,2%"
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
                  {insights.map((item) => (
                    <div
                      key={item.texto}
                      className={cn(
                        "rounded-2xl p-4 text-sm",
                        item.tom === "warning" && "bg-warning/12 text-foreground",
                        item.tom === "primary" && "bg-primary/12 text-foreground",
                        item.tom === "info" && "bg-info/12 text-foreground",
                      )}
                    >
                      {item.texto}
                    </div>
                  ))}
                  <Button className="mt-2 w-full rounded-xl bg-gradient-brand font-semibold">
                    Conversar com o Certo IA
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

              <Card className="rounded-3xl border-border/70 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Evolução do patrimônio</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={patrimonio}>
                      <defs>
                        <linearGradient id="pat" x1="0" y1="0" x2="0" y2="1">
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
                        fill="url(#pat)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-border/70 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Metas financeiras</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {metas.map((meta) => {
                    const pct = Math.round((meta.atual / meta.alvo) * 100);
                    return (
                      <div key={meta.nome} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{meta.nome}</span>
                          <span className="text-muted-foreground">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {brl(meta.atual)} de {brl(meta.alvo)}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-3xl border-border/70 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Contas a vencer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {contas.map((conta) => (
                    <div
                      key={conta.nome}
                      className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-xl bg-warning/15 text-warning">
                          <CalendarClock className="size-4" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-sm font-medium">{conta.nome}</p>
                          <p className="text-xs text-muted-foreground">{conta.venc}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">{brl(conta.valor)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-border/70 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Cartão Certo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl bg-gradient-brand p-5 text-primary-foreground shadow-brand">
                    <div className="flex items-center justify-between">
                      <CreditCard className="size-6" aria-hidden="true" />
                      <span className="text-xs uppercase tracking-widest opacity-80">Crédito</span>
                    </div>
                    <p className="mt-8 text-sm opacity-80">Fatura atual</p>
                    <p className="text-2xl font-semibold">{brl(2140)}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Limite utilizado</span>
                      <span className="font-medium">27%</span>
                    </div>
                    <Progress value={27} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Disponível {brl(5860)} de {brl(8000)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  delta,
  positive,
  icon: Icon,
  highlight,
}: {
  title: string;
  value: string;
  delta: string;
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
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
