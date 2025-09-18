import Redis from "ioredis"; // <-- Importe Redis do ioredis
import { env } from "./env.js";
import logger from "./logger.js"; // <-- Importe o logger

if (!env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined in environment variables.");
}

// Crie uma nova instância do cliente ioredis
export const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Desativa a lógica de repetição automática para evitar erros de "sendCommand"
  enableOfflineQueue: true, // Permite que os comandos sejam enfileirados enquanto o cliente está offline
});

// Eventos do ioredis
redisClient.on("error", (err) =>
  logger.error({ err }, "Redis Client Error (ioredis)")
);
redisClient.on("connect", () =>
  logger.info("Redis Client Connected (ioredis)")
);
redisClient.on("reconnecting", () =>
  logger.warn("Redis Client Reconnecting (ioredis)")
);
redisClient.on("end", () => logger.info("Redis Client Disconnected (ioredis)"));
redisClient.on("ready", () => logger.info("Redis Client Ready (ioredis)")); // Evento quando a conexão está totalmente estabelecida

export const connectRedis = async () => {
  try {
    // Com ioredis, a conexão é estabelecida automaticamente na criação da instância.
    // Podemos verificar o status ou apenas aguardar o evento 'ready' se necessário.
    // Para este caso, apenas logar que a conexão foi tentada.
    logger.info("Attempting to connect to Redis (ioredis)...");
    // O ioredis gerencia a conexão automaticamente. Podemos usar um ping para verificar.
    await redisClient.ping();
    logger.info("Redis connected (ioredis)");
  } catch (error) {
    logger.error({ error }, "Failed to connect to Redis (ioredis)");
    process.exit(1);
  }
};
