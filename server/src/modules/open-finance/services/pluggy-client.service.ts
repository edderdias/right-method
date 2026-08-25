import { Injectable, Logger } from "@nestjs/common";
import { AppConfigService } from "../../../config/app-config.service";
import { UsersService } from "../../users/users.service";
import {
  OpenFinanceSyncFailedException,
  PluggyCredentialsMissingException,
} from "../../../common/exceptions/app.exception";
import type {
  PluggyAccount,
  PluggyAccountsResponse,
  PluggyAuthResponse,
  PluggyBill,
  PluggyConnectTokenResponse,
  PluggyItem,
  PluggyTransaction,
  PluggyTransactionsResponse,
} from "../pluggy.types";

/** Cache each user's Pluggy API key for less than its real TTL (~2h) so we always renew comfortably early. */
const API_KEY_TTL_MS = 100 * 60 * 1000;
/** Safety cap on cursor pages per transaction sync so a misbehaving account can never loop forever. */
const MAX_TRANSACTION_PAGES = 40;

interface CachedApiKey {
  apiKey: string;
  expiresAt: number;
}

@Injectable()
export class PluggyClientService {
  private readonly logger = new Logger(PluggyClientService.name);
  /** Every user brings their own Pluggy credentials, so the auth token is cached per userId. */
  private readonly apiKeyCache = new Map<string, CachedApiKey>();

  constructor(
    private readonly config: AppConfigService,
    private readonly usersService: UsersService,
  ) {}

  async createConnectToken(
    userId: string,
    options: { itemId?: string; webhookUrl?: string } = {},
  ): Promise<string> {
    const body: Record<string, unknown> = {
      options: {
        clientUserId: userId,
        ...(options.webhookUrl ? { webhookUrl: options.webhookUrl } : {}),
      },
    };
    if (options.itemId) {
      body["itemId"] = options.itemId;
    }
    const response = await this.request<PluggyConnectTokenResponse>(userId, "POST", "/connect_token", {
      body,
    });
    return response.accessToken;
  }

  getItem(userId: string, itemId: string): Promise<PluggyItem> {
    return this.request<PluggyItem>(userId, "GET", `/items/${itemId}`);
  }

  async listAccounts(userId: string, itemId: string): Promise<PluggyAccount[]> {
    const response = await this.request<PluggyAccountsResponse>(userId, "GET", "/accounts", {
      query: { itemId },
    });
    return response.results;
  }

  async listTransactions(
    userId: string,
    accountId: string,
    params: { from?: string; to?: string } = {},
  ): Promise<PluggyTransaction[]> {
    const transactions: PluggyTransaction[] = [];
    let cursor: string | null = null;
    let page = 0;

    do {
      const response: PluggyTransactionsResponse = await this.request<PluggyTransactionsResponse>(
        userId,
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

  async deleteItem(userId: string, itemId: string): Promise<void> {
    await this.request<{ count: number }>(userId, "DELETE", `/items/${itemId}`);
  }

  getBill(userId: string, billId: string): Promise<PluggyBill> {
    return this.request<PluggyBill>(userId, "GET", `/bills/${billId}`);
  }

  private async getApiKey(userId: string, forceRefresh = false): Promise<string> {
    const cached = this.apiKeyCache.get(userId);
    if (!forceRefresh && cached && Date.now() < cached.expiresAt) {
      return cached.apiKey;
    }

    const credentials = await this.usersService.getPluggyCredentials(userId);
    if (!credentials) {
      throw new PluggyCredentialsMissingException();
    }

    const baseUrl = this.config.get("PLUGGY_BASE_URL");
    const response = await fetch(`${baseUrl}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
      }),
    });

    if (!response.ok) {
      this.logger.error(`Pluggy /auth failed with status ${response.status}`);
      throw new OpenFinanceSyncFailedException(
        "Não foi possível autenticar com o provedor Open Finance. Verifique suas credenciais do Pluggy em Configurações.",
      );
    }

    const data = (await response.json()) as PluggyAuthResponse;
    const entry: CachedApiKey = { apiKey: data.apiKey, expiresAt: Date.now() + API_KEY_TTL_MS };
    this.apiKeyCache.set(userId, entry);
    return entry.apiKey;
  }

  private async request<T>(
    userId: string,
    method: "GET" | "POST" | "DELETE",
    path: string,
    options: { body?: unknown; query?: Record<string, string>; retrying?: boolean } = {},
  ): Promise<T> {
    const baseUrl = this.config.get("PLUGGY_BASE_URL");
    const apiKey = await this.getApiKey(userId);
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
      await this.getApiKey(userId, true);
      return this.request<T>(userId, method, path, { ...options, retrying: true });
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
