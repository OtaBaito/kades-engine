// Proyek besar: tujuan jangka panjang untuk desa yang kasnya sudah tebal.
// Biayanya Rp 1-3 M, dibayar bertahap (30% di muka, sisanya dua tahap), dikerjakan konsorsium
// (tidak memakai kursi kontraktor), hanya satu yang boleh berjalan. Kalau kas tidak cukup saat
// tahap berikutnya jatuh tempo, proyek mangkrak: berhenti, warga kecewa, gosip naik.
import { arus } from './arus.ts';
import { GameError } from './errors.ts';
import type { CardDef, GroupId, IndexId, VillageState } from './types.ts';

const JT = 1_000_000;

export interface MegaDef {
  id: string;
  nama: string;
  teks: string;
  biaya: number;
  durasi: number;
  minLevel: number;
  /** Efek sekali saat diresmikan. */
  indeks: Partial<Record<IndexId, number>>;
  /** Kenaikan target kepuasan permanen per kelompok. */
  target: Partial<Record<GroupId, number>>;
  pemasukanBulanan: number;
  popularitas: number;
}

export const MEGA: MegaDef[] = [
  {
    id: 'jalan_tembus',
    nama: 'Jalan Tembus Kabupaten',
    teks: 'Jalan beton dua lajur yang memotong jarak ke kota kabupaten. Truk hasil bumi tidak perlu memutar lagi.',
    biaya: 1200 * JT,
    durasi: 60,
    minLevel: 5,
    indeks: { ekonomi: 12, sosial: 3 },
    target: { pedagang: 6, petani: 4, perantau: 6 },
    pemasukanBulanan: 25 * JT,
    popularitas: 6,
  },
  {
    id: 'pasar_modern',
    nama: 'Pasar Modern Desa',
    teks: 'Pasar dua lantai dengan los bersih, gudang dingin, dan parkir luas. Pedagang dari desa tetangga ikut menyewa.',
    biaya: 1800 * JT,
    durasi: 75,
    minLevel: 6,
    indeks: { ekonomi: 15 },
    target: { pedagang: 10, pkk: 3 },
    pemasukanBulanan: 45 * JT,
    popularitas: 6,
  },
  {
    id: 'rs_pratama',
    nama: 'Rumah Sakit Pratama Desa',
    teks: 'Rumah sakit kecil dengan IGD 24 jam dan ruang bersalin. Warga tidak lagi harus ke kota saat darurat.',
    biaya: 2200 * JT,
    durasi: 90,
    minLevel: 7,
    indeks: { sosial: 15 },
    target: { pkk: 8, tokoh: 4, petani: 3, pedagang: 3, pemuda: 3, perantau: 3 },
    pemasukanBulanan: 15 * JT,
    popularitas: 8,
  },
  {
    id: 'pltmh',
    nama: 'Bendungan Mini & PLTMH',
    teks: 'Bendung kecil di hulu kali untuk irigasi musim kemarau dan pembangkit listrik mikrohidro milik desa.',
    biaya: 2500 * JT,
    durasi: 90,
    minLevel: 8,
    indeks: { lingkungan: 12, ekonomi: 6 },
    target: { petani: 10, pkk: 2 },
    pemasukanBulanan: 35 * JT,
    popularitas: 6,
  },
  {
    id: 'kampus_vokasi',
    nama: 'Kampus Vokasi Desa',
    teks: 'Politeknik kecil jurusan pertanian, pariwisata, dan teknik. Pemuda tidak perlu merantau untuk kuliah.',
    biaya: 3000 * JT,
    durasi: 120,
    minLevel: 9,
    indeks: { sosial: 10, ekonomi: 8 },
    target: { pemuda: 12, perantau: 4, pkk: 3 },
    pemasukanBulanan: 20 * JT,
    popularitas: 10,
  },
];

