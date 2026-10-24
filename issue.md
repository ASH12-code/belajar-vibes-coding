# Issue: Implementasi Endpoint Login Pengguna & Manajemen Session (`POST /api/users/login`)

## 1. Ringkasan & Tujuan
Membuat fitur otentikasi login pengguna (*User Login*) yang memvalidasi kredensial (email & password) dan menerbitkan token sesi (*session token*) berbasis UUID. Sesi yang aktif akan disimpan ke dalam tabel baru `sessions` di database MySQL.

Dokumen ini disusun sebagai panduan langkah-demi-langkah (*step-by-step implementation guide*) tingkat tinggi yang mudah dipahami oleh pengembang junior maupun model AI pelaksana.

---

## 2. Spesifikasi Teknis

### A. Skema Tabel Database Baru (`sessions`)
Buat tabel baru dengan nama `sessions` pada database MySQL dengan spesifikasi sebagai berikut:

| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `BIGINT / SERIAL` | Primary Key, Auto Increment |
| `token` | `VARCHAR(255)` | Not Null, Unique (Menyimpan string UUID token sesi) |
| `user_id` | `BIGINT UNSIGNED` | Not Null, Foreign Key mengarah ke `users.id` |
| `created_at` | `TIMESTAMP` | Default: Current Timestamp |

### B. Spesifikasi API Endpoint
- **URL**: `POST /api/users/login`
- **Content-Type**: `application/json`

#### 1. Request Body
```json
{
  "email": "eko@locahost",
  "password": "rahasia"
}
```

#### 2. Response Body (Sukses - HTTP 200)
Jika kredensial valid, terbitkan token UUID baru dan simpan ke tabel `sessions`:
```json
{
  "data": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```
*(Catatan: Nilai field `data` adalah string token UUID yang dibuat).*

#### 3. Response Body (Error - HTTP 400 / 401)
Jika email tidak ditemukan ATAU password salah:
```json
{
  "error": "Email atau password salah"
}
```
*(Penting: Untuk alasan keamanan, pesan error disamakan agar tidak membocorkan apakah email terdaftar atau tidak).*

---

## 3. Langkah-Langkah Implementasi (Step-by-Step)

### Langkah 1: Buat Skema Database `sessions` (Drizzle ORM)
1. Buat file skema baru [src/db/schema/sessions.ts](file:///d:/coding/vibeCoding/src/db/schema/sessions.ts):
   - Definisikan tabel `sessions` menggunakan `mysqlTable`.
   - Kolom `id`: `serial("id").primaryKey()`.
   - Kolom `token`: `varchar("token", { length: 255 }).notNull().unique()`.
   - Kolom `userId`: `bigint("user_id", { mode: "number", unsigned: true }).notNull().references(() => users.id, { onDelete: "cascade" })`.
   - Kolom `createdAt`: `timestamp("created_at").defaultNow().notNull()`.
2. Ekspor skema baru tersebut di [src/db/schema/index.ts](file:///d:/coding/vibeCoding/src/db/schema/index.ts):
   ```typescript
   export * from "./users";
   export * from "./sessions";
   ```
3. Generate migrasi database:
   ```bash
   bun run db:generate
   ```
4. Aplikasikan skema ke database:
   ```bash
   bun run db:push
   ```
   *(atau jalankan `bun run db:migrate`).*

---

### Langkah 2: Verifikasi Password & Generate UUID di Bun
Manfaatkan utilitas native bawaan Bun tanpa perlu dependensi tambahan:
- **Verifikasi Bcrypt**:
  ```typescript
  const isPasswordMatch = await Bun.password.verify(body.password, user.password);
  ```
- **Pembuatan Token UUID**:
  ```typescript
  const token = crypto.randomUUID();
  ```

---

### Langkah 3: Implementasi Route `POST /api/users/login`
1. Buka file router pengguna [src/modules/users/routes.ts](file:///d:/coding/vibeCoding/src/modules/users/routes.ts).
2. Tambahkan handler route `.post("/login", async ({ body, set }) => { ... })`:
   - **Validasi Schema Input**:
     Gunakan Elysia `t.Object` untuk memvalidasi `email` (string) dan `password` (string).
   - **Cari Pengguna di Database**:
     Query user berdasarkan email:
     ```typescript
     const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
     ```
   - **Pengecekan Pengguna & Password**:
     - Jika `user` tidak ditemukan:
       - Set status `400` (atau `401`).
       - Return `{ "error": "Email atau password salah" }`.
     - Jika `user` ditemukan, verifikasi password dengan `Bun.password.verify(body.password, user.password)`:
       - Jika tidak cocok, set status `400` (atau `401`) dan return `{ "error": "Email atau password salah" }`.
   - **Generate Token & Simpan Sesi**:
     - Buat token baru: `const token = crypto.randomUUID();`
     - Simpan ke tabel `sessions`:
       ```typescript
       await db.insert(sessions).values({
         token,
         userId: user.id,
       });
       ```
   - **Response Sukses**:
     - Set status `200`.
     - Return `{ "data": token }`.

---

### Langkah 4: Pengujian & Validasi

1. **Pemeriksaan Tipe TypeScript**:
   Pastikan tidak ada error kompilasi:
   ```bash
   bun run typecheck
   ```

2. **Jalankan Server Development**:
   ```bash
   bun run dev
   ```

3. **Uji Skenario Gagal (Email Tidak Terdaftar / Password Salah)**:
   - Kirim `POST http://localhost:3000/api/users/login` dengan password yang keliru:
     ```json
     {
       "email": "eko@locahost",
       "password": "passwordsalah"
     }
     ```
   - Pastikan response mengembalikan HTTP status 400 dan body:
     ```json
     {
       "error": "Email atau password salah"
     }
     ```

4. **Uji Skenario Sukses (Kredensial Benar)**:
   - Kirim `POST http://localhost:3000/api/users/login` dengan password yang benar:
     ```json
     {
       "email": "eko@locahost",
       "password": "rahasia"
     }
     ```
   - Pastikan response mengembalikan HTTP 200 dan body:
     ```json
     {
       "data": "<token-uuid>"
     }
     ```
   - Pastikan record sesi dengan token tersebut berhasil masuk ke tabel `sessions` pada database MySQL.

---

## 4. Kriteria Selesai (Definition of Done)
- [ ] Tabel `sessions` berhasil didefinisikan di Drizzle ORM dengan relasi FK ke tabel `users`.
- [ ] File migrasi database berhasil digenerate dan diaplikasikan ke database MySQL.
- [ ] Endpoint `POST /api/users/login` menerima request body `email` dan `password`.
- [ ] Percobaan login dengan password salah mengembalikan `{ "error": "Email atau password salah" }` (HTTP 400).
- [ ] Percobaan login dengan email tidak terdaftar mengembalikan `{ "error": "Email atau password salah" }` (HTTP 400).
- [ ] Percobaan login dengan kredensial benar mengembalikan `{ "data": "<token>" }` (HTTP 200).
- [ ] Record sesi baru tersimpan di tabel `sessions` dengan token UUID yang sesuai.
- [ ] `bun run typecheck` berjalan tanpa error tipe.
