import User from "../models/user.js"; // Certifique-se de que User está importado corretamente
import type { Request, Response, NextFunction } from "express";
import * as argon2 from "argon2";
import { Types } from "mongoose"; // Importar Types do Mongoose para tipagem de _id
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema, // Importe o esquema
  resetPasswordSchema, // Importe o esquema
} from "../schemas/auth.js";
import { redisClient } from "../config/redis.js"; // Certifique-se de que redisClient está importado
import { env } from "../config/env.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/mail.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../services/tokens.js";
import { AuditEvent } from "../models/auditEvent.js"; // Já importado, mas para referência
import { CustomError } from "../utils/customError.js";
import logger from "../config/logger.js";
import crypto from "crypto";

// helper para criar e salvar token de verificação e logar o link (fallback)
async function createAndSendVerificationToken(user: any) {
  // raw token enviado por e-mail
  const rawToken = crypto.randomBytes(24).toString("hex");
  // hash armazenado no DB
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  const expires = Date.now() + 24 * 60 * 60 * 1000; // 24h

  // salva no documento (cast para any para evitar erros de tipagem)
  user.verifyEmailToken = hashedToken;
  user.verifyEmailTokenExpires = expires;
  await user.save(); // <-- ESSA LINHA É CRÍTICA PARA SALVAR NO DB

  // fallback: loga o link (se SMTP não configurado)
  const tokenLink = `${
    process.env.APP_URL ?? "http://localhost:8080"
  }/api/auth/verify-email?token=${rawToken}`;
  logger.info("****************************************************");
  logger.info(`*** TOKEN DE VERIFICAÇÃO PARA ${user.email}:`);
  logger.info(`*** COPIE ESTE LINK: ${tokenLink}`);
  logger.info("****************************************************");

  // se tiver função sendEmail, chame com rawToken/tokenLink aqui
  // await sendEmail({ to: user.email, subject: 'Verifique seu e-mail', text: `...${tokenLink}` });
}

// 1. POST /auth/register – cria usuário
export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    // Verifica se o usuário já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new CustomError("E-mail já registrado.", 409); // 409 Conflict
    }

    // Hash da senha
    const passwordHash = await argon2.hash(password);

    // Cria o usuário no banco de dados
    const newUser = await User.create({
      name,
      email,
      passwordHash,
      roles: ["user"], // Papel padrão
      status: "pending", // Status inicial
    });

    // cria token de verificação e salva (loga link)
    await createAndSendVerificationToken(newUser);

    res.status(201).json({
      status: "success",
      message:
        "Usuário registrado com sucesso. Verifique seu e-mail para ativar a conta.",
    });
  } catch (error) {
    next(error);
  }
};

