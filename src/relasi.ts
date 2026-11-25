// Politik ke atas dan ke samping: relasi kades dengan aparat (kapolsek, danramil) dan atasan
// (camat, bupati, gubernur, presiden), dukungan BPD, peraturan desa, pemilu atasan dan rotasi aparat,
// mosi pemakzulan, serta wakil kades.
//
// Relasi 0-100 (50 = biasa saja) dan memengaruhi permainan:
// - bupati: besar kecilnya termin dana desa; ikut menentukan apakah SK pemakzulan diteken
// - camat: relasi buruk bisa menahan pengesahan APBDes (termin tertunda)
// - gubernur, presiden: bantuan keuangan dan predikat desa percontohan di akhir tahun
// - kapolsek, danramil: mau tidaknya aparat membantu saat ada aksi massa, dan cepat lambatnya laporan warga
//   tentang kades diproses (peluang audit)
// Semua nama orang dan partai fiktif.
import { bantuMosi } from './tugas.ts';
import { arus } from './arus.ts';
import { GameError } from './errors.ts';
import { nextRandom } from './rng.ts';
import { bonusPerdes, tegakkanPerdes } from './usaha.ts';
import { beritaDesa } from './berita.ts';
import type { GroupId, IndexId, VillageState } from './types.ts';

const JT = 1_000_000;
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
type Catat = (j: 'info' | 'baik' | 'buruk' | 'politik', t: string) => void;

// ---------------------------------------------------------------- data

export type IdTokoh = 'kapolsek' | 'danramil' | 'camat' | 'bupati' | 'gubernur' | 'presiden';
export type JenisPemilihan = 'kapolsek' | 'danramil' | 'bupati' | 'gubernur' | 'presiden';
export type CaraDukung = 'netral' | 'restu' | 'kerahkan';

export const TOKOH: Record<IdTokoh, { jabatan: string; tingkat: 'aparat' | 'atasan'; biayaSowan: number; efek: string }> = {
  kapolsek: { jabatan: 'Kapolsek', tingkat: 'aparat', biayaSowan: 5 * JT, efek: 'Bantuan polisi saat ada aksi massa, dan cepat lambatnya laporan warga soal kades diproses.' },
  danramil: { jabatan: 'Danramil', tingkat: 'aparat', biayaSowan: 5 * JT, efek: 'Bantuan tentara saat ada aksi massa yang memanas.' },
  camat: { jabatan: 'Camat', tingkat: 'atasan', biayaSowan: 3 * JT, efek: 'Pengesahan APBDes. Relasi buruk bisa membuat termin dana desa tertahan.' },
  bupati: { jabatan: 'Bupati', tingkat: 'atasan', biayaSowan: 10 * JT, efek: 'Besaran termin dana desa (sampai ±10%) dan penentu SK pemakzulan kades.' },
  gubernur: { jabatan: 'Gubernur', tingkat: 'atasan', biayaSowan: 20 * JT, efek: 'Bantuan keuangan provinsi di akhir tahun kalau relasi baik.' },
  presiden: { jabatan: 'Presiden', tingkat: 'atasan', biayaSowan: 30 * JT, efek: 'Predikat desa percontohan nasional, atau inspeksi pusat kalau relasi buruk.' },
};

const URUT_TOKOH: IdTokoh[] = ['kapolsek', 'danramil', 'camat', 'bupati', 'gubernur', 'presiden'];

const NAMA: Record<IdTokoh, string[]> = {
  kapolsek: ['AKP Darmawan', 'AKP Hartono', 'Iptu Sasongko', 'AKP Rendra Wibowo', 'Iptu Wicaksono', 'AKP Yulia Pratiwi', 'Iptu Mahesa', 'AKP Gilang Saputro'],
  danramil: ['Kapten Surya', 'Kapten Gunawan', 'Kapten Baskara', 'Kapten Hartawan', 'Kapten Pandu', 'Kapten Ardiansyah', 'Kapten Tegar'],
  camat: ['Pak Wiryo', 'Bu Sulastri', 'Pak Haryadi', 'Bu Retno', 'Pak Kusnadi', 'Bu Endang', 'Pak Sigit'],
  bupati: ['Bambang Kertajaya', 'Ratna Wijayakusuma', 'Agus Prabandaru', 'Dedi Kusumanegara', 'Lilis Handayani', 'Yoga Pramudito', 'Hesti Rahayuningsih'],
  gubernur: ['Adrian Satyawira', 'Sekar Ayuningtyas', 'Hendro Wibisana', 'Mulyono Atmaja', 'Larasati Purnamasari', 'Rangga Mahendra'],
  presiden: ['Arya Wiratama', 'Dirga Mahaputra', 'Kirana Laksmi', 'Bagas Nugraha', 'Satria Adikara', 'Wening Kusumawardani'],
};

const PARTAI = ['Partai Pelita Rakyat', 'Partai Gerak Maju', 'Partai Tani Sejahtera', 'Partai Persatuan Nusantara', 'Partai Teduh Indonesia', 'Partai Karya Bangsa'];
const LATAR_APARAT = ['dikenal tegas', 'dekat dengan pengusaha', 'lulusan terbaik angkatan', 'putra daerah', 'baru pindah dari kota', 'disegani anak buah'];

/** Pengaruh dukungan desa terhadap peluang calon (restu = 1x, kerahkan = 2,5x). */
const PENGARUH: Record<JenisPemilihan, number> = { kapolsek: 0.16, danramil: 0.16, bupati: 0.12, gubernur: 0.06, presiden: 0.03 };
const BIAYA_KERAHKAN: Record<JenisPemilihan, number> = { kapolsek: 15 * JT, danramil: 15 * JT, bupati: 25 * JT, gubernur: 30 * JT, presiden: 40 * JT };
/** Jarak antar pemilihan/rotasi (hari game). */
const SIKLUS: Record<JenisPemilihan, number> = { kapolsek: 300, danramil: 330, bupati: 360, gubernur: 540, presiden: 720 };
const AWAL: Record<JenisPemilihan, number> = { kapolsek: 75, bupati: 150, danramil: 225, gubernur: 300, presiden: 420 };
const DURASI_PEMILIHAN = 30;

export const NAMA_PEMILIHAN: Record<JenisPemilihan, string> = {
  kapolsek: 'Rotasi Kapolsek',
  danramil: 'Rotasi Danramil',
  bupati: 'Pilkada Bupati',
  gubernur: 'Pilkada Gubernur',
  presiden: 'Pemilu Presiden',
};

export const HADIAH_PEMILIHAN: Record<JenisPemilihan, { menang: string; kalah: string }> = {
  kapolsek: { menang: 'Relasi kapolsek tinggi, gosip turun, polisi sigap saat ada aksi massa.', kalah: 'Kapolsek baru dingin: laporan warga soal kades diproses cepat, gosip naik.' },
  danramil: { menang: 'Relasi danramil tinggi, popularitas naik, tentara siap membantu.', kalah: 'Danramil baru enggan membantu desa saat ada aksi massa.' },
  bupati: { menang: 'Bantuan keuangan khusus untuk kas desa dan termin dana desa lebih besar.', kalah: 'Termin dana desa dipotong, camat ikut dingin, audit lebih sering.' },
  gubernur: { menang: 'Bantuan keuangan provinsi untuk kas desa.', kalah: 'Bantuan provinsi tidak akan mampir ke desamu.' },
  presiden: { menang: 'Dana program pusat, popularitas naik, peluang jadi desa percontohan.', kalah: 'Desa dicap kurang mendukung: inspeksi pusat lebih sering.' },
};

export interface PerdesDef {
  id: string;
  nama: string;
  teks: string;
  plus: string[];
  minus: string[];
  saatSah?: { integritas?: number; popularitas?: number; bpd?: number; relasi?: Partial<Record<IdTokoh, number>> };
  bulanan?: { kas?: number; kecurigaan?: number; popularitas?: number; bpd?: number; kepuasan?: Partial<Record<GroupId, number>>; indeks?: Partial<Record<IndexId, number>> };
}

