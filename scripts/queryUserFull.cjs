const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
dotenv.config();

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("MONGO_URI não encontrado no .env");
  process.exit(1);
}
const email = process.argv[2] || "test@example.com";

(async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    // tenta extrair DB da URI ou usa DB_NAME / test
    let dbName = process.env.DB_NAME;
    if (!dbName) {
      const m = uri.match(/\/([^\/?]+)(\?|$)/);
      if (m && m[1]) dbName = m[1];
    }
    if (!dbName) dbName = "test";
    const db = client.db(dbName);
    const user = await db.collection("users").findOne({ email });
    console.log(JSON.stringify(user, null, 2));
  } catch (err) {
    console.error("Erro:", err);
  } finally {
    await client.close();
  }
})();
