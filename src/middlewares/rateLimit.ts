import type { Request, Response, NextFunction } from "express";
import { redisClient } from "../config/redis.js";
import { CustomError } from "../utils/customError.js";

interface RateLimitOptions {
  windowMs: number; // Tempo da janela em milissegundos (ex: 60 * 1000 para 1 minuto)
  max: number; // Número máximo de requisições permitidas dentro da janela
  message?: string; // Mensagem de erro personalizada
  keyGenerator?: (req: Request) => string; // Função para gerar a chave de identificação (IP, userId, etc.)
}

/**
 * Middleware de Rate Limiting usando Redis.
 * @param options Opções de configuração para o rate limit.
 */
export const rateLimitMiddleware = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = "Muitas requisições. Por favor, tente novamente mais tarde.",
    keyGenerator = (req: Request) => req.ip || "unknown_ip", // Padrão: usar IP
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const redisKey = `rate_limit:${key}`;

    try {
      // Executa as operações INCR e TTL atomicamente
      // O resultado de exec() é um array de [Error | null, Reply] para cada comando.
      // Para INCR e TTL, Reply é um número.
      const results = (await redisClient
        .multi()
        .incr(redisKey)
        .ttl(redisKey)
        .exec()) as unknown as [[Error | null, number], [Error | null, number]]; // Tipagem mais precisa

      // Verifica se houve erros nos comandos individuais
      if (results[0][0] !== null || results[1][0] !== null) {
        // Se houver um erro no comando Redis, loga e permite a requisição para não bloquear
        console.error(
          "Erro em comando Redis durante rate limit:",
          results[0][0] || results[1][0]
        );
        return next();
      }

      // Extrai os valores de count e ttl, que agora são garantidos como números
      const count = results[0][1]; // Acessa o número diretamente
      const ttl = results[1][1]; // Acessa o número diretamente

      // Se o TTL for -1 (chave existe mas não tem expiração) ou -2 (chave não existe),
      // significa que é a primeira requisição na janela ou a chave expirou.
      // Neste caso, definimos o TTL para a janela de tempo.
      if (ttl === -1 || ttl === -2) {
        await redisClient.expire(redisKey, Math.ceil(windowMs / 1000)); // TTL em segundos
      }

      if (count > max) {
        // Se o limite for excedido, retorna erro 429
        const retryAfterSeconds = Math.ceil(
          ttl === -1 || ttl === -2 ? windowMs / 1000 : ttl
        );
        res.setHeader("Retry-After", retryAfterSeconds); // Informa quando tentar novamente
        return next(new CustomError(message, 429)); // 429 Too Many Requests
      }

      // Anexa informações do rate limit à requisição (opcional, para debug/headers)
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, max - count));
      res.setHeader(
        "X-RateLimit-Reset",
        Date.now() + (ttl === -1 || ttl === -2 ? windowMs / 1000 : ttl) * 1000
      );

      next();
    } catch (error) {
      console.error("Erro no middleware de Rate Limit:", error);
      // Em caso de erro no Redis (ex: conexão), podemos optar por permitir a requisição
      // ou retornar um erro 500, dependendo da política de segurança.
      // Por enquanto, vamos permitir para não bloquear a aplicação por falha no Redis.
      next();
    }
  };
};