// 2. POST /auth/verify-email – verifica o e-mail do usuário
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const rawToken = (
      (req.body && req.body.token) ||
      req.query?.token ||
      req.params?.token ||
      ""
    )
      .toString()
      .trim();
    if (!rawToken) {
      throw new CustomError("Token de verificação obrigatório.", 400);
    }

    const token = decodeURIComponent(rawToken);
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const now = Date.now(); // Captura o timestamp atual

    logger.info(
      `[verifyEmail][DEBUG] received token="${token}" hashed="${hashedToken}"`
    );

    // --- ATUALIZE ESTA CONSULTA ---
    const user = await User.findOne({
      $or: [
        // Tenta encontrar pelo token hasheado E não expirado
        {
          verifyEmailToken: hashedToken,
          verifyEmailTokenExpires: { $gt: now },
        },
        // Tenta encontrar pelo token raw (se o DB não hasheia) E não expirado
        { verifyEmailToken: token, verifyEmailTokenExpires: { $gt: now } },
        // Adicione outras variações de campo se existirem no seu modelo (ex: emailVerificationToken)
        // { emailVerificationToken: hashedToken, emailVerificationTokenExpires: { $gt: now } },
        // { emailVerificationToken: token, emailVerificationTokenExpires: { $gt: now } },
      ],
    }).select("+verifyEmailToken +verifyEmailTokenExpires"); // Seleciona os campos para verificar a expiração

    if (user) {
      logger.info(
        `[verifyEmail][DEBUG] user found: ID=${(user as any)._id}, Verified=${
          (user as any).isEmailVerified
        }, Token=${(user as any).verifyEmailToken}, Expires=${
          (user as any).verifyEmailTokenExpires
        }`
      );
    } else {
      logger.info("[verifyEmail][DEBUG] user found: undefined");
    }

    if (!user) {
      logger.warn(
        `[verifyEmail] Tentativa de verificação com token inválido ou expirado: ${rawToken}`
      );
      throw new CustomError("Token de verificação inválido ou expirado.", 400);
    }

    // Se o usuário foi encontrado, mas o token expirou (caso a consulta não tenha pego isso por algum motivo)
    // Esta verificação é redundante se a consulta acima for perfeita, mas serve como um fallback de segurança.
    if (
      (user as any).verifyEmailTokenExpires &&
      (user as any).verifyEmailTokenExpires.getTime() < now
    ) {
      logger.warn(`[verifyEmail] Token expirado para o usuário ${user.email}`);
      throw new CustomError("Token de verificação inválido ou expirado.", 400);
    }

    // Marcar e-mail como verificado e limpar tokens
    (user as any).isEmailVerified = true;
    (user as any).emailVerifiedAt = new Date();
    (user as any).verifyEmailToken = undefined;
    (user as any).verifyEmailTokenExpires = undefined;
    (user as any).status = "active"; // <-- ADICIONADO AQUI: Altera o status para 'active'
    await user.save();

    res
      .status(200)
      .json({ status: "success", message: "E-mail verificado com sucesso." });
  } catch (error) {
    logger.error(
      { err: error },
      `[verifyEmail] Erro durante a verificação de e-mail: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    next(error);
  }
};

// 3. POST /auth/login – autentica o usuário
export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress; // Captura o IP do cliente

  logger.debug(`[loginUser] Tentando login para: ${email} do IP: ${ipAddress}`);

  try {
    if (!email || !password) {
      throw new CustomError("E-mail e senha são obrigatórios.", 400);
    }

    // Seleciona passwordHash e loginAttempts para poder atualizá-los
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+passwordHash +loginAttempts"
    );

    if (!user || !(await user.comparePassword(password))) {
      // --- Lógica para registrar tentativa de login falha ---
      // Registrar falha de login no AuditEvent
      await AuditEvent.create({
        userId: user ? user._id : null, // Se o usuário foi encontrado, use o ID
        ip: ipAddress, // Usa 'ip' conforme o esquema AuditEvent
        email: email || "desconhecido",
        status: "failure", // Usa 'failure' conforme o enum
        reason: "Credenciais inválidas", // Fornece a razão obrigatória
        description: `Tentativa de login falha para o e-mail: ${
          email || "desconhecido"
        }`,
      });

      if (user) {
        (user as any).loginAttempts = ((user as any).loginAttempts || 0) + 1;
        (user as any).loginStatus = "failure";
        (user as any).lastLoginIp = ipAddress;
        await user.save();
      }
      // ----------------------------------------------------
      throw new CustomError("Credenciais inválidas.", 400);
    }

    if (!user.isEmailVerified) {
      // Registrar falha de login no AuditEvent (e-mail não verificado)
      await AuditEvent.create({
        userId: user._id,
        ip: ipAddress,
        email: user.email,
        status: "failure",
        reason: "E-mail não verificado",
        description: `Tentativa de login para e-mail não verificado: ${user.email}`,
      });
      throw new CustomError(
        "Por favor, verifique seu e-mail para fazer login.",
        400
      );
    }

    // --- Lógica para login bem-sucedido ---
    (user as any).loginAttempts = 0; // Resetar tentativas após sucesso
    (user as any).lastLogin = new Date();
    (user as any).loginStatus = "success"; // Usa o campo 'loginStatus' com valor 'success'
    (user as any).lastLoginIp = ipAddress; // Fornece o IP
    await user.save();
    // ------------------------------------

    // Gerar tokens
    const accessToken = generateAccessToken(user._id.toString(), user.roles);
    const refreshToken = await generateRefreshToken(user._id.toString());

    // Registrar sucesso de login no AuditEvent
    await AuditEvent.create({
      userId: user._id,
      ip: ipAddress, // <-- CORRIGIDO AQUI: de 'ipAddress' para 'ip'
      email: user.email, // <-- ADICIONADO AQUI: para corresponder ao esquema
      status: "success", // <-- CORRIGIDO AQUI: de 'eventType' para 'status' e valor 'success'
      reason: "Login bem-sucedido", // <-- ADICIONADO AQUI: campo 'reason' obrigatório
      description: `Login bem-sucedido para o usuário: ${user.email}`,
    });
    logger.debug(
      `[loginUser] Login bem-sucedido e tokens gerados para: ${user.email}`
    );

    res.status(200).json({
      status: "success",
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (error) {
    // Erros genéricos ou inesperados também devem ser logados na auditoria,
    // mas sem detalhes sensíveis do erro no AuditEvent.description
    // O logger.error já captura os detalhes do erro.
    if (!(error instanceof CustomError)) {
      // Se não for um CustomError (erro inesperado), registre no AuditEvent
      await AuditEvent.create({
        userId: null,
        ip: ipAddress,
        email: email || "desconhecido",
        status: "failure",
        reason: "Erro interno do servidor", // Fornece a razão obrigatória
        description: `Erro inesperado durante o login para e-mail: ${
          email || "desconhecido"
        }`,
      });
    }
    logger.error(
      { err: error },
      `[loginUser] Erro durante o login: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    next(error);
  }
};

