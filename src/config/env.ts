import dotenv from "dotenv";
dotenv.config();

// Adicione este log para depuração, para ver o valor bruto do process.env
console.log("DEBUG (env.ts): process.env.SMTP_HOST =", process.env.SMTP_HOST);
console.log("DEBUG (env.ts): process.env.SMTP_PORT =", process.env.SMTP_PORT);
console.log(
  "DEBUG (env.ts): process.env.SMTP_USERNAME =",
  process.env.SMTP_USERNAME
);
console.log(
  "DEBUG (env.ts): process.env.SMTP_PASSWORD =",
  process.env.SMTP_PASSWORD
);
console.log(
  "DEBUG (env.ts): process.env.SMTP_FROM_EMAIL =",
  process.env.SMTP_FROM_EMAIL
);

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/bluerise_db",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  CORS_ALLOWED_ORIGINS:
    process.env.CORS_ALLOWED_ORIGINS || "http://localhost:3000",
  JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY || "YOUR_DEV_PRIVATE_KEY", // Use uma chave real em produção
  JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY || "YOUR_DEV_PUBLIC_KEY", // Use uma chave real em produção
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1h",
  REFRESH_EXPIRES_IN: process.env.REFRESH_EXPIRES_IN || "7d",
  REFRESH_EXPIRES_IN_SECONDS: process.env.REFRESH_EXPIRES_IN_SECONDS
    ? parseInt(process.env.REFRESH_EXPIRES_IN_SECONDS, 10)
    : 7 * 24 * 60 * 60,
  BASE_URL:
    process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}/api`,

  // Configurações de E-mail: Remova quaisquer valores padrão de string aqui.
  // Se process.env.VAR for undefined, a propriedade em 'env' também será undefined.
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT
    ? parseInt(process.env.SMTP_PORT, 10)
    : undefined,
  SMTP_USERNAME: process.env.SMTP_USERNAME,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL,
};
