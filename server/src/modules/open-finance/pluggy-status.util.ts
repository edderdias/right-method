import { ConnectionStatus } from "@prisma/client";
import type { PluggyItemStatus } from "./pluggy.types";

/** Maps a Pluggy item status to our own simplified connection status (spec section 29). */
export function mapPluggyItemStatus(status: PluggyItemStatus): ConnectionStatus {
  switch (status) {
    case "UPDATED":
      return ConnectionStatus.CONNECTED;
    case "UPDATING":
      return ConnectionStatus.SYNCING;
    case "WAITING_USER_INPUT":
    case "LOGIN_ERROR":
      return ConnectionStatus.REQUIRES_REAUTH;
    case "OUTDATED":
      return ConnectionStatus.EXPIRED;
    case "ERROR":
    default:
      return ConnectionStatus.ERROR;
  }
}
