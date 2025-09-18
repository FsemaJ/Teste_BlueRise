import type { Request, Response, NextFunction } from "express";
import { CustomError } from "../utils/customError.js";

/**
 * Middleware para verificar se o usuário autenticado possui um dos papéis especificados.
 * @param allowedRoles Array de strings contendo os papéis permitidos (ex: ["admin", "editor"]).
 */
export const authorizeRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Verifica se o usuário está autenticado (req.user deve ser definido pelo authMiddleware)
    if (!req.user) {
      // Isso não deveria acontecer se authMiddleware for usado antes, mas é uma salvaguarda
      return next(
        new CustomError("Acesso negado: Usuário não autenticado.", 401)
      );
    }

    const userRoles = req.user.roles;

    // Verifica se o usuário possui pelo menos um dos papéis permitidos
    const hasPermission = allowedRoles.some((role) => userRoles.includes(role));

    if (hasPermission) {
      next(); // Usuário tem permissão, prossegue para a próxima função
    } else {
      next(
        new CustomError(
          "Acesso negado: Você não tem permissão para realizar esta ação.",
          403
        )
      ); // 403 Forbidden
    }
  };
};
