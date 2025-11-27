let cryptoModule;

// Função que carrega dinamicamente o módulo 'crypto' apenas uma vez
async function getCrypto() {
  if (!cryptoModule) {
    const mod = await import("crypto"); // importa dinamicamente
    cryptoModule = mod.default || mod;   // compatibilidade com diferentes ambientes
  }
  return cryptoModule;
}

// Algoritmo de criptografia simétrica
const algorithm = "aes-256-ctr";

// Chave secreta usada para criptografar/descriptografar
const secretKey = process.env.SECRET_KEY;

// Função para criptografar um texto
export async function encrypt(text) {
  const crypto = await getCrypto();

  // Verifica se a chave está definida e tem 64 caracteres (256 bits em hex)
  if (!secretKey || secretKey.length !== 64) {
    throw new Error("SECRET_KEY inválida. Gere uma chave hex de 64 caracteres.");
  }

  // Gera um vetor de inicialização (IV) aleatório de 16 bytes
  const iv = crypto.randomBytes(16);

  // Cria o cifrador AES-256-CTR
  const cipher = crypto.createCipheriv(
    algorithm,
    Buffer.from(secretKey, "hex"), // converte a chave de hex para buffer
    iv
  );

  // Criptografa o texto e concatena buffers
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);

  // Retorna IV + texto criptografado em formato hex, separados por ":"
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

// Função para descriptografar um texto
export async function decrypt(hash) {
  const crypto = await getCrypto();

  // Verifica a chave
  if (!secretKey || secretKey.length !== 64) {
    throw new Error("SECRET_KEY inválida. Gere uma chave hex de 64 caracteres.");
  }

  // Separa o IV e o texto criptografado
  const [ivHex, encryptedText] = hash.split(":");

  if (!ivHex || !encryptedText) {
    throw new Error("Formato inválido do dado criptografado.");
  }

  const iv = Buffer.from(ivHex, "hex"); // converte o IV de hex para buffer

  // Cria o decifrador AES-256-CTR
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(secretKey, "hex"),
    iv
  );

  // Descriptografa o texto e converte de volta para UTF-8
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