export const PERDES: PerdesDef[] = [
  {
    id: 'transparansi',
    nama: 'Perdes Keterbukaan Anggaran',
    teks: 'APBDes dan realisasinya dipajang di baliho balai desa dan grup warga.',
    plus: ['Integritas +3', 'Gosip -1 tiap bulan', 'BPD +5'],
    minus: ['Aksi gelap lebih cepat ketahuan (gosip +5 tambahan)'],
    saatSah: { integritas: 3, bpd: 5 },
    bulanan: { kecurigaan: -1 },
  },
  {
    id: 'retribusi_pasar',
    nama: 'Perdes Retribusi Pasar Desa',
    teks: 'Pedagang di pasar dan lapak tepi jalan ditarik retribusi harian.',
    plus: ['Kas +6 jt tiap bulan'],
    minus: ['Pedagang -0,6 tiap bulan'],
    bulanan: { kas: 6 * JT, kepuasan: { pedagang: -0.6 } },
  },
  {
    id: 'perlindungan_sawah',
    nama: 'Perdes Perlindungan Lahan Sawah',
    teks: 'Sawah produktif tidak boleh dialihfungsikan jadi perumahan atau gudang.',
    plus: ['Petani +0,5 tiap bulan', 'Indeks lingkungan naik pelan'],
    minus: ['Bupati -8 (investor perumahan batal)', 'Pabrik yang butuh lahan sawah tidak bisa diizinkan'],
    saatSah: { relasi: { bupati: -8 } },
    bulanan: { kepuasan: { petani: 0.5 }, indeks: { lingkungan: 0.2 } },
  },
  {
    id: 'jam_malam',
    nama: 'Perdes Ketertiban dan Jam Malam',
    teks: 'Kegiatan di atas jam 23.00 wajib izin RT. Ronda digiatkan.',
    plus: ['Aksi massa lebih jarang', 'Kapolsek +6', 'Tokoh masyarakat +0,3 tiap bulan'],
    minus: ['Pemuda -0,6 tiap bulan'],
    saatSah: { relasi: { kapolsek: 6 } },
    bulanan: { kepuasan: { pemuda: -0.6, tokoh: 0.3 } },
  },
  {
    id: 'iuran_keamanan',
    nama: 'Perdes Iuran Keamanan Lingkungan',
    teks: 'Setiap rumah membayar iuran bulanan untuk pos ronda dan linmas.',
    plus: ['Kas +4 jt tiap bulan', 'Danramil +5'],
    minus: ['Semua warga -0,3 tiap bulan'],
    saatSah: { relasi: { danramil: 5 } },
    bulanan: { kas: 4 * JT, kepuasan: { petani: -0.3, pedagang: -0.3, pemuda: -0.3, pkk: -0.3, tokoh: -0.3, perantau: -0.3 } },
  },
  {
    id: 'upah_buruh',
    nama: 'Perdes Upah Layak Pekerja Proyek',
    teks: 'Pekerja proyek desa wajib dibayar minimal sesuai upah layak daerah.',
    plus: ['Mogok buruh jauh lebih jarang', 'Pemuda +0,4 tiap bulan'],
    minus: ['Kas -3 jt tiap bulan (subsidi upah)'],
    bulanan: { kas: -3 * JT, kepuasan: { pemuda: 0.4 } },
  },
  {
    id: 'musdes_rutin',
    nama: 'Perdes Musyawarah Desa Rutin',
    teks: 'Musyawarah desa terbuka setiap bulan. Warga boleh bertanya soal anggaran.',
    plus: ['BPD +1 tiap bulan', 'Popularitas +0,3 tiap bulan'],
    minus: ['Kas -2 jt tiap bulan (konsumsi rapat)'],
    bulanan: { kas: -2 * JT, bpd: 1, popularitas: 0.3 },
  },
  {
    id: 'larangan_tambang',
    nama: 'Perdes Larangan Tambang Pasir',
    teks: 'Penambangan pasir di sungai desa dilarang total.',
    plus: ['Indeks lingkungan naik', 'Petani +0,3 tiap bulan', 'Popularitas +3'],
    minus: ['Bupati -10 dan gubernur -6 (izin tambang batal)', 'Tambang yang sudah beroperasi ikut ditutup'],
    saatSah: { popularitas: 3, relasi: { bupati: -10, gubernur: -6 } },
    bulanan: { kepuasan: { petani: 0.3 }, indeks: { lingkungan: 0.3 } },
  },
];

export const MAKS_PERDES = 4;

export type LatarWakil = 'mantan_aktivis' | 'anak_juragan' | 'keponakan_bupati' | 'pensiunan_aparat' | 'ketua_tani' | 'rival_pilkades' | 'kader_partai' | 'guru_honorer';

export interface LatarWakilDef {
  nama: string;
  plus: string[];
  minus: string[];
  saatMasuk?: { integritas?: number; popularitas?: number; bpd?: number; relasi?: Partial<Record<IdTokoh, number>> };
  bulanan?: { kas?: number; dompet?: number; kecurigaan?: number; popularitas?: number; kepuasan?: Partial<Record<GroupId, number>> };
  loyalitas: [number, number];
  ambisi: [number, number];
}

export const LATAR_WAKIL: Record<LatarWakil, LatarWakilDef> = {
  mantan_aktivis: {
    nama: 'Mantan aktivis mahasiswa',
    plus: ['Pemuda +0,5 tiap bulan', 'BPD +5', 'Integritas +2'],
    minus: ['Bupati -8', 'Suka mengkritik kades di depan umum'],
    saatMasuk: { bpd: 5, integritas: 2, relasi: { bupati: -8 } },
    bulanan: { kepuasan: { pemuda: 0.5 } },
    loyalitas: [45, 70],
    ambisi: [45, 75],
  },
  anak_juragan: {
    nama: 'Anak juragan beras',
    plus: ['Pedagang +0,5 tiap bulan', 'Setoran Rp 2 jt per bulan ke kantong kades'],
    minus: ['Gosip +1 tiap bulan'],
    bulanan: { dompet: 2 * JT, kecurigaan: 1, kepuasan: { pedagang: 0.5 } },
    loyalitas: [55, 80],
    ambisi: [30, 55],
  },
  keponakan_bupati: {
    nama: 'Keponakan bupati',
    plus: ['Bupati +15', 'Camat +10 (selama bupatinya tidak berganti)'],
    minus: ['Integritas -4 (nepotisme)', 'Warga -0,2 tiap bulan'],
    saatMasuk: { integritas: -4, relasi: { bupati: 15, camat: 10 } },
    bulanan: { kepuasan: { petani: -0.2, pedagang: -0.2, pemuda: -0.2 } },
    loyalitas: [40, 65],
    ambisi: [55, 85],
  },
  pensiunan_aparat: {
    nama: 'Pensiunan aparat',
    plus: ['Kapolsek +10', 'Danramil +10', 'Tokoh masyarakat +0,3 tiap bulan'],
    minus: ['Pemuda -0,4 tiap bulan'],
    saatMasuk: { relasi: { kapolsek: 10, danramil: 10 } },
    bulanan: { kepuasan: { tokoh: 0.3, pemuda: -0.4 } },
    loyalitas: [60, 85],
    ambisi: [20, 45],
  },
  ketua_tani: {
    nama: 'Ketua kelompok tani',
    plus: ['Petani +0,6 tiap bulan', 'Loyal'],
    minus: ['Kas -1 jt tiap bulan (bantuan bibit titipan)'],
    bulanan: { kas: -1 * JT, kepuasan: { petani: 0.6 } },
    loyalitas: [65, 90],
    ambisi: [15, 40],
  },
  rival_pilkades: {
    nama: 'Mantan rival pilkades',
    plus: ['Popularitas +4', 'BPD +8 (rekonsiliasi)'],
    minus: ['Loyalitas rendah, ambisi tinggi: bisa menusuk dari belakang'],
    saatMasuk: { popularitas: 4, bpd: 8 },
    loyalitas: [25, 50],
    ambisi: [65, 90],
  },
  kader_partai: {
    nama: 'Kader partai',
    plus: ['Gubernur +8', 'Presiden +5'],
    minus: ['Gosip +0,5 tiap bulan', 'Ambisi tinggi'],
    saatMasuk: { relasi: { gubernur: 8, presiden: 5 } },
    bulanan: { kecurigaan: 0.5 },
    loyalitas: [40, 65],
    ambisi: [55, 80],
  },
  guru_honorer: {
    nama: 'Guru honorer',
    plus: ['Integritas +2', 'Popularitas +0,3 tiap bulan', 'PKK +0,3 tiap bulan'],
    minus: ['Tidak punya jaringan ke atas', 'Tunjangan tambahan Rp 1 jt per bulan'],
    saatMasuk: { integritas: 2 },
    bulanan: { kas: -1 * JT, popularitas: 0.3, kepuasan: { pkk: 0.3 } },
    loyalitas: [55, 80],
    ambisi: [20, 45],
  },
};

