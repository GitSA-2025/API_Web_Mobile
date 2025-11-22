import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";

export async function generateQRCode(data) {
  const json = JSON.stringify(data);
  return await QRCode.toDataURL(json, {
    type: "image/png",
    width: 300,
    margin: 1,
  });
}

export async function generateQRCodeAsFile(data, filename = null) {
  const json = JSON.stringify(data);
  const id = filename || crypto.randomUUID();

  const qrBase64 = await QRCode.toDataURL(json);

  return {
    id,
    filename: `${id}.png`,
    dataUrl: qrBase64,
  };
}