const MUKA = 0.3;
const TAHAP = 0.35;
/** Tiap tahap pengembangan berikutnya 60% lebih mahal, efek separuh, pemasukan tetap bertambah. */
const NAIK_BIAYA = 1.6;

/** Berapa kali proyek besar ini sudah diresmikan (0 = belum berdiri). */
export function tingkatMega(s: VillageState, id: string): number {
  return (s.megaSelesai ?? []).filter((x) => x === id).length;
}
export function biayaMega(def: MegaDef, tingkat: number): number {
  return Math.round((def.biaya * Math.pow(NAIK_BIAYA, tingkat)) / JT) * JT;
}
const skala = (tingkat: number) => (tingkat === 0 ? 1 : 0.5);
/** Hari yang dipangkas kalau kades setuju lembur di kartu "Bupati minta dipercepat". */
export const PERCEPAT_LEMBUR = 15;

/** Progres pengerjaan 0..1: dihitung dari sisa hari, jadi ikut membeku selama mangkrak. */
function progresMega(s: VillageState, m: NonNullable<VillageState['mega']>, def: MegaDef): number {
  return Math.max(0, Math.min(1, 1 - (m.selesaiHari - s.hari) / Math.max(1, def.durasi)));
}

const NAMA_TAHAP = (def: MegaDef, tingkat: number) => (tingkat === 0 ? def.nama : `${def.nama} tahap ${tingkat + 1}`);

export function bonusMega(s: VillageState, g: GroupId): number {
  const per = new Map<string, number>();
  let total = 0;
  for (const id of s.megaSelesai ?? []) {
    const t = per.get(id) ?? 0;
    per.set(id, t + 1);
    total += Math.round((MEGA.find((m) => m.id === id)?.target[g] ?? 0) * skala(t));
  }
  return total;
}

export function mulaiMega(s: VillageState, id: string): string {
  const def = MEGA.find((m) => m.id === id);
  if (!def) throw new GameError('Proyek besar tidak dikenal.');
  const tingkat = tingkatMega(s, id);
  const nama = NAMA_TAHAP(def, tingkat);
  if (s.mega) throw new GameError('Masih ada proyek besar yang berjalan. Konsorsium hanya sanggup satu per satu.');
  if (s.level < def.minLevel) throw new GameError(`${def.nama} butuh level desa ${def.minLevel}.`);
  const biaya = biayaMega(def, tingkat);
  const muka = Math.round(biaya * MUKA);
  if (s.kas - (s.pajak?.titipan ?? 0) < muka) throw new GameError(`Kas bebas (di luar titipan pajak) tidak cukup untuk uang muka ${Math.round(muka / JT)} jt.`);
  arus(s, 'Pembangunan', -muka);
  s.mega = {
    id,
    biaya,
    tahapKe: tingkat,
    mulaiHari: s.hari,
    selesaiHari: s.hari + def.durasi,
    dibayar: muka,
    tahap: 1,
    jatuhTempo: s.hari + Math.round(def.durasi / 3),
    mangkrak: false,
  };
  s.flags = [...new Set([...(s.flags ?? []), 'mega_berjalan'])];
  s.popularitas = Math.min(100, s.popularitas + 2);
  // perkiraan kasar: kas bebas sekarang + arus bersih rata-rata 3 bulan terakhir sampai tagihan tahap 2 jatuh tempo
  const tagihan = Math.round(biaya * TAHAP);
  const hariTempo = Math.round(def.durasi / 3);
  const lap = (s.laporan ?? []).slice(-3);
  const bersihHarian = lap.length ? lap.reduce((t, l) => t + (l.pemasukan ?? 0) - (l.pengeluaran ?? 0), 0) / lap.length / 30 : 0;
  const perkiraan = s.kas - (s.pajak?.titipan ?? 0) + bersihHarian * hariTempo;
  const peringatan =
    perkiraan < tagihan
      ? ` PERHATIAN: tagihan tahap 2 (${Math.round(tagihan / JT)} jt) jatuh tempo ${hariTempo} hari lagi, sedangkan perkiraan kas bebas saat itu hanya sekitar ${Math.round(Math.max(0, perkiraan) / JT)} jt. Tahan belanja lain atau siapkan pinjaman supaya tidak mangkrak.`
      : ` Tagihan tahap 2 (${Math.round(tagihan / JT)} jt) jatuh tempo ${hariTempo} hari lagi.`;
  return `Peletakan batu pertama ${nama}. Uang muka ${Math.round(muka / JT)} jt dibayar, dua tahap berikutnya menyusul.${peringatan}`;
}

