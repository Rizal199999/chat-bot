const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const messageHandler = require('./handlers/messageHandler')
const path = require('path')

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(path.resolve('./session'))

    const { version } = await fetchLatestBaileysVersion()
    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: require('pino')({ level: 'silent' })
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async (msg) => {
        if (msg.type !== 'notify') return
        await messageHandler(sock, msg.messages[0])
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('Koneksi terputus. Reconnect?', shouldReconnect)
            if (shouldReconnect) {
                connectToWhatsApp()
            }
        } else if (connection === 'open') {
            console.log('🟢 Terhubung ke WhatsApp!')
        }
    })
}

module.exports = { connectToWhatsApp }
