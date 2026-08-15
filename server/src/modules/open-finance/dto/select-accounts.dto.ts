import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsString } from "class-validator";

export class SelectAccountsDto {
  @ApiProperty({
    type: [String],
    description: "IDs (do Pluggy) das contas que o usuário escolheu importar para o Método Certo.",
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  externalAccountIds!: string[];
}
