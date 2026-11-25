// Kawasan usaha: perusahaan (PT) melamar masuk desa, minta izin dan kadang minta desa ikut menanggung
// sesuatu (jalan akses, air, lahan). Kades bisa menyetujui, menyetujui sambil minta CSR, minta uang pelicin
// ke kantong pribadi, atau menolak. Setelah dibangun, PT menyerap tenaga kerja warga, membayar retribusi,
// dan membawa dampak (baik atau buruk) ke lingkungan dan kelompok warga.
//
// Dua mitra nyata ikut hadir: PT Dahono Consulting Agency (dahono.com) dan PT Sabako Kreativ Digital
// (sabako.id). Perusahaan lainnya fiktif.
import { arus } from './arus.ts';
import { beritaDesa, efekAktif } from './berita.ts';
import { GameError } from './errors.ts';
import { perdesAktif, stateRelasi } from './relasi.ts';
import { nextRandom } from './rng.ts';
import type { GroupId, IndexId, VillageState } from './types.ts';

const JT = 1_000_000;
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
type Catat = (j: 'info' | 'baik' | 'buruk' | 'politik', t: string) => void;

export type GambarUsaha = 'kantor_kaca' | 'studio_digital' | 'pabrik' | 'kandang' | 'kebun_kopi' | 'gudang' | 'tambang' | 'pabrik_air' | 'peternakan_sapi';

export interface UsahaDef {
  id: string;
  nama: string;
  bidang: string;
  teks: string;
  gambar: GambarUsaha;
  /** Teks pendek di papan nama peta. */
  papan: string;
  minLevel: number;
  investasi: number;
  tenagaKerja: number;
  durasiHari: number;
  /** Yang diminta PT dari desa. */
  minta: { izin: string; dana?: number; untuk?: string };
  /** Efek bulanan selama beroperasi. */
  bulanan: { kas: number; kepuasan?: Partial<Record<GroupId, number>>; indeks?: Partial<Record<IndexId, number>>; kecurigaan?: number; popularitas?: number };
  /** Efek sekali saat izin disetujui (selain dana). */
  saatSetuju?: { kepuasan?: Partial<Record<GroupId, number>>; relasiBupati?: number };
  plus: string[];
  minus: string[];
  csr: number;
  pelicin: number;
  /** Perusahaan bersih menolak uang pelicin dan melaporkannya. */
  bersih?: boolean;
  /** Peluang kejadian buruk per bulan (limbah, kecelakaan, bau). */
  risiko?: number;
  kejadianBuruk?: string;
  /** Diblokir perdes tertentu. */
  diblokir?: { perdes: string; alasan: string };
  /** Perlu lahan sawah (berbenturan dengan semangat swasembada). */
  lahanSawah?: boolean;
}