/** Dipanggil tiap hari: bayar tahap, tangani mangkrak, resmikan. */
export function harianMega(s: VillageState, catat: (j: 'baik' | 'buruk' | 'info', t: string) => void): void {
  const m = s.mega;
  if (!m) return;
  const def = MEGA.find((x) => x.id === m.id);
  if (!def) {
    s.mega = null;
    return;
  }
  const total = m.biaya ?? def.biaya;
  const tk = m.tahapKe ?? 0;
  const nama = NAMA_TAHAP(def, tk);
  const f = skala(tk) * (m.porsi ?? 1);
  if (s.flags?.includes('mega_lembur')) {
    s.flags = s.flags.filter((x) => x !== 'mega_lembur');
    const lama = m.selesaiHari;
    m.selesaiHari = Math.max(s.hari + 5, m.selesaiHari - PERCEPAT_LEMBUR);
    if (m.selesaiHari < lama) catat('baik', `Pekerja ${nama} lembur: target selesai maju ${lama - m.selesaiHari} hari.`);
  }
  // pengingat 5 hari sebelum jatuh tempo kalau kas belum cukup (tutup buku bulanan bisa ikut memotong kas)
  if (m.dibayar < total && !m.mangkrak && m.jatuhTempo - s.hari === 5 && m.diingatkan !== m.jatuhTempo) {
    const bayar = Math.min(total - m.dibayar, Math.round(total * TAHAP));
    m.diingatkan = m.jatuhTempo;
    const bebas = s.kas - (s.pajak?.titipan ?? 0);
    if (bebas < bayar * 1.15) catat('buruk', `Tagihan tahap berikutnya ${nama} (${Math.round(bayar / JT)} jt) jatuh tempo 5 hari lagi. Kas bebas sekarang ${Math.round(bebas / JT)} jt (di luar titipan pajak): siapkan cadangan untuk gaji dan perawatan juga.`);
  }
  if (m.dibayar < total && s.hari >= m.jatuhTempo) {
    const bayar = Math.min(total - m.dibayar, Math.round(total * TAHAP));
    // kas kurang di hari jatuh tempo: kontraktor memberi tenggang 7 hari sebelum proyek berhenti
    // titipan pajak bukan milik desa: tagihan hanya boleh dibayar dari kas bebas
    const bebas = s.kas - (s.pajak?.titipan ?? 0);
    if (bebas < bayar && !m.mangkrak && m.tenggang === undefined) {
      m.tenggang = s.hari + 7;
      catat('buruk', `Kas bebas (di luar titipan pajak) belum cukup membayar tahap berikutnya ${nama} (${Math.round(bayar / JT)} jt). Kontraktor memberi tenggang 7 hari sebelum pekerjaan berhenti.`);
    }
    if (bebas >= bayar) {
      m.tenggang = undefined;
      arus(s, 'Pembangunan', -bayar);
      m.dibayar += bayar;
      m.tahap += 1;
      if (m.mangkrak) catat('baik', `${nama} dilanjutkan lagi setelah kas cukup.`);
      m.mangkrak = false;
      m.jatuhTempo = m.dibayar >= total ? Number.MAX_SAFE_INTEGER : s.hari + Math.round(def.durasi / 3);
      catat('info', `Tahap ${m.tahap} ${nama} dibayar ${Math.round(bayar / JT)} jt.`);
    } else if (!m.mangkrak && s.hari >= (m.tenggang ?? s.hari)) {
      m.mangkrak = true;
      m.tenggang = undefined;
      s.popularitas = Math.max(0, s.popularitas - 4);
      s.politik.kecurigaan = Math.min(100, s.politik.kecurigaan + 4);
      catat('buruk', `${nama} MANGKRAK: kas tidak cukup membayar tahap berikutnya (${Math.round(bayar / JT)} jt). Pekerja pulang, warga mulai bertanya ke mana uangnya.`);
    }
  }
  // kartu "percepat" hanya masuk akal di paruh pertama pengerjaan, selagi sisa waktunya masih panjang
  const jauh = !m.mangkrak && progresMega(s, m, def) < 0.5 && m.selesaiHari - s.hari > 25;
  s.flags = jauh ? [...new Set([...(s.flags ?? []), 'mega_jauh'])] : (s.flags ?? []).filter((f) => f !== 'mega_jauh');
  if (m.mangkrak) {
    // proyek berhenti: tanggal selesai ikut mundur, warga makin kesal tiap bulan
    m.selesaiHari += 1;
    if ((s.hari - m.mulaiHari) % 30 === 0) for (const g of Object.keys(s.kepuasan) as GroupId[]) s.kepuasan[g] = Math.max(0, s.kepuasan[g] - 1);
    return;
  }
  if (s.hari >= m.selesaiHari && m.dibayar >= total) {
    s.mega = null;
    s.megaSelesai = [...(s.megaSelesai ?? []), def.id];
    s.flags = (s.flags ?? []).filter((f) => f !== 'mega_berjalan' && f !== 'mega_jauh');
    for (const [k, v] of Object.entries(def.indeks) as [IndexId, number][]) s.indeks[k] = Math.min(100, s.indeks[k] + Math.round(v * f));
    for (const [g, v] of Object.entries(def.target) as [GroupId, number][]) s.kepuasan[g] = Math.min(100, s.kepuasan[g] + Math.round(v * f));
    s.pemasukanTambahanBulanan += Math.round(def.pemasukanBulanan * (m.porsi ?? 1));
    s.popularitas = Math.min(100, s.popularitas + Math.round(def.popularitas * f));
    catat('baik', `${nama} DIRESMIKAN! Pita digunting bupati, warga memadati lokasi. Kepuasan naik permanen dan ada pemasukan baru ${Math.round((def.pemasukanBulanan * (m.porsi ?? 1)) / JT)} jt per bulan.`);
  }
}

