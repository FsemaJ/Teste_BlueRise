import { Schema, model, Document } from "mongoose";

// Interface para o documento de Evento de Auditoria
export interface IAuditEvent extends Document {
  ip: string;
  userId?: Schema.Types.ObjectId; // Opcional, pois pode ser uma tentativa de login sem usuário válido
  email?: string; // Opcional, para registrar o email tentado no login
  timestamp: Date;
  status: "success" | "failure";
  reason: string;
  details?: object; // Para detalhes adicionais, se necessário
}

const auditEventSchema = new Schema<IAuditEvent>({
  ip: {
    type: String,
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User", // Referencia o modelo User
    required: false, // Não é obrigatório, pois pode ser um login falho sem userId
  },
  email: {
    type: String,
    required: false, // Não é obrigatório, mas útil para tentativas de login
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  status: {
    type: String,
    enum: ["success", "failure"],
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  details: {
    type: Object, // Pode ser um objeto JSON para armazenar informações adicionais
    required: false,
  },
});

const AuditEvent = model<IAuditEvent>("AuditEvent", auditEventSchema);

export { AuditEvent };
