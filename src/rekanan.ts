// Kontraktor rekanan desa: menambah jumlah proyek yang bisa dikerjakan bersamaan.
// Kursi dasar naik mengikuti level desa; kontrak rekanan menambah kursi selama masa kontrak.
import { arus } from './arus.ts';
import { GameError } from './errors.ts';
import type { VillageState } from './types.ts';

const JT = 1_000_000;

export interface RekananDef {
  id: string;
  nama: string;
  teks: string;
  biaya: number;
  /** Lama kontrak dalam hari game. */
  durasi: number;
  kursi: number;
  minLevel: number;
  /** Proyek yang dimulai selama kontrak selesai lebih cepat (0,8 = 20% lebih cepat). */
  durasiX?: number;
  /** Rekanan "dekat kades": fee ke dompet tiap proyek, tapi gosip naik. */
  dekat?: { feeProyek: number; gosipKontrak: number; gosipProyek: number };
}

export const REKANAN: RekananDef[] = [
  {
    id: 'cv_lokal',
    nama: 'CV Karya Warga',
    teks: 'Kontraktor lokal, tukangnya warga sendiri. Menambah 1 proyek bersamaan.',
    biaya: 90 * JT,
    durasi: 180,
    kursi: 1,
    minLevel: 2,
  },
  {
    id: 'pt_besar',
    nama: 'PT Bangun Persada',
    teks: 'Kontraktor besar dari kota. Menambah 1 proyek bersamaan, proyek baru 20% lebih cepat selesai.',
    biaya: 240 * JT,
    durasi: 360,
    kursi: 1,
    minLevel: 5,
    durasiX: 0.8,
  },
  {
    id: 'cv_kerabat',
    nama: 'CV Ponakan Sejahtera',
    teks: 'Milik keponakan kades. Menambah 1 proyek bersamaan, ada "uang terima kasih" ke dompet tiap proyek, tapi warga mulai curiga.',
    biaya: 60 * JT,
    durasi: 360,
    kursi: 1,
    minLevel: 1,
    dekat: { feeProyek: 4 * JT, gosipKontrak: 6, gosipProyek: 2 },
  },
];

/** Kursi proyek dasar menurut level desa. */
export function kursiDasar(level: number): number {
  return level >= 7 ? 4 : level >= 4 ? 3 : 2;
}

export function levelKursiBerikut(level: number): number | null {
  return level < 4 ? 4 : level < 7 ? 7 : null;
}

export function rekananAktif(s: VillageState) {
  return (s.rekanan ?? []).filter((r) => r.sampaiHari > s.hari);
}

export function maksProyek(s: VillageState): number {
  return kursiDasar(s.level) + rekananAktif(s).reduce((t, r) => t + (REKANAN.find((d) => d.id === r.id)?.kursi ?? 0), 0);
}

export function kontrakRekanan(s: VillageState, id: string): string {
  const def = REKANAN.find((d) => d.id === id);
  if (!def) throw new GameError('Kontraktor tidak dikenal.');
  if (s.level < def.minLevel) throw new GameError(`${def.nama} baru mau bekerja sama dengan desa level ${def.minLevel}.`);
  if (rekananAktif(s).some((r) => r.id === id)) throw new GameError(`Kontrak dengan ${def.nama} masih berjalan.`);
  if (s.kas < def.biaya) throw new GameError(`Kas tidak cukup. Butuh Rp ${Math.round(def.biaya / JT)} jt.`);
  arus(s, 'Pembangunan', -def.biaya);
  s.rekanan = [...rekananAktif(s), { id, sampaiHari: s.hari + def.durasi }];
  if (def.dekat && s.politik) s.politik.kecurigaan = Math.min(100, s.politik.kecurigaan + def.dekat.gosipKontrak);
  const bulan = Math.round(def.durasi / 30);
  return def.dekat
    ? `${def.nama} resmi jadi rekanan desa selama ${bulan} bulan. Warga berbisik: "kok keluarga kades lagi?"`
    : `${def.nama} resmi jadi rekanan desa selama ${bulan} bulan. Desa bisa mengerjakan lebih banyak proyek sekaligus.`;
}

/** Dipanggil saat proyek/upgrade dimulai: percepatan dan fee rekanan. */
export function efekRekananProyek(s: VillageState, durasi: number): number {
  let x = 1;
  for (const r of rekananAktif(s)) {
    const def = REKANAN.find((d) => d.id === r.id);
    if (!def) continue;
    if (def.durasiX) x = Math.min(x, def.durasiX);
    if (def.dekat && s.politik) {
      s.politik.dompet += def.dekat.feeProyek;
      s.politik.kecurigaan = Math.min(100, s.politik.kecurigaan + def.dekat.gosipProyek);
    }
  }
  return Math.max(1, Math.ceil(durasi * x));
}

export function viewRekanan(s: VillageState) {
  const aktif = rekananAktif(s);
  return {
    dasar: kursiDasar(s.level),
    maks: maksProyek(s),
    levelBerikut: levelKursiBerikut(s.level),
    daftar: REKANAN.map((d) => {
      const r = aktif.find((x) => x.id === d.id);
      return {
        id: d.id,
        nama: d.nama,
        teks: d.teks,
        biaya: d.biaya,
        durasiBulan: Math.round(d.durasi / 30),
        minLevel: d.minLevel,
        terbuka: s.level >= d.minLevel,
        dekat: Boolean(d.dekat),
        sisaHari: r ? r.sampaiHari - s.hari : 0,
      };
    }),
  };
}
