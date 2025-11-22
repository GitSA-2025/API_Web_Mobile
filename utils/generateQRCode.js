import QRCode from "qrcode-svg";

export function generateQRCode(data) {
  const json = JSON.stringify(data);

  const qr = new QRCode({
    content: json,
    padding: 2,
    width: 256,
    height: 256
  });

  return qr.svg();
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
