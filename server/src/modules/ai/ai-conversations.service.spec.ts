import { AiMessageRole } from "@prisma/client";
import { AiConversationNotFoundException } from "../../common/exceptions/app.exception";
import { AiConversationsService } from "./ai-conversations.service";

function createPrismaMock() {
  const prisma: any = {
    aiConversation: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  return prisma;
}

function buildConversation(overrides: Record<string, unknown> = {}) {
  return {
    id: "conv-1",
    userId: "user-1",
    title: "Nova conversa",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("AiConversationsService", () => {
  let prisma: any;
  let service: AiConversationsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AiConversationsService(prisma);
  });

  describe("findOne", () => {
    it("throws AiConversationNotFoundException when the conversation belongs to another user", async () => {
      prisma.aiConversation.findFirst.mockResolvedValue(null);

      await expect(service.findOne("user-1", "conv-owned-by-someone-else")).rejects.toThrow(
        AiConversationNotFoundException,
      );
      expect(prisma.aiConversation.findFirst).toHaveBeenCalledWith({
        where: { id: "conv-owned-by-someone-else", userId: "user-1" },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    });

    it("returns the conversation with its messages when owned by the user", async () => {
      const conversation = {
        ...buildConversation(),
        messages: [{ id: "m1", role: AiMessageRole.USER, content: "Oi" }],
      };
      prisma.aiConversation.findFirst.mockResolvedValue(conversation);

      const result = await service.findOne("user-1", "conv-1");

      expect(result).toBe(conversation);
    });
  });

  describe("update", () => {
    it("throws when the conversation is not owned by the user", async () => {
      prisma.aiConversation.findFirst.mockResolvedValue(null);

      await expect(service.update("user-1", "conv-1", { title: "Novo título" })).rejects.toThrow(
        AiConversationNotFoundException,
      );
      expect(prisma.aiConversation.update).not.toHaveBeenCalled();
    });

    it("renames an owned conversation", async () => {
      prisma.aiConversation.findFirst.mockResolvedValue(buildConversation());
      prisma.aiConversation.update.mockResolvedValue(
        buildConversation({ title: "Plano de viagem" }),
      );

      const result = await service.update("user-1", "conv-1", { title: "Plano de viagem" });

      expect(prisma.aiConversation.update).toHaveBeenCalledWith({
        where: { id: "conv-1" },
        data: { title: "Plano de viagem" },
      });
      expect(result.title).toBe("Plano de viagem");
    });
  });

  describe("remove", () => {
    it("throws instead of deleting when the conversation is not owned by the user", async () => {
      prisma.aiConversation.findFirst.mockResolvedValue(null);

      await expect(service.remove("user-1", "conv-1")).rejects.toThrow(
        AiConversationNotFoundException,
      );
      expect(prisma.aiConversation.delete).not.toHaveBeenCalled();
    });
  });
});
