// filepath: c:\Users\james\OneDrive\Área de Trabalho\TesteBlueRise\src\routes\apikeys.ts
import { Router } from "express";
import { createApiKey } from "../controllers/apikeys.js"; // Assumindo createApiKey está em controllers/apikeys.ts
import { authenticate } from "../middlewares/auth.js"; // Importar authenticate
import { authorizeRoles } from "../middlewares/authorizeRoles.js"; // Importar authorizeRoles

// Exporta uma função que configura as rotas de apikeys
export const createApiKeysRoutes = () => {
  const router = Router();

  // Aplica autenticação e autorização para esta rota
  router.post("/", authenticate, authorizeRoles(["admin"]), createApiKey);

  return router;
};
