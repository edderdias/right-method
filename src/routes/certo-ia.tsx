import { createFileRoute, Link } from "@tanstack/react-router";

import { requireAuth } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  History,
  LineChart,
  Pencil,
  Plus,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

import { AppShell, brl } from "@/components/app-shell";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useAiConversation,
  useAiConversations,
  useCreateAiConversation,
  useDeleteAiConversation,
  useRenameAiConversation,
  useSendAiMessage,
} from "@/hooks/use-ai-chat";
import { useReportSummary } from "@/hooks/use-reports";
import { useFinancialGoalsSummary } from "@/hooks/use-financial-goals";
import { useInvestmentsSummary } from "@/hooks/use-investments";
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

const WELCOME_MESSAGE =
  "Olá! Eu sou o Certo IA.\n\nEstou aqui para ajudar você a entender melhor seu dinheiro, encontrar oportunidades de economia e tomar decisões financeiras mais conscientes.\n\nComo posso ajudar hoje?";

const sugestoes = [
  "Quanto gastei este mês?",
  "Onde estou gastando mais?",
  "Como estão minhas metas?",
  "Posso economizar mais?",
  "Como está meu patrimônio?",
  "Como estão meus investimentos?",
];

/** Whitelist of routes the assistant is allowed to link to — matches the routes named in the
 * system prompt, so a stray/hallucinated value from the model never becomes a broken link. */
const SUGGESTED_ROUTES = {
  "/relatorios": "/relatorios",
  "/despesas": "/despesas",
  "/receitas": "/receitas",
  "/metas": "/metas",
  "/investimentos": "/investimentos",
  "/cartoes": "/cartoes",
  "/contas": "/contas",
  "/dashboard": "/dashboard",
} as const;

function resolveSuggestedRoute(route: string | null | undefined) {
  if (!route) return null;
  return SUGGESTED_ROUTES[route as keyof typeof SUGGESTED_ROUTES] ?? null;
}