function statistikMega(s: VillageState) {
  const hitung = new Map<string, number>();
  let investasi = 0;
  let pemasukan = 0;
  for (const id of s.megaSelesai ?? []) {
    const k = hitung.get(id) ?? 0;
    hitung.set(id, k + 1);
    const d = MEGA.find((x) => x.id === id);
    if (!d) continue;
    investasi += biayaMega(d, k);
    pemasukan += d.pemasukanBulanan;
  }
  const kelompok: GroupId[] = ['petani', 'pedagang', 'pemuda', 'pkk', 'tokoh', 'perantau'];
  return {
    tahap: (s.megaSelesai ?? []).length,
    investasi,
    pemasukanBulanan: pemasukan,
    /** Berapa bulan sampai pemasukan proyek besar menutup biayanya. */
    balikModalBulan: pemasukan > 0 ? Math.round(investasi / pemasukan) : null,
    bonusKepuasan: kelompok.map((g) => ({ kelompok: g, nilai: bonusMega(s, g) })).filter((x) => x.nilai > 0),
  };
}

export function viewMega(s: VillageState) {
  const m = s.mega;
  return {
    statistik: statistikMega(s),
    berjalan: m
      ? (() => {
          const def = MEGA.find((x) => x.id === m.id)!;
          const total = m.biaya ?? def.biaya;
          return {
            id: m.id,
            nama: NAMA_TAHAP(def, m.tahapKe ?? 0),
            progres: Math.round(progresMega(s, m, def) * 100),
            sisaHari: Math.max(0, m.selesaiHari - s.hari),
            dibayar: m.dibayar,
            total,
            tagihanBerikut: m.dibayar < total ? Math.min(total - m.dibayar, Math.round(total * TAHAP)) : 0,
            jatuhTempoHari: m.dibayar < total ? Math.max(0, m.jatuhTempo - s.hari) : null,
            /** Sisa hari tenggang kalau tagihan sudah lewat jatuh tempo tapi kas belum cukup. */
            tenggangHari: m.tenggang !== undefined ? Math.max(0, m.tenggang - s.hari) : null,
            mangkrak: m.mangkrak,
          };
        })()
      : null,
    daftar: MEGA.map((d) => {
      const tingkat = tingkatMega(s, d.id);
      const biaya = biayaMega(d, tingkat);
      const f = skala(tingkat);
      const kali = (o: Record<string, number | undefined>): Record<string, number> => {
        const out: Record<string, number> = {};
        for (const [k, v] of Object.entries(o)) if (v && Math.round(v * f) > 0) out[k] = Math.round(v * f);
        return out;
      };
      return {
        id: d.id,
        nama: d.nama,
        teks: d.teks,
        biaya,
        uangMuka: Math.round(biaya * MUKA),
        durasi: d.durasi,
        minLevel: d.minLevel,
        pemasukanBulanan: d.pemasukanBulanan,
        indeks: kali(d.indeks),
        target: kali(d.target),
        /** 0 = belum berdiri; 1+ = sudah berdiri, berikutnya pengembangan tahap (tingkat+1). */
        tingkat,
        selesai: tingkat > 0,
        berjalan: s.mega?.id === d.id,
        terbuka: s.level >= d.minLevel,
      };
    }),
  };
}

