import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type {
  CreateCreditCardInput,
  CreditCard,
  CreditCardInvoice,
  CreditCardInvoiceDetail,
  CreditCardPurchase,
  CreditCardPurchaseFilters,
  CreditCardPurchaseListResponse,
  CreditCardSummary,
  CreatePurchaseInput,
  PayInvoiceInput,
  RemovePurchaseScope,
  UpdateCreditCardInput,
  UpdatePurchaseInput,
} from "@/types/credit-card";
import type { AvailablePluggyAccount } from "@/types/open-finance";

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export async function listCreditCards(): Promise<CreditCard[]> {
  const { data } = await apiGet<ApiEnvelope<CreditCard[]>>("/credit-cards");
  return data;
}

export async function getCreditCardsSummary(): Promise<CreditCardSummary> {
  const { data } = await apiGet<ApiEnvelope<CreditCardSummary>>("/credit-cards/summary");
  return data;
}

export async function getCreditCard(id: string): Promise<CreditCard> {
  const { data } = await apiGet<ApiEnvelope<CreditCard>>(`/credit-cards/${id}`);
  return data;
}

export async function createCreditCard(input: CreateCreditCardInput): Promise<CreditCard> {
  const { data } = await apiPost<ApiEnvelope<CreditCard>>("/credit-cards", input);
  return data;
}

export async function updateCreditCard(
  id: string,
  input: UpdateCreditCardInput,
): Promise<CreditCard> {
  const { data } = await apiPatch<ApiEnvelope<CreditCard>>(`/credit-cards/${id}`, input);
  return data;
}

export async function removeCreditCard(id: string): Promise<{ message: string }> {
  return apiDelete<ApiEnvelope<null>>(`/credit-cards/${id}`);
}

export async function listCreditCardPurchases(
  cardId: string,
  filters: CreditCardPurchaseFilters = {},
): Promise<CreditCardPurchaseListResponse> {
  const { data } = await apiGet<ApiEnvelope<CreditCardPurchaseListResponse>>(
    `/credit-cards/${cardId}/purchases`,
    { ...filters },
  );
  return data;
}

export async function createCreditCardPurchase(
  cardId: string,
  input: CreatePurchaseInput,
): Promise<CreditCardPurchase> {
  const { data } = await apiPost<ApiEnvelope<CreditCardPurchase>>(
    `/credit-cards/${cardId}/purchases`,
    input,
  );
  return data;
}

export async function updateCreditCardPurchase(
  id: string,
  input: UpdatePurchaseInput,
): Promise<CreditCardPurchase> {
  const { data } = await apiPatch<ApiEnvelope<CreditCardPurchase>>(
    `/credit-card-purchases/${id}`,
    input,
  );
  return data;
}

export async function removeCreditCardPurchase(
  id: string,
  scope: RemovePurchaseScope = "one",
): Promise<void> {
  await apiDelete<ApiEnvelope<null>>(`/credit-card-purchases/${id}?scope=${scope}`);
}

export async function listCreditCardInvoices(cardId: string): Promise<CreditCardInvoice[]> {
  const { data } = await apiGet<ApiEnvelope<CreditCardInvoice[]>>(
    `/credit-cards/${cardId}/invoices`,
  );
  return data;
}

export async function getCreditCardInvoice(
  cardId: string,
  invoiceId: string,
): Promise<CreditCardInvoiceDetail> {
  const { data } = await apiGet<ApiEnvelope<CreditCardInvoiceDetail>>(
    `/credit-cards/${cardId}/invoices/${invoiceId}`,
  );
  return data;
}

export async function payCreditCardInvoice(
  cardId: string,
  invoiceId: string,
  input: PayInvoiceInput,
): Promise<CreditCardInvoice> {
  const { data } = await apiPost<ApiEnvelope<CreditCardInvoice>>(
    `/credit-cards/${cardId}/invoices/${invoiceId}/pay`,
    input,
  );
  return data;
}

export async function listAvailableOpenFinanceCreditCards(
  connectionId: string,
): Promise<AvailablePluggyAccount[]> {
  const { data } = await apiGet<ApiEnvelope<AvailablePluggyAccount[]>>(
    "/open-finance/credit-cards",
    {
      connectionId,
    },
  );
  return data;
}

export async function addOpenFinanceCreditCard(
  connectionId: string,
  externalCardId: string,
): Promise<CreditCard> {
  const { data } = await apiPost<ApiEnvelope<CreditCard>>("/open-finance/credit-cards", {
    connectionId,
    externalCardId,
  });
  return data;
}

export async function syncOpenFinanceCreditCard(id: string): Promise<{ message: string }> {
  return apiPost<ApiEnvelope<null>>(`/open-finance/credit-cards/${id}/sync`, {});
}
