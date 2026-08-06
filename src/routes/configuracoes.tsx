import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  Fingerprint,
  Globe,
  LogOut,
  Moon,
  Palette,
  ShieldCheck,
  Smartphone,
  Sun,
  User,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações | Método Certo" },
      {
        name: "description",
        content:
          "Ajuste perfil, tema, notificações, segurança com biometria e 2FA, e as preferências do app Método Certo.",
      },
      { property: "og:title", content: "Configurações | Método Certo" },
      {
        property: "og:description",
        content: "Perfil, aparência, notificações, segurança e preferências do aplicativo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConfiguracoesPage,
});

const notificacoes = [
  { id: "vencimento", label: "Contas vencendo", detalhe: "Aviso 3 dias antes do vencimento" },
  { id: "cartao", label: "Fatura do cartão", detalhe: "Fechamento e vencimento das faturas" },
  { id: "meta", label: "Progresso de metas", detalhe: "Quando você atinge marcos importantes" },
  { id: "saldo", label: "Saldo baixo", detalhe: "Quando o saldo ficar abaixo de R$ 500" },
  { id: "investimento", label: "Investimentos", detalhe: "Dividendos, vencimentos e rentabilidade" },
];

const seguranca = [
  { id: "biometria", label: "Biometria", detalhe: "Entrar com digital ou Face ID", icon: Fingerprint },
  { id: "2fa", label: "Autenticação em 2 fatores", detalhe: "Código por app autenticador", icon: ShieldCheck },
  { id: "sessoes", label: "Alerta de novo dispositivo", detalhe: "Avisar em cada novo login", icon: Smartphone },
];

const temas = [
  { id: "claro", label: "Claro", icon: Sun },
  { id: "escuro", label: "Escuro", icon: Moon },
  { id: "sistema", label: "Sistema", icon: Palette },
] as const;

function ConfiguracoesPage() {
  const [tema, setTema] = useState<(typeof temas)[number]["id"]>("claro");
  const [ativas, setAtivas] = useState<Record<string, boolean>>({
    vencimento: true,
    cartao: true,
    meta: true,
    saldo: false,
    investimento: true,
    biometria: true,
    "2fa": false,
    sessoes: true,
  });

  const alternar = (id: string) => setAtivas((s) => ({ ...s, [id]: !s[id] }));

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie seu perfil, aparência, alertas e segurança.
        </p>
      </div>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <User className="size-4 text-primary" aria-hidden="true" />
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid size-16 place-items-center rounded-2xl bg-gradient-brand text-lg font-semibold text-primary-foreground">
                MC
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold">Marina Costa</p>
                <p className="text-sm text-muted-foreground">marina.costa@email.com</p>
              </div>
              <Button variant="secondary" className="rounded-xl">
                Trocar foto
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="nome" className="text-sm font-medium">
                  Nome completo
                </label>
                <input
                  id="nome"
                  defaultValue="Marina Costa"
                  className="mt-2 h-11 w-full rounded-xl border border-input bg-surface px-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              <div>
                <label htmlFor="email" className="text-sm font-medium">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  defaultValue="marina.costa@email.com"
                  className="mt-2 h-11 w-full rounded-xl border border-input bg-surface px-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              <div>
                <label htmlFor="telefone" className="text-sm font-medium">
                  Telefone
                </label>
                <input
                  id="telefone"
                  defaultValue="(11) 98877-4321"
                  className="mt-2 h-11 w-full rounded-xl border border-input bg-surface px-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              <div>
                <label htmlFor="moeda" className="text-sm font-medium">
                  Moeda
                </label>
                <select
                  id="moeda"
                  defaultValue="BRL"
                  className="mt-2 h-11 w-full rounded-xl border border-input bg-surface px-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="BRL">Real brasileiro (R$)</option>
                  <option value="USD">Dólar americano (US$)</option>
                  <option value="EUR">Euro (€)</option>
                </select>
              </div>
            </div>
            <Button className="rounded-xl bg-gradient-brand font-semibold">
              Salvar alterações
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Palette className="size-4 text-primary" aria-hidden="true" />
                Aparência
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              {temas.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTema(t.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border border-transparent bg-surface-2 p-3 text-xs font-medium transition-colors",
                    tema === t.id
                      ? "border-primary/40 bg-gradient-surface text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <t.icon className="size-5" aria-hidden="true" />
                  {t.label}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Globe className="size-4 text-primary" aria-hidden="true" />
                Preferências
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Idioma</span>
                <span className="text-muted-foreground">Português (BR)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Fuso horário</span>
                <span className="text-muted-foreground">GMT-3 São Paulo</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Início da semana</span>
                <span className="text-muted-foreground">Domingo</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Ocultar saldos</span>
                <Switch
                  checked={!!ativas["ocultar"]}
                  onCheckedChange={() => alternar("ocultar")}
                  aria-label="Ocultar saldos"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Bell className="size-4 text-primary" aria-hidden="true" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notificacoes.map((n) => (
              <div
                key={n.id}
                className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.label}</p>
                  <p className="text-xs text-muted-foreground">{n.detalhe}</p>
                </div>
                <Switch
                  checked={!!ativas[n.id]}
                  onCheckedChange={() => alternar(n.id)}
                  aria-label={n.label}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {seguranca.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-primary">
                  <s.icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.detalhe}</p>
                </div>
                <Switch
                  checked={!!ativas[s.id]}
                  onCheckedChange={() => alternar(s.id)}
                  aria-label={s.label}
                />
              </div>
            ))}
            <Button variant="secondary" className="w-full rounded-xl">
              Alterar senha
            </Button>
            <Button variant="ghost" className="w-full rounded-xl text-destructive">
              <LogOut className="size-4" aria-hidden="true" />
              Encerrar todas as sessões
            </Button>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
