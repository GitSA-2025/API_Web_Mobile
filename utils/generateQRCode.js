const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function generateQRCode(data) {
  const json = JSON.stringify(data);
  return await QRCode.toDataURL(json);
}

async function generateQRCodeAsFile(data, filename = null) {
  const json = JSON.stringify(data);
  const id = filename || uuidv4();
  const dirPath = path.join(__dirname, '..', 'public', 'qrcodes');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const filePath = path.join(dirPath, `${id}.png`);
  await QRCode.toFile(filePath, json);
  return filePath; // Retorna o caminho absoluto completo
}

module.exports = { generateQRCode, generateQRCodeAsFile };
