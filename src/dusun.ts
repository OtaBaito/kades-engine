// Ekspansi desa: membuka dusun baru di selatan secara bertahap.
// Tanahnya bisa dibeli dari warga (mahal, bersih) atau diserobot (murah, tapi gosip naik dan muncul sengketa lahan).
import { arus } from './arus.ts';
import { GameError } from './errors.ts';
import type { CardDef, GroupId, ProjectDef, VillageState } from './types.ts';

const JT = 1_000_000;

export interface DusunDef {
  id: string;
  nama: string;
  teks: string;
  biaya: number;
  minLevel: number;
  /** Warga baru yang pindah ke dusun ini. */
  jiwa: Partial<Record<GroupId, number>>;
}

export const DUSUN: DusunDef[] = [
  {
    id: 'dusun_mekar',
    nama: 'Dusun Mekar',
    teks: 'Lahan kebun di ujung jalan desa. Cocok untuk perumahan dan pasar kecil.',
    biaya: 300 * JT,
    minLevel: 4,
    jiwa: { petani: 170, pedagang: 80, pemuda: 110, pkk: 90, tokoh: 18, perantau: 60 },
  },
  {
    id: 'dusun_harapan',
    nama: 'Dusun Harapan',
    teks: 'Tanah tegalan yang luas. Warga muda butuh sekolah dan layanan kesehatan dekat rumah.',
    biaya: 600 * JT,
    minLevel: 7,
    jiwa: { petani: 140, pedagang: 110, pemuda: 170, pkk: 140, tokoh: 22, perantau: 90 },
  },
  {
    id: 'dusun_ujung',
    nama: 'Dusun Ujung',
    teks: 'Perbatasan dengan desa tetangga, dilalui jalan kabupaten. Ramai pendatang dan pedagang.',
    biaya: 1200 * JT,
    minLevel: 10,
    jiwa: { petani: 110, pedagang: 180, pemuda: 180, pkk: 140, tokoh: 30, perantau: 170 },
  },
];

