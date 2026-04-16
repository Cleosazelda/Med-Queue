const express = require('express');
const db = require('./db');
const path = require('path');
require('dotenv').config();

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Fungsi Inisialisasi Database (PostgreSQL version)
async function initDB() {
  try {
    // Buat tabel bookings
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

    // Buat tabel jadwal
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

    // Isi data awal jika kosong
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

// Halaman Utama
app.get('/', async (req, res) => {
  const { rows: jadwal } = await db.query('SELECT * FROM jadwal');
  res.render('index', { jadwal });
});

// Halaman Booking
app.get('/booking', async (req, res) => {
  const { rows: jadwal } = await db.query('SELECT DISTINCT poli FROM jadwal');
  res.render('booking', { jadwal, success: null, error: null });
});

// Proses Booking (PostgreSQL pakai $1, $2, dst)
app.post('/booking', async (req, res) => {
  const { nama, nik, tanggal, poli, keluhan } = req.body;
  const fotoUrl = req.file ? req.file.location : null; // Asumsi pakai S3/Multer

  try {
    await db.query(
      'INSERT INTO bookings (nama, nik, tanggal, poli, keluhan, foto_ktp) VALUES ($1, $2, $3, $4, $5, $6)',
      [nama, nik, tanggal, poli, keluhan, fotoUrl]
    );
    const { rows: jadwal } = await db.query('SELECT DISTINCT poli FROM jadwal');
    res.render('booking', { jadwal, success: 'Booking berhasil!', error: null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan');
  }
});

// Halaman Jadwal
app.get('/jadwal', async (req, res) => {
  const { rows: jadwal } = await db.query('SELECT * FROM jadwal');
  res.render('jadwal', { jadwal });
});

// Halaman Admin
app.get('/admin', async (req, res) => {
  const { rows: bookings } = await db.query('SELECT * FROM bookings ORDER BY created_at DESC');
  res.render('admin', { bookings });
});

// Update Status Booking
app.post('/admin/update-status', async (req, res) => {
  const { id, status } = req.body;
  await db.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, id]);
  res.redirect('/admin');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server jalan di http://localhost:${PORT}`));