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

  console.log("Valor recebido p/ decrypt:", hash);

  const [ivHex, encryptedText] = hash.split(":");

  if (!ivHex || !encryptedText) {
    throw new Error("Formato inválido — IV ou texto ausente");
  }

  const iv = Buffer.from(ivHex, "hex");

  console.log("IV length:", iv.length);
  console.log("Encrypted length:", encryptedText.length);

  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(secretKey, "hex"),
    iv
  );

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString();
}
