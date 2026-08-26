import { Controller, Get, Param, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/types/authenticated-request";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Lista as notificações recentes do usuário e a contagem de não lidas" })
  async list(@CurrentUser() user: JwtPayload) {
    const data = await this.notificationsService.listRecent(user.sub);
    return { message: "Notificações.", data };
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Marca uma notificação como lida" })
  async markRead(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    await this.notificationsService.markRead(user.sub, id);
    return { message: "Notificação marcada como lida." };
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Marca todas as notificações do usuário como lidas" })
  async markAllRead(@CurrentUser() user: JwtPayload) {
    await this.notificationsService.markAllRead(user.sub);
    return { message: "Todas as notificações foram marcadas como lidas." };
  }
}
