/**
 * Classe de erro personalizada para lidar com erros de aplicação com códigos de status HTTP.
 */
export class CustomError extends Error {
  public statusCode: number;
  public isOperational: boolean; // Indica se o erro é operacional (esperado) ou de programação (inesperado)

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Captura o stack trace para melhor depuração
    Error.captureStackTrace(this, this.constructor);
  }
}
