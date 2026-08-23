import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, RefreshCw, Search } from "lucide-react";

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
import { TransactionDetailDialog } from "@/components/contas/transaction-detail-dialog";
import { useExpenseCategories } from "@/hooks/use-expenses";
import {
  useConnectedAccount,
  useAccountTransactions,
  useSyncAccount,
} from "@/hooks/use-open-finance";
import { useRevenueCategories } from "@/hooks/use-revenues";
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
import type { BankTransaction, BankTransactionType } from "@/types/open-finance";

export const Route = createFileRoute("/contas_/$accountId")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Extrato | Método Certo" },
      {
        name: "description",
        content: "Extrato completo de uma conta conectada via Open Finance.",
      },
    ],
  }),
  component: ContaExtratoPage,
});

type PeriodFilter = "today" | "7days" | "30days" | "month" | "6months";

const PERIOD_OPTIONS: { key: PeriodFilter; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7days", label: "7 dias" },
  { key: "30days", label: "30 dias" },
  { key: "month", label: "Este mês" },
  { key: "6months", label: "Últimos 6 meses" },
];

const TYPE_OPTIONS: { key: "all" | BankTransactionType; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "CREDIT", label: "Entradas" },
  { key: "DEBIT", label: "Saídas" },
];

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
    default:
      return getMonthRange(today.getFullYear(), today.getMonth() + 1);
  }
}

function ContaExtratoPage() {
  const { accountId } = Route.useParams();
  const [period, setPeriod] = useState<PeriodFilter>("30days");
  const [type, setType] = useState<"all" | BankTransactionType>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [period, type, categoryId, search]);

  const range = resolveRange(period);
  const accountQuery = useConnectedAccount(accountId);
  const revenueCategoriesQuery = useRevenueCategories();
  const expenseCategoriesQuery = useExpenseCategories();
  const categories = [
    ...(revenueCategoriesQuery.data ?? []),
    ...(expenseCategoriesQuery.data ?? []),
  ];

  const transactionsQuery = useAccountTransactions(accountId, {
    from: range.from,
    to: range.to,
    ...(type !== "all" ? { type } : {}),
    ...(categoryId !== "all" ? { categoryId } : {}),
    ...(search ? { search } : {}),
    page,
    pageSize: 20,
  });
  const syncAccount = useSyncAccount();

  const account = accountQuery.data;
  const transactions = transactionsQuery.data?.items ?? [];
  const total = transactionsQuery.data?.total ?? 0;
  const pageSize = transactionsQuery.data?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AppShell>
      <div>
        <Link
          to="/contas"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Contas bancárias
        </Link>
      </div>

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            {accountQuery.isLoading ? (
              <Skeleton className="h-7 w-48" />
            ) : (
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {account?.connection.institutionName}
              </h1>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {account?.marketingName ?? account?.name}
              {account?.numberMasked ? ` · •••• ${account.numberMasked.slice(-4)}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Saldo atual</p>
            {accountQuery.isLoading ? (
              <Skeleton className="mt-1 h-7 w-28" />
            ) : (
              <p className="text-xl font-semibold tracking-tight">
                {formatBRL(account?.balance ?? 0)}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {account?.lastSyncAt
                ? `Sincronizado em ${formatDateTime(account.lastSyncAt)}`
                : "Ainda não sincronizado"}
            </p>
          </div>
          <Button
            variant="secondary"
            className="rounded-xl"
            disabled={syncAccount.isPending}
            onClick={() => syncAccount.mutate(accountId)}
          >
            <RefreshCw
              className={cn("size-4", syncAccount.isPending && "animate-spin")}
              aria-hidden="true"
            />
            Sincronizar agora
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardHeader className="flex-col items-stretch gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold">Extrato</CardTitle>
            <div className="relative w-full max-w-xs">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por descrição ou estabelecimento"
                aria-label="Buscar movimentações"
                className="h-9 w-full rounded-xl border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
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
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setType(option.key)}
                aria-pressed={type === option.key}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  type === option.key
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-surface-2 text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-8 w-48 rounded-full text-xs">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {transactionsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : transactionsQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">Não foi possível carregar o extrato.</p>
              <Button variant="outline" onClick={() => transactionsQuery.refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma movimentação encontrada para os filtros selecionados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow
                    key={transaction.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatShortDate(transaction.transactionDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "grid size-7 shrink-0 place-items-center rounded-lg",
                            transaction.type === "CREDIT"
                              ? "bg-primary/12 text-primary"
                              : "bg-destructive/12 text-destructive",
                          )}
                        >
                          {transaction.type === "CREDIT" ? (
                            <ArrowDownLeft className="size-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowUpRight className="size-3.5" aria-hidden="true" />
                          )}
                        </span>
                        <span className="truncate">{transaction.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {transaction.category?.name ?? "Sem categoria"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold whitespace-nowrap",
                        transaction.type === "CREDIT" ? "text-primary" : "text-foreground",
                      )}
                    >
                      {transaction.type === "CREDIT" ? "+" : "−"}
                      {formatBRL(transaction.amount)}
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

      <TransactionDetailDialog
        transaction={selectedTransaction}
        categories={categories}
        onOpenChange={(open) => {
          if (!open) setSelectedTransaction(null);
        }}
      />
    </AppShell>
  );
}
