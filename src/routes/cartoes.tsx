import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard, Plus, Trash2, Wifi } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArchiveCreditCardDialog } from "@/components/cartoes/archive-credit-card-dialog";
import { NewCreditCardDialog } from "@/components/cartoes/new-credit-card-dialog";
import { useCreditCards, useCreditCardsSummary } from "@/hooks/use-credit-cards";
import { requireAuth } from "@/lib/auth";
import { formatBRL } from "@/lib/finance-format";
import { MaskableAmount } from "@/components/ui/maskable-amount";
import { cn } from "@/lib/utils";
import type { CreditCard as CreditCardModel } from "@/types/credit-card";

export const Route = createFileRoute("/cartoes")({
  beforeLoad: requireAuth,
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
        content: "Fatura atual, limite disponível e compras dos seus cartões.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartoesPage,
});

function EmptyCardsState({ onNewCard }: { onNewCard: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary">
        <CreditCard className="size-7" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold">Você ainda não possui cartões cadastrados.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Conecte um cartão via Open Finance ou cadastre manualmente.
        </p>
      </div>
      <Button onClick={onNewCard} className="rounded-xl bg-gradient-brand font-semibold">
        <Plus className="size-4" aria-hidden="true" />
        Novo cartão
      </Button>
    </div>
  );
}

function CreditCardTile({ card, onArchive }: { card: CreditCardModel; onArchive: () => void }) {
  const navigate = useNavigate();
  const limit = card.creditLimit ?? 0;
  const available = card.availableLimit ?? limit;
  const used = Math.max(0, limit - available);
  const usedPct = limit > 0 ? Math.round((used / limit) * 100) : 0;

  return (
    <Card
      className="cursor-pointer rounded-3xl border-border/70 shadow-soft transition-colors hover:bg-surface"
      onClick={() => navigate({ to: "/cartoes/$cardId", params: { cardId: card.id } })}
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
              <CreditCard className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{card.institutionName ?? card.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {card.name !== card.institutionName ? `${card.name} · ` : ""}
                {card.brand ?? "—"}
                {card.lastFourDigits ? ` · •••• ${card.lastFourDigits}` : ""}
              </p>
            </div>
          </div>
          {card.source === "MANUAL" && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-lg text-destructive hover:text-destructive"
              aria-label="Excluir cartão"
              onClick={(event) => {
                event.stopPropagation();
                onArchive();
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>

        {limit > 0 ? (
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Limite utilizado</span>
              <span>{usedPct}%</span>
            </div>
            <Progress value={usedPct} className="mt-2 h-2" />
            <p className="mt-2 text-sm font-semibold">
              <MaskableAmount value={formatBRL(used)} />{" "}
              <span className="font-normal text-muted-foreground">
                / <MaskableAmount value={formatBRL(limit)} />
              </span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Limite não disponível</p>
        )}

        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            card.source === "OPEN_FINANCE" ? "bg-primary/12 text-primary" : "bg-info/12 text-info",
          )}
        >
          {card.source === "OPEN_FINANCE" ? (
            <>
              <Wifi className="size-3" aria-hidden="true" /> Open Finance
            </>
          ) : (
            "Cadastro manual"
          )}
        </span>

        <Button variant="secondary" className="w-full rounded-xl">
          Ver cartão
        </Button>
      </CardContent>
    </Card>
  );
}

function CartoesPage() {
  const cardsQuery = useCreditCards();
  const summaryQuery = useCreditCardsSummary();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [archiving, setArchiving] = useState<CreditCardModel | null>(null);

  const cards = cardsQuery.data ?? [];
  const summary = summaryQuery.data;
  const usedPct =
    summary && summary.totalLimit > 0
      ? Math.round((summary.totalUsed / summary.totalLimit) * 100)
      : 0;

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Cartões de crédito</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Limites, faturas e compras de todos os seus cartões em um só lugar.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="rounded-xl bg-gradient-brand font-semibold"
        >
          <Plus className="size-4" aria-hidden="true" />
          Novo cartão
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Limite total</p>
            {summaryQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                <MaskableAmount value={formatBRL(summary?.totalLimit ?? 0)} />
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">{cards.length} cartões ativos</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Limite disponível</p>
            {summaryQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">
                <MaskableAmount value={formatBRL(summary?.totalAvailable ?? 0)} />
              </p>
            )}
            <Progress value={usedPct} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">{usedPct}% do limite utilizado</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Faturas em aberto</p>
            {summaryQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                <MaskableAmount value={formatBRL(summary?.openInvoicesTotal ?? 0)} />
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        {cardsQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-56 w-full rounded-3xl" />
            ))}
          </div>
        ) : cardsQuery.isError ? (
          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar seus cartões.
              </p>
              <Button variant="outline" onClick={() => cardsQuery.refetch()}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : cards.length === 0 ? (
          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardContent>
              <EmptyCardsState onNewCard={() => setDialogOpen(true)} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <CreditCardTile key={card.id} card={card} onArchive={() => setArchiving(card)} />
            ))}
          </div>
        )}
      </section>

      <NewCreditCardDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <ArchiveCreditCardDialog
        card={archiving}
        onOpenChange={(open) => {
          if (!open) setArchiving(null);
        }}
      />
    </AppShell>
  );
}
