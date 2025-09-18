import { Schema, model, Document, Types } from "mongoose";
import * as argon2 from "argon2";

// 1. Interface para as propriedades do documento
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  roles: string[];
  status: "pending" | "active" | "inactive" | "suspended";
  isEmailVerified: boolean;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  verifyEmailToken?: string;
  verifyEmailTokenExpires?: Date;
  // --- ADICIONE ESTES DOIS CAMPOS À INTERFACE ---
  loginStatus?: "success" | "failure"; // Opcional, pois pode não estar sempre presente
  lastLoginIp?: string; // Opcional
  // ---------------------------------------------
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// 2. Esquema Mongoose
const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: { type: String, required: true, select: false },
    roles: { type: [String], default: ["user"], enum: ["user", "admin"] },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "active", "inactive", "suspended"],
    },
    isEmailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, default: null },
    verifyEmailToken: {
      type: String,
      select: false,
    },
    verifyEmailTokenExpires: {
      type: Date,
      select: false,
    },
    // Estes campos já estão no esquema, agora estarão na interface também
    loginStatus: {
      type: String,
      enum: ["success", "failure"],
    },
    lastLoginIp: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// <-- ADICIONE A IMPLEMENTAÇÃO DO MÉTODO AQUI
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  // 'this' refere-se ao documento do usuário
  return argon2.verify(this.passwordHash, candidatePassword);
};

// 3. Crie e exporte o modelo
const User = model<IUser>("User", userSchema);
export default User;
