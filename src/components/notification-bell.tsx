import { Bell, CheckCheck } from "lucide-react";
import { Link, type LinkProps } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types/notification";

/** Notification `link` values are always set by our own backend (never user/LLM input), but
 * TanStack Router's `Link` still needs a literal known route for type-safety — this allowlist
 * mirrors the one in certo-ia.tsx for the AI chat's suggestedRoute. */
const NOTIFICATION_ROUTES: Record<string, LinkProps["to"]> = {
  "/despesas": "/despesas",
  "/cartoes": "/cartoes",
  "/investimentos": "/investimentos",
  "/metas": "/metas",
  "/contas": "/contas",
};

function resolveNotificationRoute(link: string | null): LinkProps["to"] | null {
  if (!link) return null;
  return NOTIFICATION_ROUTES[link] ?? null;
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function NotificationRow({ notification }: { notification: AppNotification }) {
  const markRead = useMarkNotificationRead();
  const route = resolveNotificationRoute(notification.link);

  function handleClick() {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
  }

  const content = (
    <div
      className={cn(
        "flex gap-3 rounded-xl p-3 text-left transition-colors hover:bg-surface-2",
        !notification.read && "bg-primary/5",
      )}
    >
      <span
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          notification.read ? "bg-transparent" : "bg-primary",
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{notification.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatRelativeDate(notification.createdAt)}
        </p>
      </div>
    </div>
  );

  if (route) {
    return (
      <Link to={route} onClick={handleClick} className="block">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handleClick} className="block w-full">
      {content}
    </button>
  );
}

export function NotificationBell() {
  const { data } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl"
          aria-label="Notificações"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2">
        <div className="flex items-center justify-between px-2 py-1">
          <p className="text-sm font-semibold">Notificações</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 rounded-lg px-2 text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="size-3.5" aria-hidden="true" />
              Marcar todas
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Nenhuma notificação por aqui.
          </p>
        ) : (
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {notifications.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
