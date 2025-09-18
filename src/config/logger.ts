import pino from "pino";
import { env } from "./env.js"; // Certifique-se de que env.js está acessível

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:HH:MM:ss Z",
      ignore: "pid,hostname",
      messageMaxLength: 0, // Desativa o truncamento
    },
  },
  level: env.NODE_ENV === "production" ? "info" : "debug",
});

export default logger;
