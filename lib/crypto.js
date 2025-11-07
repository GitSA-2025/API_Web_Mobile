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
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export async function decrypt(hash) {
  const crypto = await getCrypto();
  const [ivHex, encryptedText] = hash.split(":");
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(secretKey, "hex"),
    Buffer.from(ivHex, "hex")
  );
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString();
}
