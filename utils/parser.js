const axios = require('axios');

/**
 * Parse pesan teks pesanan menjadi struktur JSON
 * Contoh pesan:
 * • Beras x2 = Rp 10.000
 * • Gula x1 = Rp 8.000
 * Total: Rp 18.000
 */
async function parseOrderMessage(text) {
  if (typeof text !== 'string') {
    throw new Error('Expected `text` to be string, got ' + typeof text);
  }

  const res = await axios.get('https://rizal.infonering.com/api/products/map');
  const productMap = res.data;

  // 🔧 Normalize key
  const normalizedMap = {};
  for (const key in productMap) {
    normalizedMap[key.toLowerCase()] = productMap[key];
  }

  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const items = [];
  let total_price = 0;

  for (const line of lines) {
    if (line.toLowerCase().startsWith("total:")) {
      const totalStr = line.replace(/[^\d]/g, '');
      total_price = parseInt(totalStr);
      continue;
    }

    const match = line.match(/•\s*(.+?)\s*x(\d+)\s*=\s*Rp\s*([\d.]+)/i);
    if (match) {
      const name = match[1].toLowerCase().trim();
      const qty = parseInt(match[2]);

      if (normalizedMap[name]) {
        items.push({
          product_id: normalizedMap[name].id,
          product_name: normalizedMap[name].name,
          quantity: qty,
          unit_price: normalizedMap[name].price
        });
      } else {
        console.log(`⚠️ Produk tidak dikenali: "${name}"`);
        console.log("🗺️ Product map tersedia:", Object.keys(normalizedMap));
      }
    }
  }

  console.log("🧾 Pesanan berhasil di-parse:", items);

  return {
    total_price,
    items
  };
}


module.exports = {
  parseOrderMessage
};
