const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parseOrderMessage } = require('../utils/parser');

// Dummy merchant info
const MERCHANT_ID = '000000000000000';
const MERCHANT_NAME = 'Toko Sembako';
const QR_OUTPUT_PATH = path.resolve(__dirname, '../temp/checkout-qr.png');

/**
 * Generate QRIS dengan nominal tetap (dummy)
 * @param {number} amount 
 * @returns {string}
 */
function generateFixedQRIS(amount) {
  const dummyQRContent = `00020101021226680012ID.CO.QRIS.WWW011893600915031234563034${amount}5204581253033605405${amount}5802ID5901A6009Jakarta61051123462150703A016304`;
  return dummyQRContent;
}

/**
 * Kirim QR ke WhatsApp saat user pertama kali checkout
 * @param {*} sock - koneksi WhatsApp (baileys)
 * @param {*} msg - pesan masuk
 * @param {string} text - isi pesan (pesanan user)
 */
async function handleCheckout(sock, msg, text) {
  const sender = msg.key.remoteJid.replace('@s.whatsapp.net', '');
  const orderData = await parseOrderMessage(text);
  orderData.payment_status = 'unpaid';
  orderData.number_wa = sender;

  const qrData = generateFixedQRIS(orderData.total_price);
  await qrcode.toFile(QR_OUTPUT_PATH, qrData, { width: 300 });

  const rupiah = (n) => 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  await sock.sendMessage(sender + '@s.whatsapp.net', {
    image: fs.readFileSync(QR_OUTPUT_PATH),
    caption: `🧾 Berikut QR pembayaran sebesar *${rupiah(orderData.total_price)}*.\nSetelah pembayaran, balas dengan *"Sudah bayar"* untuk konfirmasi.`,
  });

  console.log("🧾 Parsed order data:", orderData);

  return orderData;
}


/**
 * Setelah konfirmasi pembayaran, kirim pesanan ke backend CI4
 * @param {*} sock - koneksi WA
 * @param {*} msg - pesan masuk
 * @param {*} orderData - data pesanan yang sebelumnya di-parse
 */
async function handleSuccessfulPayment(sock, msg, orderData) {
  const sender = msg.key.remoteJid.replace('@s.whatsapp.net', ''); 

  try {
    orderData.payment_status = 'paid';
    orderData.number_wa = sender;
    console.log("📦 Data yang dikirim ke backend:", orderData);

    const response = await axios.post('https://rizal.infonering.com/Api/Orders', orderData);

    if (response.data?.order_id) {
      const orderId = response.data.order_id;
    
      // Format daftar item jadi string
      const itemList = orderData.items.map(item => `• ${item.product_name} x${item.quantity}`).join('\n');
    
      await sock.sendMessage(sender + '@s.whatsapp.net', {
        text: `✅ Pembayaran berhasil!\nOrder ID: #${orderId}\nPesanan kamu:\n\n${itemList}\n\nTunggu hingga admin menyiapkan pesananmu, Terima kasih 🙌`
      });
    } else {
      await sock.sendMessage(sender + '@s.whatsapp.net', {
        text: '❌ Gagal menyimpan pesanan. Mohon ulangi lagi ya!'
      });
    }
  } catch (err) {
    console.error('❌ Gagal kirim ke backend:', err.message);
    if (err.response) {
      console.error('📦 Response:', err.response.data);
    }
    await sock.sendMessage(msg.key.remoteJid, {
      text: '⚠️ Terjadi kesalahan saat mencatat pesanan ke sistem kami.'
    });
  }  
}

module.exports = {
  handleCheckout,
  handleSuccessfulPayment,
};
