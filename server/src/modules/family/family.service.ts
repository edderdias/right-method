import { Injectable } from "@nestjs/common";
import { randomInt } from "crypto";
import { AuditEvent, FamilyInviteStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AuditLogService } from "../audit/audit-log.service";
import type { RequestMetadata } from "../../common/utils/request-metadata";
import {
  FamilyAccessDeniedException,
  FamilyAccessGrantNotFoundException,
  FamilyInviteNotFoundException,
  FamilyInviteSelfRedeemException,
} from "../../common/exceptions/app.exception";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const INVITE_TTL_DAYS = 7;

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

@Injectable()
export class FamilyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createInvite(inviterId: string, metadata: RequestMetadata) {
    await this.prisma.familyInvite.updateMany({
      where: { inviterId, status: FamilyInviteStatus.PENDING },
      data: { status: FamilyInviteStatus.REVOKED },
    });

    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
    let invite;
    // Retry on the (astronomically unlikely) event of a code collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        invite = await this.prisma.familyInvite.create({
          data: { inviterId, code: generateCode(), expiresAt },
        });
        break;
      } catch {
        continue;
      }
    }
    if (!invite) {
      throw new Error("Não foi possível gerar um código de convite. Tente novamente.");
    }

    await this.auditLogService.record(AuditEvent.FAMILY_INVITE_CREATED, metadata, inviterId);
    return invite;
  }

  async getActiveInvite(inviterId: string) {
    const invite = await this.prisma.familyInvite.findFirst({
      where: { inviterId, status: FamilyInviteStatus.PENDING },
      orderBy: { createdAt: "desc" },
    });
    if (!invite) return null;

    if (invite.expiresAt < new Date()) {
      await this.prisma.familyInvite.update({
        where: { id: invite.id },
        data: { status: FamilyInviteStatus.EXPIRED },
      });
      return null;
    }

    return invite;
  }

  async revokeInvite(inviterId: string, inviteId: string): Promise<void> {
    const result = await this.prisma.familyInvite.updateMany({
      where: { id: inviteId, inviterId, status: FamilyInviteStatus.PENDING },
      data: { status: FamilyInviteStatus.REVOKED },
    });
    if (result.count === 0) {
      throw new FamilyInviteNotFoundException();
    }
  }

  async redeemInvite(memberId: string, code: string, metadata: RequestMetadata) {
    const invite = await this.prisma.familyInvite.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!invite || invite.status !== FamilyInviteStatus.PENDING || invite.expiresAt < new Date()) {
      throw new FamilyInviteNotFoundException();
    }

    if (invite.inviterId === memberId) {
      throw new FamilyInviteSelfRedeemException();
    }

    const grant = await this.prisma.familyAccessGrant.upsert({
      where: { ownerId_memberId: { ownerId: invite.inviterId, memberId } },
      create: { ownerId: invite.inviterId, memberId },
      update: { revokedAt: null },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    await this.prisma.familyInvite.update({
      where: { id: invite.id },
      data: { status: FamilyInviteStatus.REDEEMED, redeemedById: memberId, redeemedAt: new Date() },
    });

    await this.auditLogService.record(AuditEvent.FAMILY_INVITE_REDEEMED, metadata, memberId);
    return grant;
  }

  listMembers(ownerId: string) {
    return this.prisma.familyAccessGrant.findMany({
      where: { ownerId, revokedAt: null },
      include: { member: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  listAccessibleOwners(memberId: string) {
    return this.prisma.familyAccessGrant.findMany({
      where: { memberId, revokedAt: null },
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async revokeGrant(requesterId: string, grantId: string, metadata: RequestMetadata): Promise<void> {
    const grant = await this.prisma.familyAccessGrant.findUnique({ where: { id: grantId } });
    if (!grant || grant.revokedAt) {
      throw new FamilyAccessGrantNotFoundException();
    }
    if (grant.ownerId !== requesterId && grant.memberId !== requesterId) {
      throw new FamilyAccessGrantNotFoundException();
    }

    await this.prisma.familyAccessGrant.update({
      where: { id: grantId },
      data: { revokedAt: new Date() },
    });

    await this.auditLogService.record(AuditEvent.FAMILY_ACCESS_REVOKED, metadata, requesterId);
  }

  async assertViewAccess(memberId: string, ownerId: string): Promise<void> {
    if (memberId === ownerId) return;

    const grant = await this.prisma.familyAccessGrant.findUnique({
      where: { ownerId_memberId: { ownerId, memberId } },
    });

    if (!grant || grant.revokedAt) {
      throw new FamilyAccessDeniedException();
    }
  }
}
