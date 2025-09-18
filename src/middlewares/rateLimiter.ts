import rateLimit, {
  Options as RateLimitOptions,
  ipKeyGenerator,
  ValueDeterminingMiddleware,
} from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redisClient } from "../config/redis.js";
import logger from "../config/logger.js";
import { Request, Response, NextFunction } from "express";

// rate-limit-redis espera Promise<any> para sendCommand
type SendCommandFn = (...args: string[]) => Promise<any>;

interface RateLimiterOptions extends Partial<RateLimitOptions> {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: ValueDeterminingMiddleware<string>;
  handler?: (
    req: Request,
    res: Response,
    next: NextFunction,
    options: RateLimitOptions
  ) => void;
}

export const createRateLimiter = (options: RateLimiterOptions) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: ((...args: string[]) => {
        const command = args[0];
        const commandArgs = args.slice(1);
        if (!command)
          return Promise.reject(
            new Error("Comando Redis não fornecido para sendCommand.")
          );
        return (redisClient as any).call(command, ...commandArgs);
      }) as SendCommandFn,
    }),
    windowMs: options.windowMs,
    max: options.max,
    message:
      options.message ??
      "Muitas requisições. Por favor, tente novamente mais tarde.",
    // TS2352: primeiro para unknown, depois para ValueDeterminingMiddleware<string>
    keyGenerator:
      options.keyGenerator ??
      (ipKeyGenerator as unknown as ValueDeterminingMiddleware<string>),
    handler:
      options.handler ??
      ((
        req: Request,
        res: Response,
        next: NextFunction,
        opts: RateLimitOptions
      ) => {
        logger.warn(
          `[RateLimit] Limite excedido para IP: ${req.ip} na rota: ${req.originalUrl}`
        );
        res
          .status(opts.statusCode ?? 429)
          .json({ status: "error", message: opts.message });
      }),
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// 🔹 Rate limiter específico para LOGIN (IP + email)
export const loginRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  // keyGenerator agora recebe (req, res) e chama ipKeyGenerator corretamente
  keyGenerator: (req: Request, res: Response) => {
    const ipPart = (
      ipKeyGenerator as unknown as ValueDeterminingMiddleware<string>
    )(req, res);
    const emailPart = (req.body?.email as string) || "unknown";
    return `${ipPart}:${emailPart}`;
  },
  message: "Muitas tentativas de login. Tente novamente mais tarde.",
});
