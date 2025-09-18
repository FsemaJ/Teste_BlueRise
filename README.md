# Teste_BlueRise

Este é um projeto backend que oferece funcionalidades de autenticação, gerenciamento de usuários e chaves de API, utilizando Node.js, Express, MongoDB e Redis.

## Configuração do Ambiente

Para configurar e executar este projeto, siga os passos abaixo:

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis. Você pode usar o `.env.example` como base.

```
PORT=8080
MONGO_URI=mongodb+srv://dbUser:1O8H3DSnn7Air3oh@cluster0.v9xipid.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
REDIS_URL=redis://localhost:6379
CORS_ALLOWED_ORIGINS=http://localhost:3000

# SUBSTITUA PELAS SUAS CHAVES RSA REAIS GERADAS COM OPENSSL
# CERTIFIQUE-SE DE ENVOLVER EM ASPAS DUPLAS E USAR \n PARA QUEBRAS DE LINHA
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=7d
# Configurações de E-mail (comentadas para não usar SMTP)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USERNAME=seu_email@example.com
# SMTP_PASSWORD=sua_senha_de_email
# SMTP_FROM_EMAIL=noreply@example.com
```

**Observações sobre as chaves RSA:**

- As chaves `JWT_PRIVATE_KEY` e `JWT_PUBLIC_KEY` devem ser geradas usando OpenSSL.
- Certifique-se de que as chaves estejam entre aspas duplas e que as quebras de linha sejam representadas por `\n`.

### 2. Instalação de Dependências

Navegue até o diretório raiz do projeto e instale as dependências:

```powershell
npm install
```

### 3. Executando o Projeto

Para iniciar o servidor, execute:

```powershell
npm start
```

O servidor estará disponível em `http://localhost:8080` (ou na porta especificada em `PORT`).

## Estrutura do Projeto

```
.env.example
package.json
README.md
sequencia_de_cURL.txt
tsconfig.json
scripts/
	queryUser.cjs
	queryUserFull.cjs
src/
	server.ts
	config/
		db.ts
		env.ts
		logger.ts
		redis.ts
	controllers/
		apikeys.ts
		auth.ts
		health.ts
		users.ts
	docs/
		swagger.ts
		swagger.yaml
	middlewares/
		apiKey.ts
		auth.ts
		authorizeRoles.ts
		error.ts
		rateLimit.ts
		rateLimiter.ts
	models/
		apikey.ts
		auditEvent.ts
		user.ts
	routes/
		apikeys.ts
		auth.ts
		health.ts
		index.ts
		users.ts
	schemas/
		auth.ts
		users.ts
	services/
		mail.ts
		tokens.ts
	utils/
		customError.ts
```
