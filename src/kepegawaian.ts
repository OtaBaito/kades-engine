// Kepegawaian desa: tiap jabatan punya kursi (bertambah sesuai level desa), tiap bulan ada kandidat baru
// dengan sifat plus-minus, dan kantor desa bisa diperbesar supaya muat lebih banyak pegawai.
import { PEGAWAI, type PegawaiDef } from './content/fitur.ts';
import { GameError } from './errors.ts';
import { arus } from './arus.ts';
import { nextRandom } from './rng.ts';
import type { Kandidat, Staf, VillageState } from './types.ts';

const JT = 1_000_000;

export interface SifatDef {
  nama: string;
  baik: boolean;
  teks: string;
  /** Tambahan kinerja (1 = normal). */
  kinerja?: number;
  /** Pengali gaji. */
  gajiX?: number;
  /** Efek per bulan selama bekerja. */
  bulanan?: { kecurigaan?: number; popularitas?: number; integritas?: number };
  /** Efek sekali saat direkrut. */
  saatMasuk?: { integritas?: number; flag?: string; popularitas?: number };
}

export const SIFAT: Record<string, SifatDef> = {
  rajin: { nama: 'Rajin', baik: true, teks: 'Kinerja +30%', kinerja: 0.3 },
  jujur: { nama: 'Jujur', baik: true, teks: 'Gosip turun tiap bulan', bulanan: { kecurigaan: -1.5 } },
  disukai: { nama: 'Disukai warga', baik: true, teks: 'Popularitas kades naik pelan', bulanan: { popularitas: 0.6 } },
  sarjana: { nama: 'Lulusan sarjana', baik: true, teks: 'Kinerja +20%, gaji +30%', kinerja: 0.2, gajiX: 1.3 },
  digital: { nama: 'Melek digital', baik: true, teks: 'Kinerja +15%', kinerja: 0.15 },
  hemat: { nama: 'Mau digaji kecil', baik: true, teks: 'Gaji -20%', gajiX: 0.8 },
  pemalas: { nama: 'Pemalas', baik: false, teks: 'Kinerja -30%', kinerja: -0.3 },
  main_proyek: { nama: 'Suka main proyek', baik: false, teks: 'Gosip naik tiap bulan', bulanan: { kecurigaan: 2 } },
  penggosip: { nama: 'Tukang gosip', baik: false, teks: 'Popularitas kades turun pelan', bulanan: { popularitas: -0.5 } },
  sering_izin: { nama: 'Sering izin', baik: false, teks: 'Kinerja -15%', kinerja: -0.15 },
  titipan: { nama: 'Titipan pejabat', baik: false, teks: 'Integritas -2, tapi kabupaten senang', saatMasuk: { integritas: -2, flag: 'restu_bupati' } },
  kerabat: { nama: 'Kerabat kades', baik: false, teks: 'Integritas -3 (nepotisme), loyal', saatMasuk: { integritas: -3 }, bulanan: { kecurigaan: 0.5 } },
  mahal: { nama: 'Minta gaji tinggi', baik: false, teks: 'Gaji +40%', gajiX: 1.4 },
};

const SIFAT_BAIK = Object.keys(SIFAT).filter((k) => SIFAT[k].baik);
const SIFAT_BURUK = Object.keys(SIFAT).filter((k) => !SIFAT[k].baik);

// sapaan harus cocok dengan nama: "Pak Rina" atau "Mbak Joko" terdengar aneh
const NAMA_LAKI = [
  'Agus', 'Bambang', 'Yudi', 'Hadi', 'Eko', 'Arif', 'Joko', 'Rudi', 'Dodi', 'Imam', 'Fajar', 'Wahyu', 'Bayu', 'Slamet',
  'Andi', 'Budi', 'Dedi', 'Hendra', 'Irfan', 'Kurnia', 'Lukman', 'Nanang', 'Rizal', 'Sugeng', 'Taufik', 'Udin', 'Yusuf', 'Zainal',
];
const NAMA_PEREMPUAN = [
  'Siti', 'Dewi', 'Rina', 'Lina', 'Tari', 'Wati', 'Ayu', 'Fitri', 'Sari', 'Nur', 'Ningsih', 'Indah', 'Lestari', 'Yuni',
  'Ani', 'Desi', 'Eka', 'Fatimah', 'Heni', 'Iis', 'Kartika', 'Mega', 'Novi', 'Puji', 'Ratih', 'Susi', 'Tuti', 'Wulan',
];
/** Peluang pelamar perempuan per jabatan (kader posyandu hampir selalu ibu-ibu, linmas hampir selalu bapak-bapak). */
const PELUANG_PEREMPUAN: Record<string, number> = { kader: 1, bendahara: 0.6, linmas: 0.08, penyuluh_agama: 0.2, pelatih: 0.25, kebersihan: 0.35 };
const SAPAAN_LAKI = ['Mas', 'Pak', 'Kang'];
const SAPAAN_PEREMPUAN = ['Mbak', 'Bu', 'Teh'];

