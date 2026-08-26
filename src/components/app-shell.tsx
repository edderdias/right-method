import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownRight,
  CalendarClock,
  Check,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LineChart,
  Menu,
  Search,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { BrandLockup, BrandMark } from "@/components/brand";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useFamilyView } from "@/hooks/use-family-view";
import { useCurrentUser } from "@/hooks/use-user-settings";
import { clearSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" as const },
  { label: "Receitas", icon: TrendingUp, to: "/receitas" as const },
  { label: "Despesas", icon: ArrowDownRight, to: "/despesas" as const },
  { label: "Contas", icon: Wallet, to: "/contas" as const },
  { label: "Cartões", icon: CreditCard, to: "/cartoes" as const },
  { label: "Investimentos", icon: LineChart, to: "/investimentos" as const },
  { label: "Metas", icon: Target, to: "/metas" as const },

  { label: "Relatórios", icon: CalendarClock, to: "/relatorios" as const },
  { label: "Certo IA", icon: Sparkles, to: "/certo-ia" as const },
  { label: "Configurações", icon: Settings, to: "/configuracoes" as const },
];

const itemBase =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors";
const inactive =
  "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
const active = "bg-sidebar-accent text-sidebar-primary";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const { viewAsUserId, viewingOwner, accessibleAccounts, switchTo } = useFamilyView();

  const displayName = viewingOwner?.name ?? currentUser?.name ?? "Minha conta";
  const displayInitials = initialsOf(displayName);

  function handleLogout() {
    clearSession();
    navigate({ to: "/" });
  }

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
              <Link
                key={item.label}
                to={item.to}
                className={cn(itemBase, inactive)}
                activeProps={{ className: cn(itemBase, active) }}
              >
                <item.icon className="size-5 shrink-0" aria-hidden="true" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground hover:text-foreground"
          >
            {sidebarOpen ? "Sair da conta" : "←"}
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass sticky top-0 z-20 flex items-center gap-3 px-4 py-3 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl lg:hidden"
              aria-label="Abrir menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden rounded-xl lg:inline-flex"
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
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-gradient-brand text-xs font-semibold text-primary-foreground">
                      {displayInitials}
                    </span>
                    <div className="hidden text-left sm:block">
                      <p className="text-sm font-medium leading-none">{displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {viewingOwner ? "Visualizando (somente leitura)" : "Minha conta"}
                      </p>
                    </div>
                    {accessibleAccounts.length > 0 && (
                      <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                {accessibleAccounts.length > 0 && (
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="flex items-center gap-2">
                      <Users className="size-4" aria-hidden="true" />
                      Visualizar conta
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => switchTo(null)} className="justify-between">
                      Minha conta
                      {!viewAsUserId && <Check className="size-4" aria-hidden="true" />}
                    </DropdownMenuItem>
                    {accessibleAccounts.map((grant) => (
                      <DropdownMenuItem
                        key={grant.id}
                        onClick={() => switchTo(grant.ownerId)}
                        className="justify-between"
                      >
                        <span className="truncate">{grant.owner?.name}</span>
                        {viewAsUserId === grant.ownerId && (
                          <Check className="size-4 shrink-0" aria-hidden="true" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                )}
              </DropdownMenu>
            </div>
          </header>

          {viewingOwner && (
            <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6">
              <div className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-primary">
                <Users className="size-4 shrink-0" aria-hidden="true" />
                Você está visualizando os dados de <strong>{viewingOwner.name}</strong> em modo
                somente leitura.
                <button
                  type="button"
                  onClick={() => switchTo(null)}
                  className="ml-auto font-medium underline underline-offset-2 hover:text-primary/80"
                >
                  Voltar para minha conta
                </button>
              </div>
            </div>
          )}

          <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">{children}</main>
        </div>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="flex w-72 flex-col p-4">
          <SheetHeader className="space-y-0">
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <BrandLockup />
          </SheetHeader>
          <nav className="mt-4 flex-1 space-y-1" aria-label="Navegação principal">
            {nav.map((item) => (
              <SheetClose asChild key={item.label}>
                <Link
                  to={item.to}
                  className={cn(itemBase, inactive)}
                  activeProps={{ className: cn(itemBase, active) }}
                >
                  <item.icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </SheetClose>
            ))}
          </nav>
          <SheetClose asChild>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground hover:text-foreground"
            >
              Sair da conta
            </button>
          </SheetClose>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
