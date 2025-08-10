const express = require('express')
const qrcode = require('qrcode')

let currentQR = null

function setQR(qr) {
  currentQR = qr
}

function startQRServer() {
  const app = express()

  app.get('/', (req, res) => {
    if (!currentQR) return res.send('<h3>QR belum tersedia. Tunggu sebentar...</h3>')
    qrcode.toDataURL(currentQR, (err, url) => {
      if (err) return res.send('Gagal generate QR')
      res.send(`<h2>Scan QR WhatsApp</h2><img src="${url}" />`)
    })
  })

  app.listen(3000, () => {
    console.log('🌐 Buka browser di http://localhost:3000 untuk scan QR')
  })
}

module.exports = { setQR, startQRServer }
