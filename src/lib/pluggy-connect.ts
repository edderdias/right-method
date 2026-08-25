import { PluggyConnect } from "pluggy-connect-sdk";

interface OpenPluggyConnectOptions {
  connectToken: string;
  /** Present only when reconnecting/renewing an existing item. */
  updateItemId?: string;
  onSuccess: (itemId: string) => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

/** Opens the Pluggy Connect widget. Credentials are typed directly into Pluggy's iframe —
 * they never pass through the Método Certo frontend or backend. */
export function openPluggyConnect(options: OpenPluggyConnectOptions): void {
  const widget = new PluggyConnect({
    connectToken: options.connectToken,
    includeSandbox: import.meta.env.DEV,
    ...(options.updateItemId ? { updateItem: options.updateItemId } : {}),
    onSuccess: (data) => options.onSuccess(data.item.id),
    // Pluggy's own close control isn't always reliable once the item errors out (e.g. connection
    // refused) — destroy the widget ourselves so it never gets stuck open on screen.
    onError: (error) => {
      options.onError?.(error.message);
      void widget.destroy();
    },
    onClose: () => {
      options.onClose?.();
      void widget.destroy();
    },
  });
  void widget.init();
}