function formatRelativeDate(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function CertoIaPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useAiConversations();
  const { data: conversation, isLoading: isLoadingConversation } = useAiConversation(activeId);
  const createConversation = useCreateAiConversation();
  const renameConversation = useRenameAiConversation();
  const deleteConversation = useDeleteAiConversation();
  const sendMessage = useSendAiMessage();

  const { data: reportSummary } = useReportSummary({});
  const { data: goalsSummary } = useFinancialGoalsSummary();
  const { data: investmentsSummary } = useInvestmentsSummary();

  const isSending = sendMessage.isPending || createConversation.isPending;

  useEffect(() => {
    if (activeId === null && conversations && conversations.length > 0) {
      setActiveId(conversations[0]!.id);
    }
  }, [activeId, conversations]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeId]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages, isSending]);

  async function enviar(valor: string) {
    const pergunta = valor.trim();
    if (!pergunta || isSending) return;
    setTexto("");

    let conversationId = activeId;
    if (!conversationId) {
      const created = await createConversation.mutateAsync();
      conversationId = created.id;
      setActiveId(created.id);
    }

    sendMessage.mutate({ conversationId, message: pergunta });
  }

  async function handleNovaConversa() {
    const created = await createConversation.mutateAsync();
    setActiveId(created.id);
  }

  function handleStartRename() {
    setRenameValue(conversation?.title ?? "");
    setRenaming(true);
  }

  function handleConfirmRename() {
    const title = renameValue.trim();
    if (activeId && title) {
      renameConversation.mutate({ id: activeId, title });
    }
    setRenaming(false);
  }

  function handleConfirmDelete() {
    if (!activeId) return;
    const remaining = (conversations ?? []).filter((c) => c.id !== activeId);
    deleteConversation.mutate(activeId);
    setActiveId(remaining[0]?.id ?? null);
    setDeleteOpen(false);
  }

  const messages = conversation?.messages ?? [];
  const expensesTrendPct = reportSummary?.variation.expensesPct ?? null;

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Certo IA</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seu consultor financeiro pessoal, com base nos seus lançamentos.
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" className="rounded-xl">
                <History className="size-4" aria-hidden="true" />
                Histórico
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {!conversations || conversations.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Nenhuma conversa ainda.
                </div>
              ) : (
                conversations.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onSelect={() => setActiveId(c.id)}
                    className={cn("justify-between gap-2", c.id === activeId && "bg-surface-2")}
                  >
                    <span className="truncate">{c.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelativeDate(c.updatedAt)}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="secondary"
            className="rounded-xl"
            onClick={handleNovaConversa}
            disabled={isSending}
          >
            <Plus className="size-4" aria-hidden="true" />
            Nova conversa
          </Button>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="flex h-[600px] flex-col overflow-hidden rounded-3xl border-border/70 shadow-soft xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
            {renaming ? (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmRename();
                    if (e.key === "Escape") setRenaming(false);
                  }}
                  autoFocus
                  className="h-8"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={handleConfirmRename}
                >
                  <Check className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => setRenaming(false)}
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <>
                <p className="truncate text-sm font-medium text-foreground">
                  {conversation?.title ?? "Nova conversa"}
                </p>
                {activeId && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground"
                      onClick={handleStartRename}
                      aria-label="Renomear conversa"
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                      aria-label="Excluir conversa"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          <CardContent className="flex-1 space-y-5 overflow-y-auto p-5">
            {isLoadingConversation ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-3/4 rounded-2xl" />
                <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
              </div>
            ) : (
              <>
                <div className="flex gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-brand">
                    <BrandMark className="size-5" />
                  </span>
                  <p className="max-w-prose whitespace-pre-line pt-1 text-sm leading-relaxed text-foreground">
                    {WELCOME_MESSAGE}
                  </p>
                </div>

                {messages.map((m) => {
                  const route = resolveSuggestedRoute(m.suggestedRoute);
                  return m.role === "ASSISTANT" ? (
                    <div key={m.id} className="flex gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-brand">
                        <BrandMark className="size-5" />
                      </span>
                      <div className="max-w-prose space-y-2 pt-1">
                        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                          {m.content}
                        </p>
                        {route && (
                          <Button asChild size="sm" variant="outline" className="rounded-xl">
                            <Link to={route}>{m.suggestedLabel ?? "Ver detalhes"}</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex justify-end">
                      <p className="max-w-prose rounded-2xl bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
                        {m.content}
                      </p>
                    </div>
                  );
                })}

                {isSending && (
                  <div className="flex gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-brand">
                      <BrandMark className="size-5" />
                    </span>
                    <p className="animate-pulse pt-1 text-sm text-muted-foreground">
                      Analisando suas finanças...
                    </p>
                  </div>
                )}
              </>
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
                  disabled={isSending}
                  className="rounded-full bg-surface-2 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                void enviar(texto);
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
                    void enviar(texto);
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
                disabled={!texto.trim() || isSending}
                className="absolute bottom-3 right-3 size-9 rounded-xl bg-gradient-brand"
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </Button>
            </form>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
              O Certo IA fornece análises com base nos dados disponíveis no Método Certo. As
              informações não constituem recomendação financeira, contábil ou jurídica profissional.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Resumo financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3 rounded-2xl bg-surface-2 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-primary">
                  <Wallet className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Saldo do mês: {brl(reportSummary?.current.balance ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Receitas {brl(reportSummary?.current.income ?? 0)} · Despesas{" "}
                    {brl(reportSummary?.current.expenses ?? 0)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 rounded-2xl bg-surface-2 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-primary">
                  {expensesTrendPct !== null && expensesTrendPct > 0 ? (
                    <TrendingUp className="size-4" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="size-4" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {expensesTrendPct === null
                      ? "Sem dados do mês anterior"
                      : `Despesas ${expensesTrendPct >= 0 ? "subiram" : "caíram"} ${Math.abs(expensesTrendPct)}%`}
                  </p>
                  <p className="text-xs text-muted-foreground">Comparado ao mês anterior</p>
                </div>
              </div>

              <div className="flex gap-3 rounded-2xl bg-surface-2 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-primary">
                  <Target className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Metas: {goalsSummary?.overallProgressPct ?? 0}% concluídas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {goalsSummary?.activeCount ?? 0} meta(s) ativa(s)
                  </p>
                </div>
              </div>

              <div className="flex gap-3 rounded-2xl bg-surface-2 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-primary">
                  <LineChart className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Investido: {brl(investmentsSummary?.totalCurrentValue ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {investmentsSummary?.investmentCount ?? 0} investimento(s)
                  </p>
                </div>
              </div>
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
                  disabled={isSending}
                  className={cn(
                    "w-full rounded-2xl bg-surface-2 p-3 text-left text-sm transition-colors",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50",
                  )}
                >
                  {s}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Todo o histórico desta conversa com o Certo IA será
              perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
