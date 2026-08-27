import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/types/authenticated-request";
import { AppConfigService } from "../../config/app-config.service";
import { UsersService } from "../users/users.service";
import { AiConversationsService } from "./ai-conversations.service";
import { AiChatService } from "./ai-chat.service";
import { AiFreeTierLimiterService } from "./ai-free-tier-limiter.service";
import { SendMessageDto } from "./dto/send-message.dto";
import { UpdateConversationDto } from "./dto/update-conversation.dto";

@ApiTags("ai")
@ApiBearerAuth()
@Controller("ai/conversations")
export class AiController {
  constructor(
    private readonly conversations: AiConversationsService,
    private readonly chat: AiChatService,
    private readonly users: UsersService,
    private readonly config: AppConfigService,
    private readonly freeTierLimiter: AiFreeTierLimiterService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Lista as conversas do Certo IA do usuário" })
  async list(@CurrentUser() user: JwtPayload) {
    const data = await this.conversations.list(user.sub);
    return { message: "Conversas do Certo IA.", data };
  }

  @Get("free-tier-status")
  @ApiOperation({ summary: "Indica se o usuário está no modo gratuito e quanto já usou hoje" })
  async freeTierStatus(@CurrentUser() user: JwtPayload) {
    const credentials = await this.users.getAiCredentials(user.sub);
    const active = credentials === null && Boolean(this.config.get("GOOGLE_API_KEY"));
    const data = active
      ? { active: true, provider: "GOOGLE" as const, ...(await this.freeTierLimiter.getUsage(user.sub)) }
      : { active: false };
    return { message: "Status do modo gratuito da Certo IA.", data };
  }

  @Post()
  @ApiOperation({ summary: "Inicia uma nova conversa com o Certo IA" })
  async create(@CurrentUser() user: JwtPayload) {
    const data = await this.conversations.create(user.sub);
    return { message: "Conversa criada.", data };
  }

  @Get(":id")
  @ApiOperation({ summary: "Detalhe de uma conversa, com as mensagens" })
  async findOne(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const data = await this.conversations.findOne(user.sub, id);
    return { message: "Conversa carregada.", data };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Renomeia uma conversa" })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    const data = await this.conversations.update(user.sub, id, dto);
    return { message: "Conversa atualizada.", data };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Exclui uma conversa" })
  async remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    await this.conversations.remove(user.sub, id);
    return { message: "Conversa excluída.", data: null };
  }

  @Post(":id/messages")
  @ApiOperation({ summary: "Envia uma mensagem ao Certo IA e recebe a resposta" })
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
  ) {
    const data = await this.chat.sendMessage(user.sub, id, dto.message);
    return { message: "Mensagem enviada.", data };
  }
}