const NAMA_WAKIL = {
  l: ['Pak Darto', 'Mas Yogi', 'Pak Sarwono', 'Kang Ujang', 'Mas Bowo', 'Pak Rusdi', 'Mas Aris', 'Pak Tarno', 'Kang Asep', 'Mas Gilang'],
  p: ['Bu Warsini', 'Mbak Ningrum', 'Bu Kartini', 'Teh Euis', 'Mbak Sekar', 'Bu Murni', 'Mbak Laras', 'Bu Yati'],
};

/** Tunjangan wakil kades dari kas desa per bulan. */
export const TUNJANGAN_WAKIL = 3 * JT;

// ---------------------------------------------------------------- state

export interface Tokoh {
  nama: string;
  kubu: string;
  relasi: number;
  sejakHari: number;
}

export interface CalonAtas {
  id: string;
  nama: string;
  kubu: string;
  kekuatan: number;
}

export interface Pemilihan {
  jenis: JenisPemilihan;
  mulaiHari: number;
  hasilHari: number;
  calon: CalonAtas[];
  dukung: { calonId: string | null; cara: CaraDukung } | null;
}

export interface Wakil {
  id: string;
  nama: string;
  latar: LatarWakil;
  loyalitas: number;
  ambisi: number;
  sejakHari?: number;
  /** Tunjangan sedang telat (supaya pemberitahuan cukup sekali per masa telat). */
  telat?: boolean;
}

export interface Mosi {
  mulaiHari: number;
  batasHari: number;
  respon: string[];
  dilindungi: boolean;
}

export interface StateRelasi {
  /** Biaya politik yang dibayar dari anggaran dinas desa bulan ini (untuk batas wajar). */
  dinas?: { bulan: number; total: number };
  tokoh: Record<IdTokoh, Tokoh>;
  /** Dukungan BPD terhadap kades (0-100). */
  bpd: number;
  pemilihan: Pemilihan | null;
  jadwal: Record<JenisPemilihan, number>;
  perdes: string[];
  mosi: Mosi | null;
  wakil: Wakil | null;
  kandidatWakil: Wakil[];
  jeda: Record<string, number>;
  nomor: number;
}

