# Issue: Implementasi Endpoint Get Current User (`GET /api/users/current`)

## 1. Ringkasan & Tujuan
Membuat fitur untuk mengambil data profil pengguna yang sedang login (*Get Current Authenticated User*). Endpoint ini memvalidasi token sesi (*session token*) yang dikirim melalui HTTP Header `Authorization: Bearer <token>`, memverifikasi token ke tabel `sessions`, dan mengembalikan data profil pengguna terkait tanpa mengekspos kata sandi (*password*).

Dokumen ini disusun sebagai panduan langkah-demi-langkah (*step-by-step implementation guide*) tingkat tinggi yang mudah dipahami oleh pengembang junior maupun model AI pelaksana.

---

## 2. Spesifikasi Teknis

### A. Spesifikasi API Endpoint
- **URL**: `GET /api/users/current`
- **Method**: `GET`
- **Headers**:
  - `Authorization`: `Bearer <token>` *(Wajib)*

### B. Spesifikasi Response

#### 1. Response Body (Sukses - HTTP 200)
Jika token valid dan sesi ditemukan di database:
```json
{
  "data": {
    "id": 1,
    "name": "eko",
    "email": "eko@localhost",
    "created_at": "2026-10-24T03:35:22.000Z"
  }
}
```
*(Penting: Field `password` **TIDAK BOLEH** disertakan di dalam objek `data` demi alasan keamanan).*

#### 2. Response Body (Error - HTTP 401 Unauthorized)
Jika:
- Header `Authorization` tidak dikirim atau tidak diawali `Bearer `.
- Token tidak ditemukan di tabel `sessions`.
- Pengguna yang terhubung dengan sesi tersebut tidak ditemukan.

Kembalikan format response:
```json
{
  "error": "Unauthorized"
}
```

---

## 3. Langkah-Langkah Implementasi (Step-by-Step)

### Langkah 1: Memahami Alur Otentikasi Token
1. Token yang diterima dari header `Authorization: Bearer <token>` dicocokkan dengan kolom `token` pada tabel `sessions`.
2. Dari record session yang cocok, ambil `user_id` untuk mendapatkan data akun pengguna di tabel `users`.
3. Kolom yang diambil dari tabel `users` hanyalah: `id`, `name`, `email`, dan `createdAt`.

---

### Langkah 2: Implementasi Route Handler di ElysiaJS
1. Buka file router pengguna [src/modules/users/routes.ts](file:///d:/coding/vibeCoding/src/modules/users/routes.ts).
2. Tambahkan handler route `.get("/current", async ({ headers, set }) => { ... })`:
   
   - **Ekstraksi Token**:
     - Ambil nilai header `authorization` dari objek `headers`.
     - Periksa apakah header ada dan memiliki format `Bearer <token>`.
     - Jika tidak ada atau format salah:
       - Set status `401`.
       - Return `{ "error": "Unauthorized" }`.
     - Ambil string token: `const token = authorization.replace(/^Bearer\s+/i, "");`

   - **Pencarian Sesi & User di Database (Drizzle ORM)**:
     - Gunakan `innerJoin` antara tabel `sessions` dan `users` berdasarkan `eq(sessions.userId, users.id)` di mana `eq(sessions.token, token)`:
       ```typescript
       const [result] = await db
         .select({
           id: users.id,
           name: users.name,
           email: users.email,
           created_at: users.createdAt,
         })
         .from(sessions)
         .innerJoin(users, eq(sessions.userId, users.id))
         .where(eq(sessions.token, token))
         .limit(1);
       ```
     - Jika `result` tidak ditemukan:
       - Set status `401`.
       - Return `{ "error": "Unauthorized" }`.

   - **Response Sukses**:
     - Set status `200`.
     - Return `{ "data": result }`.

---

### Langkah 3: Pengujian & Validasi

1. **Pemeriksaan Tipe TypeScript**:
   Pastikan kode tidak memiliki error tipe:
   ```bash
   bun run typecheck
   ```

2. **Jalankan Unit Test**:
   Tambahkan skenario test di [src/modules/users/routes.test.ts](file:///d:/coding/vibeCoding/src/modules/users/routes.test.ts) dan jalankan:
   ```bash
   bun test
   ```

3. **Uji Coba Manual / End-to-End**:
   - **Skenario 1 (Tanpa Header Authorization)**:
     ```bash
     curl -i http://localhost:3000/api/users/current
     ```
     *Ekspektasi: HTTP 401 `{ "error": "Unauthorized" }`*

   - **Skenario 2 (Token Salah / Kadaluarsa)**:
     ```bash
     curl -i http://localhost:3000/api/users/current -H "Authorization: Bearer token-asal"
     ```
     *Ekspektasi: HTTP 401 `{ "error": "Unauthorized" }`*

   - **Skenario 3 (Token Valid dari Hasil Login)**:
     1. Lakukan login via `POST /api/users/login` dan salin nilai token UUID dari response `{ "data": "<token-uuid>" }`.
     2. Panggil endpoint current user:
        ```bash
        curl -i http://localhost:3000/api/users/current -H "Authorization: Bearer <token-uuid>"
        ```
     *Ekspektasi: HTTP 200 `{ "data": { "id": 1, "name": "eko", "email": "eko@localhost", ... } }` tanpa field password.*

---

## 4. Kriteria Selesai (Definition of Done)
- [ ] Endpoint `GET /api/users/current` telah diimplementasikan pada `src/modules/users/routes.ts`.
- [ ] Header `Authorization: Bearer <token>` diekstraksi dan divalidasi dengan benar.
- [ ] Query database menggunakan Drizzle mencocokkan token di tabel `sessions` dan merelasikannya ke tabel `users`.
- [ ] Jika token tidak valid / tidak disertakan, server mengembalikan status HTTP 401 dengan body `{ "error": "Unauthorized" }`.
- [ ] Jika token valid, server mengembalikan status HTTP 200 dengan data user (id, name, email, created_at).
- [ ] Password user tidak pernah diekspos dalam response data.
- [ ] `bun run typecheck` dan `bun test` berjalan sukses.
