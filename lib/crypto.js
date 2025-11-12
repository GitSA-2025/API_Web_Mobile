import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = process.env.SECRET_KEY || "chave-de-teste-bem-secreta";

export function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY, "utf-8"), iv);
  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
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