export const USAHA: UsahaDef[] = [
  {
    id: 'dahono',
    nama: 'PT Dahono Consulting Agency',
    bidang: 'Konsultan perizinan, AI hukum, dan infrastruktur AI',
    teks: 'Kelompok usaha asal Jakarta (dahono.com) ingin membuka kantor cabang: pendampingan perizinan dan kepatuhan untuk UMKM, audit kontrak berbasis AI, dan simpul server untuk layanan AI mereka.',
    gambar: 'kantor_kaca',
    papan: 'DAHONO',
    minLevel: 3,
    investasi: 2_500 * JT,
    tenagaKerja: 35,
    durasiHari: 45,
    minta: { izin: 'Izin lokasi kantor dan rekomendasi desa' },
    bulanan: { kas: 4 * JT, kepuasan: { pemuda: 0.5, perantau: 0.5, pedagang: 0.3 }, kecurigaan: -0.5 },
    plus: ['35 lowongan kerja kantoran', 'Pendampingan kepatuhan desa: gosip -0,5/bln', 'Perdes lebih mudah disahkan (+10%)', 'Pembayaran QRIS untuk pedagang: pedagang +0,3/bln'],
    minus: ['Menolak uang pelicin dan bisa melaporkannya'],
    csr: 40 * JT,
    pelicin: 0,
    bersih: true,
  },
  {
    id: 'sabako',
    nama: 'PT Sabako Kreativ Digital',
    bidang: 'Software house: web, aplikasi, IoT, dan AI terapan',
    teks: 'Software house asal Jakarta (sabako.id) ingin membuka studio pengembangan: aplikasi layanan desa, sensor IoT irigasi untuk sawah, dan pelatihan coding untuk anak muda.',
    gambar: 'studio_digital',
    papan: 'SABAKO',
    minLevel: 3,
    investasi: 1_800 * JT,
    tenagaKerja: 30,
    durasiHari: 40,
    minta: { izin: 'Izin lokasi studio dan akses jaringan internet' },
    bulanan: { kas: 3 * JT, kepuasan: { pemuda: 0.7, petani: 0.3 }, popularitas: 0.2 },
    plus: ['30 lowongan programmer dan desainer', 'Sensor IoT irigasi: petani +0,3/bln', 'Aplikasi layanan desa: popularitas naik pelan', 'Disukai presiden saat pidato desa digital'],
    minus: ['Menolak uang pelicin dan bisa melaporkannya'],
    csr: 35 * JT,
    pelicin: 0,
    bersih: true,
  },
  {
    id: 'garmen',
    nama: 'PT Sinar Benang Nusantara',
    bidang: 'Pabrik garmen',
    teks: 'Pabrik pakaian jadi untuk ekspor. Butuh ratusan penjahit dan meminta desa ikut membangun jalan akses untuk truk kontainer.',
    gambar: 'pabrik',
    papan: 'SINAR BENANG',
    minLevel: 2,
    investasi: 12_000 * JT,
    tenagaKerja: 220,
    durasiHari: 75,
    minta: { izin: 'Izin lokasi pabrik', dana: 80 * JT, untuk: 'jalan akses truk kontainer' },
    bulanan: { kas: 10 * JT, kepuasan: { pemuda: 0.8, pkk: 0.5, perantau: 0.5 }, indeks: { lingkungan: -0.2 } },
    saatSetuju: { relasiBupati: 6 },
    plus: ['220 lowongan kerja', 'Retribusi Rp 10 jt/bln', 'Bupati senang (+6)'],
    minus: ['Desa menanggung jalan akses Rp 80 jt', 'Lingkungan turun pelan', 'Pekerja bisa mogok'],
    csr: 60 * JT,
    pelicin: 40 * JT,
    risiko: 0.05,
    kejadianBuruk: 'Ratusan buruh garmen berunjuk rasa minta lembur dibayar. Jalan desa macet seharian.',
    lahanSawah: true,
  },
  {
    id: 'unggas',
    nama: 'PT Unggas Raya Makmur',
    bidang: 'Peternakan ayam petelur',
    teks: 'Kandang ayam petelur modern berkapasitas puluhan ribu ekor. Kotorannya bisa jadi pupuk, tapi baunya terbawa angin.',
    gambar: 'kandang',
    papan: 'UNGGAS RAYA',
    minLevel: 1,
    investasi: 3_000 * JT,
    tenagaKerja: 45,
    durasiHari: 40,
    minta: { izin: 'Izin lingkungan peternakan' },
    bulanan: { kas: 5 * JT, kepuasan: { petani: 0.3, pkk: -0.3, pemuda: 0.3 }, indeks: { lingkungan: -0.3 } },
    plus: ['45 lowongan kerja', 'Pupuk kandang murah: petani +0,3/bln'],
    minus: ['Bau: ibu-ibu -0,3/bln', 'Lingkungan turun'],
    csr: 25 * JT,
    pelicin: 15 * JT,
    risiko: 0.08,
    kejadianBuruk: 'Bau kandang ayam menyengat sampai ke permukiman dan lalat merajalela. Warga protes ke kantor desa.',
  },
  {
    id: 'kopi',
    nama: 'PT Agro Kopi Lestari',
    bidang: 'Perkebunan dan pengolahan kopi',
    teks: 'Kebun kopi dan rumah sangrai yang membeli biji kopi petani desa dengan harga kontrak.',
    gambar: 'kebun_kopi',
    papan: 'AGRO KOPI',
    minLevel: 1,
    investasi: 2_200 * JT,
    tenagaKerja: 70,
    durasiHari: 50,
    minta: { izin: 'Izin usaha perkebunan' },
    bulanan: { kas: 5 * JT, kepuasan: { petani: 0.6, pedagang: 0.2 }, indeks: { lingkungan: 0.1 } },
    plus: ['70 lowongan kerja', 'Beli hasil panen petani: petani +0,6/bln', 'Ramah lingkungan'],
    minus: ['Retribusi tidak sebesar pabrik'],
    csr: 25 * JT,
    pelicin: 15 * JT,
  },
  {
    id: 'logistik',
    nama: 'PT Logistik Cepat Nusa',
    bidang: 'Gudang dan pusat distribusi',
    teks: 'Gudang distribusi untuk belanja daring se-kabupaten. Truk keluar masuk siang malam, dan mereka minta desa memperkuat jalan.',
    gambar: 'gudang',
    papan: 'CEPAT NUSA',
    minLevel: 2,
    investasi: 5_000 * JT,
    tenagaKerja: 80,
    durasiHari: 55,
    minta: { izin: 'Izin lokasi gudang', dana: 60 * JT, untuk: 'pengerasan jalan desa' },
    bulanan: { kas: 8 * JT, kepuasan: { pedagang: 0.4, pemuda: 0.5 }, indeks: { lingkungan: -0.1 } },
    saatSetuju: { relasiBupati: 4 },
    plus: ['80 lowongan kerja', 'Pedagang lebih mudah kirim barang', 'Retribusi Rp 8 jt/bln'],
    minus: ['Desa menanggung pengerasan jalan Rp 60 jt', 'Jalan cepat rusak'],
    csr: 40 * JT,
    pelicin: 25 * JT,
    risiko: 0.04,
    kejadianBuruk: 'Truk gudang terguling di tikungan desa. Jalan tertutup setengah hari.',
  },
  {
    id: 'tambang',
    nama: 'PT Batu Pasir Perkasa',
    bidang: 'Tambang pasir dan batu',
    teks: 'Penambangan pasir di bantaran sungai desa. Uangnya besar, bupati mendukung, tapi sungai dan sawah bisa rusak.',
    gambar: 'tambang',
    papan: 'BATU PASIR',
    minLevel: 1,
    investasi: 4_000 * JT,
    tenagaKerja: 50,
    durasiHari: 30,
    minta: { izin: 'Rekomendasi izin usaha pertambangan' },
    bulanan: { kas: 12 * JT, kepuasan: { petani: -0.5, pemuda: 0.3 }, indeks: { lingkungan: -0.6 } },
    saatSetuju: { relasiBupati: 8, kepuasan: { petani: -3 } },
    plus: ['Retribusi terbesar: Rp 12 jt/bln', 'Bupati sangat senang (+8)'],
    minus: ['Lingkungan rusak cepat', 'Petani -0,5/bln', 'Rawan longsor dan banjir lumpur'],
    csr: 50 * JT,
    pelicin: 60 * JT,
    risiko: 0.1,
    kejadianBuruk: 'Tebing galian pasir longsor dan lumpurnya masuk ke sawah warga.',
    diblokir: { perdes: 'larangan_tambang', alasan: 'Perdes Larangan Tambang Pasir masih berlaku.' },
  },
  {
    id: 'air',
    nama: 'PT Tirta Murni Pegunungan',
    bidang: 'Pabrik air minum kemasan',
    teks: 'Pabrik air minum kemasan yang menyedot mata air di lereng desa. Banyak lowongan, tapi sumur warga bisa menyusut.',
    gambar: 'pabrik_air',
    papan: 'TIRTA MURNI',
    minLevel: 2,
    investasi: 6_500 * JT,
    tenagaKerja: 110,
    durasiHari: 60,
    minta: { izin: 'Izin pengambilan air tanah', dana: 40 * JT, untuk: 'jaringan pipa ke mata air' },
    bulanan: { kas: 9 * JT, kepuasan: { pemuda: 0.6, petani: -0.4, pkk: -0.2 }, indeks: { lingkungan: -0.3 } },
    saatSetuju: { relasiBupati: 5 },
    plus: ['110 lowongan kerja', 'Retribusi Rp 9 jt/bln'],
    minus: ['Desa menanggung pipa Rp 40 jt', 'Sumur warga menyusut: petani dan ibu-ibu kesal'],
    csr: 50 * JT,
    pelicin: 35 * JT,
    risiko: 0.05,
    kejadianBuruk: 'Sumur-sumur warga mengering di musim kemarau. Warga menuding pabrik air.',
  },
  {
    id: 'susu',
    nama: 'PT Sentra Susu Lembah',
    bidang: 'Peternakan sapi perah',
    teks: 'Peternakan sapi perah bermitra dengan peternak rakyat. Susunya dipasok ke dapur MBG se-kecamatan.',
    gambar: 'peternakan_sapi',
    papan: 'SUSU LEMBAH',
    minLevel: 2,
    investasi: 2_800 * JT,
    tenagaKerja: 40,
    durasiHari: 45,
    minta: { izin: 'Izin lingkungan peternakan' },
    bulanan: { kas: 4 * JT, kepuasan: { petani: 0.4, pkk: 0.3 }, indeks: { lingkungan: -0.1 } },
    plus: ['40 lowongan kerja', 'Kemitraan peternak: petani +0,4/bln', 'Pasokan susu untuk MBG'],
    minus: ['Sedikit bau dan limbah'],
    csr: 25 * JT,
    pelicin: 15 * JT,
    risiko: 0.03,
    kejadianBuruk: 'Limbah kandang sapi meluap ke selokan setelah hujan deras.',
  },
];

