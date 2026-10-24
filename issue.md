# Issue: Implementasi Endpoint Registrasi Pengguna Baru (`POST /api/users`)

## 1. Ringkasan & Tujuan
Membuat fitur registrasi pengguna baru (*User Registration*) yang mencakup pembaruan skema tabel database `users`, mekanisme enkripsi password (*bcrypt*), validasi input, serta penanganan error jika email telah terdaftar.

Dokumen ini disusun sebagai panduan langkah-demi-langkah (*step-by-step implementation guide*) untuk pengembang junior atau model AI pelaksana.

---

## 2. Spesifikasi Teknis

### A. Skema Database (`users`)
Perbarui tabel `users` pada database MySQL dengan spesifikasi field sebagai berikut:

| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `INTEGER` / `SERIAL` | Primary Key, Auto Increment |
| `name` | `VARCHAR(255)` | Not Null |
| `email` | `VARCHAR(255)` | Not Null, Unique |
| `password` | `VARCHAR(255)` | Not Null (Hash string hasil enkripsi bcrypt) |
| `created_at` | `TIMESTAMP` | Default: Current Timestamp |

### B. Spesifikasi API Endpoint
- **URL**: `POST /api/users`
- **Content-Type**: `application/json`

#### 1. Request Body
```json
{
  "name": "Eko",
  "email": "eko@locahost",
  "password": "rahasia"
}
```

#### 2. Response Body (Sukses - HTTP 201 / 200)
Jika registrasi berhasil:
```json
{
  "data": "OK"
}
```

#### 3. Response Body (Error Duplikasi Email - HTTP 400)
Jika email yang dikirim sudah pernah terdaftar di database:
```json
{
  "error": "Email sudah terdaftar"
}
```

---

## 3. Langkah-Langkah Implementasi (Step-by-Step)

### Langkah 1: Perbarui Skema Database (Drizzle ORM)
1. Buka file [src/db/schema/users.ts](file:///d:/coding/vibeCoding/src/db/schema/users.ts).
2. Tambahkan kolom `password` ke definisi tabel `users`:
   - Gunakan tipe `varchar("password", { length: 255 }).notNull()`.
3. Jalankan perintah untuk menghasilkan file migrasi baru:
   ```bash
   bun run db:generate
   ```
4. Jalankan migrasi ke database (atau sinkronisasi skema):
   ```bash
   bun run db:migrate
   ```
   *(atau `bun run db:push` jika bekerja pada local development).*

---

### Langkah 2: Mekanisme Hashing Password (Bcrypt)
Gunakan utilitas hashing bcrypt. Pada runtime **Bun**, telah tersedia API hashing native bawaan tanpa perlu menginstal paket eksternal tambahan:
```typescript
const hashedPassword = await Bun.password.hash(password, {
  algorithm: "bcrypt",
  cost: 10,
});
```
*(Catatan: Jika diperlukan paket independen, library `bcryptjs` juga dapat digunakan).*

---

### Langkah 3: Implementasi Route & Controller
1. Buka atau sesuaikan router pengguna di [src/modules/users/routes.ts](file:///d:/coding/vibeCoding/src/modules/users/routes.ts) dan pastikan prefix route mengarah ke `/api/users` (bisa diatur langsung pada router atau saat registrasi plugin di [src/index.ts](file:///d:/coding/vibeCoding/src/index.ts)).
2. Buat endpoint handler untuk method `POST`:
   - **Validasi Schema Input**: Gunakan Elysia TypeBox (`t.Object`) untuk memastikan `name`, `email`, dan `password` bertipe string dan tidak kosong.
   - **Pengecekan Email Unik**:
     - Lakukan query ke database untuk mencari user dengan email yang sama:
       ```typescript
       const existingUser = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
       ```
     - Jika data ditemukan (`existingUser.length > 0`):
       - Atur HTTP response status menjadi `400`.
       - Kembalikan response: `{ "error": "Email sudah terdaftar" }`.
   - **Proses Hashing**:
     - Enkripsi `body.password` menggunakan bcrypt.
   - **Penyimpanan ke Database**:
     - Simpan data pengguna baru (`name`, `email`, `password` yang sudah di-hash) ke tabel `users`.
   - **Response Sukses**:
     - Atur HTTP response status menjadi `201` (atau `200`).
     - Kembalikan response: `{ "data": "OK" }`.

---

### Langkah 4: Validasi & Pengujian

1. **Pemeriksaan Tipe TypeScript**:
   Jalankan pemeriksaan tipe untuk memastikan tidak ada kesalahan kompilasi:
   ```bash
   bun run typecheck
   ```
2. **Jalankan Server Development**:
   ```bash
   bun run dev
   ```
3. **Uji Skenario Berhasil**:
   - Kirim HTTP POST ke `http://localhost:3000/api/users` dengan body JSON baru:
     ```json
     {
       "name": "Eko",
       "email": "eko@localhost",
       "password": "rahasia"
     }
     ```
   - Pastikan response mengembalikan HTTP 201/200 dan body:
     ```json
     {
       "data": "OK"
     }
     ```
   - Pastikan di database field `password` tersimpan dalam format hash bcrypt (diawali `$2b$` atau `$2a$`), bukan plaintext.
4. **Uji Skenario Email Terdaftar**:
   - Kirim kembali request dengan email yang sama (`eko@localhost`).
   - Pastikan response mengembalikan HTTP 400 dan body:
     ```json
     {
       "error": "Email sudah terdaftar"
     }
     ```

---

## 4. Kriteria Selesai (Definition of Done)
- [ ] Skema `users` pada Drizzle memiliki kolom `password` (varchar 255 not null).
- [ ] File migrasi berhasil dibuat dan diaplikasikan ke database.
- [ ] Endpoint `POST /api/users` menerima request body `name`, `email`, dan `password`.
- [ ] Password tersimpan di database dalam bentuk hash bcrypt.
- [ ] Response sukses mengembalikan `{ "data": "OK" }`.
- [ ] Response saat email duplikat mengembalikan status HTTP 400 dengan `{ "error": "Email sudah terdaftar" }`.
- [ ] `bun run typecheck` berjalan sukses tanpa error tipe TypeScript.
