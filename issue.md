# Issue: Implementasi Automated Unit & Integration Test untuk Seluruh API

## 1. Ringkasan & Tujuan
Menyusun rangkaian automated test yang komprehensif untuk seluruh endpoint API yang tersedia di dalam aplikasi. Pengujian dilakukan menggunakan runner bawaan **Bun** (`bun test`) dan disimpan di dalam folder khusus `tests/`.

Tujuan utama adalah memastikan seluruh fungsionalitas, validasi input, autentikasi sesi, serta penanganan error berjalan sesuai spesifikasi dan terbebas dari regresi (*regression-free*).

Dokumen ini disusun sebagai panduan perencanaan tingkat tinggi (*high-level test specification*) yang memetakan seluruh skenario pengujian tanpa instruksi kode yang terlalu mendetail, sehingga dapat diimplementasikan oleh junior programmer atau model AI pelaksana.

---

## 2. Ketentuan Umum & Strategi Testing

1. **Lokasi File Test**:
   - Seluruh file pengujian harus ditempatkan di dalam folder `tests/` (misal: `tests/users.test.ts` atau `tests/api.test.ts`).
2. **Framework & Runner**:
   - Menggunakan `bun test` bawaan runtime Bun (`describe`, `test`, `expect`, `beforeEach`, `afterAll`).
3. **Isolasi & Pembersihan Data (Database Cleanup)**:
   - Setiap pengujian harus bersifat independen dan konsisten (*idempotent*).
   - Wajib melakukan pembersihan data (hapus data pada tabel `sessions` dan `users`) sebelum setiap skenario dijalankan (misal menggunakan hook `beforeEach`), agar tidak ada data sisa yang mengganggu pengujian berikutnya.
   - Pastikan koneksi database ditutup dengan benar di akhir pengujian (`afterAll`) jika diperlukan.
4. **Eksekusi Request**:
   - Manfaatkan kemampuan pengujian native Elysia menggunakan `app.handle(new Request(...))` untuk menguji endpoint secara cepat dan presisi.

---

## 3. Cakupan Skenario Pengujian per Endpoint

Berikut adalah daftar skenario yang wajib diuji untuk setiap API:

### A. Root & Utility Endpoints
1. **Endpoint `GET /`**:
   - **Skenario 1.1**: Respon sukses mengembalikan status HTTP `200` dan pesan sambutan (*welcome message*).
2. **Endpoint `GET /health`**:
   - **Skenario 1.2**: Respon sukses mengembalikan status HTTP `200`, status database `connected`, dan uptime aplikasi.

---

### B. Registrasi Pengguna (`POST /api/users`)
1. **Skenario Sukses**:
   - **Skenario 2.1**: Registrasi dengan data valid (nama, email, password) mengembalikan status HTTP `201` dan body `{ "data": "OK" }`.
   - **Skenario 2.2**: Memastikan data user tersimpan di database dan password tersimpan dalam format hash bcrypt (bukan teks polos).
2. **Skenario Gagal & Validasi Input**:
   - **Skenario 2.3 (Email Duplikat)**: Registrasi dengan email yang sudah ada di database mengembalikan status HTTP `400` dan body `{ "error": "Email sudah terdaftar" }`.
   - **Skenario 2.4 (Format Email Tidak Valid)**: Request dengan email yang tidak sesuai format mengembalikan status HTTP `422`.
   - **Skenario 2.5 (Nama Melebihi Batas)**: Request dengan nama lebih dari 255 karakter mengembalikan status HTTP `422`.
   - **Skenario 2.6 (Field Tidak Lengkap/Kosong)**: Request tanpa field wajib (misal tanpa password atau tanpa nama) mengembalikan status HTTP `422`.

---

### C. Login Pengguna (`POST /api/users/login`)
1. **Skenario Sukses**:
   - **Skenario 3.1**: Login dengan kredensial benar mengembalikan status HTTP `200` dan token sesi UUID pada field `data`.
   - **Skenario 3.2**: Memastikan token sesi yang diterbitkan benar-benar tersimpan di tabel `sessions` dan terhubung dengan user yang bersangkutan.
2. **Skenario Gagal & Validasi**:
   - **Skenario 3.3 (Email Tidak Terdaftar)**: Login dengan email yang belum ada di database mengembalikan status HTTP `400` dan body `{ "error": "Email atau password salah" }`.
   - **Skenario 3.4 (Password Salah)**: Login dengan email benar namun password salah mengembalikan status HTTP `400` dan body `{ "error": "Email atau password salah" }`.
   - **Skenario 3.5 (Request Body Tidak Valid)**: Request tanpa email atau tanpa password mengembalikan status HTTP `422`.

---

### D. Get Current User (`GET /api/users/current`)
1. **Skenario Sukses**:
   - **Skenario 4.1**: Request dengan header `Authorization: Bearer <valid-token>` mengembalikan status HTTP `200` beserta profil pengguna (`id`, `name`, `email`, `created_at`).
   - **Skenario 4.2 (Security Check)**: Memastikan field `password` sama sekali tidak disertakan/terekspos di dalam respon data profil.
2. **Skenario Gagal & Otorisasi**:
   - **Skenario 4.3 (Tanpa Header)**: Request tanpa header `Authorization` mengembalikan status HTTP `401` dan body `{ "error": "Unauthorized" }`.
   - **Skenario 4.4 (Format Header Salah)**: Header tidak diawali dengan skema `Bearer ` (misal `Basic ...` atau string acak) mengembalikan status HTTP `401` dan body `{ "error": "Unauthorized" }`.
   - **Skenario 4.5 (Token Tidak Terdaftar / Palsu)**: Mengirim token acak yang tidak tercatat di tabel `sessions` mengembalikan status HTTP `401` dan body `{ "error": "Unauthorized" }`.

---

### E. Logout Pengguna (`DELETE /api/users/logout`)
1. **Skenario Sukses**:
   - **Skenario 5.1**: Request dengan header `Authorization: Bearer <valid-token>` mengembalikan status HTTP `200` dan body `{ "data": "OK" }`.
   - **Skenario 5.2 (Pembersihan Sesi)**: Memastikan record token tersebut telah terhapus dari tabel `sessions` di database.
   - **Skenario 5.3 (Invalidasi Token)**: Token yang sudah di-logout tidak dapat digunakan kembali untuk mengakses `GET /api/users/current` maupun logout ulang (keduanya harus mengembalikan status HTTP `401`).
2. **Skenario Gagal & Otorisasi**:
   - **Skenario 5.4 (Tanpa Header)**: Request tanpa header `Authorization` mengembalikan status HTTP `401` dan body `{ "error": "Unauthorized" }`.
   - **Skenario 5.5 (Token Tidak Terdaftar)**: Request dengan token palsu atau token yang sudah dihapus mengembalikan status HTTP `401` dan body `{ "error": "Unauthorized" }`.

---

## 4. Kriteria Selesai (Definition of Done)
- [ ] Folder `tests/` telah dibuat dan berisi berkas pengujian API.
- [ ] Database cleanup logic (`beforeEach`) diterapkan agar data selalu bersih sebelum setiap pengujian.
- [ ] Seluruh skenario pengujian pada bagian 3 (A, B, C, D, E) telah terimplementasi.
- [ ] Perintah `bun test` dapat dijalankan berulang kali dengan hasil 100% lulus (*all tests passing*).
- [ ] Tidak ada dependensi urutan (*test order dependency*) antar skenario pengujian.
- [ ] `bun run typecheck` berjalan tanpa error tipe TypeScript.
