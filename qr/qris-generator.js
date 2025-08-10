// qr/qrisGenerator.js
const QRCode = require('qrcode');

async function buatQRISDemo(namaToko, nominal) {
  const jumlahFormatted = Number(nominal).toFixed(2);
  const qrContent = `00020101021126660014ID.CO.QRIS.WWW01189360091123456789030203ID5204831253033605406${jumlahFormatted}5802ID5913${namaToko}6013BANDUNG62070703ABC6304C13D`;
  const qrImageDataUrl = await QRCode.toDataURL(qrContent);
  return qrImageDataUrl;
}

module.exports = { buatQRISDemo };
