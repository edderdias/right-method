import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { FinancialGoalStatus } from "@prisma/client";
import { IsIn, IsOptional } from "class-validator";
import { CreateFinancialGoalDto } from "./create-financial-goal.dto";

const USER_SETTABLE_STATUSES = [
  FinancialGoalStatus.ACTIVE,
  FinancialGoalStatus.PAUSED,
  FinancialGoalStatus.ARCHIVED,
] as const;

/** COMPLETED is derived automatically from currentAmount vs targetAmount (see
 * GoalTransactionsService) and can never be set directly through this DTO. */
export class UpdateFinancialGoalDto extends PartialType(CreateFinancialGoalDto) {
  @ApiPropertyOptional({ enum: USER_SETTABLE_STATUSES, example: FinancialGoalStatus.PAUSED })
  @IsOptional()
  @IsIn(USER_SETTABLE_STATUSES)
  status?: (typeof USER_SETTABLE_STATUSES)[number];
}