/** Kejadian yang hanya muncul selama proyek besar dikerjakan. */
export const KARTU_MEGA: CardDef[] = [
  {
    id: 'mega_lahan',
    judul: 'Pembebasan Lahan Proyek Besar Macet',
    teks: 'Tiga keluarga menolak melepas tanah yang dilewati proyek besar. Mereka minta harga dua kali lipat, kontraktor konsorsium mulai mengeluh.',
    kategori: 'politik',
    bobot: 3,
    jedaHari: 120,
    syarat: { flag: 'mega_berjalan' },
    opsi: [
      { id: 'bayar', label: 'Bayar harga yang diminta', effect: { kas: -80 * JT, kepuasan: { petani: 4 }, integritas: 1 } },
      { id: 'musyawarah', label: 'Musyawarah dan geser sedikit rute', effect: { kas: -25 * JT, kepuasan: { petani: 2, tokoh: 2 }, indeks: { sosial: 1 } } },
      { id: 'paksa', label: 'Minta aparat "mengamankan" lahan', effect: { integritas: -5, kecurigaan: 8, popularitas: -4, kepuasan: { petani: -8 } } },
    ],
  },
  {
    id: 'mega_markup',
    judul: 'Konsorsium Menawarkan "Pengertian"',
    teks: 'Pimpinan konsorsium proyek besar mengajak makan malam. Katanya, angka RAB masih bisa "disesuaikan" dan kades kebagian.',
    kategori: 'politik',
    bobot: 2.5,
    jedaHari: 150,
    syarat: { flag: 'mega_berjalan' },
    opsi: [
      { id: 'tolak', label: 'Tolak, minta laporan kemajuan mingguan', effect: { integritas: 4, kecurigaan: -3 } },
      { id: 'terima', label: 'Terima bagian, toh proyeknya tetap jalan', effect: { dompet: 60 * JT, kecurigaan: 14, integritas: -6 } },
      { id: 'lapor', label: 'Laporkan ke inspektorat', effect: { integritas: 6, popularitas: 3, kepuasan: { tokoh: 3 }, kas: -10 * JT } },
    ],
  },
  {
    id: 'mega_percepat',
    judul: 'Bupati Minta Proyek Besar Dipercepat',
    teks: 'Bupati ingin meresmikan proyek besar desa sebelum musim kampanye kabupaten. Lembur pekerja butuh biaya tambahan.',
    kategori: 'peluang',
    bobot: 4,
    jedaHari: 150,
    syarat: { flag: 'mega_jauh' },
    opsi: [
      { id: 'lembur', label: `Setuju lembur, selesai ${PERCEPAT_LEMBUR} hari lebih cepat, kas desa tanggung`, effect: { kas: -60 * JT, setFlag: ['restu_bupati', 'mega_lembur'], popularitas: 2 } },
      { id: 'tolak', label: 'Tetap sesuai jadwal, kualitas nomor satu', effect: { integritas: 2, setFlag: ['dimusuhi_bupati'] } },
      { id: 'janji', label: 'Janjikan, tapi tidak dikerjakan', effect: { popularitas: -2, kepuasan: { tokoh: -2 } } },
    ],
  },
];

