import { Injectable, Logger } from "@nestjs/common";
import { AppConfigService } from "../../../config/app-config.service";
import { OpenFinanceSyncFailedException } from "../../../common/exceptions/app.exception";
import type {
  PluggyAccount,
  PluggyAccountsResponse,
  PluggyAuthResponse,
  PluggyConnectTokenResponse,
  PluggyItem,
  PluggyTransaction,
  PluggyTransactionsResponse,
} from "../pluggy.types";

/** Cache the Pluggy API key for less than its real TTL (~2h) so we always renew comfortably early. */
const API_KEY_TTL_MS = 100 * 60 * 1000;
/** Safety cap on cursor pages per transaction sync so a misbehaving account can never loop forever. */
const MAX_TRANSACTION_PAGES = 40;

@Injectable()
export class PluggyClientService {
  private readonly logger = new Logger(PluggyClientService.name);
  private apiKey: string | null = null;
  private apiKeyExpiresAt = 0;

  constructor(private readonly config: AppConfigService) {}

  async createConnectToken(
    clientUserId: string,
    options: { itemId?: string; webhookUrl?: string } = {},
  ): Promise<string> {
    const body: Record<string, unknown> = {
      options: {
        clientUserId,
        ...(options.webhookUrl ? { webhookUrl: options.webhookUrl } : {}),
      },
    };
    if (options.itemId) {
      body["itemId"] = options.itemId;
    }
    const response = await this.request<PluggyConnectTokenResponse>("POST", "/connect_token", {
      body,
    });
    return response.accessToken;
  }

  getItem(itemId: string): Promise<PluggyItem> {
    return this.request<PluggyItem>("GET", `/items/${itemId}`);
  }

  async listAccounts(itemId: string): Promise<PluggyAccount[]> {
    const response = await this.request<PluggyAccountsResponse>("GET", "/accounts", {
      query: { itemId },
    });
    return response.results;
  }

  async listTransactions(
    accountId: string,
    params: { from?: string; to?: string } = {},
  ): Promise<PluggyTransaction[]> {
    const transactions: PluggyTransaction[] = [];
    let cursor: string | null = null;
    let page = 0;

    do {
      const response: PluggyTransactionsResponse = await this.request<PluggyTransactionsResponse>(
        "GET",
        "/v2/transactions",
        {
          query: {
            accountId,
            ...(params.from ? { from: params.from } : {}),
            ...(params.to ? { to: params.to } : {}),
            ...(cursor ? { after: cursor } : {}),
          },
        },
      );
      transactions.push(...response.results);
      cursor = response.next;
      page += 1;
    } while (cursor && page < MAX_TRANSACTION_PAGES);

    return transactions;
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.request<{ count: number }>("DELETE", `/items/${itemId}`);
  }

  private async getApiKey(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.apiKey && Date.now() < this.apiKeyExpiresAt) {
      return this.apiKey;
    }

    const baseUrl = this.config.get("PLUGGY_BASE_URL");
    const response = await fetch(`${baseUrl}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: this.config.get("PLUGGY_CLIENT_ID"),
        clientSecret: this.config.get("PLUGGY_CLIENT_SECRET"),
      }),
    });

    if (!response.ok) {
      this.logger.error(`Pluggy /auth failed with status ${response.status}`);
      throw new OpenFinanceSyncFailedException(
        "Não foi possível autenticar com o provedor Open Finance.",
      );
    }

    const data = (await response.json()) as PluggyAuthResponse;
    this.apiKey = data.apiKey;
    this.apiKeyExpiresAt = Date.now() + API_KEY_TTL_MS;
    return this.apiKey;
  }

  private async request<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    options: { body?: unknown; query?: Record<string, string>; retrying?: boolean } = {},
  ): Promise<T> {
    const baseUrl = this.config.get("PLUGGY_BASE_URL");
    const apiKey = await this.getApiKey();
    const url = new URL(`${baseUrl}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url, {
      method,
      headers: {
        "X-API-KEY": apiKey,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 403 && !options.retrying) {
      await this.getApiKey(true);
      return this.request<T>(method, path, { ...options, retrying: true });
    }

    if (!response.ok) {
      this.logger.error(`Pluggy ${method} ${path} failed with status ${response.status}`);
      throw new OpenFinanceSyncFailedException();
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }
}
