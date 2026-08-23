import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";

export const REMOVE_PURCHASE_SCOPES = ["one", "group"] as const;
export type RemovePurchaseScope = (typeof REMOVE_PURCHASE_SCOPES)[number];

export class RemovePurchaseQueryDto {
  @ApiPropertyOptional({ enum: REMOVE_PURCHASE_SCOPES, default: "one" })
  @IsOptional()
  @IsIn(REMOVE_PURCHASE_SCOPES)
  scope?: RemovePurchaseScope = "one";
}