/**
 * Ganti kades: sisa kas kades lama dipakai melunasi tagihan proyek besar yang belum lunas. Kalau masih kurang,
 * pengerjaan diselesaikan sesuai uang yang sudah masuk (manfaat proporsional), jadi kades baru tidak mewarisi utang.
 */
export function serahTerimaMega(s: VillageState, kasLama: number): string | null {
  const m = s.mega;
  if (!m) return null;
  const def = MEGA.find((x) => x.id === m.id);
  if (!def) return null;
  const total = m.biaya ?? def.biaya;
  const sisa = total - m.dibayar;
  if (sisa <= 0) return null;
  const nama = NAMA_TAHAP(def, m.tahapKe ?? 0);
  const pakai = Math.max(0, Math.min(sisa, kasLama));
  m.dibayar += pakai;
  m.tenggang = undefined;
  m.mangkrak = false;
  m.jatuhTempo = Number.MAX_SAFE_INTEGER;
  if (m.dibayar >= total) return `Sisa kas kades lama (${Math.round(pakai / JT)} jt) melunasi tagihan ${nama}. Pengerjaan berlanjut tanpa tagihan baru.`;
  m.porsi = Math.max(0.1, m.dibayar / total) * (m.porsi ?? 1);
  m.biaya = m.dibayar;
  return `Tagihan ${nama} belum lunas ${Math.round((total - m.dibayar) / JT)} jt${pakai > 0 ? ` setelah dibayar sisa kas lama ${Math.round(pakai / JT)} jt` : ''}. Kontrak dirampingkan: proyek diselesaikan sebatas dana yang sudah masuk (sekitar ${Math.round(m.porsi * 100)}% manfaat), kades baru tidak menanggung utangnya.`;
}

/** Peringatan di kartu yang memakan kas saat tagihan tahap proyek besar sudah dekat. */
export function peringatanTagihanMega(s: VillageState, biaya: number): string | null {
  const m = s.mega;
  if (!m || biaya <= 0) return null;
  const def = MEGA.find((x) => x.id === m.id);
  if (!def) return null;
  const total = m.biaya ?? def.biaya;
  if (m.dibayar >= total) return null;
  const tagihan = Math.min(total - m.dibayar, Math.round(total * TAHAP));
  const hari = Math.max(0, m.jatuhTempo - s.hari);
  if (hari > 30) return null;
  const bebas = s.kas - (s.pajak?.titipan ?? 0);
  if (bebas - biaya >= tagihan) return null;
  return `Awas: tagihan ${NAMA_TAHAP(def, m.tahapKe ?? 0)} ${Math.round(tagihan / JT)} jt jatuh tempo ${hari} hari lagi. Kas bebas sekarang ${Math.round(bebas / JT)} jt; kalau dipakai ${Math.round(biaya / JT)} jt untuk ini, proyek bisa mangkrak.`;
}
