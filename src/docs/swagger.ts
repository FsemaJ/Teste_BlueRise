import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";

// __dirname não está disponível em módulos ES, então precisamos recriá-lo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega o arquivo YAML de definição da API
const swaggerDocument = YAML.load(path.join(__dirname, "swagger.yaml"));

export default swaggerDocument;
