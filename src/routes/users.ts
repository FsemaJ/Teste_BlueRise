import { Router } from "express";
import { getMe } from "../controllers/users.js"; // Assumindo que getMe está em controllers/users.ts
import { authenticate } from "../middlewares/auth.js"; // Importar authenticate

const router = Router();

// Aplica o middleware de autenticação apenas para esta rota
router.get("/me", authenticate, getMe);

export default router;