export const USAHA_BY_ID = new Map(USAHA.map((u) => [u.id, u]));
export const JUMLAH_KAPLING = 9;

export interface UsahaAktif {
  id: string;
  kapling: number;
  status: 'dibangun' | 'beroperasi';
  mulaiHari: number;
  selesaiHari: number;
  csr?: boolean;
}

export interface StateUsaha {
  daftar: UsahaAktif[];
  tawaran: { id: string; hari: number; batasHari: number } | null;
  tawaranBerikut: number;
  jeda: Record<string, number>;
}

export function stateUsaha(s: VillageState): StateUsaha {
  s.usaha ??= { daftar: [], tawaran: null, tawaranBerikut: Math.max(s.hari + 15, 40), jeda: {} };
  return s.usaha;
}

export function usahaBeroperasi(s: VillageState, id: string): boolean {
  return Boolean(s.usaha?.daftar.some((u) => u.id === id && u.status === 'beroperasi'));
}

/** Bonus peluang perdes dari pendampingan kepatuhan Dahono. */
export function bonusPerdes(s: VillageState): number {
  return usahaBeroperasi(s, 'dahono') ? 0.1 : 0;
}

export function lapanganKerja(s: VillageState): number {
  return (s.usaha?.daftar ?? []).filter((u) => u.status === 'beroperasi').reduce((t, u) => t + (USAHA_BY_ID.get(u.id)?.tenagaKerja ?? 0), 0);
}

