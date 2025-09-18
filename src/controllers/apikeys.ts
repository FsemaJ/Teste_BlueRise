import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid"; // Para gerar UUIDs para as API Keys
import * as argon2 from "argon2"; // Para fazer hash das API Keys
import { ApiKey } from "../models/apikey.js"; // Importe o modelo ApiKey
import { CustomError } from "../utils/customError.js";
import { z } from "zod"; // Para validação de entrada

// Esquema de validação para a criação de API Key (apenas um nome opcional)
const createApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "O nome da API Key não pode ser vazio.")
    .optional(),
  permissions: z.array(z.string()).optional().default([]), // Ex: ["read:users", "write:products"]
  expiresAt: z.string().datetime().optional(), // Data de expiração opcional
});

/**
 * Gera uma nova API Key, faz o hash, armazena o hash no banco de dados
 * e retorna a chave original (não hash) uma única vez.
 * Requer autenticação e papel de 'admin'.
 */
export const createApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Valida o corpo da requisição
    const { name, permissions, expiresAt } = createApiKeySchema.parse(req.body);

    // Gera uma API Key única (UUID)
    const rawApiKey = uuidv4();

    // Faz o hash da API Key antes de armazenar
    const keyHash = await argon2.hash(rawApiKey);

    // Cria o novo documento da API Key no MongoDB
    const newApiKey = await ApiKey.create({
      keyHash,
      userId: req.user?.id, // Associa ao usuário admin que a criou, se disponível
      name: name || `API Key para ${req.user?.email || "serviço"}`,
      permissions,
      isActive: true,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    // Retorna a chave original (não hash) para o cliente.
    // Esta é a ÚNICA vez que a chave original será exposta.
    res.status(201).json({
      status: "success",
      message:
        "API Key gerada com sucesso. Guarde-a com segurança, ela não será mostrada novamente.",
      data: {
        apiKey: rawApiKey, // A chave original
        apiKeyId: newApiKey._id, // O ID do documento no banco de dados
        name: newApiKey.name,
        permissions: newApiKey.permissions,
        expiresAt: newApiKey.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
