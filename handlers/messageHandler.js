const { handleCheckout, handleSuccessfulPayment } = require('./checkoutHandler');
const pendingOrders = new Map();

module.exports = async (sock, message) => {
  const sender = message.key.remoteJid;

  const body =
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    message.message?.buttonsResponseMessage?.selectedButtonId ||
    message.message?.listResponseMessage?.singleSelectReply?.selectedRowId;

  if (!body) return;
  const text = body.toLowerCase().trim();

  // 🌐 Katalog
  if (text === 'pesan' || text === 'katalog' || text === 'lihat katalog' || text === 'lihat katalog produk') {
    await sock.sendMessage(sender, {
      text: 'Klik link berikut untuk melihat katalog produk kami:\n\nhttps://rizal.infonering.com/katalog'
    });
    return;
  }

  // ✅ Konfirmasi "Sudah bayar"
  if (text === 'sudah bayar') {
    if (pendingOrders.has(sender)) {
      const orderData = pendingOrders.get(sender);
      console.log("📝 Menyimpan order sementara:", orderData);
      await handleSuccessfulPayment(sock, message, orderData);
      pendingOrders.delete(sender);
    } else {
      await sock.sendMessage(sender, {
        text: '⚠️ Belum ada pesanan yang menunggu konfirmasi. Silakan kirim pesan pemesanan terlebih dahulu.'
      });
    }
    return;
  }

  // 🧾 Deteksi format pemesanan (dengan kata “Total:”)
  const totalMatch = body.match(/total:\s*rp\s*([\d.,]+)/i);
  if (totalMatch) {
    const orderData = await handleCheckout(sock, message, body); // hanya kirim QR
    console.log("📝 Menyimpan order sementara:", orderData);
    pendingOrders.set(sender, orderData); // simpan pesanan SEMENTARA
    return;
  }

  // ❌ Tidak dikenali
  console.log(`❌ Pesan tidak dikenali: ${body}`);
};
