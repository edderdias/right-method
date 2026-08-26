import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationsScanService } from "./notifications-scan.service";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsScanService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
