// qrServer.js
let currentQR = null;

function setQR(qr) {
  currentQR = qr;
  console.log('QR diupdate!');
}

function getQR() {
  return currentQR;
}

function startQRServer() {
  console.log('QR Server dimulai...');
}

module.exports = { setQR, getQR, startQRServer };