// 4. POST /auth/refresh – emite novo access_token
export const refreshTokens = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      throw new CustomError("Token de atualização não fornecido.", 400);
    }

    const decoded = await verifyRefreshToken(refresh_token); // <-- ADICIONE 'await' AQUI
    if (!decoded || !decoded.userId || !decoded.jti) {
      throw new CustomError("Token de atualização inválido ou expirado.", 401);
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new CustomError("Usuário não encontrado.", 404);
    }

    // Gerar novo access token
    // Corrigido: user._id tipado explicitamente
    const newAccessToken = generateAccessToken(
      (user._id as Types.ObjectId).toString(),
      user.roles
    );

    // Opcional: Gerar um novo refresh token e invalidar o antigo (rotação de refresh token)
    // Para este objetivo, vamos apenas emitir um novo access_token e manter o refresh_token existente válido
    // Se quiser rotação, você precisaria gerar um novo refresh token e atualizar o Redis.

    res.status(200).json({
      access_token: newAccessToken,
      // refresh_token: newRefreshToken // Se você implementar rotação
    });
  } catch (error) {
    next(error);
  }
};

// 5. POST /auth/logout – revoga refresh token no Redis.
export const logoutUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      throw new CustomError("Token de atualização não fornecido.", 400);
    }

    // O serviço de tokens deve ter uma função para revogar o refresh token
    // que o remove da whitelist no Redis.
    const revoked = await redisClient.del(`refresh_token:${refresh_token}`);

    if (revoked === 0) {
      // Se não foi revogado, talvez já estivesse expirado ou inválido
      console.warn(
        `Tentativa de logout de refresh token não encontrado: ${refresh_token}`
      );
    }

    res.status(200).json({ message: "Logout realizado com sucesso." });
  } catch (error) {
    next(error);
  }
};

// 6. POST /auth/forgot-password – solicita redefinição de senha
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      // Para evitar enumeração de usuários, sempre retorne uma mensagem genérica
      return res.status(200).json({
        message:
          "Se o e-mail estiver registrado, um link de redefinição de senha foi enviado.",
      });
    }

    // Gerar um token de redefinição de senha (string aleatória ou JWT curto)
    const resetToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const resetKey = `password_reset:${resetToken}`;

    // Salvar no Redis com TTL de 15 minutos (900 segundos)
    await redisClient.set(
      resetKey,
      (user._id as Types.ObjectId).toString(),
      "EX", // <-- ALTERADO AQUI: Use "EX" como string
      900 // <-- E o valor numérico para 15 minutos
    );

    // Enviar e-mail de redefinição de senha
    if (env.SMTP_HOST && env.SMTP_USERNAME && env.SMTP_PASSWORD) {
      await sendPasswordResetEmail(user.email, resetToken);
    } else {
      const resetLink = `${req.protocol}://${req.get(
        "host"
      )}/auth/reset-password?token=${resetToken}`;
      console.warn(
        `SMTP não configurado. Link de redefinição (apenas para desenvolvimento): ${resetLink}`
      );
    }

    res.status(200).json({
      message:
        "Se o e-mail estiver registrado, um link de redefinição de senha foi enviado.",
    });
  } catch (error) {
    next(error);
  }
};

// 7. POST /auth/reset-password – redefine a senha usando o token
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    const resetKey = `password_reset:${token}`;
    const userId = await redisClient.get(resetKey);

    if (!userId) {
      throw new CustomError(
        "Token de redefinição de senha inválido ou expirado.",
        400
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError("Usuário não encontrado.", 404);
    }

    // Fazer hash da nova senha
    user.passwordHash = await argon2.hash(newPassword);
    await user.save();

    await redisClient.del(resetKey); // Remover o token do Redis

    res.status(200).json({
      message:
        "Senha redefinida com sucesso. Você já pode fazer login com a nova senha.",
    });
  } catch (error) {
    next(error);
  }
};
