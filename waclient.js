const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
  } = require('@whiskeysockets/baileys');
  const pino = require('pino');
  const { Boom } = require('@hapi/boom');
  const path = require('path');
  
  let sock;
  
  async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(path.resolve('./session'));
    const { version } = await fetchLatestBaileysVersion();
  
    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: 'silent' })
    });
  
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('Koneksi terputus. Reconnect?', shouldReconnect);
        if (shouldReconnect) connectToWhatsApp();
      } else if (connection === 'open') {
        console.log('🟢 Terhubung ke WhatsApp!');
      }
    });
  
    return sock;
  }
  
  connectToWhatsApp();
  module.exports = sock;
  