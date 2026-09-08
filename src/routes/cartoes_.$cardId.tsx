import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Undo2,
  Wifi,
  X,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArchiveCreditCardDialog } from "@/components/cartoes/archive-credit-card-dialog";
import { DeletePurchaseDialog } from "@/components/cartoes/delete-purchase-dialog";
import { EditCreditCardDialog } from "@/components/cartoes/edit-credit-card-dialog";
import { PayInvoiceDialog } from "@/components/cartoes/pay-invoice-dialog";
import { PurchaseFormDialog } from "@/components/cartoes/purchase-form-dialog";
import { ReverseInvoicePaymentDialog } from "@/components/cartoes/reverse-invoice-payment-dialog";
import { useExpenseCategories } from "@/hooks/use-expenses";
import {
  useCardResponsiblesSummary,
  useCreditCard,
  useCreditCardInvoices,
  useCreditCardPurchases,
  useSyncCreditCard,
} from "@/hooks/use-credit-cards";
import { requireAuth } from "@/lib/auth";
import {
  formatBRL,
  formatDateTime,
  formatShortDate,
  getLast30DaysRange,
  getLast6MonthsRange,
  getLastNDaysRange,
  getMonthRange,
  getTodayRange,
} from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type {
  CreditCardInvoice,
  CreditCardInvoiceStatus,
  CreditCardPurchase,
} from "@/types/credit-card";

export const Route = createFileRoute("/cartoes_/$cardId")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Cartão | Método Certo" },
      {
        name: "description",
        content: "Fatura, limite e extrato completo de um cartão de crédito.",
      },
    ],
  }),
  component: CartaoDetailPage,
});

type PeriodFilter = "all" | "today" | "7days" | "30days" | "month" | "6months";

const PERIOD_OPTIONS: { key: PeriodFilter; label: string }[] = [
  { key: "all", label: "Tudo" },
  { key: "today", label: "Hoje" },
  { key: "7days", label: "7 dias" },
  { key: "30days", label: "30 dias" },
  { key: "month", label: "Este mês" },
  { key: "6months", label: "Últimos 6 meses" },
];

const INVOICE_STATUS_META: Record<CreditCardInvoiceStatus, { label: string; className: string }> = {
  OPEN: { label: "Aberta", className: "bg-info/12 text-info" },
  CLOSED: { label: "Fechada", className: "bg-secondary text-secondary-foreground" },
  DUE: { label: "A vencer", className: "bg-warning/15 text-warning" },
  PAID: { label: "Paga", className: "bg-primary/12 text-primary" },
  OVERDUE: { label: "Atrasada", className: "bg-destructive/12 text-destructive" },
};

function resolveRange(period: PeriodFilter) {
  const today = new Date();
  switch (period) {
    case "today":
      return getTodayRange();
    case "7days":
      return getLastNDaysRange(7);
    case "30days":
      return getLast30DaysRange();
    case "6months":
      return getLast6MonthsRange();
    case "month":
      return getMonthRange(today.getFullYear(), today.getMonth() + 1);
    case "all":
    default:
      return { from: undefined, to: undefined };
  }
}

function limitAlertClass(pct: number): string {
  if (pct >= 90) return "text-destructive";
  if (pct >= 70) return "text-warning";
  return "text-primary";
}

