// utils/api.js
const axios = require('axios');

const API_BASE_URL = 'https://rizal.infonering.com';

async function getKategoriList() {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/categories/jsonList`);
    return response.data;
  } catch (error) {
    console.error('Gagal fetch kategori:', error);
    return [];
  }
}

async function getProdukByKategoriId(kategoriId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/products/category/${kategoriId}`);
    return response.data;
  } catch (error) {
    console.error('Gagal ambil produk:', error.message);
    return [];
  }
}


module.exports = {
  getKategoriList,
  getProdukByKategoriId
};
