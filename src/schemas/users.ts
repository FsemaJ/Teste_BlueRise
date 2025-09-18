import { Schema } from "mongoose";
import { type IUser } from "../models/user.js"; // Importa a interface do arquivo de modelo

export const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
    required: true,
    select: false,
  },
  roles: {
    type: [String],
    enum: ["user", "admin"],
    default: ["user"],
  },
  status: {
    type: String,
    enum: ["active", "inactive", "pending"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // --- ADICIONE ESTES DOIS CAMPOS ---
  verifyEmailToken: {
    type: String,
    select: false, // Não retorna o token por padrão
  },
  verifyEmailTokenExpires: {
    type: Date,
    select: false, // Não retorna a data de expiração por padrão
  },
  // ---------------------------------
});
