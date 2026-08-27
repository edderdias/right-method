import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Landmark,
  Link2,
  RefreshCw,
  Trash2,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DisconnectAccountDialog } from "@/components/contas/disconnect-account-dialog";
import { PluggyConnectButton } from "@/components/contas/pluggy-connect-button";
import { useConnectedAccounts, useConnections, useSyncAccount } from "@/hooks/use-open-finance";
import { requireAuth } from "@/lib/auth";
import { formatBRL, formatDateTime } from "@/lib/finance-format";
import { MaskableAmount } from "@/components/ui/maskable-amount";
import { cn } from "@/lib/utils";
import type { ConnectedAccount, ConnectionStatus } from "@/types/open-finance";

export const Route = createFileRoute("/contas")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Contas bancárias | Método Certo" },
      {
        name: "description",
        content:
          "Conecte suas contas via Open Finance e acompanhe saldo e extrato reais em um só lugar.",
      },
      { property: "og:title", content: "Contas bancárias | Método Certo" },
      {
        property: "og:description",
        content: "Conecte suas contas via Open Finance e acompanhe saldo e extrato reais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContasPage,
});

const STATUS_META: Record<
  ConnectionStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  CONNECTED: { label: "Conectado", className: "bg-primary/12 text-primary", icon: CheckCircle2 },
  SYNCING: { label: "Sincronizando", className: "bg-info/12 text-info", icon: RefreshCw },
  REQUIRES_REAUTH: {
    label: "Requer nova autorização",
    className: "bg-warning/15 text-warning",
    icon: AlertTriangle,
  },
  EXPIRED: { label: "Expirado", className: "bg-warning/15 text-warning", icon: AlertTriangle },
  ERROR: {
    label: "Erro na conexão",
    className: "bg-destructive/12 text-destructive",
    icon: AlertTriangle,
  },
  DISCONNECTED: { label: "Desconectado", className: "bg-muted text-muted-foreground", icon: Clock },
};

function StatusPill({ status }: { status: ConnectionStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        meta.className,
      )}
    >
      <meta.icon className="size-3" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function EmptyAccountsState() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary">
        <Link2 className="size-7" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold">Nenhuma conta conectada.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Conecte uma conta via Open Finance para ver seu extrato real aqui.
        </p>
      </div>
      <PluggyConnectButton className="rounded-xl bg-gradient-brand font-semibold" />
    </div>
  );
}

function AccountCard({
  account,
  onSync,
  onDisconnect,
  syncing,
}: {
  account: ConnectedAccount;
  onSync: () => void;
  onDisconnect: () => void;
  syncing: boolean;
}) {
  const navigate = useNavigate();
  const Icon = account.accountType === "CREDIT" ? Landmark : Wallet;

  return (
    <Card
      className="cursor-pointer rounded-3xl border-border/70 shadow-soft transition-colors hover:bg-surface"
      onClick={() => navigate({ to: "/contas/$accountId", params: { accountId: account.id } })}
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{account.connection.institutionName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {account.marketingName ?? account.name}
                {account.numberMasked ? ` · •••• ${account.numberMasked.slice(-4)}` : ""}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-lg text-destructive hover:text-destructive"
            aria-label="Desconectar conta"
            onClick={(event) => {
              event.stopPropagation();
              onDisconnect();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Saldo atualizado</p>
          <p className="text-xl font-semibold tracking-tight">
            <MaskableAmount value={formatBRL(account.balance)} />
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusPill status={account.status} />
          <span className="text-xs text-muted-foreground">
            {account.lastSyncAt
              ? `Sincronizado em ${formatDateTime(account.lastSyncAt)}`
              : "Ainda não sincronizado"}
          </span>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 rounded-xl">
            Ver extrato
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            aria-label="Sincronizar agora"
            disabled={syncing}
            onClick={(event) => {
              event.stopPropagation();
              onSync();
            }}
          >
            <RefreshCw className={cn("size-4", syncing && "animate-spin")} aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ContasPage() {
  const accountsQuery = useConnectedAccounts();
  const connectionsQuery = useConnections();
  const syncAccount = useSyncAccount();
  const [disconnecting, setDisconnecting] = useState<ConnectedAccount | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const accounts = accountsQuery.data ?? [];
  const connections = connectionsQuery.data ?? [];
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const needsAttention = connections.filter((connection) =>
    ["REQUIRES_REAUTH", "EXPIRED", "ERROR"].includes(connection.status),
  );

  function handleSync(accountId: string) {
    setSyncingId(accountId);
    syncAccount.mutate(accountId, { onSettled: () => setSyncingId(null) });
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Contas bancárias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conecte suas contas via Open Finance — sem informar senha do banco no Método Certo.
          </p>
        </div>
        <PluggyConnectButton className="rounded-xl bg-gradient-brand font-semibold" />
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Saldo consolidado</p>
            {accountsQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                <MaskableAmount value={formatBRL(totalBalance)} />
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Contas conectadas</p>
            {accountsQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight">{accounts.length}</p>
            )}
          </CardContent>
        </Card>
      </section>

      {needsAttention.length > 0 && (
        <Card className="rounded-3xl border-warning/40 bg-warning/5 shadow-soft">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm font-semibold text-warning">Conexões que precisam de atenção</p>
            {needsAttention.map((connection) => (
              <div
                key={connection.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{connection.institutionName}</p>
                  <StatusPill status={connection.status} />
                </div>
                <PluggyConnectButton
                  reconnectItemId={connection.providerItemId}
                  label="Reconectar"
                  variant="secondary"
                  size="sm"
                  className="rounded-xl"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <section>
        {accountsQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-56 w-full rounded-3xl" />
            ))}
          </div>
        ) : accountsQuery.isError ? (
          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar suas contas.
              </p>
              <Button variant="outline" onClick={() => accountsQuery.refetch()}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardContent>
              <EmptyAccountsState />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                syncing={syncingId === account.id}
                onSync={() => handleSync(account.id)}
                onDisconnect={() => setDisconnecting(account)}
              />
            ))}
          </div>
        )}
      </section>

      {connections.length > 0 && (
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Autorizações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-surface text-muted-foreground">
                    <Building2 className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{connection.institutionName}</p>
                    <p className="text-xs text-muted-foreground">
                      {connection.accounts.length}{" "}
                      {connection.accounts.length === 1 ? "conta conectada" : "contas conectadas"}
                      {connection.lastSyncAt
                        ? ` · última sincronização ${formatDateTime(connection.lastSyncAt)}`
                        : ""}
                    </p>
                  </div>
                </div>
                <StatusPill status={connection.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <DisconnectAccountDialog
        account={disconnecting}
        onOpenChange={(open) => {
          if (!open) setDisconnecting(null);
        }}
      />
    </AppShell>
  );
}
