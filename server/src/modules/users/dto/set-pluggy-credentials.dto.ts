import { IsString, MinLength } from "class-validator";

export class SetPluggyCredentialsDto {
  @IsString()
  @MinLength(10)
  clientId!: string;

  @IsString()
  @MinLength(10)
  clientSecret!: string;
}