/** Bangunan yang hanya bisa didirikan di dusun tertentu. */
export const PROYEK_DUSUN: (ProjectDef & { butuhDusun: string })[] = [
  {
    id: 'balai_dusun',
    butuhDusun: 'dusun_mekar',
    nama: 'Balai Dusun Mekar',
    deskripsi: 'Tempat rapat RT/RW, posyandu keliling, dan hajatan warga dusun baru.',
    biaya: 110 * JT,
    durasiHari: 12,
    perawatanBulanan: 1 * JT,
    menyediakan: [],
    indeks: { sosial: 5 },
    kepuasan: { tokoh: 6, pkk: 4 },
  },
  {
    id: 'pasar_dusun',
    butuhDusun: 'dusun_mekar',
    nama: 'Pasar Dusun Mekar',
    deskripsi: 'Pasar pagi untuk warga dusun baru. Retribusi lapak masuk kas desa.',
    biaya: 160 * JT,
    durasiHari: 15,
    perawatanBulanan: 1.5 * JT,
    menyediakan: [],
    indeks: { ekonomi: 5 },
    kepuasan: { pedagang: 8, pkk: 2 },
    pemasukanBulanan: 6 * JT,
  },
  {
    id: 'sekolah_dusun',
    butuhDusun: 'dusun_harapan',
    nama: 'SD Dusun Harapan',
    deskripsi: 'Sekolah dasar supaya anak-anak tidak perlu jalan jauh ke desa sebelah.',
    biaya: 260 * JT,
    durasiHari: 22,
    perawatanBulanan: 2.5 * JT,
    menyediakan: [],
    indeks: { sosial: 8 },
    kepuasan: { pkk: 10, pemuda: 4 },
  },
  {
    id: 'pustu_dusun',
    butuhDusun: 'dusun_harapan',
    nama: 'Puskesmas Pembantu',
    deskripsi: 'Bidan dan perawat jaga untuk dusun yang jauh dari pusat desa.',
    biaya: 220 * JT,
    durasiHari: 18,
    perawatanBulanan: 2 * JT,
    menyediakan: [],
    indeks: { sosial: 7 },
    kepuasan: { pkk: 8, tokoh: 3, petani: 3 },
  },
  {
    id: 'terminal_dusun',
    butuhDusun: 'dusun_ujung',
    nama: 'Terminal Angkot Desa',
    deskripsi: 'Angkot dan ojek pangkalan resmi di jalan kabupaten. Retribusi parkir masuk kas.',
    biaya: 380 * JT,
    durasiHari: 24,
    perawatanBulanan: 3 * JT,
    menyediakan: [],
    indeks: { ekonomi: 7 },
    kepuasan: { perantau: 8, pedagang: 5 },
    pemasukanBulanan: 12 * JT,
  },
  {
    id: 'gor_dusun',
    butuhDusun: 'dusun_ujung',
    nama: 'Gelanggang Olahraga',
    deskripsi: 'GOR untuk voli, bulu tangkis, dan turnamen antardesa. Bisa disewakan.',
    biaya: 420 * JT,
    durasiHari: 26,
    perawatanBulanan: 3 * JT,
    menyediakan: [],
    indeks: { sosial: 6 },
    kepuasan: { pemuda: 12 },
    pemasukanBulanan: 5 * JT,
  },
  // ---- tambahan Dusun Mekar
  {
    id: 'taman_dusun',
    butuhDusun: 'dusun_mekar',
    nama: 'Taman Bermain Dusun',
    deskripsi: 'Ayunan, perosotan, dan bangku teduh untuk anak-anak dan ibu-ibu sore hari.',
    biaya: 70 * JT,
    durasiHari: 8,
    perawatanBulanan: 0.6 * JT,
    menyediakan: [],
    indeks: { sosial: 3, lingkungan: 2 },
    kepuasan: { pkk: 6, pemuda: 2 },
  },
  {
    id: 'bank_sampah',
    butuhDusun: 'dusun_mekar',
    nama: 'Bank Sampah Dusun',
    deskripsi: 'Sampah plastik ditimbang dan ditukar tabungan. Selokan tidak mampet lagi.',
    biaya: 90 * JT,
    durasiHari: 10,
    perawatanBulanan: 0.8 * JT,
    menyediakan: [],
    indeks: { lingkungan: 6 },
    kepuasan: { pkk: 5 },
    pemasukanBulanan: 2 * JT,
  },
  {
    id: 'pos_dusun',
    butuhDusun: 'dusun_mekar',
    nama: 'Pos Keamanan Dusun',
    deskripsi: 'Pos jaga dengan kentongan dan CCTV di pintu masuk dusun baru.',
    biaya: 60 * JT,
    durasiHari: 6,
    perawatanBulanan: 0.5 * JT,
    menyediakan: [],
    indeks: { sosial: 3 },
    kepuasan: { pedagang: 3, tokoh: 3, pkk: 2 },
  },
  // ---- tambahan Dusun Harapan
  {
    id: 'smp_dusun',
    butuhDusun: 'dusun_harapan',
    nama: 'SMP Satu Atap',
    deskripsi: 'Lulusan SD tidak perlu naik angkot ke kecamatan untuk sekolah lanjutan.',
    biaya: 340 * JT,
    durasiHari: 26,
    perawatanBulanan: 3 * JT,
    menyediakan: [],
    indeks: { sosial: 8 },
    kepuasan: { pemuda: 8, pkk: 6 },
  },
  {
    id: 'koperasi_tani',
    butuhDusun: 'dusun_harapan',
    nama: 'Koperasi Tani Harapan',
    deskripsi: 'Simpan pinjam dan pembelian pupuk bersama. Petani tidak lagi bergantung tengkulak.',
    biaya: 180 * JT,
    durasiHari: 14,
    perawatanBulanan: 1.5 * JT,
    menyediakan: [],
    indeks: { ekonomi: 6 },
    kepuasan: { petani: 10 },
    pemasukanBulanan: 5 * JT,
  },
  {
    id: 'embung_dusun',
    butuhDusun: 'dusun_harapan',
    nama: 'Embung Tadah Hujan',
    deskripsi: 'Kolam penampung air hujan untuk tegalan saat kemarau, plus budidaya ikan.',
    biaya: 240 * JT,
    durasiHari: 20,
    perawatanBulanan: 1.5 * JT,
    menyediakan: [],
    indeks: { lingkungan: 6, ekonomi: 3 },
    kepuasan: { petani: 8 },
    pemasukanBulanan: 3 * JT,
  },
  // ---- tambahan Dusun Ujung
  {
    id: 'rest_area',
    butuhDusun: 'dusun_ujung',
    nama: 'Rest Area & Kuliner',
    deskripsi: 'Tempat singgah di jalan kabupaten: warung, toilet bersih, dan musik akustik malam minggu.',
    biaya: 320 * JT,
    durasiHari: 20,
    perawatanBulanan: 2.5 * JT,
    menyediakan: [],
    indeks: { ekonomi: 6 },
    kepuasan: { pedagang: 8, pemuda: 4 },
    pemasukanBulanan: 10 * JT,
  },
  {
    id: 'pasar_grosir',
    butuhDusun: 'dusun_ujung',
    nama: 'Pasar Grosir Antardesa',
    deskripsi: 'Pedagang dari tiga desa belanja stok di sini. Lapak paling mahal se-kecamatan.',
    biaya: 520 * JT,
    durasiHari: 30,
    perawatanBulanan: 4 * JT,
    menyediakan: [],
    indeks: { ekonomi: 9 },
    kepuasan: { pedagang: 12, perantau: 3 },
    pemasukanBulanan: 18 * JT,
  },
  {
    id: 'gudang_logistik',
    butuhDusun: 'dusun_ujung',
    nama: 'Gudang Logistik Desa',
    deskripsi: 'Gudang sewa untuk ekspedisi dan toko online warga. Truk keluar-masuk tiap hari.',
    biaya: 400 * JT,
    durasiHari: 22,
    perawatanBulanan: 3 * JT,
    menyediakan: [],
    indeks: { ekonomi: 7, lingkungan: -2 },
    kepuasan: { perantau: 6, pemuda: 4 },
    pemasukanBulanan: 14 * JT,
  },
];

