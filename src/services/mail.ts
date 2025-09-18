import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { CustomError } from "../utils/customError.js";
import logger from "../config/logger.js"; // <-- ALTERADO AQUI: Importe o logger do novo arquivo

let transporter: nodemailer.Transporter | undefined;

if (env.SMTP_HOST && env.SMTP_USERNAME && env.SMTP_PASSWORD && env.SMTP_PORT) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: Number(env.SMTP_PORT) === 465,
    auth: {
      user: env.SMTP_USERNAME,
      pass: env.SMTP_PASSWORD,
    },
  });
  logger.info("--- SMTP CONFIGURADO ---");
} else {
  logger.warn("--- SMTP NÃO CONFIGURADO. E-MAILS NÃO SERÃO ENVIADOS. ---");
  logger.info(
    "--- USANDO FALLBACK DE CONSOLE PARA LINKS DE VERIFICAÇÃO/REDEFINIÇÃO. ---"
  );
}

export const sendVerificationEmail = async (email: string, token: string) => {
  logger.info(">>> sendVerificationEmail INICIADO <<<");
  if (!transporter) {
    logger.info(">>> Entrou no bloco de FALLBACK (sem SMTP) <<<");
    const verificationLink = `${
      env.BASE_URL || "http://localhost:8080/api"
    }/auth/verify-email?token=${token}`;
    logger.info({
      message: `****************************************************\n*** TOKEN DE VERIFICAÇÃO PARA ${email}:\n*** COPIE ESTE LINK: ${verificationLink}\n****************************************************`,
      tokenLink: verificationLink,
    });
    return;
  }

  const verificationLink = `${
    env.BASE_URL || "http://localhost:8080/api"
  }/auth/verify-email?token=${token}`;

  await transporter.sendMail({
    from: env.SMTP_FROM_EMAIL,
    to: email,
    subject: "Verifique seu e-mail para BlueRise API",
    html: `<p>Por favor, clique no link para verificar seu e-mail: <a href="${verificationLink}">${verificationLink}</a></p>`,
  });
  logger.info(">>> E-mail de verificação ENVIADO VIA SMTP <<<");
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  logger.info(">>> sendPasswordResetEmail INICIADO <<<");
  if (!transporter) {
    logger.info(
      ">>> Entrou no bloco de FALLBACK (sem SMTP) para redefinição <<<"
    );
    const resetLink = `${
      env.BASE_URL || "http://localhost:8080/api"
    }/auth/reset-password?token=${token}`;
    logger.info({
      message: `****************************************************\n*** TOKEN DE REDEFINIÇÃO PARA ${email}:\n*** COPIE ESTE LINK: ${resetLink}\n****************************************************`,
      tokenLink: resetLink,
    });
    return;
  }

  const resetLink = `${
    env.BASE_URL || "http://localhost:8080/api"
  }/auth/reset-password?token=${token}`;

  await transporter.sendMail({
    from: env.SMTP_FROM_EMAIL,
    to: email,
    subject: "Redefinição de Senha para BlueRise API",
    html: `<p>Você solicitou uma redefinição de senha. Clique no link para redefinir: <a href="${resetLink}">${resetLink}</a></p>`,
  });
  logger.info(">>> E-mail de redefinição ENVIADO VIA SMTP <<<");
};
