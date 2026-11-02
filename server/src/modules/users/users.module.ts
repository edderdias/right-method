import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { TwoFactorService } from "./two-factor.service";
import { WebAuthnService } from "./webauthn.service";
import { UsersDataService } from "./users-data.service";

@Module({
  controllers: [UsersController],
  providers: [UsersService, TwoFactorService, WebAuthnService, UsersDataService],
  exports: [UsersService, TwoFactorService, WebAuthnService],
})
export class UsersModule {}
