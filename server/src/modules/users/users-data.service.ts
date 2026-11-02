import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AppException } from "../../common/exceptions/app.exception";
import { RESET_DATA_CONFIRMATION_PHRASE } from "./dto/reset-data.dto";

/** Backup and reset of everything a user owns, except the account itself (profile, credentials,
 * sessions, 2FA, biometrics and family access). Shared system categories (userId = null) are never
 * touched. */
@Injectable()
export class UsersDataService {
  constructor(private readonly prisma: PrismaService) {}

  /** Snapshot of the user's financial data as plain JSON. Secrets (password hash, encrypted API
   * keys, 2FA secret) are deliberately left out. */
  async exportBackup(userId: string) {
    const where = { userId };
    const [
      user,
      accounts,
      accountTransfers,
      categories,
      revenues,
      expenses,
      creditCards,
      creditCardInvoices,
      creditCardPurchases,
      investments,
      investmentTransactions,
      investmentIncomes,
      financialGoals,
      goalTransactions,
      goalInvestmentLinks,
      openFinanceConnections,
      connectedAccounts,
      bankTransactions,
      aiConversations,
    ] = await this.prisma.$transaction([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          currency: true,
          createdAt: true,
        },
      }),
      this.prisma.account.findMany({ where }),
      this.prisma.accountTransfer.findMany({ where }),
      this.prisma.category.findMany({ where }),
      this.prisma.revenue.findMany({ where }),
      this.prisma.expense.findMany({ where }),
      this.prisma.creditCard.findMany({ where }),
      this.prisma.creditCardInvoice.findMany({ where }),
      this.prisma.creditCardPurchase.findMany({ where }),
      this.prisma.investment.findMany({ where }),
      this.prisma.investmentTransaction.findMany({ where }),
      this.prisma.investmentIncome.findMany({ where }),
      this.prisma.financialGoal.findMany({ where }),
      this.prisma.goalTransaction.findMany({ where }),
      this.prisma.goalInvestmentLink.findMany({ where: { goal: { userId } } }),
      this.prisma.openFinanceConnection.findMany({ where }),
      this.prisma.connectedAccount.findMany({ where }),
      this.prisma.bankTransaction.findMany({ where }),
      this.prisma.aiConversation.findMany({ where, include: { messages: true } }),
    ]);

    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      user,
      accounts,
      accountTransfers,
      categories,
      revenues,
      expenses,
      creditCards,
      creditCardInvoices,
      creditCardPurchases,
      investments,
      investmentTransactions,
      investmentIncomes,
      financialGoals,
      goalTransactions,
      goalInvestmentLinks,
      openFinanceConnections,
      connectedAccounts,
      bankTransactions,
      aiConversations,
    };
  }

  /** Deletes all of the user's data in one transaction, children before parents because several
   * relations (expense/revenue → account/category) are not cascading. */
  async resetData(userId: string, confirmation: string): Promise<void> {
    if (confirmation.trim() !== RESET_DATA_CONFIRMATION_PHRASE) {
      throw new AppException(
        "RESET_CONFIRMATION_INVALID",
        `Digite exatamente "${RESET_DATA_CONFIRMATION_PHRASE}" para confirmar.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const where = { userId };
    await this.prisma.$transaction([
      this.prisma.creditCardPurchase.deleteMany({ where }),
      this.prisma.creditCardInvoice.deleteMany({ where }),
      this.prisma.creditCard.deleteMany({ where }),
      this.prisma.expense.deleteMany({ where }),
      this.prisma.revenue.deleteMany({ where }),
      this.prisma.accountTransfer.deleteMany({ where }),
      this.prisma.goalInvestmentLink.deleteMany({ where: { goal: { userId } } }),
      this.prisma.goalTransaction.deleteMany({ where }),
      this.prisma.financialGoal.deleteMany({ where }),
      this.prisma.investmentIncome.deleteMany({ where }),
      this.prisma.investmentTransaction.deleteMany({ where }),
      this.prisma.investment.deleteMany({ where }),
      this.prisma.bankTransaction.deleteMany({ where }),
      this.prisma.connectedAccount.deleteMany({ where }),
      this.prisma.openFinanceConnection.deleteMany({ where }),
      this.prisma.account.deleteMany({ where }),
      this.prisma.category.deleteMany({ where }),
      this.prisma.aiConversation.deleteMany({ where }),
      this.prisma.notification.deleteMany({ where }),
    ]);
  }
}
