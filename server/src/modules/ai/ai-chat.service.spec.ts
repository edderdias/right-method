import { AiMessageRole } from "@prisma/client";
import { AiConversationNotFoundException } from "../../common/exceptions/app.exception";
import { AiChatService } from "./ai-chat.service";
import type { AiFinancialContext } from "./ai-context.service";

function createPrismaMock() {
  const prisma: any = {
    aiMessage: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
    aiConversation: { update: jest.fn() },
    $transaction: jest.fn(),
  };
  return prisma;
}

const FAKE_CONTEXT: AiFinancialContext = {
  generatedAt: "2026-08-22T00:00:00.000Z",
  currentMonth: {
    period: { from: "2026-08-01", to: "2026-08-31" },
    income: 10000,
    expenses: 7000,
    balance: 3000,
    savingsRatePct: 30,
  },
  previousMonth: { income: 9000, expenses: 6500, balance: 2500 },
  variationVsPreviousMonth: { incomePct: 11.1, expensesPct: 7.7, balancePct: 20 },
  expensesByCategory: [{ name: "Alimentação", total: 1200, percentage: 17.1 }],
  topExpenses: [],
  goals: null,
  investments: null,
  creditCards: null,
};

describe("AiChatService", () => {
  let prisma: any;
  let config: any;
  let conversations: any;
  let context: any;
  let provider: any;
  let users: any;
  let service: AiChatService;

  beforeEach(() => {
    prisma = createPrismaMock();
    config = { get: jest.fn().mockReturnValue(undefined) };
    conversations = { assertOwnership: jest.fn() };
    context = { buildContext: jest.fn().mockResolvedValue(FAKE_CONTEXT) };
    provider = { complete: jest.fn().mockResolvedValue({ content: "Você gastou R$ 7.000." }) };
    users = {
      getAiCredentials: jest.fn().mockResolvedValue({ provider: "OPENAI", apiKey: "sk-user-key" }),
    };
    service = new AiChatService(prisma, config, conversations, context, provider, users);
  });

  it("never calls the LLM provider for a conversation the user does not own", async () => {
    conversations.assertOwnership.mockRejectedValue(new AiConversationNotFoundException());

    await expect(service.sendMessage("user-1", "conv-of-another-user", "Oi")).rejects.toThrow(
      AiConversationNotFoundException,
    );
    expect(provider.complete).not.toHaveBeenCalled();
    expect(context.buildContext).not.toHaveBeenCalled();
  });

  it("grounds the provider call in the real financial context, not the user message", async () => {
    conversations.assertOwnership.mockResolvedValue({ id: "conv-1", title: "Nova conversa" });
    prisma.$transaction.mockResolvedValue([
      { id: "msg-user", role: AiMessageRole.USER, content: "Quanto gastei?" },
      { id: "msg-assistant", role: AiMessageRole.ASSISTANT, content: "Você gastou R$ 7.000." },
    ]);

    await service.sendMessage("user-1", "conv-1", "Quanto gastei este mês?");

    expect(context.buildContext).toHaveBeenCalledWith("user-1");
    expect(provider.complete).toHaveBeenCalledWith(
      "OPENAI",
      [],
      "Quanto gastei este mês?",
      FAKE_CONTEXT,
      "sk-user-key",
    );
  });

  it("refuses to call the provider when the user has no AI key configured", async () => {
    users.getAiCredentials.mockResolvedValue(null);
    conversations.assertOwnership.mockResolvedValue({ id: "conv-1", title: "Nova conversa" });

    await expect(service.sendMessage("user-1", "conv-1", "Oi")).rejects.toThrow(
      "Configure sua chave da OpenAI",
    );
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("persists both the user message and the assistant reply, and auto-titles a fresh conversation", async () => {
    conversations.assertOwnership.mockResolvedValue({ id: "conv-1", title: "Nova conversa" });
    prisma.$transaction.mockResolvedValue([
      { id: "msg-user", role: AiMessageRole.USER, content: "Quanto gastei este mês?" },
      { id: "msg-assistant", role: AiMessageRole.ASSISTANT, content: "Você gastou R$ 7.000." },
    ]);

    const result = await service.sendMessage("user-1", "conv-1", "Quanto gastei este mês?");

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.assistantMessage.content).toBe("Você gastou R$ 7.000.");
    expect(prisma.aiConversation.update).toHaveBeenCalledWith({
      where: { id: "conv-1" },
      data: { updatedAt: expect.any(Date), title: "Quanto gastei este mês?" },
    });
  });

  it("does not overwrite a conversation title the user (or a previous turn) already set", async () => {
    conversations.assertOwnership.mockResolvedValue({ id: "conv-1", title: "Plano de viagem" });
    prisma.$transaction.mockResolvedValue([
      { id: "msg-user", role: AiMessageRole.USER, content: "E os investimentos?" },
      { id: "msg-assistant", role: AiMessageRole.ASSISTANT, content: "..." },
    ]);

    await service.sendMessage("user-1", "conv-1", "E os investimentos?");

    expect(prisma.aiConversation.update).toHaveBeenCalledWith({
      where: { id: "conv-1" },
      data: { updatedAt: expect.any(Date) },
    });
  });
});
