# Issue: Implementasi Endpoint Logout Pengguna (`DELETE /api/users/logout`)

## 1. Ringkasan & Tujuan
Membuat fitur penghentian sesi pengguna (*User Logout*). Endpoint ini memvalidasi token sesi (*session token*) yang dikirim melalui HTTP Header `Authorization: Bearer <token>`, memverifikasi keberadaan token pada tabel `sessions`, lalu menghapus data sesi tersebut dari database MySQL agar token tidak dapat digunakan kembali.

Dokumen ini disusun sebagai panduan langkah-demi-langkah (*step-by-step implementation guide*) tingkat tinggi yang mudah dipahami oleh pengembang junior maupun model AI pelaksana.

---

## 2. Spesifikasi Teknis

### A. Spesifikasi API Endpoint
- **URL**: `DELETE /api/users/logout`
- **Method**: `DELETE`
- **Headers**:
  - `Authorization`: `Bearer <token>` *(Wajib)*

### B. Spesifikasi Response

#### 1. Response Body (Sukses - HTTP 200)
Jika token valid dan data sesi berhasil dihapus dari database:
```json
{
  "data": "OK"
}
```

#### 2. Response Body (Error - HTTP 401 Unauthorized)
Jika:
- Header `Authorization` tidak dikirim atau tidak diawali format `Bearer `.
- Token kosong atau tidak ditemukan di dalam tabel `sessions` (misal: token palsu atau sudah pernah logout sebelumnya).

Kembalikan format response:
```json
{
  "error": "Unauthorized"
}
```

---

## 3. Langkah-Langkah Implementasi (Step-by-Step)

### Langkah 1: Ekstraksi & Validasi Header Authorization
1. Tangkap header `authorization` dari request context Elysia.
2. Periksa apakah header tersedia dan berawalan string `"Bearer "`.
3. Jika header tidak tersedia atau format tidak valid:
   - Atur HTTP status menjadi `401`.
   - Kembalikan response: `{ "error": "Unauthorized" }`.
4. Ekstrak string token murni dengan memotong awalan `"Bearer "`:
   ```typescript
   const token = authorization.slice(7).trim();
   ```

---

### Langkah 2: Verifikasi & Hapus Sesi di Database (Drizzle ORM)
1. Buka file [src/modules/users/routes.ts](file:///d:/coding/vibeCoding/src/modules/users/routes.ts).
2. Tambahkan handler route `.delete("/logout", async ({ headers, set }) => { ... })`.
3. Eksekusi query penghapusan data sesi dari tabel `sessions`:
   ```typescript
   const [deleteResult] = await db
     .delete(sessions)
     .where(eq(sessions.token, token));

   if (deleteResult.affectedRows === 0) {
     set.status = 401;
     return {
       error: "Unauthorized",
     };
   }
   ```
4. Kembalikan response sukses:
   - Atur HTTP status menjadi `200`.
   - Kembalikan: `{ "data": "OK" }`.

---

### Langkah 3: Pengujian & Validasi

1. **Pemeriksaan Tipe TypeScript**:
   Pastikan tidak ada error kompilasi:
   ```bash
   bun run typecheck
   ```

2. **Unit / Contract Testing**:
   Tambahkan test case di [src/modules/users/routes.test.ts](file:///d:/coding/vibeCoding/src/modules/users/routes.test.ts) untuk memverifikasi penolakan request tanpa header atau format salah:
   ```bash
   bun test
   ```

3. **Uji Coba Manual / End-to-End**:
   - **Skenario 1 (Tanpa Header Authorization)**:
     ```bash
     curl -i -X DELETE http://localhost:3000/api/users/logout
     ```
     *Ekspektasi: HTTP 401 `{ "error": "Unauthorized" }`*

   - **Skenario 2 (Token Palsu / Tidak Terdaftar)**:
     ```bash
     curl -i -X DELETE http://localhost:3000/api/users/logout -H "Authorization: Bearer token-asal"
     ```
     *Ekspektasi: HTTP 401 `{ "error": "Unauthorized" }`*

   - **Skenario 3 (Logout Sukses & Invalidation Check)**:
     1. Login user via `POST /api/users/login` dan salin token sesi UUID.
     2. Panggil logout:
        ```bash
        curl -i -X DELETE http://localhost:3000/api/users/logout -H "Authorization: Bearer <token-uuid>"
        ```
        *Ekspektasi: HTTP 200 `{ "data": "OK" }`*
     3. Verifikasi pada database MySQL bahwa token tersebut telah hilang dari tabel `sessions`.
     4. Coba panggil kembali `GET /api/users/current` atau `DELETE /api/users/logout` menggunakan token yang sama.
        *Ekspektasi: Menghasilkan HTTP 401 `{ "error": "Unauthorized" }` (karena token sudah tidak berlaku).*

---

## 4. Kriteria Selesai (Definition of Done)
- [ ] Endpoint `DELETE /api/users/logout` diimplementasikan pada `src/modules/users/routes.ts`.
- [ ] Header `Authorization: Bearer <token>` divalidasi dengan benar.
- [ ] Request tanpa header atau dengan token tidak terdaftar mengembalikan status HTTP 401 `{ "error": "Unauthorized" }`.
- [ ] Request dengan token valid menghapus record terkait dari tabel `sessions` dan mengembalikan status HTTP 200 `{ "data": "OK" }`.
- [ ] Token yang telah di-logout tidak dapat digunakan lagi untuk mengakses `GET /api/users/current`.
- [ ] `bun run typecheck` dan `bun test` berjalan tanpa error.
