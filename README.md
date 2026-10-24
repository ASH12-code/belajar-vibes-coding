# Project Backend Bun + ElysiaJS + Drizzle ORM + MySQL

Proyek backend performa tinggi yang dibangun menggunakan runtime [Bun](https://bun.sh/), framework [ElysiaJS](https://elysiajs.com/), ORM [Drizzle](https://orm.drizzle.team/), dan driver database MySQL.

---

## 📁 Struktur Direktori
```text
├── drizzle/             # SQL Migrations dari Drizzle Kit
├── src/
│   ├── config/          # Environment configuration
│   ├── db/
│   │   ├── index.ts     # MySQL connection pool & Drizzle ORM client
│   │   └── schema/      # Skema tabel (e.g. users.ts)
│   ├── modules/
│   │   └── users/       # Routes & handlers CRUD users
│   └── index.ts         # Entry point server Elysia
├── .env.example         # Template konfigurasi environment
├── drizzle.config.ts    # Konfigurasi Drizzle Kit
├── package.json
└── tsconfig.json
```

---

## 🚀 Persiapan & Instalasi

1. **Instalasi Dependensi**:
   ```bash
   bun install
   ```

2. **Setup Konfigurasi Environment**:
   Salin `.env.example` menjadi `.env` lalu sesuaikan kredensial MySQL Anda:
   ```bash
   cp .env.example .env
   ```

3. **Migrasi Database**:
   - Generate file migrasi baru dari skema TypeScript:
     ```bash
     bun run db:generate
     ```
   - Jalankan migrasi ke instance MySQL Anda:
     ```bash
     bun run db:migrate
     ```

4. **Menjalankan Server**:
   - Mode Development (dengan hot-reload):
     ```bash
     bun run dev
     ```
   - Mode Production:
     ```bash
     bun run start
     ```

---

## 📡 Endpoint Utama
- `GET /` : Endpoint selamat datang / root check.
- `GET /health` : Healthcheck server beserta status koneksi ke MySQL.
- `POST /api/users` : Registrasi pengguna baru.
  - **Body**: `{ "name": "Eko", "email": "eko@localhost", "password": "rahasia" }`
  - **Response Sukses (201)**: `{ "data": "OK" }`
  - **Response Error (400)**: `{ "error": "Email sudah terdaftar" }`
