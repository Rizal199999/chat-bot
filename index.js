const express = require('express');
const app = express();
const PORT = 3000;

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const pino = require('pino');
const QRCode = require('qrcode'); // <-- Tambah ini untuk generate QR image
const messageHandler = require('./handlers/messageHandler');
const { startQRServer, setQR, getQR } = require('./qrServer'); // <-- Tambah getQR
const { handleCheckout } = require('./handlers/checkoutHandler');

let sock; // Simpan instance WA socket global

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join('/tmp', 'session'));
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      setQR(qr); // Simpan QR string
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Koneksi terputus. Reconnect?', shouldReconnect);
      if (shouldReconnect) connectToWhatsApp();
    } else if (connection === 'open') {
      console.log('🟢 Terhubung ke WhatsApp!');
      setQR(null); // Hapus QR setelah terkoneksi
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message) return;

    const text = msg.message?.conversation || "";

    if (text.startsWith("Pesanan Baru:")) {
      const total = 47912;
      await handleCheckout(sock, msg, total);
    } else {
      await messageHandler(sock, msg);
    }
  });
}

app.use(express.json());

// ✅ Endpoint GET (untuk testing manual via URL)
app.get('/', async (req, res) => {
  res.json({ success: true, message: 'REST API WhatsApp siap digunakan!' });
});

app.get('/send-message', async (req, res) => {
  if (!sock) return res.status(500).json({ success: false, message: 'WA belum siap' });
  const number = req.query.to;
  const text = req.query.text;
  try {
    await sock.sendMessage(number + '@s.whatsapp.net', { text });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ✅ Endpoint baru untuk tampilkan QR di browser
app.get('/qr', async (req, res) => {
  const qr = getQR();
  if (!qr) {
    return res.send('<h1>Sudah terkoneksi ke WhatsApp atau QR belum tersedia. Refresh halaman ini jika perlu.</h1>');
  }

  try {
    const qrImageUrl = await QRCode.toDataURL(qr); // Generate base64 image
    res.send(`
      <html>
        <head>
          <title>Scan QR WhatsApp</title>
          <meta http-equiv="refresh" content="10"> <!-- Auto-refresh setiap 10 detik -->
        </head>
        <body>
          <h1>Scan QR ini untuk koneksi WhatsApp</h1>
          <img src="${qrImageUrl}" alt="QR Code">
          <p>Refresh halaman jika QR tidak muncul atau expired.</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Error generate QR:', err);
    res.status(500).send('<h1>Error generate QR</h1>');
  }
});

// ✅ Endpoint POST (untuk backend CI4 kirim notifikasi)
app.post('/send-message', async (req, res) => {
  if (!sock) return res.status(500).json({ success: false, message: 'WA belum siap' });
  const { number, message } = req.body;
  if (!number || !message) return res.status(400).json({ success: false, message: 'Data kurang' });
  try {
    await sock.sendMessage(number + '@s.whatsapp.net', { text: message });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.listen(PORT, () => {
  console.log(`REST API WhatsApp ready at http://localhost:${PORT}`);
});

// Mulai bot WhatsApp
startQRServer();
connectToWhatsApp();