// nama awal diambil dari hash nama desa, supaya tidak memakai RNG (aman dipanggil dari tampilan)
function hash(t: string): number {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pilihTetap<T>(s: VillageState, xs: T[], garam: string): T {
  return xs[hash(`${s.namaDesa}|${s.namaKades}|${garam}`) % xs.length];
}

function pilihAcak<T>(s: VillageState, xs: T[]): T {
  return xs[Math.floor(nextRandom(s) * xs.length)];
}

function kubuTokoh(id: IdTokoh, pilih: (xs: string[]) => string): string {
  if (id === 'kapolsek' || id === 'danramil') return pilih(LATAR_APARAT);
  if (id === 'camat') return 'ditunjuk bupati';
  return pilih(PARTAI);
}

function buatWakilTetap(s: VillageState, i: number): Wakil {
  const latar = pilihTetap(s, Object.keys(LATAR_WAKIL) as LatarWakil[], `wakil-latar-${i}`);
  const def = LATAR_WAKIL[latar];
  const g = hash(`${s.namaDesa}|g${i}`) % 3 === 0 ? 'p' : 'l';
  const r = (hash(`${s.namaDesa}|r${i}`) % 1000) / 1000;
  return {
    id: `w${i}`,
    nama: pilihTetap(s, NAMA_WAKIL[g], `wakil-nama-${i}`),
    latar,
    loyalitas: Math.round(def.loyalitas[0] + r * (def.loyalitas[1] - def.loyalitas[0])),
    ambisi: Math.round(def.ambisi[0] + (1 - r) * (def.ambisi[1] - def.ambisi[0])),
  };
}

export function stateRelasi(s: VillageState): StateRelasi {
  if (s.relasi) return s.relasi;
  const tokoh = {} as Record<IdTokoh, Tokoh>;
  for (const id of URUT_TOKOH) {
    tokoh[id] = { nama: pilihTetap(s, NAMA[id], id), kubu: kubuTokoh(id, (xs) => pilihTetap(s, xs, `kubu-${id}`)), relasi: 50, sejakHari: 0 };
  }
  const jadwal = {} as Record<JenisPemilihan, number>;
  for (const j of Object.keys(AWAL) as JenisPemilihan[]) jadwal[j] = Math.max(s.hari + 30, AWAL[j] + (hash(`${s.namaDesa}|${j}`) % 30));
  // wakil unik latar
  const kandidat: Wakil[] = [];
  for (let i = 0; kandidat.length < 3 && i < 12; i++) {
    const w = buatWakilTetap(s, i);
    if (!kandidat.some((k) => k.latar === w.latar || k.nama === w.nama)) kandidat.push(w);
  }
  s.relasi = { tokoh, bpd: 55, pemilihan: null, jadwal, perdes: [], mosi: null, wakil: null, kandidatWakil: kandidat, jeda: {}, nomor: 10 };
  return s.relasi;
}

// ---------------------------------------------------------------- bantuan

function ubahRelasi(r: StateRelasi, id: IdTokoh, d: number) {
  r.tokoh[id].relasi = clamp(r.tokoh[id].relasi + d);
}

function cekJeda(s: VillageState, r: StateRelasi, kunci: string, nama: string) {
  const sampai = r.jeda[kunci] ?? 0;
  if (s.hari < sampai) throw new GameError(`${nama} bisa dilakukan lagi dalam ${sampai - s.hari} hari.`);
}

function bayarDompet(s: VillageState, n: number, untuk: string) {
  if (s.politik.dompet < n) throw new GameError(`Uang pribadimu kurang untuk ${untuk} (butuh Rp ${Math.round(n / JT)} jt). Kamu bisa memakai anggaran dinas desa.`);
  s.politik.dompet -= n;
}

export type SumberDana = 'pribadi' | 'dinas';
/** Batas wajar perjalanan dan jamuan dinas per bulan; di atas itu warga dan BPD mulai curiga. */
export const BATAS_DINAS = 20 * JT;

/**
 * Bayar biaya politik dari uang pribadi atau dari anggaran perjalanan dan jamuan dinas desa (resmi, tercatat
 * di laporan keuangan). Anggaran dinas sedikit menaikkan gosip, dan melonjak kalau melewati batas wajar sebulan.
 */
function bayarPolitik(s: VillageState, n: number, untuk: string, dana: SumberDana = 'pribadi'): string {
  if (dana === 'pribadi') {
    bayarDompet(s, n, untuk);
    return '';
  }
  if (s.kas < n) throw new GameError(`Kas desa kurang untuk ${untuk} (butuh Rp ${Math.round(n / JT)} jt).`);
  const r = stateRelasi(s);
  const bulan = Math.floor(s.hari / 30);
  if (!r.dinas || r.dinas.bulan !== bulan) r.dinas = { bulan, total: 0 };
  r.dinas.total += n;
  arus(s, 'Perjalanan & jamuan dinas', -n);
  if (r.dinas.total > BATAS_DINAS) {
    s.politik.kecurigaan = clamp(s.politik.kecurigaan + 4);
    s.integritas = clamp(s.integritas - 1);
    return ` Dibayar dari anggaran dinas, tapi biaya dinas bulan ini sudah Rp ${Math.round(r.dinas.total / JT)} jt: warga mulai bertanya-tanya. (gosip +4, integritas -1)`;
  }
  s.politik.kecurigaan = clamp(s.politik.kecurigaan + 1);
  return ` Dibayar dari anggaran dinas desa (tercatat di laporan, gosip +1).`;
}

function terapkan(s: VillageState, r: StateRelasi, e: PerdesDef['saatSah'] | undefined) {
  if (!e) return;
  if (e.integritas) s.integritas = clamp(s.integritas + e.integritas);
  if (e.popularitas) s.popularitas = clamp(s.popularitas + e.popularitas);
  if (e.bpd) r.bpd = clamp(r.bpd + e.bpd);
  for (const [id, d] of Object.entries(e.relasi ?? {})) ubahRelasi(r, id as IdTokoh, d ?? 0);
}

function rataKepuasan(s: VillageState): number {
  const v = Object.values(s.kepuasan);
  return v.reduce((t, x) => t + x, 0) / v.length;
}

function wakilMembelot(r: StateRelasi): boolean {
  return Boolean(r.wakil && r.wakil.loyalitas < 30 && r.wakil.ambisi >= 55);
}

// ---------------------------------------------------------------- dampak ke sistem lain

/** Pengali termin dana desa dari relasi bupati: 0,9 (musuh) sampai 1,1 (sekutu). */
export function faktorTermin(s: VillageState): number {
  if (!s.relasi) return 1;
  return 1 + (s.relasi.tokoh.bupati.relasi - 50) / 500;
}

/** Pengali peluang audit inspektorat: aparat dan bupati yang dingin membuat laporan warga cepat diproses. */
export function faktorAudit(s: VillageState): number {
  if (!s.relasi) return 1;
  const t = s.relasi.tokoh;
  return Math.max(0.6, Math.min(1.5, 1 + (50 - t.kapolsek.relasi) / 160 + (50 - t.bupati.relasi) / 220 + (50 - t.presiden.relasi) / 400));
}

/** Pengali peluang munculnya aksi massa (perdes jam malam, upah layak, wakil pensiunan aparat). */
export function faktorPemicuUnjuk(s: VillageState, jenis: 'demo' | 'mogok_buruh' | 'lain'): number {
  const r = s.relasi;
  if (!r) return 1;
  let f = 1;
  if (r.perdes.includes('jam_malam') && jenis === 'demo') f *= 0.7;
  if (r.perdes.includes('upah_buruh') && jenis === 'mogok_buruh') f *= 0.35;
  if (r.wakil?.latar === 'pensiunan_aparat') f *= 0.85;
  return f;
}

/** Relasi aparat (kapolsek/danramil) untuk penanganan aksi massa. */
export function relasiAparat(s: VillageState, id: 'kapolsek' | 'danramil'): number {
  return s.relasi?.tokoh[id].relasi ?? 50;
}

export function namaTokoh(s: VillageState, id: IdTokoh): string {
  return stateRelasi(s).tokoh[id].nama;
}

export function perdesAktif(s: VillageState, id: string): boolean {
  return Boolean(s.relasi?.perdes.includes(id));
}

// ---------------------------------------------------------------- aksi

export type AksiRelasi = 'sowan' | 'kritik';

export function aturRelasi(s: VillageState, aksi: AksiRelasi, id: IdTokoh, dana: SumberDana = 'pribadi'): string {
  const r = stateRelasi(s);
  const t = r.tokoh[id];
  const def = TOKOH[id];
  if (!def) throw new GameError('Tokoh tidak dikenal.');
  if (aksi === 'sowan') {
    cekJeda(s, r, `sowan:${id}`, `Sowan ke ${def.jabatan.toLowerCase()}`);
    if (id === 'presiden' && s.popularitas < 70) throw new GameError('Audiensi dengan presiden hanya untuk kades yang populer (popularitas minimal 70).');
    const catatanDana = bayarPolitik(s, def.biayaSowan, `sowan ke ${def.jabatan.toLowerCase()}`, dana);
    const naik = Math.round(6 + nextRandom(s) * 5);
    ubahRelasi(r, id, naik);
    r.jeda[`sowan:${id}`] = s.hari + (id === 'presiden' ? 180 : 30);
    if (def.tingkat === 'aparat') s.politik.kecurigaan = clamp(s.politik.kecurigaan + 1);
    const teks: Record<IdTokoh, string> = {
      kapolsek: `Kades ngopi bareng ${t.nama} di polsek sambil membawa bingkisan. Hubungan makin cair.`,
      danramil: `Kades ikut senam pagi di koramil bersama ${t.nama}, lalu sarapan bersama.`,
      camat: `Kades sowan ke rumah ${t.nama} membawa oleh-oleh hasil bumi desa.`,
      bupati: `Kades menghadiri acara keluarga ${t.nama} dan menyalami beliau di depan para tamu.`,
      gubernur: `Kades ikut rombongan forum desa ke kantor gubernur dan sempat berfoto dengan ${t.nama}.`,
      presiden: `Kades diundang audiensi singkat dengan Presiden ${t.nama}. Fotonya beredar di grup warga.`,
    };
    if (id === 'presiden') s.popularitas = clamp(s.popularitas + 3);
    return `${teks[id]} (relasi +${naik})${catatanDana}`;
  }
  // kritik terbuka: populer di warga, merusak relasi
  cekJeda(s, r, `kritik:${id}`, `Kritik terbuka ke ${def.jabatan.toLowerCase()}`);
  ubahRelasi(r, id, -15);
  r.jeda[`kritik:${id}`] = s.hari + 30;
  s.popularitas = clamp(s.popularitas + 3);
  s.kepuasan.pemuda = clamp(s.kepuasan.pemuda + 4);
  s.kepuasan.perantau = clamp(s.kepuasan.perantau + 2);
  if (t.relasi < 25 && (id === 'bupati' || id === 'camat') && nextRandom(s) < 0.4) {
    s.politik.kecurigaan = clamp(s.politik.kecurigaan + 6);
    return `Kritik kades ke ${def.jabatan.toLowerCase()} viral. Seminggu kemudian inspektorat "kebetulan" menjadwalkan pemeriksaan ke desa. (relasi -15)`;
  }
  return `Kades mengkritik kebijakan ${def.jabatan.toLowerCase()} ${t.nama} di depan wartawan lokal. Warga muda bertepuk tangan. (relasi -15)`;
}

export function dukungCalon(s: VillageState, calonId: string | null, cara: CaraDukung): string {
  const r = stateRelasi(s);
  const p = r.pemilihan;
  if (!p) throw new GameError('Tidak ada pemilihan atau rotasi yang sedang berjalan.');
  if (p.dukung) throw new GameError('Sikapmu di pemilihan ini sudah diputuskan.');
  const nama = NAMA_PEMILIHAN[p.jenis];
  if (cara === 'netral') {
    p.dukung = { calonId: null, cara: 'netral' };
    s.integritas = clamp(s.integritas + 1);
    return `Kades menyatakan netral di ${nama}. Aparat desa dilarang ikut kampanye.`;
  }
  const c = p.calon.find((x) => x.id === calonId);
  if (!c) throw new GameError('Calon tidak ditemukan.');
  const aparat = p.jenis === 'kapolsek' || p.jenis === 'danramil';
  if (cara === 'kerahkan') {
    bayarDompet(s, BIAYA_KERAHKAN[p.jenis], aparat ? 'lobi ke atasan' : 'mengerahkan dukungan');
    s.politik.kecurigaan = clamp(s.politik.kecurigaan + (aparat ? 3 : 5));
    if (!aparat) {
      s.integritas = clamp(s.integritas - 2);
      const g = pilihAcak(s, Object.keys(s.kepuasan) as GroupId[]);
      s.kepuasan[g] = clamp(s.kepuasan[g] - 3);
    }
  } else if (!aparat) {
    s.politik.kecurigaan = clamp(s.politik.kecurigaan + 2);
  }
  p.dukung = { calonId: c.id, cara };
  if (aparat)
    return cara === 'kerahkan'
      ? `Kades melobi atasan ${c.nama} lewat jalur "silaturahmi" dan bingkisan. Rekomendasi desa ikut dipertimbangkan.`
      : `Kades mengirim surat rekomendasi untuk ${c.nama} ke kabupaten.`;
  return cara === 'kerahkan'
    ? `Kades mengerahkan RT, RW, dan kader desa untuk memenangkan ${c.nama} (${c.kubu}). Bawaslu mulai melirik.`
    : `Kades terang-terangan memberi restu ke ${c.nama} (${c.kubu}) di acara warga.`;
}

export type AksiBpd = 'jamuan' | 'rapat_terbuka';

export function aturBpd(s: VillageState, aksi: AksiBpd, dana: SumberDana = 'pribadi'): string {
  const r = stateRelasi(s);
  if (aksi === 'jamuan') {
    cekJeda(s, r, 'bpd:jamuan', 'Jamuan BPD');
    const catatanDana = bayarPolitik(s, 8 * JT, 'menjamu anggota BPD', dana);
    r.bpd = clamp(r.bpd + 8);
    s.politik.kecurigaan = clamp(s.politik.kecurigaan + 2);
    s.integritas = clamp(s.integritas - 1);
    r.jeda['bpd:jamuan'] = s.hari + 30;
    return 'Anggota BPD dijamu makan malam di rumah makan kota. Pulangnya masing-masing membawa "oleh-oleh". (BPD +8)' + catatanDana;
  }
  cekJeda(s, r, 'bpd:rapat', 'Rapat terbuka dengan BPD');
  const naik = 3 + (s.integritas >= 60 ? 3 : 0);
  r.bpd = clamp(r.bpd + naik);
  s.popularitas = clamp(s.popularitas + 1);
  r.jeda['bpd:rapat'] = s.hari + 30;
  return `Kades rapat terbuka dengan BPD, membahas anggaran baris per baris. (BPD +${naik})`;
}

export function peluangPerdes(s: VillageState): number {
  const r = stateRelasi(s);
  return Math.max(0.1, Math.min(0.95, 0.2 + (r.bpd / 100) * 0.9 + bonusPerdes(s)));
}

export function aturPerdes(s: VillageState, id: string, aksi: 'usul' | 'cabut'): string {
  const r = stateRelasi(s);
  const def = PERDES.find((d) => d.id === id);
  if (!def) throw new GameError('Perdes tidak dikenal.');
  if (aksi === 'cabut') {
    if (!r.perdes.includes(id)) throw new GameError('Perdes ini tidak sedang berlaku.');
    r.perdes = r.perdes.filter((x) => x !== id);
    r.bpd = clamp(r.bpd - 2);
    return `${def.nama} dicabut. Sebagian anggota BPD menggerutu karena dulu ikut membahasnya.`;
  }
  if (r.perdes.includes(id)) throw new GameError('Perdes ini sudah berlaku.');
  if (r.perdes.length >= MAKS_PERDES) throw new GameError(`Maksimal ${MAKS_PERDES} perdes politis berlaku bersamaan. Cabut salah satu dulu.`);
  cekJeda(s, r, 'perdes', 'Mengajukan perdes baru');
  r.jeda.perdes = s.hari + 30;
  if (nextRandom(s) < peluangPerdes(s)) {
    r.perdes.push(id);
    terapkan(s, r, def.saatSah);
    const tutup = tegakkanPerdes(s, id);
    return `BPD menyetujui ${def.nama}. Perdes langsung berlaku.${tutup ? ` ${tutup} harus berhenti beroperasi (relasi bupati turun, pekerja dirumahkan).` : ''}`;
  }
  r.bpd = clamp(r.bpd - 3);
  return `BPD menolak ${def.nama}. Rapat paripurna berakhir dengan walk out. (BPD -3)`;
}

export type ResponMosi = 'lobi' | 'dialog' | 'perlindungan';

export function responMosi(s: VillageState, cara: ResponMosi): string {
  const r = stateRelasi(s);
  const m = r.mosi;
  if (!m) throw new GameError('Tidak ada mosi pemakzulan.');
  if (m.respon.includes(cara)) throw new GameError('Langkah ini sudah kamu ambil.');
  if (cara === 'lobi') {
    bayarDompet(s, 20 * JT, 'melobi anggota BPD');
    m.respon.push(cara);
    r.bpd = clamp(r.bpd + 12);
    s.politik.kecurigaan = clamp(s.politik.kecurigaan + 3);
    return 'Satu per satu anggota BPD didatangi malam-malam. Beberapa mulai ragu menandatangani hak angket. (BPD +12)';
  }
  if (cara === 'dialog') {
    m.respon.push(cara);
    if (s.popularitas >= 45) {
      r.bpd = clamp(r.bpd + 8);
      return 'Kades menggelar dialog terbuka di balai desa. Warga yang hadir membela kades. (BPD +8)';
    }
    r.bpd = clamp(r.bpd + 2);
    s.popularitas = clamp(s.popularitas - 1);
    return 'Dialog terbuka sepi peminat. Yang datang justru meneriaki kades. (BPD +2)';
  }
  const t = r.tokoh.bupati;
  if (t.relasi < 55) throw new GameError(`Bupati ${t.nama} tidak cukup dekat denganmu untuk dimintai perlindungan (relasi minimal 55).`);
  m.respon.push(cara);
  m.dilindungi = true;
  ubahRelasi(r, 'bupati', -10);
  return `Bupati ${t.nama} berjanji tidak akan meneken SK pemberhentian. Tentu saja, ada harganya. (relasi bupati -10)`;
}

export type AksiWakil = 'pilih' | 'rangkul' | 'berhentikan' | 'cari';

export function aturWakil(s: VillageState, aksi: AksiWakil, id?: string, dana: SumberDana = 'pribadi'): string {
  const r = stateRelasi(s);
  if (aksi === 'cari') {
    if (r.wakil) throw new GameError('Kursi wakil kades sudah terisi. Berhentikan dulu wakil yang sekarang sebelum mencari calon baru.');
    cekJeda(s, r, 'wakil:cari', 'Mencari calon wakil baru');
    r.jeda['wakil:cari'] = s.hari + 30;
    r.kandidatWakil = buatKandidatAcak(s, r);
    return 'Tiga nama baru disodorkan para tokoh untuk kursi wakil kades.';
  }
  if (aksi === 'pilih') {
    if (r.wakil) throw new GameError('Kursi wakil kades sudah terisi. Berhentikan dulu wakil yang sekarang.');
    const w = r.kandidatWakil.find((k) => k.id === id);
    if (!w) throw new GameError('Calon wakil tidak ditemukan.');
    const def = LATAR_WAKIL[w.latar];
    r.wakil = { ...w, sejakHari: s.hari };
    r.kandidatWakil = r.kandidatWakil.filter((k) => k.id !== w.id);
    terapkan(s, r, def.saatMasuk);
    return `${w.nama} (${def.nama.toLowerCase()}) dilantik jadi wakil kades.`;
  }
  const w = r.wakil;
  if (!w) throw new GameError('Belum ada wakil kades.');
  if (aksi === 'rangkul') {
    cekJeda(s, r, 'wakil:rangkul', 'Merangkul wakil');
    const catatanDana = bayarPolitik(s, 5 * JT, 'merangkul wakil', dana);
    r.jeda['wakil:rangkul'] = s.hari + 30;
    w.loyalitas = clamp(w.loyalitas + 12);
    return `Kades mengajak ${w.nama} makan malam dan memberinya proyek kecil untuk diurus. (loyalitas +12)${catatanDana}`;
  }
  // berhentikan
  cekJeda(s, r, 'wakil:ganti', 'Mengganti wakil');
  r.wakil = null;
  r.jeda['wakil:ganti'] = s.hari + 60;
  r.bpd = clamp(r.bpd - 5);
  if (w.latar === 'keponakan_bupati') ubahRelasi(r, 'bupati', -15);
  if (w.latar === 'rival_pilkades') s.popularitas = clamp(s.popularitas - 3);
  if (w.latar === 'pensiunan_aparat') {
    ubahRelasi(r, 'kapolsek', -6);
    ubahRelasi(r, 'danramil', -6);
  }
  if (r.kandidatWakil.length === 0) r.kandidatWakil = buatKandidatAcak(s, r);
  const dendam = w.ambisi >= 60;
  if (dendam) s.flags = [...new Set([...(s.flags ?? []), 'mantan_wakil_dendam'])];
  return `${w.nama} diberhentikan dari kursi wakil kades.${dendam ? ' Dia pulang dengan dendam dan mulai mengumpulkan pendukung.' : ''} (BPD -5)`;
}

function buatKandidatAcak(s: VillageState, r: StateRelasi): Wakil[] {
  const latar = (Object.keys(LATAR_WAKIL) as LatarWakil[]).filter((l) => l !== r.wakil?.latar);
  const hasil: Wakil[] = [];
  const dipakai = new Set<string>([r.wakil?.nama ?? '']);
  while (hasil.length < 3 && latar.length) {
    const l = latar.splice(Math.floor(nextRandom(s) * latar.length), 1)[0];
    const def = LATAR_WAKIL[l];
    const g = nextRandom(s) < 0.35 ? 'p' : 'l';
    let nama = pilihAcak(s, NAMA_WAKIL[g]);
    for (let i = 0; dipakai.has(nama) && i < 5; i++) nama = pilihAcak(s, NAMA_WAKIL[g]);
    dipakai.add(nama);
    hasil.push({
      id: `w${r.nomor++}`,
      nama,
      latar: l,
      loyalitas: Math.round(def.loyalitas[0] + nextRandom(s) * (def.loyalitas[1] - def.loyalitas[0])),
      ambisi: Math.round(def.ambisi[0] + nextRandom(s) * (def.ambisi[1] - def.ambisi[0])),
    });
  }
  return hasil;
}

// ---------------------------------------------------------------- harian & bulanan

function mulaiPemilihan(s: VillageState, r: StateRelasi, jenis: JenisPemilihan, catat: Catat) {
  const idTokoh = jenis as IdTokoh;
  const petahana = r.tokoh[idTokoh];
  const aparat = jenis === 'kapolsek' || jenis === 'danramil';
  const calon: CalonAtas[] = [];
  const namaPakai = new Set<string>([petahana.nama]);
  for (let i = 0; i < 2; i++) {
    let nama = pilihAcak(s, NAMA[idTokoh]);
    for (let k = 0; namaPakai.has(nama) && k < 8; k++) nama = pilihAcak(s, NAMA[idTokoh]);
    namaPakai.add(nama);
    const kubu = aparat ? pilihAcak(s, LATAR_APARAT) : pilihAcak(s, PARTAI.filter((x) => !calon.some((c) => c.kubu === x)));
    calon.push({ id: `c${r.nomor++}`, nama, kubu, kekuatan: Math.round(40 + nextRandom(s) * 30) });
  }
  // pilkada: petahana ikut maju kalau belum dua kali (sederhana: 50%)
  if (!aparat && nextRandom(s) < 0.5) calon[0] = { id: `c${r.nomor++}`, nama: petahana.nama, kubu: petahana.kubu, kekuatan: Math.round(50 + nextRandom(s) * 20) };
  r.pemilihan = { jenis, mulaiHari: s.hari, hasilHari: s.hari + DURASI_PEMILIHAN, calon, dukung: null };
  const daftar = calon.map((c) => `${c.nama} (${c.kubu})`).join(' vs ');
  catat(
    'politik',
    aparat
      ? `${NAMA_PEMILIHAN[jenis]}: kabupaten menimbang dua nama, ${daftar}. Rekomendasi kades bisa ikut menentukan.`
      : `${NAMA_PEMILIHAN[jenis]} dimulai: ${daftar}. Hasilnya diumumkan ${DURASI_PEMILIHAN} hari lagi. Kades bisa netral, memberi restu, atau mengerahkan warga.`,
  );
}

export function peluangCalon(p: Pemilihan): number[] {
  const total = p.calon.reduce((t, c) => t + c.kekuatan, 0);
  const dasar = p.calon.map((c) => c.kekuatan / total);
  if (p.dukung?.calonId) {
    const i = p.calon.findIndex((c) => c.id === p.dukung!.calonId);
    const geser = PENGARUH[p.jenis] * (p.dukung.cara === 'kerahkan' ? 2.5 : 1);
    if (i >= 0) {
      dasar[i] = Math.min(0.95, dasar[i] + geser);
      dasar[1 - i] = 1 - dasar[i];
    }
  }
  return dasar;
}

function selesaiPemilihan(s: VillageState, r: StateRelasi, catat: Catat) {
  const p = r.pemilihan!;
  r.pemilihan = null;
  r.jadwal[p.jenis] = s.hari + SIKLUS[p.jenis];
  const pel = peluangCalon(p);
  const menangIdx = nextRandom(s) < pel[0] ? 0 : 1;
  const pemenang = p.calon[menangIdx];
  const id = p.jenis as IdTokoh;
  const lama = r.tokoh[id].nama;
  const cara = p.dukung?.cara ?? 'netral';
  const m = cara === 'kerahkan' ? 2 : 1;
  const didukung = p.dukung?.calonId ?? null;
  let relasiBaru = 50;
  const judul = NAMA_PEMILIHAN[p.jenis];
  const lanjut = pemenang.nama === lama ? `${pemenang.nama} bertahan` : `${pemenang.nama} (${pemenang.kubu}) terpilih`;

  if (!didukung) {
    relasiBaru = 50;
    catat('politik', `${judul}: ${lanjut}. Kades netral, hubungan dengan pejabat baru dimulai dari nol.`);
  } else if (didukung === pemenang.id) {
    relasiBaru = cara === 'kerahkan' ? 86 : 72;
    const hadiah: string[] = [];
    if (id === 'kapolsek') {
      s.politik.kecurigaan = clamp(s.politik.kecurigaan - 5 * m);
      hadiah.push(`gosip -${5 * m}`);
    } else if (id === 'danramil') {
      s.popularitas = clamp(s.popularitas + 2 * m);
      hadiah.push(`popularitas +${2 * m}`);
    } else if (id === 'bupati') {
      const n = 40 * JT * m;
      arus(s, 'Bonus & hadiah', n);
      ubahRelasi(r, 'camat', 8 * m);
      hadiah.push(`bantuan keuangan khusus Rp ${n / JT} jt`, `camat +${8 * m}`);
    } else if (id === 'gubernur') {
      const n = 60 * JT * m;
      arus(s, 'Bonus & hadiah', n);
      hadiah.push(`bantuan provinsi Rp ${n / JT} jt`);
    } else {
      const n = 100 * JT * m;
      arus(s, 'Bonus & hadiah', n);
      s.popularitas = clamp(s.popularitas + 3);
      hadiah.push(`dana program pusat Rp ${n / JT} jt`, 'popularitas +3');
    }
    catat('baik', `${judul}: ${lanjut}. Jagoan desa menang! Balas jasa: ${hadiah.join(', ')}.`);
  } else {
    relasiBaru = cara === 'kerahkan' ? 12 : 25;
    const akibat: string[] = [];
    if (id === 'kapolsek') {
      s.politik.kecurigaan = clamp(s.politik.kecurigaan + 4 * m);
      akibat.push(`gosip +${4 * m}`);
    } else if (id === 'bupati') {
      ubahRelasi(r, 'camat', -10 * m);
      s.politik.kecurigaan = clamp(s.politik.kecurigaan + 3 * m);
      akibat.push(`camat -${10 * m}`, `gosip +${3 * m}`);
    } else if (id === 'presiden') {
      s.politik.kecurigaan = clamp(s.politik.kecurigaan + 2 * m);
      akibat.push(`gosip +${2 * m}`);
    }
    catat('buruk', `${judul}: ${lanjut}. Jagoan desa kalah, dan pemenangnya ingat siapa yang dulu berseberangan.${akibat.length ? ` (${akibat.join(', ')})` : ''}`);
  }
  r.tokoh[id] = { nama: pemenang.nama, kubu: pemenang.kubu, relasi: relasiBaru, sejakHari: s.hari };
  beritaDesa(
    s,
    p.jenis === 'kapolsek' || p.jenis === 'danramil' ? `${pemenang.nama} Resmi Jadi ${TOKOH[id].jabatan} Baru` : `${pemenang.nama} Menangi ${judul}`,
    p.jenis === 'kapolsek' || p.jenis === 'danramil' ? `Serah terima jabatan digelar di kecamatan. ${lama} pindah tugas.` : `${pemenang.nama} (${pemenang.kubu}) unggul dalam hitung cepat. Para kepala desa mulai merapat.`,
    p.jenis === 'presiden' ? 'nasional' : 'daerah',
    p.jenis === 'presiden' ? 'Kabar Nusantara' : 'Warta Kabupaten',
  );
  // wakil keponakan bupati lama kehilangan "nilai jual"-nya, dan bupati baru curiga
  if (id === 'bupati' && pemenang.nama !== lama && r.wakil?.latar === 'keponakan_bupati') {
    r.tokoh.bupati.relasi = clamp(r.tokoh.bupati.relasi - 10);
    r.wakil.loyalitas = clamp(r.wakil.loyalitas - 10);
    catat('buruk', `Wakil kades ${r.wakil.nama} adalah keponakan bupati lama. Bupati baru menganggap desamu "orangnya rezim lama". (relasi bupati -10)`);
  }
  // bupati baru merotasi camat
  if (id === 'bupati' && pemenang.nama !== lama) {
    r.tokoh.camat = { nama: pilihAcak(s, NAMA.camat.filter((n) => n !== r.tokoh.camat.nama)), kubu: 'ditunjuk bupati', relasi: clamp(30 + relasiBaru * 0.5), sejakHari: s.hari };
    catat('info', `Bupati baru merotasi camat. ${r.tokoh.camat.nama} kini memimpin kecamatan.`);
  }
}

export function harianRelasi(s: VillageState, catat: Catat): void {
  const r = stateRelasi(s);
  // efek kartu lama: restu/dimusuhi bupati kini jadi relasi
  if (s.flags?.includes('restu_bupati')) {
    ubahRelasi(r, 'bupati', 10);
    s.flags = s.flags.filter((f) => f !== 'restu_bupati');
  }
  if (s.flags?.includes('dimusuhi_bupati')) {
    ubahRelasi(r, 'bupati', -10);
    s.flags = s.flags.filter((f) => f !== 'dimusuhi_bupati');
  }
  if (s.flags?.includes('restu_camat')) {
    ubahRelasi(r, 'camat', 10);
    s.flags = s.flags.filter((f) => f !== 'restu_camat');
  }
  // pemilihan
  if (r.pemilihan && s.hari >= r.pemilihan.hasilHari) selesaiPemilihan(s, r, catat);
  if (!r.pemilihan) {
    const jatuh = (Object.keys(r.jadwal) as JenisPemilihan[]).filter((j) => s.hari >= r.jadwal[j]).sort((a, b) => r.jadwal[a] - r.jadwal[b]);
    if (jatuh.length) mulaiPemilihan(s, r, jatuh[0], catat);
  }
  // mosi pemakzulan: hari pemungutan suara BPD
  if (r.mosi && s.hari >= r.mosi.batasHari) putuskanMosi(s, r, catat);
  // wakil yang membelot ikut maju di pilkades
  const k = s.politik.kampanye;
  if (k && r.wakil && wakilMembelot(r) && r.wakil.ambisi >= 60 && !k.lawan.some((l) => l.id === 'wakil')) {
    k.lawan.push({ id: 'wakil', nama: r.wakil.nama, kubu: 'mantan wakil kades', kekuatan: Math.round(40 + r.wakil.ambisi / 5) });
    catat('buruk', `Wakil kades ${r.wakil.nama} mundur dan ikut mencalonkan diri melawanmu di pilkades.`);
    r.wakil = null;
  } else if (k && s.flags?.includes('mantan_wakil_dendam') && !k.lawan.some((l) => l.id === 'mantan_wakil')) {
    k.lawan.push({ id: 'mantan_wakil', nama: 'Mantan wakil kades', kubu: 'barisan sakit hati', kekuatan: 50 });
    s.flags = s.flags.filter((f) => f !== 'mantan_wakil_dendam');
    catat('buruk', 'Mantan wakil kades yang dulu kamu berhentikan ikut maju di pilkades.');
  }
}

function putuskanMosi(s: VillageState, r: StateRelasi, catat: Catat) {
  const m = r.mosi!;
  r.mosi = null;
  const loyal = r.wakil && r.wakil.loyalitas >= 70 ? -0.1 : 0;
  const belot = wakilMembelot(r) ? 0.15 : 0;
  const peluang = Math.max(0.05, Math.min(0.9, (50 - r.bpd) / 45 + belot + loyal - bantuMosi(s)));
  if (nextRandom(s) >= peluang) {
    r.bpd = clamp(r.bpd + 5);
    r.jeda.mosi = s.hari + 120;
    catat('baik', 'Hak angket BPD kandas: suara tidak cukup untuk mengusulkan pemberhentian kades.');
    return;
  }
  const bupati = r.tokoh.bupati;
  if (m.dilindungi || bupati.relasi >= 70) {
    r.bpd = clamp(r.bpd - 5);
    r.jeda.mosi = s.hari + 90;
    catat('politik', `BPD mengusulkan pemberhentian kades, tapi Bupati ${bupati.nama} menolak meneken SK. Kades selamat, BPD makin geram.`);
    return;
  }
  s.status = 'dimakzulkan';
  const plt = r.wakil ? ` Wakil kades ${r.wakil.nama} ditunjuk jadi pelaksana tugas.` : ' Camat menunjuk pelaksana tugas.';
  catat('buruk', `Bupati ${bupati.nama} meneken SK pemberhentian. ${s.namaKades} dimakzulkan atas usul BPD.${plt}`);
}

export function bulananRelasi(s: VillageState, catat: Catat): void {
  const r = stateRelasi(s);
  // relasi memudar ke netral kalau tidak dirawat
  for (const id of URUT_TOKOH) {
    const t = r.tokoh[id];
    if (t.relasi > 52) t.relasi -= 1;
    else if (t.relasi < 48) t.relasi += 1;
  }
  // perdes berjalan
  for (const pid of r.perdes) {
    const b = PERDES.find((d) => d.id === pid)?.bulanan;
    if (!b) continue;
    // subsidi perdes berhenti sementara kalau kas tidak cukup
    if (b.kas && (b.kas > 0 || s.kas >= -b.kas)) arus(s, b.kas > 0 ? 'Iuran & retribusi' : 'Operasional kantor', b.kas);
    if (b.kecurigaan) s.politik.kecurigaan = clamp(s.politik.kecurigaan + b.kecurigaan);
    if (b.popularitas) s.popularitas = clamp(s.popularitas + b.popularitas);
    if (b.bpd) r.bpd = clamp(r.bpd + b.bpd);
    for (const [g, d] of Object.entries(b.kepuasan ?? {})) s.kepuasan[g as GroupId] = clamp(s.kepuasan[g as GroupId] + (d ?? 0));
    for (const [i, d] of Object.entries(b.indeks ?? {})) s.indeks[i as IndexId] = clamp(s.indeks[i as IndexId] + (d ?? 0));
  }
  // wakil kades
  const w = r.wakil;
  if (w) {
    // tunjangan wakil: kalau kas kosong tidak dibayar, dan wakil makin kecewa
    if (s.kas >= TUNJANGAN_WAKIL) {
      arus(s, 'Gaji perangkat', -TUNJANGAN_WAKIL);
      w.telat = false;
    } else {
      w.loyalitas = clamp(w.loyalitas - 6);
      if (!w.telat) catat('buruk', `Tunjangan wakil kades ${w.nama} telat dibayar karena kas kosong. Loyalitasnya turun setiap bulan sampai dibayar.`);
      w.telat = true;
    }
    const b = LATAR_WAKIL[w.latar].bulanan;
    if (b?.kas && s.kas >= -b.kas) arus(s, 'Operasional kantor', b.kas);
    if (b?.dompet) s.politik.dompet += b.dompet;
    if (b?.kecurigaan) s.politik.kecurigaan = clamp(s.politik.kecurigaan + b.kecurigaan);
    if (b?.popularitas) s.popularitas = clamp(s.popularitas + b.popularitas);
    for (const [g, d] of Object.entries(b?.kepuasan ?? {})) s.kepuasan[g as GroupId] = clamp(s.kepuasan[g as GroupId] + (d ?? 0));
    // loyalitas: ikut kades yang kuat, menjauh dari kades yang lemah
    w.loyalitas = clamp(w.loyalitas + (s.popularitas - 50) / 25 - (w.ambisi - 50) / 50 - (s.politik.kecurigaan > 60 ? 2 : 0));
    if (wakilMembelot(r) && nextRandom(s) < 0.3) {
      r.bpd = clamp(r.bpd - 4);
      catat('buruk', `Wakil kades ${w.nama} terlihat makan malam bersama ketua BPD. Kabar miring soal kades mulai beredar. (BPD -4)`);
    } else if (w.latar === 'mantan_aktivis' && w.loyalitas < 50 && nextRandom(s) < 0.15) {
      s.popularitas = clamp(s.popularitas - 2);
      catat('politik', `Wakil kades ${w.nama} mengkritik kebijakan kades di grup warga. (popularitas -2)`);
    }
  }
  // dukungan BPD mengikuti kinerja dan citra kades
  const target = 0.4 * s.popularitas + 0.3 * s.integritas + 0.3 * rataKepuasan(s) - (s.politik.kecurigaan > 50 ? (s.politik.kecurigaan - 50) / 2 : 0);
  r.bpd = clamp(r.bpd + (target - r.bpd) * 0.12);

  // camat dingin: pengesahan APBDes ditahan
  if (r.tokoh.camat.relasi < 25 && nextRandom(s) < 0.15 && !s.flags.includes('termin_ditahan')) {
    s.flags = [...s.flags, 'termin_ditahan'];
    catat('buruk', `Camat ${r.tokoh.camat.nama} "belum sempat" memeriksa dokumen APBDes. Termin dana desa berikutnya tertahan.`);
  }

  // evaluasi akhir tahun dari provinsi dan pusat
  const bulan = ((Math.floor(s.hari / 30) - 1) % 12) + 1;
  if (bulan === 12) {
    const g = r.tokoh.gubernur;
    if (g.relasi >= 65) {
      const n = Math.round((50 + (g.relasi - 65) * 2) * JT);
      arus(s, 'Bonus & hadiah', n);
      catat('baik', `Gubernur ${g.nama} mengucurkan bantuan keuangan provinsi Rp ${Math.round(n / JT)} jt untuk desa.`);
    }
    const pr = r.tokoh.presiden;
    if (pr.relasi >= 70) {
      s.popularitas = clamp(s.popularitas + 3);
      arus(s, 'Bonus & hadiah', 50 * JT);
      catat('baik', 'Desa ditetapkan sebagai desa percontohan nasional. Ada dana pembinaan Rp 50 jt dan kunjungan wartawan.');
    } else if (pr.relasi < 25) {
      s.politik.kecurigaan = clamp(s.politik.kecurigaan + 5);
      catat('buruk', 'Tim inspeksi pusat datang mendadak memeriksa penggunaan dana desa. (gosip +5)');
    }
  }

  // mosi pemakzulan
  if (!r.mosi && s.hari >= 90 && s.hari >= (r.jeda.mosi ?? 0)) {
    const goyah = s.popularitas < 35 || s.politik.kecurigaan >= 55 || s.integritas < 30;
    if (r.bpd < 30 && goyah && nextRandom(s) < 0.35 + (wakilMembelot(r) ? 0.2 : 0)) {
      r.mosi = { mulaiHari: s.hari, batasHari: s.hari + 20, respon: [], dilindungi: false };
      beritaDesa(s, `BPD ${s.namaDesa} Gulirkan Hak Angket terhadap Kades`, 'Sejumlah anggota BPD menilai kades gagal menjalankan amanah. Pemungutan suara dijadwalkan pekan depan.');
      catat('buruk', `BPD menggulirkan hak angket dan mengancam mengusulkan pemberhentian kades. Pemungutan suara 20 hari lagi.${wakilMembelot(r) ? ` Wakil kades ${r.wakil!.nama} disebut-sebut ikut mendorong.` : ''}`);
    }
  }
}

// ---------------------------------------------------------------- tampilan

export function viewRelasi(s: VillageState) {
  const r = stateRelasi(s);
  const sisa = (k: string) => Math.max(0, (r.jeda[k] ?? 0) - s.hari);
  const p = r.pemilihan;
  const berikut = (Object.keys(r.jadwal) as JenisPemilihan[])
    .map((j) => ({ jenis: j, nama: NAMA_PEMILIHAN[j], hariLagi: Math.max(0, r.jadwal[j] - s.hari) }))
    .sort((a, b) => a.hariLagi - b.hariLagi);
  return {
    /** Biaya politik dari anggaran dinas bulan ini dan batas wajarnya. */
    dinasBulanIni: r.dinas && r.dinas.bulan === Math.floor(s.hari / 30) ? r.dinas.total : 0,
    batasDinas: BATAS_DINAS,
    tokoh: URUT_TOKOH.map((id) => ({
      id,
      jabatan: TOKOH[id].jabatan,
      tingkat: TOKOH[id].tingkat,
      nama: r.tokoh[id].nama,
      kubu: r.tokoh[id].kubu,
      relasi: Math.round(r.tokoh[id].relasi),
      efek: TOKOH[id].efek,
      biayaSowan: TOKOH[id].biayaSowan,
      jedaSowan: sisa(`sowan:${id}`),
      jedaKritik: sisa(`kritik:${id}`),
    })),
    bpd: Math.round(r.bpd),
    jedaBpd: { jamuan: sisa('bpd:jamuan'), rapat: sisa('bpd:rapat') },
    faktorTermin: Math.round(faktorTermin(s) * 100) / 100,
    pemilihan: p
      ? {
          jenis: p.jenis,
          nama: NAMA_PEMILIHAN[p.jenis],
          aparat: p.jenis === 'kapolsek' || p.jenis === 'danramil',
          sisaHari: Math.max(0, p.hasilHari - s.hari),
          calon: p.calon.map((c, i) => ({ ...c, peluang: Math.round(peluangCalon(p)[i] * 100) })),
          dukung: p.dukung,
          biayaKerahkan: BIAYA_KERAHKAN[p.jenis],
          hadiah: HADIAH_PEMILIHAN[p.jenis],
        }
      : null,
    berikutnya: berikut,
    perdes: PERDES.map((d) => ({ id: d.id, nama: d.nama, teks: d.teks, plus: d.plus, minus: d.minus, aktif: r.perdes.includes(d.id) })),
    maksPerdes: MAKS_PERDES,
    peluangPerdes: Math.round(peluangPerdes(s) * 100),
    jedaPerdes: sisa('perdes'),
    mosi: r.mosi
      ? {
          sisaHari: Math.max(0, r.mosi.batasHari - s.hari),
          respon: r.mosi.respon,
          dilindungi: r.mosi.dilindungi,
          peluangLolos: Math.round(Math.max(0.05, Math.min(0.9, (50 - r.bpd) / 45 + (wakilMembelot(r) ? 0.15 : 0) + (r.wakil && r.wakil.loyalitas >= 70 ? -0.1 : 0))) * 100),
        }
      : null,
    risikoMosi: r.bpd < 30 ? 'tinggi' : r.bpd < 40 ? 'waspada' : 'aman',
    wakil: r.wakil ? { ...r.wakil, ...latarView(r.wakil.latar), membelot: wakilMembelot(r) } : null,
    kandidatWakil: r.kandidatWakil.map((k) => ({ ...k, ...latarView(k.latar) })),
    tunjanganWakil: TUNJANGAN_WAKIL,
    jedaWakil: { cari: sisa('wakil:cari'), rangkul: sisa('wakil:rangkul'), ganti: sisa('wakil:ganti') },
  };
}

function latarView(l: LatarWakil) {
  const d = LATAR_WAKIL[l];
  return { namaLatar: d.nama, plus: d.plus, minus: d.minus };
}

/** Perkiraan arus kas bulanan dari perdes dan wakil kades (untuk laporan keuangan). */
export function arusBulananRelasi(s: VillageState): { masukPerdes: number; keluarPerdes: number; wakil: number } {
  const r = s.relasi;
  if (!r) return { masukPerdes: 0, keluarPerdes: 0, wakil: 0 };
  let masukPerdes = 0;
  let keluarPerdes = 0;
  for (const pid of r.perdes) {
    const k = PERDES.find((d) => d.id === pid)?.bulanan?.kas ?? 0;
    if (k > 0) masukPerdes += k;
    else keluarPerdes -= k;
  }
  let wakil = 0;
  // tunjangan wakil ditambah biaya bulanan latar belakangnya (kalau ada)
  if (r.wakil) wakil = TUNJANGAN_WAKIL - Math.min(0, LATAR_WAKIL[r.wakil.latar].bulanan?.kas ?? 0);
  return { masukPerdes, keluarPerdes, wakil };
}
