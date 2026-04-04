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
    super(`O horário ${time} já se encontra ocupado.`, 409, "CONFLICT_SCHEDULE");
  }
}

export class NotFoundException extends AppError {
  constructor(resource: string) {
    super(`${resource} não encontrado.`, 404, "NOT_FOUND");
  }
}