function kaplingKosong(us: StateUsaha): number {
  for (let i = 0; i < JUMLAH_KAPLING; i++) if (!us.daftar.some((u) => u.kapling === i)) return i;
  return -1;
}

function terblokir(s: VillageState, d: UsahaDef): string | null {
  if (d.diblokir && perdesAktif(s, d.diblokir.perdes)) return d.diblokir.alasan;
  if (d.lahanSawah && perdesAktif(s, 'perlindungan_sawah')) return 'Pabrik ini butuh lahan sawah, padahal Perdes Perlindungan Lahan Sawah masih berlaku.';
  return null;
}

/** Perdes baru yang melarang usaha tertentu: PT yang sudah ada ikut ditutup (dipanggil saat perdes disahkan). */
export function tegakkanPerdes(s: VillageState, perdesId: string): string | null {
  const us = s.usaha;
  if (!us) return null;
  const kena = us.daftar.filter((u) => USAHA_BY_ID.get(u.id)?.diblokir?.perdes === perdesId);
  if (!kena.length) return null;
  us.daftar = us.daftar.filter((u) => !kena.includes(u));
  const rel = stateRelasi(s);
  for (const u of kena) {
    const d = USAHA_BY_ID.get(u.id)!;
    us.jeda[u.id] = s.hari + 720;
    rel.tokoh.bupati.relasi = clamp(rel.tokoh.bupati.relasi - 6);
    if (u.status === 'beroperasi') s.kepuasan.pemuda = clamp(s.kepuasan.pemuda - 3);
    beritaDesa(s, `${d.nama} Ditutup Setelah Perdes Baru Disahkan`, `Kegiatan ${d.bidang.toLowerCase()} dihentikan. ${d.tenagaKerja} pekerja dirumahkan, bupati kecewa.`, 'daerah', 'Warta Kabupaten');
  }
  return kena.map((u) => USAHA_BY_ID.get(u.id)!.nama).join(', ');
}

