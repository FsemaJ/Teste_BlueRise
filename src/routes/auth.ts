import { Router, Request, Response, NextFunction } from "express";
import { createRateLimiter } from "../middlewares/rateLimiter.js";
import { ipKeyGenerator } from "express-rate-limit";
import logger from "../config/logger.js";
import {
  registerUser,
  verifyEmail,
  loginUser,
  refreshTokens,
  logoutUser,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.js";

function extractEmail(req: Request): string {
  return req.body && typeof req.body.email === "string"
    ? req.body.email.toLowerCase()
    : "unknown";
}

const loginKeyGenerator = (req: Request, res: Response): string => {
  // Cast para garantir a assinatura (req, res) ao helper importado
  const ip = (
    ipKeyGenerator as unknown as (req: Request, res: Response) => string
  )(req, res);
  const email = extractEmail(req);
  return `${ip}:${email}`;
};

export const createAuthRoutes = (authLimiter: any) => {
  const router = Router();

  const loginRateLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message:
      "Muitas tentativas de login. Por favor, tente novamente após 5 minutos.",
    keyGenerator: loginKeyGenerator,
    handler: (
      req: Request,
      res: Response,
      next: NextFunction,
      options: any
    ) => {
      logger.warn(
        `[RateLimit] Limite de login excedido para IP: ${req.ip}, email: ${
          req.body?.email || "N/A"
        }`
      );
      res.status(options.statusCode || 429).send(options.message);
    },
  });

  router.post("/register", authLimiter, registerUser);
  router.post("/verify-email", authLimiter, verifyEmail);
  router.post("/login", authLimiter, loginRateLimiter, loginUser);
  router.post("/refresh", authLimiter, refreshTokens);
  router.post("/logout", authLimiter, logoutUser);
  router.post("/forgot-password", authLimiter, forgotPassword);
  router.post("/reset-password", authLimiter, resetPassword);

  return router;
};