export const KARTU_DUSUN: CardDef[] = [
  {
    id: 'sengketa_lahan',
    judul: 'Sengketa Lahan Dusun Baru',
    teks: 'Ahli waris pemilik tanah yang diserobot untuk dusun baru datang membawa pengacara dan sertifikat. Mereka menuntut ganti rugi atau membawa kasus ke pengadilan.',
    kategori: 'aduan',
    bobot: 1,
    sekali: false,
    hanyaLanjutan: true,
    opsi: [
      { id: 'ganti_rugi', label: 'Bayar ganti rugi yang layak dari kas desa', effect: { kas: -120 * JT, integritas: 3, kecurigaan: -6, kepuasan: { petani: 4 } } },
      { id: 'mediasi', label: 'Mediasi lewat camat, bayar separuh', effect: { kas: -60 * JT, kepuasan: { petani: -2 }, kecurigaan: -2 } },
      { id: 'preman', label: 'Kirim "orang lapangan" untuk menekan ahli waris', effect: { integritas: -6, kecurigaan: 15, popularitas: -5, kepuasan: { petani: -8 } } },
      { id: 'pengadilan', label: 'Biarkan ke pengadilan, desa punya surat', effect: { kas: -15 * JT, popularitas: -3 }, risiko: { setelahHari: 30, peluang: 0.5, pesan: 'Pengadilan memenangkan ahli waris. Desa wajib membayar ganti rugi plus biaya perkara.', effect: { kas: -160 * JT, popularitas: -4 } } },
    ],
  },
];

export function dusunTerbuka(s: VillageState): string[] {
  return s.dusun ?? [];
}

export function bukaDusun(s: VillageState, id: string, cara: 'beli' | 'serobot'): string {
  const idx = DUSUN.findIndex((d) => d.id === id);
  const def = DUSUN[idx];
  if (!def) throw new GameError('Dusun tidak dikenal.');
  const terbuka = dusunTerbuka(s);
  if (terbuka.includes(id)) throw new GameError(`${def.nama} sudah dibuka.`);
  if (terbuka.length !== idx) throw new GameError(`Buka ${DUSUN[terbuka.length].nama} dulu.`);
  if (s.level < def.minLevel) throw new GameError(`${def.nama} baru bisa dibuka di level desa ${def.minLevel}.`);
  const biaya = cara === 'beli' ? def.biaya : Math.round(def.biaya * 0.4);
  if (s.kas < biaya) throw new GameError(`Kas tidak cukup. Butuh Rp ${Math.round(biaya / JT)} jt.`);
  arus(s, 'Pembangunan', -biaya);
  s.dusun = [...terbuka, id];
  for (const [g, n] of Object.entries(def.jiwa) as [GroupId, number][]) s.penduduk[g] = (s.penduduk[g] ?? 0) + n;
  s.popularitas = Math.min(100, s.popularitas + 3);
  if (cara === 'serobot') {
    s.politik.kecurigaan = Math.min(100, s.politik.kecurigaan + 12);
    s.integritas = Math.max(0, s.integritas - 6);
    s.kepuasan.petani = Math.max(0, s.kepuasan.petani - 8);
    (s.antreanKartu ??= []).push({ cardId: 'sengketa_lahan', hari: s.hari + 20 });
    return `${def.nama} dibuka di atas tanah yang "dibebaskan" paksa. Warga baru berdatangan, tapi para pemilik lama mulai mengumpulkan surat.`;
  }
  const jiwa = Object.values(def.jiwa).reduce((t, n) => t + (n ?? 0), 0);
  return `${def.nama} resmi dibuka. Tanah dibeli dengan harga layak, ${jiwa} warga baru pindah dan lima lahan bangunan baru tersedia.`;
}

export function viewDusun(s: VillageState) {
  const terbuka = dusunTerbuka(s);
  return DUSUN.map((d, i) => ({
    id: d.id,
    nama: d.nama,
    teks: d.teks,
    biayaBeli: d.biaya,
    biayaSerobot: Math.round(d.biaya * 0.4),
    minLevel: d.minLevel,
    jiwa: Object.values(d.jiwa).reduce((t, n) => t + (n ?? 0), 0),
    bangunan: PROYEK_DUSUN.filter((p) => p.butuhDusun === d.id).map((p) => p.nama),
    terbuka: terbuka.includes(d.id),
    bisaDibuka: !terbuka.includes(d.id) && terbuka.length === i && s.level >= d.minLevel,
    giliran: terbuka.length === i,
  }));
}
