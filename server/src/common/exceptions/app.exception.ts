import { HttpException, HttpStatus } from "@nestjs/common";

export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
  ) {
    super({ code, message }, status);
  }
}

export class InvalidCredentialsException extends AppException {
  constructor() {
    super("INVALID_CREDENTIALS", "E-mail ou senha inválidos.", HttpStatus.UNAUTHORIZED);
  }
}

export class EmailAlreadyExistsException extends AppException {
  constructor() {
    super("EMAIL_ALREADY_EXISTS", "Não foi possível concluir o cadastro.", HttpStatus.CONFLICT);
  }
}

export class AccountBlockedException extends AppException {
  constructor() {
    super("ACCOUNT_BLOCKED", "Esta conta está bloqueada.", HttpStatus.FORBIDDEN);
  }
}

export class AccountInactiveException extends AppException {
  constructor() {
    super("ACCOUNT_INACTIVE", "Esta conta está inativa.", HttpStatus.FORBIDDEN);
  }
}

export class EmailNotVerifiedException extends AppException {
  constructor() {
    super("EMAIL_NOT_VERIFIED", "Confirme seu e-mail antes de fazer login.", HttpStatus.FORBIDDEN);
  }
}

export class TooManyAttemptsException extends AppException {
  constructor() {
    super(
      "TOO_MANY_ATTEMPTS",
      "Muitas tentativas. Tente novamente mais tarde.",
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class InvalidTokenException extends AppException {
  constructor(message = "Token inválido ou expirado.") {
    super("INVALID_TOKEN", message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class SessionRevokedException extends AppException {
  constructor() {
    super("SESSION_REVOKED", "Sessão revogada. Faça login novamente.", HttpStatus.UNAUTHORIZED);
  }
}

export class WeakPasswordException extends AppException {
  constructor() {
    super(
      "WEAK_PASSWORD",
      "A senha não atende aos requisitos mínimos de segurança.",
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class EmailAlreadyVerifiedException extends AppException {
  constructor() {
    super("EMAIL_ALREADY_VERIFIED", "Este e-mail já foi verificado.", HttpStatus.CONFLICT);
  }
}

export class SessionNotFoundException extends AppException {
  constructor() {
    super("SESSION_NOT_FOUND", "Sessão não encontrada.", HttpStatus.NOT_FOUND);
  }
}
