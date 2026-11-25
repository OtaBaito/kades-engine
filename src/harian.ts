// Alasan untuk kembali: ringkasan "selama kamu pergi" dan hadiah harian beruntun (7 hari).
import { GameError } from './errors.ts';
import { arus } from './arus.ts';
import type { VillageState } from './types.ts';

const JT = 1_000_000;

/** Hadiah hari ke-1..7. Hari ke-7 paling besar, lalu siklus mulai lagi. */
export const HADIAH_HARIAN = [
  { kas: 5 * JT, xp: 10 },
  { kas: 8 * JT, xp: 15 },
  { kas: 10 * JT, xp: 20 },
  { kas: 12 * JT, xp: 25 },
  { kas: 15 * JT, xp: 30 },
  { kas: 20 * JT, xp: 40 },
  { kas: 40 * JT, xp: 80, dompet: 10 * JT },
] as const;

function selisihHari(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Hari ke berapa yang akan didapat kalau klaim pada `tanggal`. Absen tidak mengulang dari nol, hanya mundur. */
export function beruntunBerikut(s: VillageState, tanggal: string): number {
  const h = s.hadiahHarian;
  if (!h?.terakhir) return 1;
  const jarak = selisihHari(h.terakhir, tanggal);
  if (jarak <= 0) return h.beruntun;
  if (jarak === 1) return (h.beruntun % 7) + 1;
  return Math.max(1, h.beruntun - (jarak - 1));
}

export function klaimHarian(s: VillageState, tanggal: string, tambahXp: (n: number) => void): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new GameError('Tanggal tidak valid.');
  s.hadiahHarian ??= { terakhir: null, beruntun: 0 };
  if (s.hadiahHarian.terakhir === tanggal) throw new GameError('Hadiah hari ini sudah diambil. Datang lagi besok.');
  const ke = beruntunBerikut(s, tanggal);
  const h = HADIAH_HARIAN[ke - 1];
  arus(s, 'Bonus & hadiah', h.kas);
  if ('dompet' in h && s.politik) s.politik.dompet += h.dompet;
  tambahXp(h.xp);
  s.hadiahHarian = { terakhir: tanggal, beruntun: ke };
  return ke === 7
    ? `Hari ke-7 beruntun! Bantuan provinsi Rp ${h.kas / JT} jt cair, plus Rp 10 jt "uang lelah" untuk kades.`
    : `Hadiah hari ke-${ke}: Rp ${h.kas / JT} jt masuk kas desa.`;
}

/** Ringkasan yang ditampilkan saat pemain kembali setelah lama pergi. */
export interface RingkasanPergi {
  hari: number;
  kasAwal: number;
  kasAkhir: number;
  koinMenunggu: number;
  kartuBaru: number;
  keluhanBaru: number;
  pentingnya: string[];
  /** Waktu desa berhenti menunggu keputusan pemain (audit, mosi). */
  krisis?: string | null;
}

export function buatRingkasanPergi(sebelum: VillageState, sesudah: VillageState, hari: number, events: { jenis: string; teks: string }[]): RingkasanPergi {
  const koin = Object.values(sesudah.koin ?? {}).reduce((t, v) => t + v, 0);
  const idLama = new Set(sebelum.kotakMasuk.map((k) => k.instanceId));
  const keluhanLama = new Set((sebelum.aspirasi ?? []).map((a) => a.id));
  const penting = events
    .filter((e) => e.jenis === 'buruk' || e.jenis === 'politik' || e.jenis === 'baik')
    .filter((e) => !e.teks.startsWith('Tutup buku'))
    .map((e) => e.teks);
  return {
    hari,
    kasAwal: sebelum.kas,
    kasAkhir: sesudah.kas,
    koinMenunggu: Math.round(koin),
    kartuBaru: sesudah.kotakMasuk.filter((k) => !idLama.has(k.instanceId)).length,
    keluhanBaru: (sesudah.aspirasi ?? []).filter((a) => !keluhanLama.has(a.id)).length,
    pentingnya: [...new Set(penting)].slice(-6),
    krisis: sesudah.politik?.kasus ? 'audit inspektorat' : sesudah.relasi?.mosi ? 'mosi pemakzulan dari BPD' : null,
  };
}
