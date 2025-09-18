// OU c:\Users\james\OneDrive\Área de Trabalho\TesteBlueRise\src\controllers\user.js

import { Request, Response, NextFunction } from "express";
import User from "../models/user.js";
import { CustomError } from "../utils/customError.js";
import logger from "../config/logger.js";

// 6. GET /me – retorna perfil do usuário autenticado. JWT Bearer obrigatório.
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // O middleware de autenticação (authenticate) deve ter adicionado o userId ao req.user
    // Assumindo que req.user é tipado globalmente ou em um arquivo de declaração
    if (!req.user || !req.user.userId) {
      throw new CustomError("Usuário não autenticado.", 401);
    }

    const user = await User.findById(req.user.userId).select("-passwordHash"); // Não retornar o hash da senha

    if (!user) {
      throw new CustomError("Perfil de usuário não encontrado.", 404);
    }

    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          roles: user.roles,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error(
      { err: error },
      `[getMe] Erro ao buscar perfil do usuário: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    next(error);
  }
};
