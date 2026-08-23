export type FamilyInviteStatus = "PENDING" | "REDEEMED" | "REVOKED" | "EXPIRED";

export interface FamilyInvite {
  id: string;
  inviterId: string;
  code: string;
  status: FamilyInviteStatus;
  redeemedById: string | null;
  redeemedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface FamilyMemberSummary {
  id: string;
  name: string;
  email: string;
}

export interface FamilyAccessGrant {
  id: string;
  ownerId: string;
  memberId: string;
  createdAt: string;
  revokedAt: string | null;
  owner?: FamilyMemberSummary;
  member?: FamilyMemberSummary;
}
