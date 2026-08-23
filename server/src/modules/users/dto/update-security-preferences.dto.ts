import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateSecurityPreferencesDto {
  @ApiPropertyOptional({ description: "Permitir login por biometria/Face ID no app" })
  @IsOptional()
  @IsBoolean()
  biometricEnabled?: boolean;

  @ApiPropertyOptional({ description: "Exigir autenticação em 2 fatores no login" })
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;

  @ApiPropertyOptional({ description: "Enviar e-mail de alerta a cada novo login" })
  @IsOptional()
  @IsBoolean()
  newDeviceAlertEnabled?: boolean;
}
