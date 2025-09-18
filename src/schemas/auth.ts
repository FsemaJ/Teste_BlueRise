import { z } from "zod";
import passwordValidator from "password-validator";

// Crie um novo esquema de validação de senha
const passwordSchema = new passwordValidator();
passwordSchema
  .is()
  .min(8)
  .is()
  .max(100)
  .has()
  .uppercase()
  .has()
  .lowercase()
  .has()
  .digits()
  .has()
  .symbols()
  .has()
  .not()
  .spaces();

const getPasswordRequirementsMessage = (password: string): string => {
  const errors = passwordSchema.validate(password, { list: true });
  if (typeof errors === "boolean") {
    return "A senha não atende aos requisitos de segurança.";
  }
  return `A senha não atende aos requisitos: ${errors.join(", ")}`;
};

// Esquema para validação de dados de registro de usuário
export const registerSchema = z.object({
  name: z
    .string()
    .min(3, "O nome deve ter pelo menos 3 caracteres.")
    .max(50, "O nome não pode exceder 50 caracteres."),
  email: z.string().email("Formato de e-mail inválido."),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .superRefine((password, ctx) => {
      if (!passwordSchema.validate(password)) {
        ctx.addIssue({
          code: "custom",
          message: getPasswordRequirementsMessage(password),
        });
      }
    }),
});

// Esquema para login
export const loginSchema = z.object({
  email: z.string().email("Formato de e-mail inválido."),
  password: z.string().min(1, "A senha é obrigatória."),
});

// Esquema para "esqueci a senha"
export const forgotPasswordSchema = z.object({
  email: z.string().email("Formato de e-mail inválido."),
});

// Esquema para redefinição de senha
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "O token é obrigatório."),
  newPassword: z
    .string()
    .min(8, "A nova senha deve ter pelo menos 8 caracteres.")
    .superRefine((password, ctx) => {
      if (!passwordSchema.validate(password)) {
        ctx.addIssue({
          code: "custom",
          message: getPasswordRequirementsMessage(password),
        });
      }
    }),
});
