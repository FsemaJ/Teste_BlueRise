import type { Request, Response, NextFunction } from "express";
import * as argon2 from "argon2";
import { ApiKey } from "../models/apikey.js"; // Importe o modelo ApiKey
import { CustomError } from "../utils/customError.js";

/**
 * Middleware para verificar uma API Key no cabeçalho X-API-Key.
 * A chave é comparada com o hash armazenado no banco de dados.
 */
export const apiKeyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKeyHeader = req.headers["x-api-key"];

    if (!apiKeyHeader || typeof apiKeyHeader !== "string") {
      throw new CustomError(
        "API Key não fornecida no cabeçalho X-API-Key.",
        401
      );
    }

    // Busca a chave de API no banco de dados.
    // Como keyHash é 'select: false', precisamos explicitamente selecioná-lo.
    const storedApiKey = await ApiKey.findOne({ isActive: true }).select(
      "+keyHash"
    );

    if (!storedApiKey) {
      throw new CustomError("API Key inválida ou inativa.", 401);
    }

    // Compara a chave fornecida com o hash armazenado
    const isKeyValid = await argon2.verify(storedApiKey.keyHash, apiKeyHeader);

    if (!isKeyValid) {
      throw new CustomError("API Key inválida ou inativa.", 401);
    }

    // Opcional: Atualizar lastUsedAt para a chave de API
    storedApiKey.lastUsedAt = new Date();
    await storedApiKey.save();

    // Se a chave for válida, prossegue
    next();
  } catch (error) {
    next(error); // Passa o erro para o middleware de tratamento de erros
  }
};