export type AksiUsaha = 'setujui' | 'csr' | 'pelicin' | 'tolak' | 'tutup';

export function aturUsaha(s: VillageState, id: string, aksi: AksiUsaha): string {
  const us = stateUsaha(s);
  const d = USAHA_BY_ID.get(id);
  if (!d) throw new GameError('Perusahaan tidak dikenal.');
  const rel = stateRelasi(s);

  if (aksi === 'tutup') {
    const u = us.daftar.find((x) => x.id === id);
    if (!u) throw new GameError('Perusahaan ini tidak ada di desa.');
    us.daftar = us.daftar.filter((x) => x !== u);
    us.jeda[id] = s.hari + 360;
    rel.tokoh.bupati.relasi = clamp(rel.tokoh.bupati.relasi - 10);
    if (u.status === 'beroperasi') {
      s.kepuasan.pemuda = clamp(s.kepuasan.pemuda - 5);
      s.kepuasan.perantau = clamp(s.kepuasan.perantau - 2);
    }
    beritaDesa(s, `Izin ${d.nama} Dicabut Kades`, `${d.tenagaKerja} pekerja kehilangan pekerjaan. Bupati menyebut langkah itu "tidak ramah investasi".`, 'daerah', 'Warta Kabupaten');
    return `Izin ${d.nama} dicabut. Pekerja dirumahkan dan bupati kesal. (relasi bupati -10)`;
  }

  if (!us.tawaran || us.tawaran.id !== id) throw new GameError('Perusahaan ini tidak sedang mengajukan izin.');

  if (aksi === 'tolak') {
    us.tawaran = null;
    us.jeda[id] = s.hari + 240;
    const swasembada = d.lahanSawah && efekAktif(s, 'swasembada');
    if (!swasembada) rel.tokoh.bupati.relasi = clamp(rel.tokoh.bupati.relasi - (d.saatSetuju?.relasiBupati ? 6 : 2));
    s.kepuasan.pemuda = clamp(s.kepuasan.pemuda - 2);
    if (d.id === 'tambang') s.kepuasan.petani = clamp(s.kepuasan.petani + 3);
    beritaDesa(s, `Kades Tolak Investasi ${d.nama}`, `Rencana ${d.bidang.toLowerCase()} batal. Sebagian warga lega, anak muda kecewa kehilangan peluang kerja.`);
    return `Pengajuan ${d.nama} ditolak.${swasembada ? ' Di tengah semangat swasembada, bupati tidak bisa protes.' : ' Bupati menganggap desamu kurang ramah investasi.'}`;
  }

  const blok = terblokir(s, d);
  if (blok) throw new GameError(blok);
  const kapling = kaplingKosong(us);
  if (kapling < 0) throw new GameError('Kawasan usaha desa sudah penuh.');
  if (d.minta.dana && s.kas < d.minta.dana) throw new GameError(`Kas tidak cukup untuk ${d.minta.untuk} (butuh Rp ${Math.round(d.minta.dana / JT)} jt).`);

  let catatan = '';
  if (aksi === 'pelicin') {
    if (d.bersih) {
      us.tawaran = null;
      us.jeda[id] = s.hari + 360;
      s.politik.kecurigaan = clamp(s.politik.kecurigaan + 12);
      s.popularitas = clamp(s.popularitas - 4);
      s.integritas = clamp(s.integritas - 5);
      beritaDesa(s, `${d.nama} Batal Masuk Desa, Mengaku Dimintai Uang`, 'Perusahaan menyebut ada permintaan uang di luar ketentuan dan melaporkannya ke inspektorat.', 'daerah', 'Warta Kabupaten');
      return `${d.nama} menolak membayar uang pelicin dan melaporkan permintaanmu ke inspektorat. Investasinya batal. (gosip +12)`;
    }
    const awasi = efekAktif(s, 'awasi_pungli');
    if (nextRandom(s) < (awasi ? 0.35 : 0.1)) {
      us.tawaran = null;
      us.jeda[id] = s.hari + 240;
      s.politik.kecurigaan = clamp(s.politik.kecurigaan + 15);
      s.integritas = clamp(s.integritas - 4);
      return `Perwakilan ${d.nama} merekam permintaan uang pelicin dan rekamannya beredar.${awasi ? ' Di tengah perintah presiden memberantas pungli, kasusnya cepat naik.' : ''} Investasi batal. (gosip +15)`;
    }
    s.politik.dompet += d.pelicin;
    s.politik.kecurigaan = clamp(s.politik.kecurigaan + 6);
    s.integritas = clamp(s.integritas - 4);
    s.politik.totalKorupsi = (s.politik.totalKorupsi ?? 0) + d.pelicin;
    catatan = ` Amplop Rp ${Math.round(d.pelicin / JT)} jt masuk kantong pribadimu. (gosip +6)`;
  }
  let csr = false;
  if (aksi === 'csr') {
    const mau = d.bersih ? 0.95 : 0.7;
    if (nextRandom(s) >= mau) {
      us.tawaran = null;
      us.jeda[id] = s.hari + 240;
      rel.tokoh.bupati.relasi = clamp(rel.tokoh.bupati.relasi - 4);
      return `${d.nama} keberatan dengan permintaan CSR dan memilih pindah ke desa tetangga. (relasi bupati -4)`;
    }
    arus(s, 'Bonus & hadiah', d.csr);
    csr = true;
    catatan = ` Perusahaan setuju menyalurkan CSR Rp ${Math.round(d.csr / JT)} jt ke kas desa.`;
  }

  if (d.minta.dana) arus(s, 'Pembangunan', -d.minta.dana);
  for (const [g, v] of Object.entries(d.saatSetuju?.kepuasan ?? {})) s.kepuasan[g as GroupId] = clamp(s.kepuasan[g as GroupId] + (v ?? 0));
  if (d.saatSetuju?.relasiBupati) rel.tokoh.bupati.relasi = clamp(rel.tokoh.bupati.relasi + d.saatSetuju.relasiBupati);
  s.kepuasan.pemuda = clamp(s.kepuasan.pemuda + 2);
  us.daftar.push({ id, kapling, status: 'dibangun', mulaiHari: s.hari, selesaiHari: s.hari + d.durasiHari, csr });
  us.tawaran = null;
  beritaDesa(s, `${d.nama} Mulai Membangun di ${s.namaDesa}`, `Investasi sekitar Rp ${(d.investasi / (1000 * JT)).toLocaleString('id-ID')} M untuk ${d.bidang.toLowerCase()}. Diperkirakan menyerap ${d.tenagaKerja} tenaga kerja.`);
  return `Izin ${d.nama} disetujui. Pembangunan dimulai, selesai ${d.durasiHari} hari lagi.${d.minta.dana ? ` Desa menanggung ${d.minta.untuk} Rp ${Math.round(d.minta.dana / JT)} jt.` : ''}${catatan}`;
}

