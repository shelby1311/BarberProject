export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400, code = "INTERNAL_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class BusinessRuleException extends AppError {
  constructor(message: string) {
    super(message, 422, "BUSINESS_RULE_VIOLATION");
  }
}

export class ConflictScheduleException extends AppError {
  constructor(time: string) {
    super(`O horário ${time} já se encontra ocupado. Tente outro horário.`, 409, "CONFLICT_SCHEDULE");
  }
}

export class NotFoundException extends AppError {
  constructor(resource: string) {
    super(`${resource} não encontrado.`, 404, "NOT_FOUND");
  }
}

export class UnauthorizedException extends AppError {
  constructor(message = "Não autorizado.") {
    super(message, 403, "UNAUTHORIZED");
  }
}

export class SlotTakenException extends AppError {
  constructor() {
    super("Este horário acabou de ser preenchido por outra pessoa. Por favor, escolha outro.", 409, "SLOT_TAKEN");
  }
}
