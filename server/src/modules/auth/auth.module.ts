import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AppConfigService } from "../../config/app-config.service";
import { ConfigModule } from "../../config/config.module";
import { UsersModule } from "../users/users.module";
import { SessionsModule } from "../sessions/sessions.module";
import { EmailModule } from "../email/email.module";
import { AuditModule } from "../audit/audit.module";
import { ThrottlerModule } from "../throttler/throttler.module";
import { AuthController } from "./controllers/auth.controller";
import { AuthService } from "./services/auth.service";
import { PasswordService } from "./services/password.service";
import { TokenService } from "./services/token.service";
import { VerificationTokenService } from "./services/verification-token.service";
import { TwoFactorChallengeService } from "./services/two-factor-challenge.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    SessionsModule,
    EmailModule,
    AuditModule,
    ThrottlerModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.get("JWT_ACCESS_SECRET"),
        signOptions: { expiresIn: config.get("JWT_ACCESS_EXPIRES_IN") },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    VerificationTokenService,
    TwoFactorChallengeService,
    JwtStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