// ---------------------------------------------------------------- harian & bulanan

export function harianUsaha(s: VillageState, catat: Catat): void {
  const us = stateUsaha(s);
  for (const u of us.daftar) {
    if (u.status === 'dibangun' && s.hari >= u.selesaiHari) {
      u.status = 'beroperasi';
      const d = USAHA_BY_ID.get(u.id)!;
      catat('baik', `${d.nama} resmi beroperasi dan merekrut ${d.tenagaKerja} warga.`);
      beritaDesa(s, `${d.nama} Resmi Beroperasi`, `Sebanyak ${d.tenagaKerja} warga ${s.namaDesa} mulai bekerja. Antrean pelamar mengular sejak subuh.`);
      s.popularitas = clamp(s.popularitas + 2);
    }
  }
  if (us.tawaran && s.hari >= us.tawaran.batasHari) {
    const d = USAHA_BY_ID.get(us.tawaran.id)!;
    us.jeda[d.id] = s.hari + 120;
    us.tawaran = null;
    catat('info', `${d.nama} tidak mendapat jawaban dan memilih desa lain.`);
  }
  if (!us.tawaran && s.hari >= us.tawaranBerikut && kaplingKosong(us) >= 0) {
    const ada = new Set(us.daftar.map((u) => u.id));
    const calon = USAHA.filter((d) => !ada.has(d.id) && (s.level ?? 1) >= d.minLevel && s.hari >= (us.jeda[d.id] ?? 0));
    const karpet = efekAktif(s, 'karpet_merah');
    us.tawaranBerikut = s.hari + (karpet ? 20 : 45) + Math.floor(nextRandom(s) * (karpet ? 15 : 30));
    if (calon.length) {
      const d = calon[Math.floor(nextRandom(s) * calon.length)];
      us.tawaran = { id: d.id, hari: s.hari, batasHari: s.hari + 20 };
      catat('politik', `${d.nama} (${d.bidang.toLowerCase()}) mengajukan izin masuk desa. Lihat kawasan usaha di tab Bangun.`);
      beritaDesa(s, `${d.nama} Lirik ${s.namaDesa}`, `Perusahaan ${d.bidang.toLowerCase()} itu sedang menunggu izin kepala desa. Ada ${d.tenagaKerja} lowongan yang dijanjikan.`, 'daerah', 'Warta Kabupaten');
    }
  }
}

