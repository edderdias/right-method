import { Injectable } from "@nestjs/common";
import type { Account } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { FinanceAccountNotFoundException } from "../../common/exceptions/app.exception";
import type { CreateAccountDto } from "./dto/create-account.dto";

export type PublicAccount = Omit<Account, "balance"> & { balance: number };

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<PublicAccount[]> {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return accounts.map((account) => this.toPublic(account));
  }

  async create(userId: string, dto: CreateAccountDto): Promise<PublicAccount> {
    const account = await this.prisma.account.create({
      data: {
        userId,
        name: dto.name,
        balance: dto.initialBalance ?? 0,
      },
    });
    return this.toPublic(account);
  }

  async assertOwnership(userId: string, accountId: string): Promise<Account> {
    const account = await this.prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!account) {
      throw new FinanceAccountNotFoundException();
    }
    return account;
  }

  /** Prisma's Decimal fields serialize to strings via toJSON() — convert to numbers for API responses. */
  private toPublic(account: Account): PublicAccount {
    return { ...account, balance: Number(account.balance) };
  }
}
