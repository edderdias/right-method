import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";
import { STRONG_PASSWORD_MESSAGE, STRONG_PASSWORD_REGEX } from "../constants/password-policy";

export class ChangePasswordDto {
  @ApiProperty({ example: "SenhaAtual@123" })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  currentPassword!: string;

  @ApiProperty({ example: "NovaSenha@123" })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(STRONG_PASSWORD_REGEX, { message: STRONG_PASSWORD_MESSAGE })
  newPassword!: string;
}
