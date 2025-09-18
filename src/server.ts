import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import createPinoHttp from "pino-http";
import compression from "compression";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { connectRedis, redisClient } from "./config/redis.js";
import { CustomError } from "./utils/customError.js";
import { createRootRouter } from "./routes/index.js";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./docs/swagger.js";
import { errorHandler } from "./middlewares/error.js";
import logger from "./config/logger.js";
import { createRateLimiter } from "./middlewares/rateLimiter.js";
import {
  ipKeyGenerator as expressRateLimitIpKeyGenerator,
  ValueDeterminingMiddleware,
} from "express-rate-limit"; // <-- ADICIONE ValueDeterminingMiddleware

// REMOVA AS IMPORTAÇÕES DIRETAS DE ROTAS ESPECÍFICAS AQUI,
// POIS ELAS SERÃO MONTADAS PELO createRootRouter.
// import { createAuthRoutes } from "./routes/auth.js";
// import userRoutes from "./routes/users.js";
// import apiKeysRoutes from "./routes/apikeys.js";
// import healthRoutes from "./routes/health.js";

const app = express();

// 1. Configuração de Logging (Pino)
const httpLogger = createPinoHttp({
  logger: logger,
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:HH:MM:ss Z",
      ignore: "pid,hostname",
      messageMaxLength: 0,
    },
  },
  level: env.NODE_ENV === "production" ? "info" : "debug",
});

app.use(httpLogger);

// 2. Middlewares de Segurança e Utilitários
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: env.CORS_ALLOWED_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  })
);

// 3. Conexão com Bancos de Dados
const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    const apiLimiter = createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100,
      message:
        "Muitas requisições desta IP. Por favor, tente novamente após 15 minutos.",
      keyGenerator: (req: Request, res: Response) =>
        (
          expressRateLimitIpKeyGenerator as unknown as ValueDeterminingMiddleware<string>
        )(req, res),
    });

    const authLimiter = createRateLimiter({
      windowMs: 1 * 60 * 1000, // 1 minuto
      max: 30,
      message:
        "Muitas requisições para autenticação. Por favor, tente novamente mais tarde.",
      keyGenerator: (req: Request, res: Response) =>
        (
          expressRateLimitIpKeyGenerator as unknown as ValueDeterminingMiddleware<string>
        )(req, res),
    });

    // Crie o rootRouter passando apenas o authLimiter (não passe apiLimiter aqui)
    const rootRouter = createRootRouter(authLimiter);

    // Aplique o limiter GLOBAL para todas rotas /api APENAS UMA VEZ
    app.use("/api", apiLimiter, rootRouter);

    // 4. Rotas da API
    app.use("/api", rootRouter); // Todas as rotas agora passam pelo rootRouter

    // 5. Rota de Saúde (Health Check) - Removida daqui, agora está em controllers/health.ts e routes/health.ts
    // ...

    // 6. Configuração do Swagger UI
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    // 7. Middleware de tratamento de erros (DEVE SER O ÚLTIMO MIDDLEWARE)
    app.use(errorHandler);

    // 8. Iniciar o servidor
    app.listen(env.PORT, () => {
      console.log(`Servidor rodando na porta ${env.PORT}`);
      console.log(`Ambiente: ${env.NODE_ENV}`);
      console.log(
        `Documentação da API disponível em http://localhost:${env.PORT}/docs`
      );
    });
  } catch (error: unknown) {
    logger.error({ error }, "Falha ao iniciar o servidor.");
    process.exit(1);
  }
};

startServer();
