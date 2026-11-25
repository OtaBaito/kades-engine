# Kades Engine

Mesin simulasi kepala desa yang **deterministik**, ditulis dalam TypeScript murni tanpa dependensi.
Ini engine di balik game browser **[Asal Warga Senang](https://play.otabyte.net/aws/)** buatan [OtaByte](https://otabyte.net).

> *A deterministic village-head simulation engine in pure TypeScript (Indonesian-themed). Powers the browser game Asal Warga Senang.*

Kamu jadi kepala desa yang baru menang pilkades. Kelola dana desa yang cair bertahap, bangun desa,
jaga kepuasan enam kelompok warga, urus pegawai, hadapi auditor, dan bertahan di pilkades berikutnya.

## Kenapa menarik

- **Deterministik.** Seed yang sama + aksi yang sama = hasil yang sama persis. Cocok untuk replay, tes, dan liga.
- **Fungsi murni.** `createVillage`, `advance(state, hari)`, `applyAction(state, aksi)`, `buildView(state)`. State berupa JSON biasa.
- **Tanpa dependensi.** Jalan di Node 22.18+ langsung dari file `.ts` (type stripping), juga bisa dibundel ke browser.
- **Siap untuk AI.** Aksi berupa objek bertipe yang mudah dijadikan tool MCP. Di game aslinya, AI bisa memimpin desa di liga terpisah.

## Mulai

```bash
git clone https://github.com/OtaBaito/kades-engine.git
cd kades-engine
npm install        # hanya untuk typecheck; engine sendiri tanpa dependensi
npm test
npm run sim        # 4 bot x 20 desa, masing-masing dipimpin sampai 3 tahun
```

```ts
import { createVillage, advance, applyAction, buildView } from './src/index.ts';

let desa = createVillage({ seed: 'sukamaju-1', namaDesa: 'Sukamaju', namaKades: 'Budi', tipe: 'agraris' });
desa = advance(desa, 30).state;                          // majukan 30 hari
const r = applyAction(desa, { type: 'tagih' });          // tagih iuran warga
console.log(r.events.map((e) => e.teks));
console.log(buildView(r.state).kasTeks);                 // ringkasan siap tampil
```

## Isi

| Modul | Isi |
| --- | --- |
| `engine.ts` | inti: hari, bulan, termin dana desa, SiLPA, kartu kejadian, aksi |
| `politik.ts`, `sidang.ts` | pilkades, kampanye, uang pribadi, kecurigaan, audit dan sidang auditor |
| `kepegawaian.ts`, `jabatan.ts` | pegawai bersifat, rekrutmen, jabatan keluarga |
| `kredit.ts`, `investasi.ts`, `arus.ts` | pinjaman, dana cadangan, BUMDes, arus kas per pos |
| `dusun.ts`, `mega.ts`, `rekanan.ts` | ekspansi dusun, proyek besar bertahap, kontraktor |
| `penduduk.ts`, `harian.ts`, `fitur.ts` | penduduk, hadiah harian, misi, pencapaian |
| `view.ts` | `buildView`: state -> data siap tampil untuk UI |
| `content/` | data: kelompok warga, bangunan, BUMDes, pegawai, pencapaian, dan **paket kartu contoh** |

## Tentang konten

Repo ini memuat **paket kartu contoh** (puluhan kartu) supaya mesin bisa dijalankan dan dites.
Game Asal Warga Senang memakai 1.300+ kartu kejadian, seni peta, server, dan toko yang tidak termasuk di sini.
Kamu bebas menulis paket kartumu sendiri: format kartunya ada di `src/types.ts` (`CardDef`) dan contohnya di `src/content/cards.ts`.

Semua desa, tokoh, lembaga, dan kejadian di konten contoh adalah fiksi.

## Lisensi

Kode: [Apache-2.0](LICENSE). Nama "Asal Warga Senang", "OtaByte", dan logonya tidak termasuk lisensi; lihat [NOTICE](NOTICE).

Dibuat oleh OtaByte, bagian dari [Dahono](https://dahono.com) dan [Sabako](https://sabako.id).
