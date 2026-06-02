# ⬡ DenahEditor — Editor Denah Rumah Online

Editor denah rumah 2D + preview 3D yang bisa di-deploy sendiri.

## Cara Menjalankan

```bash
# 1. Install dependencies
npm install

# 2. Jalankan development server
npm run dev

# 3. Buka di browser
# → http://localhost:5173
```

## Build untuk Production

```bash
npm run build
# Output ada di folder dist/
# Deploy ke Netlify, Vercel, atau server sendiri
```

## Fitur

### Editor 2D
- **Gambar ruangan** — drag untuk membuat ruangan baru
- **Pindahkan** — pilih dan drag ruangan
- **Resize** — drag handle di pojok untuk ubah ukuran  
- **Pintu** — klik di dekat dinding, auto-snap ke dinding
- **Jendela** — sama seperti pintu
- **Hapus** — pilih elemen lalu tekan Delete

### Preview 3D
- Klik tombol **3D** di toolbar
- Scroll untuk zoom, drag untuk rotasi
- Otomatis center berdasarkan posisi ruangan

### Tipe Ruangan
Ruang Tamu, Kamar Tidur, Dapur, Kamar Mandi, Ruang Makan, Garasi, Teras, Ruang Kerja

## Pintasan Keyboard

| Tombol | Fungsi |
|--------|--------|
| `V` | Tool Pilih |
| `R` | Tool Ruangan |
| `D` | Tool Pintu |
| `W` | Tool Jendela |
| `E` | Tool Hapus |
| `Delete` / `Backspace` | Hapus elemen terpilih |
| `Escape` | Batal / Deselect |

## Tech Stack

- **React 18** + Vite
- **Three.js** — 3D rendering
- **Zustand** — state management
- **SVG** — 2D editor canvas
