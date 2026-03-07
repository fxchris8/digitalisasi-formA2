<div align="center">

# Crew Medical System

</div>

Aplikasi ini mengelola alur pengajuan dan persetujuan dokumen kesehatan awak kapal, mulai dari pembuatan Form CR9 dan Form A2, hingga proses approval bertahap oleh SPM, Nautica, dan Finance.

## Struktur Repositori

Monorepo dengan tiga komponen utama:

| Komponen | Teknologi | Keterangan |
|----------|-----------|------------|
| **Database** | PostgreSQL | Tidak dikelola di repo ini — gunakan instance production atau lokal yang sudah ada |
| **Backend** | Node.js, Express, TypeScript | REST API, autentikasi JWT, validasi Zod, upload file |
| **Frontend** | React, TypeScript, Vite, TailwindCSS | SPA dengan role-based UI (Admin, Manager, Staff, User) |

> Package manager yang digunakan: **pnpm**

---

## Menjalankan Aplikasi

### Prasyarat

- Node.js >= 20
- pnpm >= 9 — install dengan `npm install -g pnpm`
- PostgreSQL (lokal atau remote)

---

### Lokal (Development)

**1. Install dependencies**

```bash
pnpm install
```

**2. Konfigurasi environment**

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — isi DATABASE_URL, JWT_SECRET, dll

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env — isi VITE_API_URL (default: http://localhost:3000)
```

**3. Siapkan database**

Jalankan dari folder `backend/`:

```bash
cd backend

# Buat tabel (schema)
pnpm db:schema
pnpm db:schema-fresh (reset db dari awal)

# Isi data awal (seed)
pnpm db:seed
```

**4. Jalankan backend dan frontend** (masing-masing di terminal berbeda)

```bash
# Terminal 1 — Backend (http://localhost:3000)
cd backend
pnpm dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend
pnpm dev
```

---

### Production (Docker)

**Prasyarat:** Docker dan Docker Compose terinstal di server. Traefik sudah berjalan di VPS.

**1. Clone repositori di VPS**

```bash
git clone <repo-url>
cd CrewMedicalSystem
```

**2. Buat dan isi file environment**

```bash
cp .env.docker .env
nano .env
```

Variabel yang wajib diisi:

| Variabel | Keterangan |
|----------|-----------|
| `FRONTEND_DOMAIN` | Domain frontend, misal `app.yourdomain.com` |
| `BACKEND_DOMAIN` | Domain backend (bisa sama atau subdomain berbeda) |
| `DATABASE_URL` | Connection string database production |
| `CORS_ORIGIN` | URL frontend yang diakses browser |
| `JWT_SECRET` | String acak minimal 32 karakter |
| `TRAEFIK_NETWORK` | Nama network Traefik di VPS (cek: `docker network ls`) |
| `VITE_API_URL` | Kosongkan jika FE dan BE satu domain; isi URL BE jika beda domain |

**3. Build dan jalankan**

```bash
docker compose up -d --build
```

> Untuk update ke versi terbaru: `git pull` lalu `docker compose up -d --build`.

> **Database production** dikelola terpisah dari Docker. Schema dan seed dijalankan dari mesin lokal langsung ke DB production — arahkan `DATABASE_URL` di `backend/.env` ke DB production, lalu jalankan `pnpm db:schema` dan `pnpm db:seed` dari folder `backend/`.
