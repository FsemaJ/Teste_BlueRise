import { Schema, model, Document } from "mongoose";

// Interface para o documento de Chave de API
export interface IApiKey extends Document {
  keyHash: string; // Hash da chave de API (nunca armazene a chave em texto puro)
  userId: Schema.Types.ObjectId; // Opcional, se a chave for associada a um usuário específico
  name?: string; // Nome descritivo para a chave (ex: "App Mobile", "Integração ERP")
  permissions: string[]; // Permissões associadas a esta chave (ex: ["read:users", "write:products"])
  isActive: boolean;
  createdAt: Date;
  expiresAt?: Date; // Data de expiração da chave (opcional)
  lastUsedAt?: Date; // Última vez que a chave foi usada
}

const apiKeySchema = new Schema<IApiKey>({
  keyHash: {
    type: String,
    required: true,
    unique: true,
    select: false, // Não retornar o hash por padrão em consultas
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false, // Pode ser uma chave de API global ou associada a um serviço, não necessariamente um usuário
  },
  name: {
    type: String,
    required: false,
  },
  permissions: {
    type: [String],
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: false,
  },
  lastUsedAt: {
    type: Date,
    required: false,
  },
});

const ApiKey = model<IApiKey>("ApiKey", apiKeySchema);

export { ApiKey };
