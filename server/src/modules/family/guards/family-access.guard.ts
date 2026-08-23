import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { FamilyService } from "../family.service";
import type { AuthenticatedRequest } from "../../../common/types/authenticated-request";

/** Route prefixes (with the global "/api" prefix) that expose per-user financial data and
 * therefore accept the `viewAs` query param to read another user's data under a family grant. */
const FAMILY_SCOPED_PREFIXES = [
  "/api/dashboard",
  "/api/expenses",
  "/api/revenues",
  "/api/accounts",
  "/api/categories",
  "/api/credit-cards",
  "/api/credit-card-purchases",
  "/api/investments",
  "/api/goals",
  "/api/reports",
  "/api/open-finance",
];

@Injectable()
export class FamilyAccessGuard implements CanActivate {
  constructor(private readonly familyService: FamilyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & Request>();
    const viewAs = request.query["viewAs"];

    if (!viewAs || typeof viewAs !== "string" || !request.user) {
      return true;
    }

    if (!FAMILY_SCOPED_PREFIXES.some((prefix) => request.path.startsWith(prefix))) {
      return true;
    }

    if (request.method !== "GET") {
      throw new ForbiddenException(
        "Não é possível alterar dados enquanto visualiza a conta de outro usuário.",
      );
    }

    await this.familyService.assertViewAccess(request.user.sub, viewAs);
    request.user = { ...request.user, sub: viewAs };
    // `viewAs` is guard-internal plumbing, not a declared field on any endpoint's query DTO —
    // leaving it in place trips `forbidNonWhitelisted` validation on routes with a query DTO.
    delete (request.query as Record<string, unknown>)["viewAs"];
    return true;
  }
}
