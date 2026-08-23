import { HttpException, HttpStatus } from "@nestjs/common";

export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
  ) {
    super({ code, message }, status);
  }
}

export class InvalidCredentialsException extends AppException {
  constructor() {
    super("INVALID_CREDENTIALS", "E-mail ou senha inválidos.", HttpStatus.UNAUTHORIZED);
  }
}

export class EmailAlreadyExistsException extends AppException {
  constructor() {
    super("EMAIL_ALREADY_EXISTS", "Não foi possível concluir o cadastro.", HttpStatus.CONFLICT);
  }
}

export class AccountBlockedException extends AppException {
  constructor() {
    super("ACCOUNT_BLOCKED", "Esta conta está bloqueada.", HttpStatus.FORBIDDEN);
  }
}

export class AccountInactiveException extends AppException {
  constructor() {
    super("ACCOUNT_INACTIVE", "Esta conta está inativa.", HttpStatus.FORBIDDEN);
  }
}

export class EmailNotVerifiedException extends AppException {
  constructor() {
    super("EMAIL_NOT_VERIFIED", "Confirme seu e-mail antes de fazer login.", HttpStatus.FORBIDDEN);
  }
}

export class TooManyAttemptsException extends AppException {
  constructor() {
    super(
      "TOO_MANY_ATTEMPTS",
      "Muitas tentativas. Tente novamente mais tarde.",
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class InvalidTokenException extends AppException {
  constructor(message = "Token inválido ou expirado.") {
    super("INVALID_TOKEN", message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class SessionRevokedException extends AppException {
  constructor() {
    super("SESSION_REVOKED", "Sessão revogada. Faça login novamente.", HttpStatus.UNAUTHORIZED);
  }
}

export class WeakPasswordException extends AppException {
  constructor() {
    super(
      "WEAK_PASSWORD",
      "A senha não atende aos requisitos mínimos de segurança.",
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class EmailAlreadyVerifiedException extends AppException {
  constructor() {
    super("EMAIL_ALREADY_VERIFIED", "Este e-mail já foi verificado.", HttpStatus.CONFLICT);
  }
}

export class SessionNotFoundException extends AppException {
  constructor() {
    super("SESSION_NOT_FOUND", "Sessão não encontrada.", HttpStatus.NOT_FOUND);
  }
}

export class RevenueNotFoundException extends AppException {
  constructor() {
    super("REVENUE_NOT_FOUND", "Receita não encontrada.", HttpStatus.NOT_FOUND);
  }
}

export class FinanceAccountNotFoundException extends AppException {
  constructor() {
    super("ACCOUNT_NOT_FOUND", "Conta não encontrada.", HttpStatus.NOT_FOUND);
  }
}

export class CategoryNotFoundException extends AppException {
  constructor() {
    super("CATEGORY_NOT_FOUND", "Categoria não encontrada.", HttpStatus.NOT_FOUND);
  }
}

export class ExpenseNotFoundException extends AppException {
  constructor() {
    super("EXPENSE_NOT_FOUND", "Despesa não encontrada.", HttpStatus.NOT_FOUND);
  }
}

export class InvalidExpenseConfigException extends AppException {
  constructor(message = "Configuração de despesa inválida.") {
    super("INVALID_EXPENSE_CONFIG", message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class OpenFinanceConnectionNotFoundException extends AppException {
  constructor() {
    super("OPEN_FINANCE_CONNECTION_NOT_FOUND", "Conexão não encontrada.", HttpStatus.NOT_FOUND);
  }
}

export class OpenFinanceAccountNotFoundException extends AppException {
  constructor() {
    super(
      "OPEN_FINANCE_ACCOUNT_NOT_FOUND",
      "Conta conectada não encontrada.",
      HttpStatus.NOT_FOUND,
    );
  }
}

export class OpenFinanceTransactionNotFoundException extends AppException {
  constructor() {
    super(
      "OPEN_FINANCE_TRANSACTION_NOT_FOUND",
      "Movimentação não encontrada.",
      HttpStatus.NOT_FOUND,
    );
  }
}

export class OpenFinanceConsentExpiredException extends AppException {
  constructor() {
    super(
      "OPEN_FINANCE_CONSENT_EXPIRED",
      "O consentimento expirou ou requer nova autorização. Reconecte sua conta.",
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class OpenFinanceSyncFailedException extends AppException {
  constructor(message = "Não foi possível sincronizar a conta. Tente novamente mais tarde.") {
    super("OPEN_FINANCE_SYNC_FAILED", message, HttpStatus.BAD_GATEWAY);
  }
}

export class OpenFinanceWebhookUnauthorizedException extends AppException {
  constructor() {
    super("OPEN_FINANCE_WEBHOOK_UNAUTHORIZED", "Webhook não autorizado.", HttpStatus.UNAUTHORIZED);
  }
}

export class CreditCardNotFoundException extends AppException {
  constructor() {
    super("CREDIT_CARD_NOT_FOUND", "Cartão não encontrado.", HttpStatus.NOT_FOUND);
  }
}

export class CreditCardReadOnlyException extends AppException {
  constructor(
    message = "Cartões conectados via Open Finance preservam os dados enviados pela instituição.",
  ) {
    super("CREDIT_CARD_READ_ONLY", message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class CreditCardArchivedException extends AppException {
  constructor() {
    super(
      "CREDIT_CARD_ARCHIVED",
      "Este cartão está arquivado e não aceita novos lançamentos.",
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class CreditCardPurchaseNotFoundException extends AppException {
  constructor() {
    super("CREDIT_CARD_PURCHASE_NOT_FOUND", "Compra não encontrada.", HttpStatus.NOT_FOUND);
  }
}

export class CreditCardPurchaseReadOnlyException extends AppException {
  constructor(message = "Compras importadas do Open Finance preservam os dados originais.") {
    super("CREDIT_CARD_PURCHASE_READ_ONLY", message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class CreditCardInvoiceNotFoundException extends AppException {
  constructor() {
    super("CREDIT_CARD_INVOICE_NOT_FOUND", "Fatura não encontrada.", HttpStatus.NOT_FOUND);
  }
}

export class CreditCardInvoiceAlreadyPaidException extends AppException {
  constructor() {
    super("CREDIT_CARD_INVOICE_ALREADY_PAID", "Esta fatura já foi paga.", HttpStatus.CONFLICT);
  }
}

export class InvestmentNotFoundException extends AppException {
  constructor() {
    super("INVESTMENT_NOT_FOUND", "Investimento não encontrado.", HttpStatus.NOT_FOUND);
  }
}

export class InvestmentReadOnlyException extends AppException {
  constructor(
    message = "Investimentos conectados via Open Finance preservam os dados enviados pela instituição.",
  ) {
    super("INVESTMENT_READ_ONLY", message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class InvestmentArchivedException extends AppException {
  constructor() {
    super(
      "INVESTMENT_ARCHIVED",
      "Este investimento está arquivado e não aceita novos lançamentos.",
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class InvestmentTransactionNotFoundException extends AppException {
  constructor() {
    super("INVESTMENT_TRANSACTION_NOT_FOUND", "Lançamento não encontrado.", HttpStatus.NOT_FOUND);
  }
}

export class InvestmentInsufficientQuantityException extends AppException {
  constructor() {
    super(
      "INVESTMENT_INSUFFICIENT_QUANTITY",
      "Quantidade insuficiente para esta venda/resgate.",
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class InvestmentIncomeNotFoundException extends AppException {
  constructor() {
    super("INVESTMENT_INCOME_NOT_FOUND", "Rendimento não encontrado.", HttpStatus.NOT_FOUND);
  }
}

export class FinancialGoalNotFoundException extends AppException {
  constructor() {
    super("FINANCIAL_GOAL_NOT_FOUND", "Meta não encontrada.", HttpStatus.NOT_FOUND);
  }
}

export class FinancialGoalArchivedException extends AppException {
  constructor() {
    super(
      "FINANCIAL_GOAL_ARCHIVED",
      "Esta meta está arquivada e não aceita novos lançamentos.",
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class GoalTransactionNotFoundException extends AppException {
  constructor() {
    super("GOAL_TRANSACTION_NOT_FOUND", "Lançamento não encontrado.", HttpStatus.NOT_FOUND);
  }
}

export class GoalInsufficientBalanceException extends AppException {
  constructor(availableAmount: number) {
    super(
      "GOAL_INSUFFICIENT_BALANCE",
      `Não é possível retirar esse valor. Saldo disponível na meta: ${availableAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class GoalInvestmentLinkNotFoundException extends AppException {
  constructor() {
    super(
      "GOAL_INVESTMENT_LINK_NOT_FOUND",
      "Vínculo entre meta e investimento não encontrado.",
      HttpStatus.NOT_FOUND,
    );
  }
}

export class GoalInvestmentAlreadyLinkedException extends AppException {
  constructor() {
    super(
      "GOAL_INVESTMENT_ALREADY_LINKED",
      "Este investimento já está vinculado a esta meta.",
      HttpStatus.CONFLICT,
    );
  }
}

export class AiConversationNotFoundException extends AppException {
  constructor() {
    super("AI_CONVERSATION_NOT_FOUND", "Conversa não encontrada.", HttpStatus.NOT_FOUND);
  }
}

export class AiApiKeyMissingException extends AppException {
  constructor() {
    super(
      "AI_API_KEY_MISSING",
      "Configure sua chave da OpenAI em Configurações para usar o Certo IA.",
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class CurrentPasswordInvalidException extends AppException {
  constructor() {
    super("CURRENT_PASSWORD_INVALID", "Senha atual incorreta.", HttpStatus.UNAUTHORIZED);
  }
}

export class FamilyInviteNotFoundException extends AppException {
  constructor() {
    super(
      "FAMILY_INVITE_NOT_FOUND",
      "Código de convite inválido, expirado ou já utilizado.",
      HttpStatus.NOT_FOUND,
    );
  }
}

export class FamilyInviteSelfRedeemException extends AppException {
  constructor() {
    super(
      "FAMILY_INVITE_SELF_REDEEM",
      "Você não pode usar seu próprio código de convite.",
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class FamilyAccessGrantNotFoundException extends AppException {
  constructor() {
    super(
      "FAMILY_ACCESS_GRANT_NOT_FOUND",
      "Este compartilhamento não foi encontrado.",
      HttpStatus.NOT_FOUND,
    );
  }
}

export class FamilyAccessDeniedException extends AppException {
  constructor() {
    super(
      "FAMILY_ACCESS_DENIED",
      "Você não tem mais acesso aos dados deste usuário.",
      HttpStatus.FORBIDDEN,
    );
  }
}

export class AiProviderException extends AppException {
  constructor() {
    super(
      "AI_PROVIDER_UNAVAILABLE",
      "O Certo IA está indisponível no momento. Tente novamente em instantes.",
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