function CartaoDetailPage() {
  const { cardId } = Route.useParams();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodFilter>("30days");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [invoiceId, setInvoiceId] = useState<string>("all");
  const [responsibleName, setResponsibleName] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [payingInvoice, setPayingInvoice] = useState<CreditCardInvoice | null>(null);
  const [reversingInvoice, setReversingInvoice] = useState<CreditCardInvoice | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<CreditCardPurchase | null>(null);
  const [deletingPurchase, setDeletingPurchase] = useState<CreditCardPurchase | null>(null);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setPage(1);
    setResponsibleName(null);
  }, [period, categoryId, invoiceId]);

  useEffect(() => {
    setPage(1);
  }, [responsibleName]);

  const range = resolveRange(period);
  const cardQuery = useCreditCard(cardId);
  const invoicesQuery = useCreditCardInvoices(cardId);
  const categoriesQuery = useExpenseCategories();
  const syncCard = useSyncCreditCard();

  const sharedFilters = {
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
    ...(categoryId !== "all" ? { categoryId } : {}),
    ...(invoiceId !== "all" ? { invoiceId } : {}),
  };

  const responsiblesQuery = useCardResponsiblesSummary(cardId, sharedFilters);

  const purchasesQuery = useCreditCardPurchases(cardId, {
    ...sharedFilters,
    ...(responsibleName ? { responsibleName } : {}),
    page,
    pageSize: 20,
  });

  const card = cardQuery.data;
  const invoices = invoicesQuery.data ?? [];
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentInvoice =
    invoices.find((invoice) => invoice.referenceMonth.slice(0, 7) === currentMonthKey) ?? null;

  const purchases = purchasesQuery.data?.items ?? [];
  const total = purchasesQuery.data?.total ?? 0;
  const pageSize = purchasesQuery.data?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const responsibles = responsiblesQuery.data ?? [];
  const responsiblesTotal = responsibles.reduce((sum, row) => sum + row.total, 0);
  const periodLabel = PERIOD_OPTIONS.find((option) => option.key === period)?.label ?? "";

  const limit = card?.creditLimit ?? 0;
  const available = card?.availableLimit ?? limit;
  const used = Math.max(0, limit - available);
  const usedPct = limit > 0 ? Math.round((used / limit) * 100) : 0;

  return (
    <AppShell>
      <div>
        <Link
          to="/cartoes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Cartões
        </Link>
      </div>

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {cardQuery.isLoading ? (
                <Skeleton className="h-7 w-48" />
              ) : (
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {card?.institutionName ?? card?.name}
                </h1>
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                {card?.name}
                {card?.lastFourDigits ? ` · •••• ${card.lastFourDigits}` : ""}
                {card?.brand ? ` · ${card.brand}` : ""}
              </p>
              <span
                className={cn(
                  "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  card?.source === "OPEN_FINANCE"
                    ? "bg-primary/12 text-primary"
                    : "bg-info/12 text-info",
                )}
              >
                {card?.source === "OPEN_FINANCE" ? (
                  <>
                    <Wifi className="size-3" aria-hidden="true" /> Sincronizado via Open Finance
                  </>
                ) : (
                  "Cadastro manual"
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {card?.source === "OPEN_FINANCE" && (
                <Button
                  variant="secondary"
                  className="rounded-xl"
                  disabled={syncCard.isPending}
                  onClick={() => syncCard.mutate(cardId)}
                >
                  <RefreshCw
                    className={cn("size-4", syncCard.isPending && "animate-spin")}
                    aria-hidden="true"
                  />
                  Sincronizar agora
                </Button>
              )}
              {card?.source === "MANUAL" && (
                <>
                  <Button
                    variant="secondary"
                    className="rounded-xl"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    className="rounded-xl text-destructive"
                    onClick={() => setArchiving(true)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Excluir
                  </Button>
                </>
              )}
            </div>
          </div>

          {limit > 0 ? (
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Limite utilizado</span>
                <span className={limitAlertClass(usedPct)}>{usedPct}%</span>
              </div>
              <Progress value={usedPct} className="mt-2 h-2" />
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-semibold">{formatBRL(used)} utilizado</span>
                <span className="text-muted-foreground">{formatBRL(available)} disponível</span>
                <span className="text-muted-foreground">{formatBRL(limit)} total</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Limite não disponível</p>
          )}

          {card?.source === "OPEN_FINANCE" && (
            <p className="text-xs text-muted-foreground">
              {card.lastSyncAt
                ? `Última sincronização: ${formatDateTime(card.lastSyncAt)}`
                : "Ainda não sincronizado"}
            </p>
          )}
        </CardContent>
      </Card>

      {currentInvoice && (
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">Fatura atual</CardTitle>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                INVOICE_STATUS_META[currentInvoice.status].className,
              )}
            >
              {INVOICE_STATUS_META[currentInvoice.status].label}
            </span>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5 pt-0">
            <div>
              <p className="text-2xl font-semibold tracking-tight">
                {formatBRL(currentInvoice.totalAmount)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Fechamento {formatShortDate(currentInvoice.closingDate)} · Vencimento{" "}
                {formatShortDate(currentInvoice.dueDate)}
              </p>
            </div>
            {currentInvoice.status !== "PAID" ? (
              <Button
                variant="secondary"
                className="rounded-xl"
                onClick={() => setPayingInvoice(currentInvoice)}
              >
                <ShieldCheck className="size-4" aria-hidden="true" />
                Pagar fatura
              </Button>
            ) : (
              currentInvoice.canReverse && (
                <Button
                  variant="ghost"
                  className="rounded-xl text-destructive"
                  onClick={() => setReversingInvoice(currentInvoice)}
                >
                  <Undo2 className="size-4" aria-hidden="true" />
                  Estornar pagamento
                </Button>
              )
            )}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Faturas</CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesQuery.isLoading ? (
            <Skeleton className="h-24 w-full rounded-2xl" />
          ) : invoices.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma fatura ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fechamento</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="cursor-pointer"
                    onClick={() => setInvoiceId(invoice.id)}
                  >
                    <TableCell>{formatShortDate(invoice.closingDate)}</TableCell>
                    <TableCell>{formatShortDate(invoice.dueDate)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatBRL(invoice.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          INVOICE_STATUS_META[invoice.status].className,
                        )}
                      >
                        {INVOICE_STATUS_META[invoice.status].label}
                      </span>
                      {invoice.reversedAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Estornada em {formatShortDate(invoice.reversedAt)}
                          {invoice.reversalReason ? `: ${invoice.reversalReason}` : ""}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {invoice.status !== "PAID" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPayingInvoice(invoice);
                          }}
                        >
                          Pagar
                        </Button>
                      ) : (
                        invoice.canReverse && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              setReversingInvoice(invoice);
                            }}
                          >
                            Estornar
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">Gastos por responsável</CardTitle>
          <span className="text-xs text-muted-foreground">{periodLabel}</span>
        </CardHeader>
        <CardContent>
          {responsiblesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          ) : responsibles.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma compra no período selecionado.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {responsibles.map((row) => {
                const label = row.responsibleName ?? "Sem responsável";
                const isActive = responsibleName === row.responsibleName;
                const pct =
                  responsiblesTotal > 0 ? Math.round((row.total / responsiblesTotal) * 100) : 0;
                const drillable = row.responsibleName !== null;
                return (
                  <li key={label}>
                    <button
                      type="button"
                      disabled={!drillable}
                      aria-pressed={isActive}
                      onClick={() =>
                        setResponsibleName(isActive ? null : row.responsibleName)
                      }
                      className={cn(
                        "flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm transition-colors",
                        drillable ? "hover:text-primary" : "cursor-default",
                        isActive && "text-primary",
                      )}
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.count} {row.count === 1 ? "compra" : "compras"} · {pct}%
                        </span>
                      </span>
                      <span className="flex items-center gap-1 whitespace-nowrap font-semibold">
                        {formatBRL(row.total)}
                        {drillable && (
                          <ChevronRight
                            className="size-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardHeader className="flex-col items-stretch gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold">Extrato</CardTitle>
            <Button
              onClick={() => {
                setEditingPurchase(null);
                setPurchaseDialogOpen(true);
              }}
              className="rounded-xl bg-gradient-brand font-semibold"
            >
              <Plus className="size-4" aria-hidden="true" />
              Novo lançamento
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setPeriod(option.key)}
                aria-pressed={period === option.key}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  period === option.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-2 text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-8 w-48 rounded-full text-xs">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {(categoriesQuery.data ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={invoiceId} onValueChange={setInvoiceId}>
              <SelectTrigger className="h-8 w-48 rounded-full text-xs">
                <SelectValue placeholder="Fatura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as faturas</SelectItem>
                {invoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {formatShortDate(invoice.referenceMonth)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {responsibleName && (
              <button
                type="button"
                onClick={() => setResponsibleName(null)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-3 py-1 text-xs font-medium text-primary"
              >
                Responsável: {responsibleName}
                <X className="size-3" aria-hidden="true" />
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {purchasesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : purchasesQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">Não foi possível carregar o extrato.</p>
              <Button variant="outline" onClick={() => purchasesQuery.refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : purchases.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma compra encontrada para os filtros selecionados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow
                    key={purchase.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setEditingPurchase(purchase);
                      setPurchaseDialogOpen(true);
                    }}
                  >
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatShortDate(purchase.purchaseDate)}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate">{purchase.description}</p>
                          {purchase.type === "CREDIT" && (
                            <span className="shrink-0 rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              Crédito
                            </span>
                          )}
                        </div>
                        {purchase.source === "OPEN_FINANCE" && (
                          <p className="text-xs text-muted-foreground">Open Finance</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {purchase.category?.name ?? "Sem categoria"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {purchase.responsibleName ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {purchase.installmentNumber && purchase.installmentTotal
                        ? `${purchase.installmentNumber}/${purchase.installmentTotal}`
                        : "1x"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold whitespace-nowrap",
                        purchase.type === "CREDIT" && "text-primary",
                      )}
                    >
                      {purchase.type === "CREDIT" ? "+" : "-"}
                      {formatBRL(purchase.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg"
                          aria-label="Editar compra"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingPurchase(purchase);
                            setPurchaseDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-destructive hover:text-destructive"
                          aria-label="Excluir compra"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeletingPurchase(purchase);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setPage((current) => Math.max(1, current - 1));
                    }}
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-3 text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setPage((current) => Math.min(totalPages, current + 1));
                    }}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>

      <PurchaseFormDialog
        key={editingPurchase?.id ?? "create"}
        cardId={cardId}
        open={purchaseDialogOpen}
        onOpenChange={(open) => {
          setPurchaseDialogOpen(open);
          if (!open) setEditingPurchase(null);
        }}
        purchase={editingPurchase}
      />
      <DeletePurchaseDialog
        purchase={deletingPurchase}
        onOpenChange={(open) => {
          if (!open) setDeletingPurchase(null);
        }}
      />
      <PayInvoiceDialog
        cardId={cardId}
        invoice={payingInvoice}
        onOpenChange={(open) => {
          if (!open) setPayingInvoice(null);
        }}
      />
      <ReverseInvoicePaymentDialog
        cardId={cardId}
        invoice={reversingInvoice}
        onOpenChange={(open) => {
          if (!open) setReversingInvoice(null);
        }}
      />
      {card && (
        <ArchiveCreditCardDialog
          card={archiving ? card : null}
          onOpenChange={(open) => setArchiving(open)}
          onArchived={() => navigate({ to: "/cartoes" })}
        />
      )}
      <EditCreditCardDialog open={editing} onOpenChange={setEditing} card={card ?? null} />
    </AppShell>
  );
}