export function bulananUsaha(s: VillageState, catat: Catat): void {
  const us = stateUsaha(s);
  for (const u of us.daftar) {
    if (u.status !== 'beroperasi') continue;
    const d = USAHA_BY_ID.get(u.id)!;
    const b = d.bulanan;
    arus(s, 'Iuran & retribusi', b.kas);
    for (const [g, v] of Object.entries(b.kepuasan ?? {})) s.kepuasan[g as GroupId] = clamp(s.kepuasan[g as GroupId] + (v ?? 0));
    for (const [i, v] of Object.entries(b.indeks ?? {})) s.indeks[i as IndexId] = clamp(s.indeks[i as IndexId] + (v ?? 0));
    if (b.kecurigaan) s.politik.kecurigaan = clamp(s.politik.kecurigaan + b.kecurigaan);
    if (b.popularitas) s.popularitas = clamp(s.popularitas + b.popularitas);
    if (d.risiko && nextRandom(s) < d.risiko) {
      s.indeks.lingkungan = clamp(s.indeks.lingkungan - 2);
      s.popularitas = clamp(s.popularitas - 2);
      const g: GroupId = d.id === 'garmen' ? 'pemuda' : d.id === 'logistik' ? 'pedagang' : 'petani';
      s.kepuasan[g] = clamp(s.kepuasan[g] - 3);
      catat('buruk', `${d.kejadianBuruk ?? `Ada masalah di ${d.nama}.`} (popularitas -2)`);
      beritaDesa(s, `Warga Keluhkan ${d.nama}`, d.kejadianBuruk ?? 'Warga mengadu ke kantor desa.');
    }
  }
}

// ---------------------------------------------------------------- tampilan

export function viewUsaha(s: VillageState) {
  const us = stateUsaha(s);
  const t = us.tawaran;
  const def = (id: string) => USAHA_BY_ID.get(id)!;
  const info = (d: UsahaDef) => ({
    id: d.id,
    nama: d.nama,
    bidang: d.bidang,
    teks: d.teks,
    gambar: d.gambar,
    papan: d.papan,
    tenagaKerja: d.tenagaKerja,
    investasi: d.investasi,
    retribusi: d.bulanan.kas,
    plus: d.plus,
    minus: d.minus,
    minta: d.minta,
    csr: d.csr,
    pelicin: d.pelicin,
    bersih: Boolean(d.bersih),
  });
  return {
    daftar: us.daftar.map((u) => ({
      ...info(def(u.id)),
      kapling: u.kapling,
      status: u.status,
      progres: u.status === 'dibangun' ? Math.round(Math.min(1, (s.hari - u.mulaiHari) / Math.max(1, u.selesaiHari - u.mulaiHari)) * 100) : 100,
      sisaHari: Math.max(0, u.selesaiHari - s.hari),
    })),
    tawaran: t ? { ...info(def(t.id)), sisaHari: Math.max(0, t.batasHari - s.hari), terblokir: terblokir(s, def(t.id)) } : null,
    lapanganKerja: lapanganKerja(s),
    kaplingKosong: JUMLAH_KAPLING - us.daftar.length,
    jumlahKapling: JUMLAH_KAPLING,
    tawaranBerikutHari: us.tawaran ? null : Math.max(0, us.tawaranBerikut - s.hari),
  };
}

/** Perkiraan retribusi bulanan dari perusahaan yang beroperasi (untuk laporan keuangan). */
export function retribusiUsaha(s: VillageState): number {
  return (s.usaha?.daftar ?? []).filter((u) => u.status === 'beroperasi').reduce((t, u) => t + (USAHA_BY_ID.get(u.id)?.bulanan.kas ?? 0), 0);
}
