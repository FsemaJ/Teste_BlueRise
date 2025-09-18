import { Router } from "express";
import { getHealthStatus } from "../controllers/health.js";

const router = Router();

router.get("/", getHealthStatus);

export default router;
