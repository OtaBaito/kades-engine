// Menyimpan kas desa supaya tidak menumpuk (SiLPA): dana cadangan resmi, penyertaan modal BUMDes,
// dan versi satir yang berisiko: kas desa ditaruh di kripto.
import { BUMDES } from './content/fitur.ts';
import { arus } from './arus.ts';
import { kasBersih } from './pajak.ts';
import { GameError } from './errors.ts';
import { lajuKoin, totalPendapatanBumdes } from './fitur.ts';
import { nextRandom } from './rng.ts';
import type { VillageState } from './types.ts';

const JT = 1_000_000;
const DANA_DESA_TAHUNAN = 1100 * JT;
/** Termin pertama = 40% dana desa; SiLPA memotong 25% (kas > batas) atau 50% (kas > 2x batas). */
const TERMIN_PERTAMA = DANA_DESA_TAHUNAN * 0.4;

export type JenisInvestasi = 'cadangan' | 'modal_bumdes' | 'kripto';

export const INVESTASI = {
  /** Dana cadangan lewat Perdes: maksimal 30% dana desa setahun, bunga kecil, bisa ditarik. */
  cadanganMaks: Math.round(DANA_DESA_TAHUNAN * 0.3),
  bungaCadangan: 0.003,
  /** Penyertaan modal BUMDes: tidak bisa ditarik, hasil bulanan ke kas. */
  hasilModal: 0.012,
} as const;

function inv(s: VillageState) {
  s.investasi ??= { cadangan: 0, modalBumdes: 0, kripto: 0 };
  return s.investasi;
}

/** Pemasukan rutin per bulan (iuran, retribusi, usaha BUMDes), tanpa dana desa. */
export function pemasukanRutinBulanan(s: VillageState): number {
  const koin = Object.values(lajuKoin(s)).reduce((t, x) => t + x, 0) * 30;
  const usaha = totalPendapatanBumdes(s) * 30;
  return Math.round(koin + usaha);
}

/**
 * Batas kas aman saat tutup tahun. Desa yang ekonominya besar wajar menyimpan lebih banyak:
 * setengah dana desa setahun ditambah tiga bulan pemasukan rutin.
 */
export function batasSilpa(s: VillageState): number {
  return Math.round(DANA_DESA_TAHUNAN * 0.5 + pemasukanRutinBulanan(s) * 3);
}

export function aturInvestasi(s: VillageState, jenis: JenisInvestasi, arah: 'simpan' | 'tarik', jumlah: number): string {
  const i = inv(s);
  const n = Math.round(jumlah);
  if (!Number.isFinite(n) || n < JT) throw new GameError('Minimal Rp 1 jt.');
  if (arah === 'simpan' && s.kas < n) throw new GameError('Kas desa tidak cukup.');
  if (jenis === 'cadangan') {
    if (arah === 'simpan') {
      if (i.cadangan + n > INVESTASI.cadanganMaks) throw new GameError(`Dana cadangan maksimal Rp ${Math.round(INVESTASI.cadanganMaks / JT)} jt (30% dana desa setahun).`);
      arus(s, 'Dana cadangan', -n);
      i.cadangan += n;
      return `Rp ${Math.round(n / JT)} jt dipindah ke dana cadangan lewat Perdes. Aman dari hitungan SiLPA, berbunga kecil.`;
    }
    if (i.cadangan < n) throw new GameError('Dana cadangan tidak sebanyak itu.');
    i.cadangan -= n;
    arus(s, 'Dana cadangan', n);
    return `Rp ${Math.round(n / JT)} jt ditarik dari dana cadangan ke kas desa.`;
  }
  if (jenis === 'modal_bumdes') {
    if (arah === 'tarik') throw new GameError('Penyertaan modal BUMDes tidak bisa ditarik kembali.');
    arus(s, 'Penyertaan modal', -n);
    i.modalBumdes += n;
    return `Rp ${Math.round(n / JT)} jt jadi penyertaan modal BUMDes. Hasilnya masuk kas tiap bulan.`;
  }
  // kripto: satire. Kas desa bukan untuk spekulasi, dan warga tahu.
  if (arah === 'simpan') {
    arus(s, 'Investasi kripto', -n);
    i.kripto += n;
    s.politik.kecurigaan = Math.min(100, s.politik.kecurigaan + 6);
    s.integritas = Math.max(0, s.integritas - 3);
    return `Rp ${Math.round(n / JT)} jt kas desa dibelikan koin kripto atas saran "konsultan" dari grup Telegram. Bendahara gelisah.`;
  }
  if (i.kripto < n) throw new GameError('Nilai kripto desa tidak sebanyak itu.');
  i.kripto -= n;
  arus(s, 'Investasi kripto', n);
  return `Rp ${Math.round(n / JT)} jt kripto dicairkan kembali ke kas desa.`;
}

/** Tutup buku bulanan: bunga cadangan, hasil modal BUMDes, dan naik-turun kripto. */
export function bulananInvestasi(s: VillageState, catat: (j: 'baik' | 'buruk' | 'info', t: string) => void): void {
  const i = s.investasi;
  if (!i) return;
  if (i.cadangan > 0) i.cadangan = Math.round(i.cadangan * (1 + INVESTASI.bungaCadangan));
  if (i.modalBumdes > 0) arus(s, 'Usaha BUMDes', Math.round(i.modalBumdes * INVESTASI.hasilModal));
  if (i.kripto > 0) {
    const r = nextRandom(s);
    if (r < 0.05) {
      i.kripto = Math.round(i.kripto * 0.1);
      s.popularitas = Math.max(0, s.popularitas - 6);
      catat('buruk', 'Bursa kripto tempat kas desa disimpan kabur membawa dana nasabah. Nilai kripto desa tinggal 10%. Warga marah.');
    } else {
      const faktor = 0.65 + nextRandom(s) * 0.8; // 0,65 .. 1,45
      const lama = i.kripto;
      i.kripto = Math.round(i.kripto * faktor);
      const pct = Math.round((faktor - 1) * 100);
      catat(pct >= 0 ? 'info' : 'buruk', `Kripto desa ${pct >= 0 ? 'naik' : 'turun'} ${Math.abs(pct)}% bulan ini (${Math.round(lama / JT)} jt → ${Math.round(i.kripto / JT)} jt).`);
    }
  }
}

export function viewInvestasi(s: VillageState) {
  const i = s.investasi ?? { cadangan: 0, modalBumdes: 0, kripto: 0 };
  const batas = batasSilpa(s);
  return {
    cadangan: i.cadangan,
    modalBumdes: i.modalBumdes,
    kripto: i.kripto,
    cadanganMaks: INVESTASI.cadanganMaks,
    bungaCadanganPersen: INVESTASI.bungaCadangan * 100,
    hasilModalPersen: INVESTASI.hasilModal * 100,
    hasilModalBulanan: Math.round(i.modalBumdes * INVESTASI.hasilModal),
    batasSilpa: batas,
    kelebihan: Math.max(0, kasBersih(s) - batas),
    /** Perkiraan potongan termin pertama tahun depan kalau kas tetap begini. Kas sendiri tidak diambil. */
    potongan: kasBersih(s) > batas ? Math.round(Math.min(TERMIN_PERTAMA, Math.max(TERMIN_PERTAMA * 0.25, (kasBersih(s) - batas) * 0.5))) : 0,
    potonganMaks: Math.round(TERMIN_PERTAMA),
  };
}
