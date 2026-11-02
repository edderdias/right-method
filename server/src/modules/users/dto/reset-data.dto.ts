import { IsString } from "class-validator";

export const RESET_DATA_CONFIRMATION_PHRASE = "ZERAR MEUS DADOS";

export class ResetDataDto {
  @IsString()
  confirmation!: string;
}
