import { AiProvider } from "@prisma/client";
import { IsEnum, IsString, MinLength } from "class-validator";

export class SetAiCredentialsDto {
  @IsEnum(AiProvider)
  provider!: AiProvider;

  @IsString()
  @MinLength(20)
  apiKey!: string;
}
