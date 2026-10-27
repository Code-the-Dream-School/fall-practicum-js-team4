export interface FieldError {
  field: string;
  message: string;
}

// An error that is safe to show to the client: status + stable code + message
class AppError extends Error {
  status: number;
  code: string;
  details?: FieldError[];

  constructor(status: number, code: string, message: string, details?: FieldError[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export default AppError;
