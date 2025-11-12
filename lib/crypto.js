let cryptoModule;

async function getCrypto() {
  if (!cryptoModule) {
    const mod = await import("crypto");
    cryptoModule = mod.default || mod;
  }
  return cryptoModule;
}

const algorithm = "aes-256-ctr";
const secretKey = process.env.SECRET_KEY;

export async function encrypt(text) {
  const crypto = await getCrypto();
  if (!secretKey || secretKey.length !== 64) {
    throw new Error("SECRET_KEY inválida. Gere uma chave hex de 64 caracteres.");
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    algorithm,
    Buffer.from(secretKey, "hex"),
    iv
  );

  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export async function decrypt(hash) {
  const crypto = await getCrypto();
  if (!secretKey || secretKey.length !== 64) {
    throw new Error("SECRET_KEY inválida. Gere uma chave hex de 64 caracteres.");
  }

  const [ivHex, encryptedText] = hash.split(":");

  if (!ivHex || !encryptedText) {
    throw new Error("Formato inválido do dado criptografado.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(secretKey, "hex"),
    iv
  );

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
