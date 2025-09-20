# Deploy ke Vercel — Frontend PWA + Proxy ke CMS

> **Inti:** Vercel cocok untuk **frontend statis**. CMS kamu berbasis **Express + SQLite** memerlukan server **persisten** — **tidak bisa** jalan sebagai Serverless di Vercel (filesystem ephemeral). Solusi: deploy CMS di layanan lain (Railway/Render/Fly/Heroku-alike) atau ganti DB ke *managed* (Vercel Postgres / Supabase / Turso).

## Opsi yang disarankan
1) **Frontend di Vercel** (repo ini) **+** **CMS di luar** (Railway/Render/Fly) **+** rewrite `/api/*` → CMS.
2) Atau **migrate DB** ke layanan managed (Postgres/Turso) dan refactor API ke serverless functions.

---

## Langkah 1 — Deploy Frontend
1. Push folder ini ke GitHub (pastikan `index.html`, `sw.js`, `manifest.webmanifest`, `vercel.json` ada di root).
2. Di Vercel, **Import Project** dari repo tersebut.
3. Build & Deploy (tidak perlu build step).

> `vercel.json` sudah men-setup rewrite untuk `/api/*`.

## Langkah 2 — Jalankan CMS (di luar Vercel)
Gunakan salah satu:
- **Railway**: mudah, ada volume untuk SQLite.
- **Render**: Web Service + Persistent Disk.
- **Fly.io**: volume lokal.
- **Docker/VPS**: bisa juga.

### Contoh (Railway/Render)
- Jalankan server dari folder `cms-api`:
  ```bash
  npm install
  npm run dev   # pastikan PORT sesuai (Railway/Render akan inject PORT)
  ```
- Tambahkan **ENV**:
  - `ADMIN_USER`, `ADMIN_PASS` (opsional ganti)
- Pastikan endpoint kamu mis: `https://your-cms.up.railway.app`

### CORS
Di `cms-api/server.js` sudah ada `app.use(cors())`. Agar lebih aman, batasi origin:
```js
app.use(cors({ origin: ['https://your-frontend.vercel.app'], credentials: false }));
```

## Langkah 3 — Hubungkan Frontend → CMS
Edit `vercel.json`:
```json
{
  "version": 2,
  "routes": [
    { "handle": "filesystem" },
    { "src": "/api/(.*)", "dest": "https://your-cms.up.railway.app/api/$1" },
    { "src": "/(.*)", "dest": "/$1" }
  ]
}
```
Commit & redeploy. Frontend akan memanggil `/api/*` (domestik), lalu Vercel rewrite ke origin CMS.

---

## Catatan PWA (Service Worker) di Vercel
- `sw.js` di root → didaftarkan via `navigator.serviceWorker.register('/sw.js')` **disarankan** (awal kode memakai `'sw.js'`, yang juga bekerja di root).
- `start_url` sudah diubah ke `/` agar A2HS aman.
- Jika update tidak tampil, **buka DevTools → Application → Update on reload** lalu reload.

## Mengapa tidak jalankan CMS di Vercel langsung?
- **Serverless** Vercel **tidak menyimpan file** (SQLite `cms.db` tidak persisten).
- Koneksi panjang / DnD admin & upload bekerja, tapi data akan **hilang** antar cold start.
- Solusi: pakai **managed DB** (Vercel Postgres/Supabase/Turso). Jika ingin, refactor `better-sqlite3` → `pg`/`@libsql/client`.

## Bonus: variable YouTube/hero image dari CMS
- Setelah CMS aktif, isi `hero_image` & `video_youtube_id` per step di admin.
- Frontend step page akan otomatis render gambar, video, dan blocks (text/code).

Selamat deploy! 🚀
