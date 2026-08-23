import { IsString, MinLength } from "class-validator";

export class SetOpenAiKeyDto {
  @IsString()
  @MinLength(20)
  apiKey!: string;
}
