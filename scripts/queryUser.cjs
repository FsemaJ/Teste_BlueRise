const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
dotenv.config();

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("MONGO_URI não encontrado no .env");
  process.exit(1);
}

// email a consultar
const email = process.argv[2] || "test@example.com";

// tenta extrair DB name da URI (mongodb+srv://.../DBNAME?...)
let dbName = process.env.DB_NAME;
if (!dbName) {
  const m = uri.match(/\/([^\/?]+)(\?|$)/);
  if (m && m[1]) dbName = m[1];
}
if (!dbName) dbName = "test";

(async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const user = await db.collection("users").findOne(
      { email },
      {
        projection: {
          verifyEmailToken: 1,
          verifyEmailTokenExpires: 1,
          emailVerificationToken: 1,
          emailVerificationTokenExpires: 1,
          emailVerifyToken: 1,
          emailVerifyTokenExpires: 1,
          isEmailVerified: 1,
          _id: 0,
        },
      }
    );
    console.log(JSON.stringify(user, null, 2));
  } catch (err) {
    console.error("Erro:", err);
  } finally {
    await client.close();
  }
})();
