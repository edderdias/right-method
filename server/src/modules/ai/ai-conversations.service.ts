import { Injectable } from "@nestjs/common";
import type { AiConversation, AiMessage } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AiConversationNotFoundException } from "../../common/exceptions/app.exception";
import type { UpdateConversationDto } from "./dto/update-conversation.dto";

export type AiConversationWithMessages = AiConversation & { messages: AiMessage[] };

@Injectable()
export class AiConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string): Promise<AiConversation[]> {
    return this.prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  create(userId: string): Promise<AiConversation> {
    return this.prisma.aiConversation.create({ data: { userId } });
  }

  async findOne(userId: string, id: string): Promise<AiConversationWithMessages> {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conversation) {
      throw new AiConversationNotFoundException();
    }
    return conversation;
  }

  async update(userId: string, id: string, dto: UpdateConversationDto): Promise<AiConversation> {
    await this.assertOwnership(userId, id);
    return this.prisma.aiConversation.update({
      where: { id },
      data: { ...(dto.title ? { title: dto.title } : {}) },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.assertOwnership(userId, id);
    await this.prisma.aiConversation.delete({ where: { id } });
  }

  async assertOwnership(userId: string, id: string): Promise<AiConversation> {
    const conversation = await this.prisma.aiConversation.findFirst({ where: { id, userId } });
    if (!conversation) {
      throw new AiConversationNotFoundException();
    }
    return conversation;
  }
}
