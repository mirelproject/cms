# Card Tutorial — Frontend (PWA) + CMS (Node + SQLite)

## Jalankan CMS (database)
```bash
cd cms-api
cp .env.example .env   # opsional: ubah ADMIN_USER/ADMIN_PASS/PORT
npm install
npm run dev
# CMS di http://localhost:4000/admin  (default admin: admin / admin123)
```

## Hubungkan Frontend
Jalankan CMS dari folder `cms-api`, lalu bukalah `index.html` pada root proyek via server (disarankan Live Server / `python -m http.server`).

Frontend akan:
1. **Render data seed** (langsung tampil meski offline),
2. Mencoba `GET /api/tutorials?include=steps` untuk **menyegarkan** data dari database (jika CMS hidup).

> Jika kamu host bersama (reverse proxy), pastikan frontend dan `/api` satu origin. Atau aktifkan CORS di server.

## Admin CMS
- Tambah/Edit/Hapus **Tutorial** dan **Step**.
- Upload file ke `/uploads` via endpoint `/api/upload` (bisa dipakai untuk `hero_image`/`image`).

## API ringkas
- `GET /api/tutorials?include=steps`
- `GET /api/tutorials/:slug`
- `POST /api/tutorials` (admin)
- `PUT /api/tutorials/:id` (admin)
- `DELETE /api/tutorials/:id` (admin)
- `POST /api/steps` (admin)
- `PUT /api/steps/:id` (admin)
- `DELETE /api/steps/:id` (admin)
- `POST /api/upload` (admin, form field `file`)

## Catatan
- Database berada di `cms-api/cms.db` (SQLite).
- Untuk produksi: jalankan CMS di server, letakkan frontend di CDN/hosting, arahkan `/api/*` ke server CMS (Nginx proxy).
- PWA & offline tetap jalan (seed + SW cache). Konten baru dari CMS akan tampil saat online.


## Konten Blocks (Text & Code)
Di halaman Edit Tutorial (CMS), kini ada bagian **Blocks per Step**:
- Tambahkan **Kind**: `text` atau `code`
- Untuk `code`, isi **Language** (mis. `html`, `css`, `javascript`, `python`, `sql`)
- Isi **Content** dengan teks/kode Anda
- Atur **Position** untuk urutan tampil

Frontend step page akan mencoba fetch blok dari `/api/tutorials/:slug`, lalu merender urutannya.
Saat offline atau CMS mati, pengguna tetap melihat fallback konten bawaan (seed).
