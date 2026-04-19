const express = require('express');
const db = require('./db');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();

// --- KONFIGURASI VIEW ENGINE & MIDDLEWARE ---
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Izin akses folder statis
app.use(express.static('public')); 
app.use('/uploads', express.static('uploads')); // Perbaikan: Agar foto KTP bisa diakses via URL

// --- KONFIGURASI MULTER ---
// Menyimpan file di folder 'uploads' di dalam server EC2
const upload = multer({ dest: 'uploads/' });

// --- INISIALISASI DATABASE (PostgreSQL) ---
async function initDB() {
  try {
    // Buat tabel bookings jika belum ada
    await db.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        nik VARCHAR(20) NOT NULL,
        tanggal DATE NOT NULL,
        poli VARCHAR(50) NOT NULL,
        keluhan TEXT,
        foto_ktp VARCHAR(255),
        status VARCHAR(20) DEFAULT 'menunggu',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Buat tabel jadwal jika belum ada
    await db.query(`
      CREATE TABLE IF NOT EXISTS jadwal (
        id SERIAL PRIMARY KEY,
        poli VARCHAR(50) NOT NULL,
        hari VARCHAR(20) NOT NULL,
        jam_buka VARCHAR(10) NOT NULL,
        jam_tutup VARCHAR(10) NOT NULL,
        dokter VARCHAR(100) NOT NULL
      )
    `);

    // Isi data awal jadwal jika masih kosong
    const resJadwal = await db.query('SELECT COUNT(*) FROM jadwal');
    if (parseInt(resJadwal.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO jadwal (poli, hari, jam_buka, jam_tutup, dokter) VALUES
        ('Umum', 'Senin-Jumat', '08:00', '12:00', 'dr. Andi Santoso'),
        ('Gigi', 'Senin, Rabu, Jumat', '09:00', '11:00', 'drg. Siti Rahayu'),
        ('KIA', 'Selasa, Kamis', '08:00', '11:00', 'dr. Budi Prakoso'),
        ('Lansia', 'Senin, Kamis', '10:00', '12:00', 'dr. Dewi Lestari')
      `);
    }
    console.log('✅ Database PostgreSQL Siap');
  } catch (err) {
    console.error('❌ Error Init DB:', err);
  }
}

initDB();

// --- ROUTES ---

// 1. Halaman Beranda
app.get('/', async (req, res) => {
  try {
    const { rows: jadwal } = await db.query('SELECT * FROM jadwal');
    res.render('index', { jadwal });
  } catch (err) {
    res.status(500).send('Error memuat beranda');
  }
});

// 2. Halaman Form Booking
app.get('/booking', async (req, res) => {
  try {
    const { rows: jadwal } = await db.query('SELECT DISTINCT poli FROM jadwal');
    res.render('booking', { jadwal, success: null, error: null });
  } catch (err) {
    res.status(500).send('Error memuat halaman booking');
  }
});

// 3. Proses Simpan Booking (Menerima input teks dan file foto_ktp)
app.post('/booking', upload.single('foto_ktp'), async (req, res) => {
  const { nama, nik, tanggal, poli, keluhan } = req.body;
  
  // Ambil lokasi file yang baru saja diupload
  const fotoUrl = req.file ? req.file.path : null; 

  try {
    await db.query(
      'INSERT INTO bookings (nama, nik, tanggal, poli, keluhan, foto_ktp) VALUES ($1, $2, $3, $4, $5, $6)',
      [nama, nik, tanggal, poli, keluhan, fotoUrl]
    );
    
    const { rows: jadwal } = await db.query('SELECT DISTINCT poli FROM jadwal');
    res.render('booking', { jadwal, success: 'Pendaftaran berhasil dikirim!', error: null });
  } catch (err) {
    console.error('❌ Error Simpan Booking:', err);
    const { rows: jadwal } = await db.query('SELECT DISTINCT poli FROM jadwal');
    res.render('booking', { jadwal, success: null, error: 'Terjadi kesalahan pada database' });
  }
});

// 4. Halaman Daftar Jadwal
app.get('/jadwal', async (req, res) => {
  try {
    const { rows: jadwal } = await db.query('SELECT * FROM jadwal');
    res.render('jadwal', { jadwal });
  } catch (err) {
    res.status(500).send('Error memuat jadwal');
  }
});

// 5. Halaman Dashboard Admin
app.get('/admin', async (req, res) => {
  try {
    const { rows: bookings } = await db.query('SELECT * FROM bookings ORDER BY created_at DESC');
    res.render('admin', { bookings });
  } catch (err) {
    res.status(500).send('Error memuat dashboard admin');
  }
});

// 6. Update Status (Setujui/Tolak) oleh Admin
app.post('/admin/update-status', async (req, res) => {
  const { id, status } = req.body;
  try {
    await db.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, id]);
    res.redirect('/admin');
  } catch (err) {
    res.status(500).send('Gagal update status');
  }
});

// Jalankan Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server MedQueue berjalan di port ${PORT}`);
});