const { handleCheckout, handleSuccessfulPayment } = require('./checkoutHandler');
const pendingOrders = new Map();
const userStates = new Map(); // Track user state (apakah sudah dapat prosedur)

module.exports = async (sock, message) => {
  const sender = message.key.remoteJid;

  const body =
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    message.message?.buttonsResponseMessage?.selectedButtonId ||
    message.message?.listResponseMessage?.singleSelectReply?.selectedRowId;

  if (!body) return;
  const text = body.toLowerCase().trim();

  // 📌 Cek jika user baru atau pesan asal-asalan (belum punya state)
  if (!userStates.has(sender)) {
    // Kirim pesan selamat datang dengan list prosedur
    await sock.sendMessage(sender, {
      text: '👋 Selamat datang di bot kami! Jika ini pertama kali, ikuti prosedur berikut untuk memesan:\n\n' +
            '1. **Lihat Katalog**: Klik link ini untuk lihat produk kami: https://rizal.infonering.com/katalog\n' +
            '2. **Buat Pesanan**: Ketik pesan dengan format seperti ini:\n' +
            '   - Produk A - 1 pcs\n' +
            '   - Produk B - 2 pcs\n' +
            '   Total: Rp 50.000\n' +
            '   (Pastikan ada kata "Total:" di akhir untuk deteksi otomatis)\n' +
            '3. **Bayar**: Scan QR pembayaran yang kami kirim.\n' +
            '4. **Konfirmasi**: Ketik "sudah bayar" setelah transfer.\n\n' +
            'Mulai sekarang yuk! Ketik pesan pesananmu atau "katalog" untuk link lagi.'
    });
    userStates.set(sender, { hasReceivedGuide: true }); // Set state agar tidak kirim ulang
    return; // Stop di sini agar tidak lanjut ke logika lain
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

  // 🌐 Jika ketik 'katalog' atau sejenis, kirim link
  if (text.includes('katalog') || text.includes('produk')) {
    await sock.sendMessage(sender, {
      text: 'Klik link berikut untuk melihat katalog produk kami:\n\nhttps://rizal.infonering.com/katalog'
    });
    return;
  }

  // ❌ Pesan tidak dikenali: Kirim reminder prosedur singkat
  await sock.sendMessage(sender, {
    text: '⚠️ Pesan tidak dikenali. Ikuti prosedur ini ya:\n\n' +
          '1. Lihat katalog: https://rizal.infonering.com/katalog\n' +
          '2. Kirim pesan order dengan format:\n' +
          '   - Produk A - 1 pcs\n' +
          '   Total: Rp 50.000\n' +
          '3. Scan QR untuk bayar.\n' +
          '4. Ketik "sudah bayar" setelah transfer.'
  });
  console.log(`❌ Pesan tidak dikenali: ${body}`);
};