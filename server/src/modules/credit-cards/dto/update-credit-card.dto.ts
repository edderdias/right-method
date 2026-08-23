import { PartialType } from "@nestjs/swagger";
import { CreateCreditCardDto } from "./create-credit-card.dto";

/** Only meaningful for MANUAL cards — the service rejects edits to OPEN_FINANCE cards' data fields. */
export class UpdateCreditCardDto extends PartialType(CreateCreditCardDto) {}
