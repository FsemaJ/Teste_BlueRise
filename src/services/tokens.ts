import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env.js";
import logger from "../config/logger.js";
import { redisClient } from "../config/redis.js";

export interface TokenPayload {
  userId: string;
  roles: string[];
  jti?: string; // JWT ID para refresh tokens
}

export const generateAccessToken = (
  userId: string,
  roles: string[]
): string => {
  const payload: TokenPayload = {
    userId,
    roles,
  };

  const options = {
    algorithm: "RS256",
    expiresIn: env.JWT_EXPIRES_IN,
    jwtid: uuidv4(), // Adiciona um ID único ao JWT
  } as jwt.SignOptions;

  return jwt.sign(payload, env.JWT_PRIVATE_KEY, options);
};

export const generateRefreshToken = async (userId: string) => {
  const payload = {
    userId,
  };

  const options = {
    algorithm: "RS256",
    expiresIn: env.REFRESH_EXPIRES_IN,
    jwtid: uuidv4(),
  } as jwt.SignOptions;

  const refreshToken = jwt.sign(payload, env.JWT_PRIVATE_KEY, options);

  // Salvar o refresh token no Redis para whitelist/revogação
  // O jti (jwtid) é o identificador único do token
  await redisClient.set(
    `refresh_token:${options.jwtid}`,
    userId,
    "EX", // <-- ALTERADO AQUI: Argumento 'EX' como string
    env.REFRESH_EXPIRES_IN_SECONDS // <-- Argumento de segundos
  );

  return refreshToken;
};

export const verifyAccessToken = (token: string) => {
  try {
    logger.debug(
      `[verifyAccessToken] Tentando verificar token: ${token.substring(
        0,
        30
      )}...`
    );
    // ADICIONE ESTE LOG PARA VER O VALOR DA CHAVE PÚBLICA
    logger.debug(
      `[verifyAccessToken] JWT_PUBLIC_KEY carregada (primeiros 50 chars): ${env.JWT_PUBLIC_KEY.substring(
        0,
        50
      )}...`
    );

    const decoded = jwt.verify(token, env.JWT_PUBLIC_KEY, {
      algorithms: ["RS256"],
    }) as TokenPayload;
    logger.debug(
      `[verifyAccessToken] Token verificado com sucesso para userId: ${decoded.userId}`
    );
    return decoded;
  } catch (error) {
    logger.error(
      { err: error },
      `[verifyAccessToken] Erro na verificação do token: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
};

export const verifyRefreshToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, env.JWT_PRIVATE_KEY, {
      algorithms: ["RS256"],
    }) as TokenPayload & { jti?: string };

    if (!decoded.jti) {
      throw new Error("Refresh token não possui JTI.");
    }

    // Verificar se o refresh token está na whitelist do Redis
    const storedUserId = await redisClient.get(`refresh_token:${decoded.jti}`);

    if (!storedUserId || storedUserId !== decoded.userId) {
      throw new Error("Refresh token inválido ou revogado.");
    }

    return decoded;
  } catch (error) {
    throw error;
  }
};
