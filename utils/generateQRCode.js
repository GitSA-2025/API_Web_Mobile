import QRCode from "qrcode-svg"; // Biblioteca para gerar QR Codes em SVG

// Função que gera um QR Code no formato SVG
export function generateQRCode(data) {
  // Converte o objeto ou valor passado em string JSON
  const json = JSON.stringify(data);

  // Cria o QR Code usando a biblioteca QRCode
  const qr = new QRCode({
    content: json, // Conteúdo do QR Code
    padding: 2,    // Espaço em torno do QR Code
    width: 256,    // Largura em pixels
    height: 256    // Altura em pixels
  });

  // Retorna o QR Code em formato SVG como string
  return qr.svg();
}

// Função que gera um QR Code como arquivo (Data URL PNG)
export async function generateQRCodeAsFile(data, filename = null) {
  const json = JSON.stringify(data); // Converte para JSON
  const id = filename || crypto.randomUUID(); // Se não passar nome, gera um UUID

  // Converte o conteúdo em um QR Code e retorna como Data URL (base64)
  const qrBase64 = await QRCode.toDataURL(json);

  // Retorna um objeto contendo id, nome do arquivo e o conteúdo base64
  return {
    id,
    filename: `${id}.png`,
    dataUrl: qrBase64,
  };
}
