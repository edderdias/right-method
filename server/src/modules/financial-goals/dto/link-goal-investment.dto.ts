import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class LinkGoalInvestmentDto {
  @ApiProperty({ example: "b1f7c9a0-..." })
  @IsString()
  investmentId!: string;
}
