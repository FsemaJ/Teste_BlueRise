import type { Request, Response, NextFunction } from "express";
import { CustomError } from "../utils/customError.js";
import { ZodError, type ZodIssue } from "zod"; // Importar ZodError e ZodIssue para tratamento de erros de validação

/**
 * Middleware centralizado para tratamento de erros.
 * Deve ser o último middleware registrado na aplicação Express.
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction // next é necessário mesmo que não seja usado para que o Express o reconheça como middleware de erro
) => {
  // Erros personalizados (CustomError)
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  // Erros de validação do Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: "fail",
      message: "Erro de validação dos dados de entrada.",
      errors: err.issues.map((issue: ZodIssue) => ({
        // Corrigido para 'err.issues' e tipado 'issue'
        path: issue.path.join("."), // Converte o array de path para string (ex: "body.email")
        message: issue.message,
        code: issue.code,
      })),
    });
  }

  // Erros de JWT (JsonWebTokenError, TokenExpiredError, NotBeforeError)
  // Embora já tratados em authMiddleware, é uma boa prática ter um fallback aqui
  if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError" ||
    err.name === "NotBeforeError"
  ) {
    return res.status(401).json({
      status: "error",
      message: "Token de autenticação inválido ou expirado.",
    });
  }

  // Erros do Mongoose (ex: ValidationError, CastError, DuplicateKeyError)
  if (err.name === "ValidationError") {
    const errors = Object.values((err as any).errors).map(
      (el: any) => el.message
    );
    return res.status(400).json({
      status: "fail",
      message: `Dados de entrada inválidos: ${errors.join(". ")}`,
    });
  }
  if (err.name === "CastError") {
    return res.status(400).json({
      status: "fail",
      message: `Recurso não encontrado com ID inválido: ${(err as any).value}`,
    });
  }
  // Erro de chave duplicada do MongoDB (código 11000)
  if ((err as any).code === 11000) {
    // Acessa a mensagem de erro de forma mais segura
    const errorMessage = (err as any).errmsg || (err as any).message;
    const match = errorMessage.match(/(["'])(\\?.)*?\1/);
    const value = match ? match[0] : "valor desconhecido";

    return res.status(409).json({
      status: "fail",
      message: `Valor duplicado: ${value}. Por favor, use outro valor.`,
    });
  }

  // Erros inesperados (erros internos do servidor)
  console.error("ERRO INESPERADO:", err); // Logar o erro completo para depuração
  res.status(500).json({
    status: "error",
    message:
      "Ocorreu um erro inesperado no servidor. Por favor, tente novamente mais tarde.",
  });
};