/** Pasangan sifat yang saling bertentangan dan tidak boleh muncul bersama pada satu orang. */
const KONFLIK: [string, string][] = [
  ['rajin', 'pemalas'],
  ['rajin', 'sering_izin'],
  ['jujur', 'main_proyek'],
  ['jujur', 'penggosip'],
  ['disukai', 'penggosip'],
  ['hemat', 'mahal'],
  ['sarjana', 'pemalas'],
  ['digital', 'pemalas'],
  ['titipan', 'kerabat'],
];

export function sifatBertentangan(a: string, b: string): boolean {
  return KONFLIK.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export function adaKonflik(sifat: string[]): boolean {
  return sifat.some((a, i) => sifat.slice(i + 1).some((b) => sifatBertentangan(a, b)));
}

/** Kantor desa per level: kapasitas pegawai, biaya upgrade, dan level desa minimal. */
export const KANTOR: { level: number; nama: string; kapasitas: number; biaya: number; minLevelDesa: number }[] = [
  { level: 1, nama: 'Kantor Desa Sederhana', kapasitas: 4, biaya: 0, minLevelDesa: 1 },
  { level: 2, nama: 'Kantor Desa Bersayap', kapasitas: 7, biaya: 120 * JT, minLevelDesa: 3 },
  { level: 3, nama: 'Kantor Desa Dua Lantai', kapasitas: 11, biaya: 250 * JT, minLevelDesa: 5 },
  { level: 4, nama: 'Kompleks Pemerintahan Desa', kapasitas: 16, biaya: 450 * JT, minLevelDesa: 7 },
];

export function infoKantor(s: VillageState) {
  return KANTOR[Math.max(0, Math.min(KANTOR.length - 1, (s.kantorLevel ?? 1) - 1))];
}

/** Jumlah kursi sebuah jabatan menurut level desa. */
export function slotPeran(s: VillageState, def: PegawaiDef): number {
  const ambang = def.slotLevel ?? [def.minLevel ?? 1];
  return ambang.filter((l) => l <= s.level).length;
}

function pilih<T>(s: VillageState, xs: T[]): T {
  return xs[Math.floor(nextRandom(s) * xs.length)];
}

function hitungKinerja(sifat: string[]): number {
  return Math.max(0.4, Math.round((1 + sifat.reduce((t, k) => t + (SIFAT[k]?.kinerja ?? 0), 0)) * 100) / 100);
}

/** Nama yang sudah dipakai pegawai atau pelamar mana pun, supaya tidak ada dua orang senama. */
function namaTerpakai(s: VillageState): Set<string> {
  const inti = (n: string) => n.split(' ').slice(1).join(' ');
  return new Set([...(s.staf ?? []).map((x) => inti(x.nama)), ...Object.values(s.kandidat ?? {}).flat().map((k) => inti(k.nama))]);
}

function namaUnik(s: VillageState, peran: string, dipakai: Set<string>): string {
  const perempuan = nextRandom(s) < (PELUANG_PEREMPUAN[peran] ?? 0.5);
  const daftar = perempuan ? NAMA_PEREMPUAN : NAMA_LAKI;
  const bebas = daftar.filter((n) => !dipakai.has(n));
  const inti = bebas.length ? pilih(s, bebas) : `${pilih(s, daftar)} ${dipakai.size}`;
  dipakai.add(inti);
  const sapaan = pilih(s, perempuan ? SAPAAN_PEREMPUAN : SAPAAN_LAKI);
  return `${sapaan} ${inti}`;
}

function buatKandidat(s: VillageState, def: PegawaiDef, dipakai: Set<string> = namaTerpakai(s)): Kandidat {
  // setiap pelamar selalu punya kelebihan dan kekurangan, kadang satu sifat tambahan
  const sifat: string[] = [pilih(s, SIFAT_BAIK)];
  const burukCocok = SIFAT_BURUK.filter((b) => !sifat.some((a) => sifatBertentangan(a, b)));
  sifat.push(pilih(s, burukCocok));
  if (nextRandom(s) < 0.3) {
    const sisa = Object.keys(SIFAT).filter((k) => !sifat.includes(k) && !sifat.some((a) => sifatBertentangan(a, k)));
    if (sisa.length) sifat.push(pilih(s, sisa));
  }
  const gajiX = sifat.reduce((t, k) => t * (SIFAT[k]?.gajiX ?? 1), 1);
  const nama = namaUnik(s, def.id, dipakai);
  return {
    id: `kd${s.nomorUrut++}`,
    peran: def.id,
    nama,
    sifat,
    kinerja: hitungKinerja(sifat),
    gaji: Math.round((def.gajiBulanan * gajiX) / 100_000) * 100_000,
    biayaRekrut: def.biayaRekrut,
  };
}

/** Segarkan kandidat semua jabatan yang terbuka (dipanggil awal bulan). */
export function segarkanKandidat(s: VillageState): void {
  s.kandidat = {};
  const dipakai = namaTerpakai(s);
  for (const def of PEGAWAI) {
    if (slotPeran(s, def) === 0) continue;
    s.kandidat[def.id] = [buatKandidat(s, def, dipakai), buatKandidat(s, def, dipakai), buatKandidat(s, def, dipakai)];
  }
}

export function syncPegawai(s: VillageState): void {
  s.pegawai = [...new Set(s.staf.map((x) => x.peran))];
}

/** Kekuatan sebuah jabatan: pegawai pertama penuh, tambahan berikutnya setengah, dikali kinerja. */
export function kekuatanPeran(s: VillageState, peran: string): number {
  const daftar = (s.staf ?? []).filter((x) => x.peran === peran).sort((a, b) => b.kinerja - a.kinerja);
  return daftar.reduce((t, x, i) => t + x.kinerja * (i === 0 ? 1 : 0.5), 0);
}

export function gajiStaf(s: VillageState): number {
  return (s.staf ?? []).reduce((t, x) => t + x.gaji, 0);
}

export function rekrutKandidat(s: VillageState, id: string): string {
  // kompatibel: id jabatan langsung -> ambil kandidat pertama jabatan itu
  const semua = Object.values(s.kandidat ?? {}).flat();
  let k = semua.find((x) => x.id === id);
  if (!k && PEGAWAI.some((p) => p.id === id)) {
    if (!s.kandidat?.[id]?.length) segarkanKandidat(s);
    k = s.kandidat[id]?.[0];
  }
  if (!k) throw new GameError('Kandidat tidak ditemukan. Mungkin sudah diterima kerja di tempat lain.');
  const def = PEGAWAI.find((p) => p.id === k!.peran)!;
  if ((def.minLevel ?? 1) > s.level) throw new GameError(`${def.peran} baru bisa direkrut di level ${def.minLevel}.`);
  const terisi = s.staf.filter((x) => x.peran === def.id).length;
  if (terisi >= slotPeran(s, def)) throw new GameError(`Kursi ${def.peran} penuh (${terisi}). Naikkan level desa untuk kursi tambahan.`);
  const kantor = infoKantor(s);
  if (s.staf.length >= kantor.kapasitas) throw new GameError(`${kantor.nama} hanya muat ${kantor.kapasitas} pegawai. Perbesar kantor dulu.`);
  if (s.kas < k.biayaRekrut) throw new GameError(`Kas tidak cukup untuk merekrut. Butuh Rp ${Math.round(k.biayaRekrut / JT)} jt.`);
  arus(s, 'Rekrut pegawai', -k.biayaRekrut);
  s.staf.push({ id: `st${s.nomorUrut++}`, peran: k.peran, nama: k.nama, sifat: k.sifat, kinerja: k.kinerja, gaji: k.gaji, hariMasuk: s.hari });
  s.kandidat[k.peran] = (s.kandidat[k.peran] ?? []).filter((x) => x.id !== k!.id);
  s.sifatDikenal = [...new Set([...(s.sifatDikenal ?? []), ...k.sifat])];
  for (const sf of k.sifat) {
    const m = SIFAT[sf]?.saatMasuk;
    if (!m) continue;
    if (m.integritas) s.integritas = Math.max(0, Math.min(100, s.integritas + m.integritas));
    if (m.popularitas) s.popularitas = Math.max(0, Math.min(100, s.popularitas + m.popularitas));
    if (m.flag && !s.flags.includes(m.flag)) s.flags.push(m.flag);
  }
  syncPegawai(s);
  return `${k.nama} resmi bertugas sebagai ${def.peran}.`;
}

export function berhentikanStaf(s: VillageState, id: string): string {
  // kompatibel: id jabatan -> berhentikan pegawai terlama di jabatan itu
  const x = s.staf.find((st) => st.id === id) ?? s.staf.find((st) => st.peran === id);
  if (!x) throw new GameError('Pegawai itu tidak sedang bertugas.');
  s.staf = s.staf.filter((st) => st !== x);
  syncPegawai(s);
  const def = PEGAWAI.find((p) => p.id === x.peran);
  return `${x.nama} (${def?.peran ?? x.peran}) diberhentikan dengan hormat.`;
}

/** Efek kejadian/kartu: satu pegawai di jabatan ini keluar. */
export function pegawaiKeluar(s: VillageState, peran: string): void {
  const x = s.staf.find((st) => st.peran === peran);
  if (x) s.staf = s.staf.filter((st) => st !== x);
  syncPegawai(s);
}

export function cariKandidat(s: VillageState, peran: string): string {
  const def = PEGAWAI.find((p) => p.id === peran);
  if (!def || slotPeran(s, def) === 0) throw new GameError('Jabatan ini belum terbuka.');
  const terisi = s.staf.filter((x) => x.peran === def.id).length;
  if (terisi >= slotPeran(s, def)) throw new GameError(`Kursi ${def.peran} sudah penuh, tidak perlu pasang lowongan.`);
  const biaya = 2 * JT;
  if (s.kas < biaya) throw new GameError('Kas tidak cukup untuk memasang lowongan.');
  arus(s, 'Rekrut pegawai', -biaya);
  s.kandidat[peran] = [];
  const dipakai = namaTerpakai(s);
  s.kandidat[peran] = [buatKandidat(s, def, dipakai), buatKandidat(s, def, dipakai), buatKandidat(s, def, dipakai)];
  return `Lowongan ${def.peran} disebar di grup warga. Tiga pelamar baru datang.`;
}

export function upgradeKantor(s: VillageState): string {
  const kini = s.kantorLevel ?? 1;
  const berikut = KANTOR[kini];
  if (!berikut) throw new GameError('Kantor desa sudah paling besar.');
  if (s.level < berikut.minLevelDesa) throw new GameError(`${berikut.nama} butuh level desa ${berikut.minLevelDesa}.`);
  if (s.kas < berikut.biaya) throw new GameError(`Kas tidak cukup. Butuh Rp ${Math.round(berikut.biaya / JT)} jt.`);
  arus(s, 'Pembangunan', -berikut.biaya);
  s.kantorLevel = berikut.level;
  s.popularitas = Math.min(100, s.popularitas + 2);
  return `${berikut.nama} diresmikan. Kini muat ${berikut.kapasitas} pegawai.`;
}

/** Terapkan efek kartu ke pegawai yang menjadi tokoh kartu. */
export function efekKeStaf(s: VillageState, stafId: string | undefined, e: import('./types.ts').Effect): void {
  if (!stafId) return;
  const x = s.staf.find((st) => st.id === stafId);
  if (!x) return;
  if (e.stafKeluar) {
    s.staf = s.staf.filter((st) => st !== x);
    syncPegawai(s);
    return;
  }
  if (e.stafKinerja) x.kinerja = Math.max(0.4, Math.min(2, Math.round((x.kinerja + e.stafKinerja) * 100) / 100));
  if (e.stafGajiX) x.gaji = Math.round((x.gaji * e.stafGajiX) / 100_000) * 100_000;
  if (e.stafHapusSifat && x.sifat.includes(e.stafHapusSifat)) {
    x.sifat = x.sifat.filter((k) => k !== e.stafHapusSifat);
    x.kinerja = Math.max(0.4, Math.round((x.kinerja - (SIFAT[e.stafHapusSifat]?.kinerja ?? 0)) * 100) / 100);
    const gx = SIFAT[e.stafHapusSifat]?.gajiX;
    if (gx) x.gaji = Math.round(x.gaji / gx / 100_000) * 100_000;
  }
  if (e.stafTambahSifat && !x.sifat.includes(e.stafTambahSifat) && !x.sifat.some((k) => sifatBertentangan(k, e.stafTambahSifat!))) {
    x.sifat = [...x.sifat, e.stafTambahSifat];
    x.kinerja = Math.max(0.4, Math.min(2, Math.round((x.kinerja + (SIFAT[e.stafTambahSifat]?.kinerja ?? 0)) * 100) / 100));
    const gx = SIFAT[e.stafTambahSifat]?.gajiX;
    if (gx) x.gaji = Math.round((x.gaji * gx) / 100_000) * 100_000;
  }
}

/** Isi {nama} dan {peran} di teks kartu dengan pegawai tokohnya. */
export function isiTokohStaf(s: VillageState, stafId: string | undefined, teks: string): string {
  if (!stafId || !teks.includes('{')) return teks;
  const x = s.staf.find((st) => st.id === stafId);
  const peran = x ? (PEGAWAI.find((p) => p.id === x.peran)?.peran ?? x.peran) : 'pegawai';
  return teks.replaceAll('{nama}', x?.nama ?? 'Mantan pegawai').replaceAll('{peran}', peran);
}

/** Efek harian sifat pegawai (angka bulanan dibagi 30). */
export function harianSifat(s: VillageState): void {
  for (const st of s.staf ?? []) {
    for (const sf of st.sifat) {
      const b = SIFAT[sf]?.bulanan;
      if (!b) continue;
      if (b.kecurigaan && s.politik) s.politik.kecurigaan = Math.max(0, Math.min(100, s.politik.kecurigaan + b.kecurigaan / 30));
      if (b.popularitas) s.popularitas = Math.max(0, Math.min(100, s.popularitas + b.popularitas / 30));
    }
  }
}

/** Sapaan tak cocok dengan nama ("Pak Siti"), atau bapak-bapak melamar jadi kader posyandu. */
function namaJanggal(nama: string, peran: string): boolean {
  const [sapaan, ...sisa] = nama.split(' ');
  const inti = sisa.join(' ');
  const laki = SAPAAN_LAKI.includes(sapaan) || sapaan === 'Ustaz';
  const perempuan = SAPAAN_PEREMPUAN.includes(sapaan) || sapaan === 'Ustazah';
  if (laki && NAMA_PEREMPUAN.includes(inti)) return true;
  if (perempuan && NAMA_LAKI.includes(inti)) return true;
  return peran === 'kader' && laki;
}

/** Migrasi desa lama: daftar jabatan lama jadi pegawai bernama tanpa sifat khusus. */
export function migrasiStaf(s: VillageState): void {
  if (s.staf) {
    s.kantorLevel ??= 1;
    // pelamar lama dari versi sebelum aturan sifat & sapaan diperbaiki: buat ulang
    const rusak = Object.values(s.kandidat ?? {})
      .flat()
      .some((k) => adaKonflik(k.sifat) || !k.sifat.some((x) => SIFAT[x]?.baik) || !k.sifat.some((x) => !SIFAT[x]?.baik) || namaJanggal(k.nama, k.peran));
    const semua = [...(s.staf ?? []).map((x) => x.nama.split(' ').slice(1).join(' ')), ...Object.values(s.kandidat ?? {}).flat().map((k) => k.nama.split(' ').slice(1).join(' '))];
    if (!s.kandidat || rusak || new Set(semua).size !== semua.length) segarkanKandidat(s);
    return;
  }
  s.staf = (s.pegawai ?? []).map((peran, i) => {
    const def = PEGAWAI.find((p) => p.id === peran);
    return { id: `st_lama${i}`, peran, nama: def?.nama ?? peran, sifat: [], kinerja: 1, gaji: def?.gajiBulanan ?? 0, hariMasuk: 0 };
  });
  s.kantorLevel ??= 1;
  if (!s.kandidat) segarkanKandidat(s);
}
