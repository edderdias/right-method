import { createFileRoute } from "@tanstack/react-router";

import { requireAuth } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Lightbulb, RefreshCw, TrendingDown, Wallet } from "lucide-react";

import { AppShell, brl } from "@/components/app-shell";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/certo-ia")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Certo IA | Assistente financeiro do Método Certo" },
      {
        name: "description",
        content:
          "Converse com a Certo IA sobre seus gastos, previsões e planos de economia com análises personalizadas das suas finanças.",
      },
      { property: "og:title", content: "Certo IA — seu consultor financeiro" },
      {
        property: "og:description",
        content: "Pergunte quanto pode gastar, onde cortar e como investir melhor todo mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CertoIaPage,
});

type Mensagem = { id: string; autor: "ia" | "usuario"; texto: string };

const inicial: Mensagem[] = [
  {
    id: "m1",
    autor: "ia",
    texto:
      "Oi, Marina! Analisei seus últimos 6 meses. Sua taxa de poupança está em 47% e o gasto com alimentação subiu 14%. Quer que eu monte um plano para o mês?",
  },
];

const sugestoes = [
  "Quanto posso gastar este mês?",
  "Estou economizando o suficiente?",
  "Quais gastos posso cortar?",
  "Como investir o que sobrou?",
  "Qual minha previsão para dezembro?",
];

const respostas: Record<string, string> = {
  gastar:
    "Considerando suas receitas de R$ 13.650 e os compromissos fixos de R$ 5.900, você pode gastar até **R$ 2.480** em variáveis mantendo o aporte de R$ 3.950 nas metas.",
  economizando:
    "Sim. Você guardou 47% da renda nos últimos 3 meses, acima da meta de 30%. No ritmo atual a reserva de emergência fecha 4 meses antes do prazo.",
  cortar:
    "Os três maiores desperdícios do trimestre: delivery (R$ 280/mês), assinaturas duplicadas (R$ 96/mês) e tarifas bancárias (R$ 42/mês). Cortando os três você libera R$ 418 por mês.",
  investir:
    "Com R$ 3.950 livres eu sugeriria 50% em CDB de liquidez diária para completar a reserva, 30% em Tesouro IPCA+ 2035 e 20% em FIIs de tijolo para renda mensal.",
  previsão:
    "Mantendo o padrão atual, seu saldo em dezembro deve ficar em torno de R$ 41.200 e o patrimônio total em R$ 187.500 — crescimento de 9,4% no ano.",
};

const padrao =
  "Analisei seu histórico: nos últimos 6 meses você teve média de R$ 12.616 de receita e R$ 6.766 de despesa. Posso detalhar por categoria, simular uma meta ou montar um plano de corte de gastos — é só pedir.";

function responder(pergunta: string) {
  const texto = pergunta.toLowerCase();
  const chave = Object.keys(respostas).find((k) => texto.includes(k));
  return chave ? respostas[chave]! : padrao;
}

const insights = [
  {
    icon: TrendingDown,
    titulo: "Alimentação +14%",
    detalhe: "R$ 1.680 este mês contra R$ 1.470 no anterior.",
  },
  {
    icon: Wallet,
    titulo: `Sobra prevista de ${brl(2480)}`,
    detalhe: "Depois de todas as contas fixas e aportes.",
  },
  {
    icon: Lightbulb,
    titulo: "Economia possível",
    detalhe: `${brl(418)} por mês cortando delivery e assinaturas.`,
  },
];

function CertoIaPage() {
  const [mensagens, setMensagens] = useState<Mensagem[]>(inicial);
  const [texto, setTexto] = useState("");
  const [digitando, setDigitando] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, digitando]);

  const enviar = (valor: string) => {
    const pergunta = valor.trim();
    if (!pergunta || digitando) return;
    const id = String(Date.now());
    setMensagens((m) => [...m, { id, autor: "usuario", texto: pergunta }]);
    setTexto("");
    setDigitando(true);
    window.setTimeout(() => {
      setMensagens((m) => [...m, { id: `${id}-ia`, autor: "ia", texto: responder(pergunta) }]);
      setDigitando(false);
      inputRef.current?.focus();
    }, 900);
  };

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Certo IA</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seu consultor financeiro pessoal, com base nos seus lançamentos.
          </p>
        </div>
        <Button
          variant="secondary"
          className="rounded-xl"
          onClick={() => setMensagens(inicial)}
          disabled={digitando}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Nova conversa
        </Button>
      </div>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="flex h-[600px] flex-col overflow-hidden rounded-3xl border-border/70 shadow-soft xl:col-span-2">
          <CardContent className="flex-1 space-y-5 overflow-y-auto p-5">
            {mensagens.map((m) =>
              m.autor === "ia" ? (
                <div key={m.id} className="flex gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-brand">
                    <BrandMark className="size-5" />
                  </span>
                  <p className="max-w-prose whitespace-pre-line pt-1 text-sm leading-relaxed text-foreground">
                    {m.texto}
                  </p>
                </div>
              ) : (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-prose rounded-2xl bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
                    {m.texto}
                  </p>
                </div>
              ),
            )}
            {digitando && (
              <div className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-brand">
                  <BrandMark className="size-5" />
                </span>
                <p className="animate-pulse pt-1 text-sm text-muted-foreground">
                  Analisando suas finanças...
                </p>
              </div>
            )}
            <div ref={fimRef} />
          </CardContent>

          <div className="border-t border-border/70 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {sugestoes.slice(0, 3).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  className="rounded-full bg-surface-2 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                enviar(texto);
              }}
            >
              <textarea
                ref={inputRef}
                rows={2}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviar(texto);
                  }
                }}
                placeholder="Pergunte algo sobre suas finanças..."
                aria-label="Mensagem para a Certo IA"
                className="w-full resize-none rounded-2xl border border-input bg-surface p-4 pr-14 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/40"
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Enviar mensagem"
                disabled={!texto.trim() || digitando}
                className="absolute bottom-3 right-3 size-9 rounded-xl bg-gradient-brand"
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </Button>
            </form>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Insights automáticos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.map((i) => (
                <div key={i.titulo} className="flex gap-3 rounded-2xl bg-surface-2 p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-primary">
                    <i.icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{i.titulo}</p>
                    <p className="text-xs text-muted-foreground">{i.detalhe}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Perguntas frequentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sugestoes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  className={cn(
                    "w-full rounded-2xl bg-surface-2 p-3 text-left text-sm transition-colors",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
