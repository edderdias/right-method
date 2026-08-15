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
    ...(options.onError ? { onError: (error) => options.onError?.(error.message) } : {}),
    ...(options.onClose ? { onClose: options.onClose } : {}),
  });
  void widget.init();
}
