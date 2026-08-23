import { apiDelete, apiGet, apiPost } from "@/lib/api-client";
import type { FamilyAccessGrant, FamilyInvite } from "@/types/family";

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export async function createFamilyInvite(): Promise<FamilyInvite> {
  const { data } = await apiPost<ApiEnvelope<FamilyInvite>>("/family/invites", {});
  return data;
}

export async function getActiveFamilyInvite(): Promise<FamilyInvite | null> {
  const { data } = await apiGet<ApiEnvelope<FamilyInvite | null>>("/family/invites/active");
  return data;
}

export async function revokeFamilyInvite(id: string): Promise<{ message: string }> {
  return apiDelete<ApiEnvelope<null>>(`/family/invites/${id}`);
}

export async function redeemFamilyInvite(code: string): Promise<FamilyAccessGrant> {
  const { data } = await apiPost<ApiEnvelope<FamilyAccessGrant>>("/family/invites/redeem", { code });
  return data;
}

export async function listFamilyMembers(): Promise<FamilyAccessGrant[]> {
  const { data } = await apiGet<ApiEnvelope<FamilyAccessGrant[]>>("/family/members");
  return data;
}

export async function listFamilyAccess(): Promise<FamilyAccessGrant[]> {
  const { data } = await apiGet<ApiEnvelope<FamilyAccessGrant[]>>("/family/access");
  return data;
}

export async function revokeFamilyGrant(id: string): Promise<{ message: string }> {
  return apiDelete<ApiEnvelope<null>>(`/family/grants/${id}`);
}
