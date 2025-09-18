import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/tokens.js";
import { CustomError } from "../utils/customError.js";
import logger from "../config/logger.js"; // Importe o logger

// Estenda a interface Request do Express para incluir a propriedade 'user'
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        roles: string[];
        jti?: string | undefined; // <-- ALTERADO AQUI: Adicione '| undefined'
      };
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new CustomError(
        "Token de autenticação não fornecido ou mal formatado.",
        401
      );
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new CustomError("Token de autenticação não fornecido.", 401);
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      throw new CustomError("Token de acesso inválido ou expirado.", 401);
    }

    // Anexe as informações do usuário ao objeto de requisição
    req.user = {
      userId: decoded.userId,
      roles: decoded.roles,
      jti: decoded.jti, // Agora 'decoded.jti' pode ser 'string | undefined' e será atribuído corretamente
    };

    next();
  } catch (error) {
    logger.error({ error }, "Erro no middleware de autenticação");
    next(error); // Passe o erro para o próximo middleware de tratamento de erros
  }
};
