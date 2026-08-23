import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { FamilyController } from "./family.controller";
import { FamilyService } from "./family.service";
import { FamilyAccessGuard } from "./guards/family-access.guard";

@Module({
  imports: [AuditModule],
  controllers: [FamilyController],
  providers: [FamilyService, FamilyAccessGuard],
  exports: [FamilyService, FamilyAccessGuard],
})
export class FamilyModule {}
