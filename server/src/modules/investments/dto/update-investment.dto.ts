import { PartialType } from "@nestjs/swagger";
import { CreateInvestmentDto } from "./create-investment.dto";

/** Only meaningful for MANUAL investments — the service rejects edits to OPEN_FINANCE-sourced data
 * fields. currentValue/currentPrice remain editable even here since there is no live market-data
 * provider yet; manually updating them is how a user marks a position to market. */
export class UpdateInvestmentDto extends PartialType(CreateInvestmentDto) {}
