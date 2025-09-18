import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { redisClient } from "../config/redis.js";
import logger from "../config/logger.js";

export const getHealthStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const mongoStatus =
      mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    const redisStatus =
      redisClient.status === "ready" ? "connected" : "disconnected";

    res.status(200).json({
      status: "ok",
      mongodb: mongoStatus,
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error(
      { err: error },
      "[HealthCheck] Falha na verificação de saúde."
    );
    let errorMessage = "Erro desconhecido na verificação de saúde";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as any).message === "string"
    ) {
      errorMessage = (error as any).message;
    }

    res.status(500).json({
      status: "error",
      message: "Falha na verificação de saúde",
      error: errorMessage,
    });
  }
};
