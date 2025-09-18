import { Router } from "express";
import { createAuthRoutes } from "./auth.js"; // Importar a função de criação de rotas de auth
import usersRoutes from "./users.js"; // Importar como default
import { createApiKeysRoutes } from "./apikeys.js"; // Importar a função de criação de rotas de apikeys
import healthRoutes from "./health.js"; // Importar como default

export const createRootRouter = (authLimiter?: any) => {
  const router = Router();

  // Passe authLimiter para as rotas de auth/usuarios conforme já implementado
  const authRoutes = createAuthRoutes(authLimiter);
  router.use("/auth", authRoutes);

  const userRoutes = usersRoutes; // ...existing...
  router.use("/users", userRoutes);

  router.use("/apikeys", createApiKeysRoutes()); // Chamar a função para obter o router
  router.use("/health", healthRoutes); // Usar o router importado

  return router;
};
