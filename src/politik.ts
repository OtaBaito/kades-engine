// Politik desa yang bebas: dompet pribadi & aksi gelap, kecurigaan & audit, keluarga & penerus,
// kampanye melawan calon NPC, lobi mengubah aturan masa jabatan, dan rapor "Warisan".
// Semua nama orang, lembaga, dan aturan di sini fiktif.
import { JABATAN_DESA, angkatKeluarga, honorKeluarga } from './jabatan.ts';
import { GROUPS } from './content/groups.ts';
import { GameError } from './errors.ts';
import { arus } from './arus.ts';
import type { Catat } from './fitur.ts';
import { nextRandom } from './rng.ts';
import { jiwaKelompok } from './penduduk.ts';
import type { Gender,
  AnggotaKeluarga,
  CaraPromosi,
  CalonLawan,
  GroupId,
  JenisAksiGelap,
  JenisLobi,
  KeadaanPolitik,
  PilihanAudit,
  PilihanCalon,
  TujuanDompet,
  VillageState,
} from './types.ts';

const JT = 1_000_000;
const jt = (n: number) => (Math.round((n / JT) * 10) / 10).toString().replace('.', ',');
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export const POLITIK = {
  gajiKades: 4 * JT,
  tunjanganKades: 3 * JT,
  maksPeriodeAwal: 2,
  maksPeriodeLobi: 4,
  /** Bulan ke-n dalam periode ketika masa kampanye dimulai. */
  bulanKampanye: 10,
  batasHariAudit: 10,
} as const;

// ---------------------------------------------------------------- data fiktif

const NAMA_KELUARGA: Record<AnggotaKeluarga['peran'], Record<Gender, string[]>> = {
  pasangan: { l: ['Hendra', 'Bayu', 'Rahmat', 'Dimas', 'Teguh'], p: ['Ratna', 'Wulan', 'Siti', 'Indah', 'Rini'] },
  anak: { l: ['Rudi', 'Fajar', 'Galih', 'Raka', 'Bima'], p: ['Dinda', 'Tika', 'Nadia', 'Salsa', 'Putri'] },
  adik: { l: ['Yanto', 'Agus', 'Heru', 'Doni'], p: ['Mira', 'Lestari', 'Yuni', 'Eka'] },
  ipar: { l: ['Joko', 'Bambang', 'Slamet'], p: ['Sri', 'Nining', 'Tutik'] },
};

const NAMA_PEREMPUAN = new Set([
  ...Object.values(NAMA_KELUARGA).flatMap((x) => x.p),
  'Siti', 'Wulan', 'Ningsih', 'Dewi', 'Lestari', 'Ratna', 'Rina', 'Sri', 'Ani', 'Ayu', 'Fitri', 'Sari', 'Nur', 'Mega', 'Tari', 'Wati', 'Yuni', 'Indah', 'Kartika', 'Susi', 'Tuti', 'Heni', 'Novi', 'Ratih', 'Desi', 'Lina', 'Endah', 'Lilis',
]);

/** Tebak gender dari nama depan (untuk desa lama yang belum menyimpan gender kades). */
export function tebakGender(nama: string): Gender {
  const depan = nama.trim().split(/\s+/).find((w) => !/^(bu|ibu|pak|bapak|mas|mbak|h\.?|hj\.?)$/i.test(w)) ?? '';
  const kata = depan.charAt(0).toUpperCase() + depan.slice(1).toLowerCase();
  if (/^(bu|ibu|mbak|hj\.?)\s/i.test(nama.trim())) return 'p';
  return NAMA_PEREMPUAN.has(kata) ? 'p' : 'l';
}

/** Label peran keluarga sesuai gender: suami/istri, putra/putri. */
export function labelPeran(peran: AnggotaKeluarga['peran'], gender: Gender | undefined): string {
  if (peran === 'pasangan') return gender === 'l' ? 'Suami' : 'Istri';
  if (peran === 'anak') return gender === 'p' ? 'Putri sulung' : 'Putra sulung';
  if (peran === 'adik') return gender === 'p' ? 'Adik perempuan' : 'Adik laki-laki';
  return 'Ipar';
}

/** Desa lama: lengkapi gender keluarga, dan ganti nama pasangan yang sesama gender dengan kades. */
export function migrasiKeluarga(s: VillageState): void {
  s.genderKades ??= tebakGender(s.namaKades);
  for (const k of s.politik?.keluarga ?? []) {
    if (k.peran === 'pasangan') {
      const harus: Gender = s.genderKades === 'l' ? 'p' : 'l';
      if ((k.gender ?? tebakGender(k.nama)) !== harus) {
        const daftar = NAMA_KELUARGA.pasangan[harus];
        k.nama = daftar[(k.id.charCodeAt(k.id.length - 1) + s.namaKades.length) % daftar.length];
      }
      k.gender = harus;
    } else {
      k.gender ??= tebakGender(k.nama);
    }
  }
}

const CALON: { nama: string; kubu: string }[] = [
  { nama: 'Haji Darmawan', kubu: 'kubu juragan' },
  { nama: 'Rina Kusuma', kubu: 'anak muda idealis' },
  { nama: 'Pak Sardi', kubu: 'mantan sekdes' },
  { nama: 'Bu Lastri', kubu: 'kubu ibu-ibu PKK' },
  { nama: 'Kang Ujang', kubu: 'kubu kelompok tani' },
];

export const AKSI_GELAP: Record<JenisAksiGelap, { nama: string; teks: string; jeda: number }> = {
  markup: { nama: 'Mark-up proyek', teks: 'Gelembungkan anggaran proyek yang sedang jalan. Selisihnya masuk kantong.', jeda: 25 },
  fee_kontraktor: { nama: 'Minta fee kontraktor', teks: 'Kontraktor proyek setor "uang terima kasih" ke kades.', jeda: 25 },
  sewa_bengkok: { nama: 'Sewakan tanah kas desa', teks: 'Tanah kas desa disewakan ke kenalan. Uang sewanya tidak lewat kas.', jeda: 30 },
  potong_bantuan: { nama: 'Potong dana bantuan', teks: 'Bantuan untuk warga "dipotong biaya administrasi".', jeda: 35 },
};

export interface AsetPribadiDef {
  id: string;
  nama: string;
  jenis: 'gengsi' | 'usaha' | 'investasi';
  teks: string;
  harga: number;
  /** Pemasukan bersih per bulan ke dompet. */
  penghasilan: number;
  /** Pamer harta: popularitas naik sedikit, tapi gosip juga. */
  gengsi?: number;
  kecurigaan?: number;
}

export const ASET_PRIBADI: AsetPribadiDef[] = [
  { id: 'warung', nama: 'Toko sembako', jenis: 'usaha', teks: 'Dikelola pasangan di depan rumah.', harga: 60 * JT, penghasilan: 1.5 * JT },
  { id: 'sawah', nama: 'Sawah satu hektar', jenis: 'usaha', teks: 'Disewakan ke petani penggarap, bagi hasil tiap panen.', harga: 150 * JT, penghasilan: 2.5 * JT },
  { id: 'toko_bangunan', nama: 'Toko bahan bangunan', jenis: 'usaha', teks: 'Laris kalau desa sedang membangun. Rawan konflik kepentingan.', harga: 220 * JT, penghasilan: 5 * JT },
  { id: 'kos', nama: 'Kos-kosan 10 kamar', jenis: 'usaha', teks: 'Penghasilan tetap dari pekerja pabrik di kota kecamatan.', harga: 320 * JT, penghasilan: 7 * JT },
  { id: 'emas', nama: 'Emas batangan', jenis: 'investasi', teks: 'Nilainya naik pelan, gampang dijual saat butuh.', harga: 100 * JT, penghasilan: 0 },
  { id: 'motor_gede', nama: 'Motor gede', jenis: 'gengsi', teks: 'Suaranya terdengar sampai dusun sebelah.', harga: 45 * JT, penghasilan: 0, gengsi: 2, kecurigaan: 3 },
  { id: 'mobil', nama: 'Mobil SUV hitam', jenis: 'gengsi', teks: 'Kaca film gelap, cocok buat kondangan.', harga: 280 * JT, penghasilan: 0, gengsi: 4, kecurigaan: 8 },
  { id: 'rumah', nama: 'Rumah tingkat dua', jenis: 'gengsi', teks: 'Pagar tinggi, pilar besar, kolam ikan koi.', harga: 400 * JT, penghasilan: 0, gengsi: 6, kecurigaan: 10 },
];

// ---------------------------------------------------------------- pembuatan & migrasi

function pilih<T>(s: VillageState, xs: T[]): T {
  return xs[Math.floor(nextRandom(s) * xs.length)];
}

export function buatPolitik(s: VillageState): KeadaanPolitik {
  const gKades: Gender = s.genderKades ?? tebakGender(s.namaKades ?? '');
  const keluarga: AnggotaKeluarga[] = (['pasangan', 'anak', 'adik'] as const).map((peran, i) => {
    const gender: Gender = peran === 'pasangan' ? (gKades === 'l' ? 'p' : 'l') : nextRandom(s) < 0.5 ? 'l' : 'p';
    return {
    id: `kel${i + 1}`,
    nama: pilih(s, NAMA_KELUARGA[peran][gender]),
    gender,
    peran,
    elektabilitas: 10 + Math.round(nextRandom(s) * 15),
    kompetensi: 30 + Math.round(nextRandom(s) * 40),
    };
  });
  return {
    dompet: 10 * JT,
    kecurigaan: 0,
    keluarga,
    penerusId: null,
    pemimpin: 'pemain',
    periodePemain: s.periode ?? 1,
    periodeKeluarga: {},
    maksPeriode: POLITIK.maksPeriodeAwal,
    tunjangan: false,
    jeda: {},
    kasus: null,
    kampanye: null,
    aset: [],
    totalKorupsi: 0,
    pernahKasus: 0,
    tahunDinasti: 0,
  };
}

// ---------------------------------------------------------------- bantuan

function rataKepuasan(s: VillageState): number {
  let sum = 0;
  let jiwa = 0;
  for (const g of GROUPS) {
    sum += s.kepuasan[g.id] * jiwaKelompok(s, g.id);
    jiwa += jiwaKelompok(s, g.id);
  }
  return sum / jiwa;
}

function cekJeda(s: VillageState, kunci: string, nama: string) {
  const siap = s.politik.jeda[kunci];
  if (siap !== undefined && s.hari < siap) throw new GameError(`${nama} baru bisa lagi ${siap - s.hari} hari lagi.`);
}

function bayarDompet(s: VillageState, jumlah: number, untuk: string) {
  if (s.politik.dompet < jumlah) throw new GameError(`Dompet pribadi kurang untuk ${untuk}. Butuh Rp ${jt(jumlah)} jt.`);
  s.politik.dompet -= jumlah;
}

function anggota(s: VillageState, id: string): AnggotaKeluarga {
  const m = s.politik.keluarga.find((k) => k.id === id);
  if (!m) throw new GameError('Anggota keluarga tidak ditemukan.');
  return m;
}

export function namaPemimpin(s: VillageState): string {
  if (s.politik.pemimpin === 'pemain') return s.namaKades;
  return s.politik.keluarga.find((k) => k.id === s.politik.pemimpin)?.nama ?? s.namaKades;
}

export function bolehNyalon(s: VillageState, calon: 'pemain' | string): boolean {
  const p = s.politik;
  if (calon === 'pemain') return p.periodePemain < p.maksPeriode;
  return (p.periodeKeluarga[calon] ?? 0) < p.maksPeriode;
}

export function dalamKampanye(s: VillageState): boolean {
  return s.politik.kampanye !== null;
}

// ---------------------------------------------------------------- harian & bulanan

export function harianPolitik(s: VillageState, catat: Catat): void {
  const p = s.politik;
  // tenggat audit lewat: proses hukum jalan sendiri
  if (p.kasus && s.hari >= p.kasus.batas) {
    // tenggat pertama yang terlewat (mis. saat pemain tidak membuka game): panggilan kedua, temuan membesar
    if (!p.kasus.panggilanKedua) {
      p.kasus.panggilanKedua = true;
      p.kasus.sidang = undefined;
      p.kasus.nilai = Math.round(p.kasus.nilai * 1.3);
      p.kasus.batas = s.hari + 15;
      p.kecurigaan = clamp(p.kecurigaan + 5);
      catat('buruk', 'Panggilan audit tidak dijawab. Inspektorat mengirim panggilan kedua: temuan membesar, tenggat 15 hari.');
    } else {
      catat('buruk', 'Panggilan kedua audit juga diabaikan. Kasus dilimpahkan ke penegak hukum.');
      selesaikanAudit(s, 'pasrah', catat);
    }
  }
  // manuver calon lawan selama kampanye
  if (p.kampanye && p.kampanye.lawan.length && nextRandom(s) < 0.06) {
    const l = pilih(s, p.kampanye.lawan);
    const r = nextRandom(s);
    if (r < 0.4) {
      l.kekuatan = clamp(l.kekuatan + 3);
      catat('politik', `${l.nama} (${l.kubu}) bagi-bagi sembako keliling dusun.`);
    } else if (r < 0.7) {
      s.popularitas = clamp(s.popularitas - 2);
      catat('politik', `Pendukung ${l.nama} menyebar isu miring soal kades di grup warga.`);
    } else {
      l.kekuatan = clamp(l.kekuatan + 2);
      catat('politik', `${l.nama} menggelar doa bersama akbar dan dapat restu tokoh sepuh.`);
    }
  }
}

export function bulananPolitik(s: VillageState, catat: Catat): void {
  const p = s.politik;
  // penghasilan resmi kades
  p.dompet += POLITIK.gajiKades;
  // honor jabatan keluarga ikut masuk kantong keluarga kades
  p.dompet += honorKeluarga(s);
  if (p.tunjangan) {
    arus(s, 'Tunjangan kades', -POLITIK.tunjanganKades);
    p.dompet += POLITIK.tunjanganKades;
  }
  // penghasilan usaha pribadi
  for (const a of p.aset ?? []) {
    const def = ASET_PRIBADI.find((d) => d.id === a.id);
    if (!def) continue;
    p.dompet += def.penghasilan;
    if (def.id === 'emas') a.nilai = Math.round(a.nilai * 1.012);
    // toko bangunan kebagian order proyek desa: untung, tapi bikin curiga
    if (def.id === 'toko_bangunan' && s.proyekBerjalan.length > 0) {
      p.dompet += 3 * JT;
      p.kecurigaan = clamp(p.kecurigaan + 2);
    }
  }
  // kecurigaan mereda pelan-pelan kalau kades bersih
  p.kecurigaan = clamp(p.kecurigaan - (s.integritas >= 50 ? 3 : 1));
  // elektabilitas keluarga luntur kalau tidak dirawat
  for (const k of p.keluarga) k.elektabilitas = clamp(k.elektabilitas - 1);
  if (p.pemimpin !== 'pemain') p.tahunDinasti += 1 / 12;

  // audit inspektorat
  if (!p.kasus) {
    const peluang = Math.max(0, p.kecurigaan - 20) / 120 + (s.integritas < 30 ? (30 - s.integritas) / 150 : 0);
    if (nextRandom(s) < peluang) {
      const nilai = Math.round(p.totalKorupsi * 0.6 + 10 * JT);
      p.kasus = { mulai: s.hari, batas: s.hari + POLITIK.batasHariAudit, nilai };
      p.pernahKasus += 1;
      catat('buruk', `Inspektorat datang memeriksa keuangan desa. Ada temuan Rp ${jt(nilai)} jt yang harus dijelaskan dalam ${POLITIK.batasHariAudit} hari.`);
    }
  }
}

// ---------------------------------------------------------------- kampanye & pilkades

export function mulaiKampanye(s: VillageState, catat: Catat): void {
  const p = s.politik;
  if (p.kampanye) return;
  const tersedia = [...CALON];
  const lawan: CalonLawan[] = [];
  for (let i = 0; i < 2; i++) {
    const idx = Math.floor(nextRandom(s) * tersedia.length);
    const c = tersedia.splice(idx, 1)[0];
    lawan.push({ id: `lawan${i + 1}`, nama: c.nama, kubu: c.kubu, kekuatan: Math.round(38 + nextRandom(s) * 20 + 4 * (s.periode - 1)) });
  }
  let calon: PilihanCalon = 'tidak';
  if (bolehNyalon(s, 'pemain')) calon = 'pemain';
  else if (p.penerusId && bolehNyalon(s, p.penerusId)) calon = 'penerus';
  p.kampanye = { calon, lawan, bonusSuara: 0 };
  const sisa = calon === 'pemain' ? 'Kamu masih boleh mencalonkan diri.' : calon === 'penerus' ? 'Kamu sudah mentok batas periode. Penerus siap maju.' : 'Kamu sudah mentok batas periode dan belum punya penerus.';
  catat('politik', `Masa kampanye pilkades dimulai. Lawan: ${lawan.map((l) => `${l.nama} (${l.kubu})`).join(' dan ')}. ${sisa}`);
}

/** Porsi suara satu kelompok untuk calon kita (tanpa unsur acak). */
function porsiSuara(s: VillageState, g: GroupId, m: AnggotaKeluarga | undefined, lawanTerkuat: number, bonus: number): number {
  const integritas = ((s.integritas - 50) / 250) * (g === 'tokoh' ? 3 : 1);
  const dasar = m
    ? 0.3 + (s.kepuasan[g] - 50) / 150 + (s.popularitas - 50) / 350 + (m.elektabilitas - 40) / 110 + (m.kompetensi - 50) / 400 + integritas
    : 0.36 + (s.kepuasan[g] - 50) / 110 + (s.popularitas - 50) / 300 + integritas - 0.06 * (s.politik.periodePemain - 1);
  return dasar + bonus / 100 - (lawanTerkuat - 50) / 250;
}

/**
 * Survei elektabilitas: perkiraan suara calon kita kalau pilkades digelar hari ini, tanpa unsur acak.
 * Sebelum kampanye, lawan diasumsikan sekuat rata-rata (50).
 */
export function surveiElektabilitas(s: VillageState) {
  const p = s.politik;
  const k = p.kampanye;
  const calon: PilihanCalon = k?.calon ?? (bolehNyalon(s, 'pemain') ? 'pemain' : p.penerusId && bolehNyalon(s, p.penerusId) ? 'penerus' : 'tidak');
  const m = calon === 'penerus' ? p.keluarga.find((x) => x.id === p.penerusId) : undefined;
  const lawan = k?.lawan ?? [];
  const terkuat = lawan.length ? Math.max(...lawan.map((l) => l.kekuatan)) : 50;
  let suara = 0;
  let total = 0;
  for (const g of GROUPS) {
    suara += jiwaKelompok(s, g.id) * Math.min(0.95, Math.max(0.05, porsiSuara(s, g.id, m, terkuat, k?.bonusSuara ?? 0)));
    total += jiwaKelompok(s, g.id);
  }
  const kita = Math.round((suara / total) * 1000) / 10;
  const sisa = 100 - kita;
  const totalKekuatan = lawan.reduce((t, l) => t + l.kekuatan, 0) || 1;
  return {
    calon,
    namaCalon: calon === 'pemain' ? s.namaKades : calon === 'penerus' ? (m?.nama ?? '-') : '-',
    persen: calon === 'pemain' || calon === 'penerus' ? kita : 0,
    lawan: lawan.map((l) => ({ nama: l.nama, persen: Math.round((sisa * l.kekuatan * 10) / totalKekuatan) / 10 })),
  };
}

/** Hitung pilkades di akhir periode. Mengubah status atau pemimpin desa. */
export function hitungPilkades(s: VillageState, catat: Catat): { menang: boolean; persen: number; perKelompok: { kelompok: GroupId; persen: number }[] } | null {
  const p = s.politik;
  if (!p.kampanye) mulaiKampanye(s, catat);
  const k = p.kampanye!;
  const lawanTerkuat = Math.max(...k.lawan.map((l) => l.kekuatan));

  if (k.calon === 'tidak' || k.calon === 'dukung_lawan') {
    if (k.calon === 'dukung_lawan') {
      p.dompet += 25 * JT;
      catat('politik', `Kamu mendukung ${k.lawan[0].nama}. Ada "uang terima kasih" Rp 25 jt dari tim pemenangan.`);
    }
    s.status = 'pensiun';
    p.kampanye = null;
    catat('politik', `${namaPemimpin(s)} tidak lagi memimpin desa. Kursi kades berpindah ke orang lain.`);
    return null;
  }

  const m = k.calon === 'penerus' ? s.politik.keluarga.find((x) => x.id === p.penerusId) : undefined;
  if (k.calon === 'penerus' && !m) throw new GameError('Penerus belum dipilih.');
  let suara = 0;
  let total = 0;
  const perKelompok: { kelompok: GroupId; persen: number }[] = [];
  for (const g of GROUPS) {
    const noise = (nextRandom(s) - 0.5) * 0.12;
    const share = Math.min(0.95, Math.max(0.05, porsiSuara(s, g.id, m, lawanTerkuat, k.bonusSuara) + noise));
    suara += jiwaKelompok(s, g.id) * share;
    total += jiwaKelompok(s, g.id);
    perKelompok.push({ kelompok: g.id, persen: Math.round(share * 1000) / 10 });
  }
  const persen = Math.round((suara / total) * 1000) / 10;
  const menang = persen > 50;
  p.kampanye = null;
  if (!menang) {
    s.status = 'kalah';
    catat('politik', `Pilkades selesai. ${m ? m.nama : s.namaKades} kalah dengan ${persen}% suara.`);
    return { menang, persen, perKelompok };
  }
  if (m) {
    p.pemimpin = m.id;
    p.periodeKeluarga[m.id] = (p.periodeKeluarga[m.id] ?? 0) + 1;
    m.jabatan = 'Kepala Desa';
    catat('politik', `${m.nama} menang ${persen}% suara dan dilantik jadi kades. Kamu kini mengatur dari belakang layar.`);
  } else {
    if (p.pemimpin !== 'pemain') {
      const lama = p.keluarga.find((x) => x.id === p.pemimpin);
      if (lama) lama.jabatan = undefined;
    }
    p.pemimpin = 'pemain';
    p.periodePemain += 1;
    catat('politik', `Menang pilkades dengan ${persen}% suara. Periode ke-${p.periodePemain} dimulai.`);
  }
  return { menang, persen, perKelompok };
}

// ---------------------------------------------------------------- aksi pemain

export function aksiGelap(s: VillageState, jenis: JenisAksiGelap): string {
  const def = AKSI_GELAP[jenis];
  if (!def) throw new GameError('Aksi tidak dikenal.');
  const p = s.politik;
  cekJeda(s, `gelap:${jenis}`, def.nama);
  let ambil = 0;
  if (jenis === 'markup' || jenis === 'fee_kontraktor') {
    if (s.proyekBerjalan.length === 0) throw new GameError('Tidak ada proyek yang sedang berjalan.');
  }
  if (jenis === 'markup') {
    ambil = Math.round(Math.min(60 * JT, Math.max(5 * JT, s.kas * 0.12)));
    if (s.kas < ambil) throw new GameError('Kas desa terlalu tipis untuk digelembungkan.');
    arus(s, 'Bocor (mark-up)', -ambil);
    p.kecurigaan = clamp(p.kecurigaan + 12);
    s.integritas = clamp(s.integritas - 3);
  } else if (jenis === 'fee_kontraktor') {
    ambil = 15 * JT;
    p.kecurigaan = clamp(p.kecurigaan + 7);
    s.integritas = clamp(s.integritas - 2);
  } else if (jenis === 'sewa_bengkok') {
    ambil = 10 * JT;
    s.kepuasan.petani = clamp(s.kepuasan.petani - 4);
    p.kecurigaan = clamp(p.kecurigaan + 5);
    s.integritas = clamp(s.integritas - 1);
  } else {
    ambil = 20 * JT;
    s.kepuasan.pkk = clamp(s.kepuasan.pkk - 6);
    s.kepuasan.petani = clamp(s.kepuasan.petani - 3);
    s.kepuasan.perantau = clamp(s.kepuasan.perantau - 2);
    p.kecurigaan = clamp(p.kecurigaan + 15);
    s.integritas = clamp(s.integritas - 4);
  }
  p.dompet += ambil;
  p.totalKorupsi += ambil;
  p.jeda[`gelap:${jenis}`] = s.hari + def.jeda;
  return `${def.nama}: Rp ${jt(ambil)} jt masuk dompet. Bisik-bisik warga mulai terdengar.`;
}

export function pakaiDompet(s: VillageState, tujuan: TujuanDompet, jumlah?: number): string {
  const p = s.politik;
  if (tujuan === 'sumbang_kas') {
    const n = Math.round(jumlah ?? 0);
    if (n < JT) throw new GameError('Sumbangan minimal Rp 1 jt.');
    bayarDompet(s, n, 'sumbangan');
    arus(s, 'Sumbangan kades', n);
    s.integritas = clamp(s.integritas + Math.min(5, n / (20 * JT)));
    s.popularitas = clamp(s.popularitas + 2);
    p.kecurigaan = clamp(p.kecurigaan - Math.min(10, n / (10 * JT)));
    return `Kades menyumbang Rp ${jt(n)} jt dari kantong sendiri ke kas desa. Warga terharu.`;
  }
  if (tujuan === 'buzzer') {
    cekJeda(s, 'dompet:buzzer', 'Sewa buzzer');
    bayarDompet(s, 8 * JT, 'sewa buzzer');
    s.popularitas = clamp(s.popularitas + 4);
    p.kecurigaan = clamp(p.kecurigaan + 2);
    p.jeda['dompet:buzzer'] = s.hari + 15;
    return 'Akun-akun "warga peduli" ramai memuji kades di media sosial.';
  }
  if (tujuan === 'buzzer_redam') {
    cekJeda(s, 'dompet:buzzer_redam', 'Buzzer peredam gosip');
    bayarDompet(s, 15 * JT, 'buzzer peredam gosip');
    p.jeda['dompet:buzzer_redam'] = s.hari + 20;
    // makin sering dipakai, makin gampang ketahuan
    p.jeda['buzzer:pakai'] = (p.jeda['buzzer:pakai'] ?? 0) + 1;
    const peluangKetahuan = Math.min(0.45, 0.12 + 0.06 * (p.jeda['buzzer:pakai'] - 1));
    if (nextRandom(s) < peluangKetahuan) {
      p.kecurigaan = clamp(p.kecurigaan + 8);
      s.popularitas = clamp(s.popularitas - 4);
      s.integritas = clamp(s.integritas - 2);
      return 'Gagal total: wartawan lokal membongkar jaringan akun bayaran kades. Gosip malah makin panas.';
    }
    const turun = Math.min(p.kecurigaan, 14);
    p.kecurigaan = clamp(p.kecurigaan - turun);
    s.popularitas = clamp(s.popularitas + 1);
    return `Buzzer membanjiri grup warga dengan isu lain. Gosip soal kades tenggelam (-${Math.round(turun)}).`;
  }
  if (tujuan === 'baliho') {
    cekJeda(s, 'dompet:baliho', 'Pasang baliho');
    bayarDompet(s, 10 * JT, 'baliho');
    s.popularitas = clamp(s.popularitas + 3);
    if (p.kampanye) p.kampanye.bonusSuara = Math.min(12, p.kampanye.bonusSuara + 1);
    p.jeda['dompet:baliho'] = s.hari + 15;
    return 'Baliho wajah kades tersenyum terpasang di tiap perempatan.';
  }
  if (tujuan === 'sumbang_masjid') {
    cekJeda(s, 'dompet:masjid', 'Sumbangan rumah ibadah');
    bayarDompet(s, 10 * JT, 'sumbangan rumah ibadah');
    s.kepuasan.tokoh = clamp(s.kepuasan.tokoh + 5);
    s.popularitas = clamp(s.popularitas + 2);
    s.integritas = clamp(s.integritas + 1);
    p.jeda['dompet:masjid'] = s.hari + 30;
    return 'Kades menyumbang perlengkapan baru untuk rumah-rumah ibadah di desa. Namanya disebut di pengumuman.';
  }
  if (tujuan === 'amankan_aparat') {
    cekJeda(s, 'dompet:aparat', 'Amankan aparat');
    bayarDompet(s, 25 * JT, '"uang koordinasi"');
    p.kecurigaan = clamp(p.kecurigaan - 12);
    s.integritas = clamp(s.integritas - 2);
    p.jeda['dompet:aparat'] = s.hari + 45;
    return 'Beberapa "teman" di kabupaten diajak makan malam. Laporan warga tentang kades mendadak lambat diproses.';
  }
  if (tujuan === 'cawe_cawe') {
    cekJeda(s, 'dompet:cawe', 'Cawe-cawe pilkada');
    bayarDompet(s, 50 * JT, 'dukungan calon bupati');
    p.jeda['dompet:cawe'] = s.hari + 180;
    if (s.flags.includes('restu_bupati') || s.flags.includes('dimusuhi_bupati')) s.flags = s.flags.filter((f) => f !== 'restu_bupati' && f !== 'dimusuhi_bupati');
    if (nextRandom(s) < 0.6) {
      s.flags.push('restu_bupati');
      s.popularitas = clamp(s.popularitas + 2);
      return 'Calon bupati yang kamu sokong menang. Termin dana desa berikutnya "dipercepat dan ditambah".';
    }
    s.flags.push('dimusuhi_bupati');
    s.popularitas = clamp(s.popularitas - 3);
    return 'Calon bupati jagoanmu kalah. Bupati baru mencatat nama desamu di daftar "kurang mendukung".';
  }
  // serangan fajar
  if (!p.kampanye) throw new GameError('Serangan fajar hanya ada di masa kampanye.');
  if (p.kampanye.calon !== 'pemain' && p.kampanye.calon !== 'penerus') throw new GameError('Tidak ada calon yang kamu usung.');
  bayarDompet(s, 30 * JT, 'serangan fajar');
  p.kampanye.bonusSuara = Math.min(12, p.kampanye.bonusSuara + 4);
  p.kecurigaan = clamp(p.kecurigaan + 10);
  s.integritas = clamp(s.integritas - 3);
  return 'Amplop dibagikan subuh-subuh dari rumah ke rumah. Semoga tidak ada yang merekam.';
}

export function selesaikanAudit(s: VillageState, pilihan: PilihanAudit, catat: Catat): string {
  const p = s.politik;
  const kasus = p.kasus;
  if (!kasus) throw new GameError('Tidak ada audit yang sedang berjalan.');
  p.kasus = null;
  if (pilihan === 'kembalikan') {
    const bayar = Math.min(p.dompet, kasus.nilai);
    p.dompet -= bayar;
    arus(s, 'Keputusan & kejadian', bayar);
    p.kecurigaan = clamp(p.kecurigaan - 30);
    s.popularitas = clamp(s.popularitas - 5);
    s.integritas = clamp(s.integritas - 3);
    if (bayar < kasus.nilai) {
      p.kecurigaan = clamp(p.kecurigaan + 15);
      return `Uang yang bisa dikembalikan cuma Rp ${jt(bayar)} jt. Auditor mencatat kekurangannya.`;
    }
    return `Rp ${jt(bayar)} jt dikembalikan ke kas desa. Kasus ditutup dengan catatan.`;
  }
  if (pilihan === 'suap') {
    const biaya = Math.round(15 * JT + kasus.nilai * 0.3);
    if (p.dompet < biaya) {
      p.kasus = kasus;
      throw new GameError(`Uang suap kurang. Butuh Rp ${jt(biaya)} jt.`);
    }
    p.dompet -= biaya;
    const peluang = 0.75 - p.kecurigaan / 200;
    if (nextRandom(s) < peluang) {
      p.kecurigaan = clamp(p.kecurigaan - 20);
      return `Auditor "paham situasi" setelah menerima Rp ${jt(biaya)} jt. Laporan dinyatakan wajar.`;
    }
    s.status = 'ditangkap';
    catat('buruk', 'Auditor ternyata sedang diawasi. Kades tertangkap tangan saat menyerahkan amplop.');
    return 'Operasi tangkap tangan. Kades digelandang ke kantor penegak hukum.';
  }
  if (pilihan === 'kambing_hitam') {
    s.integritas = clamp(s.integritas - 6);
    s.kepuasan.tokoh = clamp(s.kepuasan.tokoh - 5);
    if (nextRandom(s) < 0.55) {
      p.kecurigaan = clamp(p.kecurigaan - 25);
      return 'Bendahara desa dijadikan tersangka tunggal. Kades lolos, tapi perangkat lain mulai takut.';
    }
    p.kecurigaan = clamp(p.kecurigaan + 20);
    p.kasus = { mulai: s.hari, batas: s.hari + POLITIK.batasHariAudit, nilai: Math.round(kasus.nilai * 1.3) };
    return 'Bendahara membawa bukti chat dengan kades. Kasus justru membesar.';
  }
  // pasrah ikut proses hukum
  if (p.kecurigaan >= 60 || p.totalKorupsi >= 60 * JT) {
    s.status = 'ditangkap';
    catat('buruk', 'Penyidik menemukan aliran dana ke rekening pribadi. Kades ditahan.');
    return 'Kades ditahan untuk proses hukum.';
  }
  p.kecurigaan = clamp(p.kecurigaan - 40);
  s.popularitas = clamp(s.popularitas - 8);
  return 'Pemeriksaan selesai. Hanya ada teguran administrasi, tapi nama kades sempat jadi bahan omongan.';
}

export function promosiKeluarga(s: VillageState, id: string, cara: CaraPromosi): string {
  const m = anggota(s, id);
  const p = s.politik;
  if (cara === 'jabatan') {
    // kompatibel dengan klien lama: pilih jabatan organisasi pertama yang belum dipegang keluarga
    if (m.jabatan) throw new GameError(`${m.nama} sudah punya jabatan. Pilih jabatan lain lewat angkat_keluarga.`);
    const bebas = JABATAN_DESA.find((j) => !(s.jabatanDesa?.[j.id] ?? '').startsWith('kel:') && (!j.syaratProyek || s.proyekSelesai.some((b) => b.proyekId === j.syaratProyek)));
    if (!bebas) throw new GameError('Semua jabatan sudah dipegang keluarga.');
    return angkatKeluarga(s, id, bebas.id);
  }
  const kunci = `promosi:${id}:${cara}`;
  if (cara === 'baliho') {
    cekJeda(s, kunci, 'Baliho');
    bayarDompet(s, 10 * JT, 'baliho');
    m.elektabilitas = clamp(m.elektabilitas + 6);
    p.jeda[kunci] = s.hari + 15;
    return `Baliho "${m.nama}, Muda, Merakyat" terpasang di gapura desa.`;
  }
  if (cara === 'blusukan') {
    cekJeda(s, kunci, 'Blusukan');
    m.elektabilitas = clamp(m.elektabilitas + 3);
    m.kompetensi = clamp(m.kompetensi + 2);
    p.jeda[kunci] = s.hari + 10;
    return `${m.nama} ikut kades blusukan ke sawah dan pasar.`;
  }
  cekJeda(s, kunci, 'Sekolah lagi');
  bayarDompet(s, 25 * JT, 'biaya kuliah');
  m.kompetensi = clamp(m.kompetensi + 10);
  p.jeda[kunci] = s.hari + 60;
  return `${m.nama} ikut kuliah kelas eksekutif akhir pekan. Gelarnya nanti panjang.`;
}

export function pilihPenerus(s: VillageState, id: string): string {
  const m = anggota(s, id);
  s.politik.penerusId = m.id;
  if (s.politik.kampanye && s.politik.kampanye.calon === 'tidak' && bolehNyalon(s, m.id)) s.politik.kampanye.calon = 'penerus';
  return `${m.nama} (${m.peran}) resmi disiapkan sebagai penerus.`;
}

export function pilihCalon(s: VillageState, calon: PilihanCalon): string {
  const p = s.politik;
  if (!p.kampanye) throw new GameError(`Masa kampanye belum mulai. Kampanye dibuka di bulan ke-${POLITIK.bulanKampanye} periode.`);
  if (calon === 'pemain' && !bolehNyalon(s, 'pemain')) throw new GameError(`Kamu sudah ${p.periodePemain} periode. Aturan hanya membolehkan ${p.maksPeriode}.`);
  if (calon === 'penerus') {
    if (!p.penerusId) throw new GameError('Pilih penerus dulu dari keluarga.');
    if (!bolehNyalon(s, p.penerusId)) throw new GameError('Penerus ini sudah mentok batas periode.');
  }
  p.kampanye.calon = calon;
  const teks: Record<PilihanCalon, string> = {
    pemain: 'Kamu mendaftar lagi sebagai calon kades.',
    penerus: `${p.keluarga.find((k) => k.id === p.penerusId)?.nama} didaftarkan sebagai calon kades.`,
    dukung_lawan: `Kamu diam-diam mendukung ${p.kampanye.lawan[0].nama}.`,
    tidak: 'Kamu memutuskan tidak ikut pilkades kali ini.',
  };
  return teks[calon];
}

export function lobiAturan(s: VillageState, jenis: JenisLobi): string {
  const p = s.politik;
  if (jenis === 'tunjangan') {
    if (p.tunjangan) throw new GameError('Perdes tunjangan kades sudah berlaku.');
    p.tunjangan = true;
    for (const g of Object.keys(s.kepuasan) as GroupId[]) s.kepuasan[g] = clamp(s.kepuasan[g] - 2);
    s.integritas = clamp(s.integritas - 2);
    return `Perdes baru: tunjangan kades Rp ${jt(POLITIK.tunjanganKades)} jt per bulan diambil dari kas desa. BPD setuju setelah makan siang bersama.`;
  }
  cekJeda(s, 'lobi:periode', 'Lobi perpanjangan');
  if (p.maksPeriode >= POLITIK.maksPeriodeLobi) throw new GameError('Batas periode sudah setinggi-tingginya.');
  bayarDompet(s, 40 * JT, 'ongkos lobi ke ibu kota');
  p.jeda['lobi:periode'] = s.hari + 180;
  s.kepuasan.pemuda = clamp(s.kepuasan.pemuda - 2);
  s.kepuasan.perantau = clamp(s.kepuasan.perantau - 2);
  const peluang = 0.35 + s.popularitas / 400;
  if (nextRandom(s) < peluang) {
    p.maksPeriode += 1;
    return `Aksi damai Asosiasi Kades Se-Nusantara berhasil. Aturan baru: kades boleh menjabat ${p.maksPeriode} periode.`;
  }
  s.popularitas = clamp(s.popularitas - 4);
  return 'Aksi damai di ibu kota cuma jadi bahan meme. Aturan tidak berubah.';
}

export function nyaleg(s: VillageState, catat: Catat): string {
  const p = s.politik;
  if (!p.kampanye) throw new GameError('Pencalonan dewan kabupaten dibuka bersamaan dengan masa kampanye.');
  bayarDompet(s, 80 * JT, 'mahar dan kampanye caleg');
  const peluang = 0.2 + s.popularitas / 250 + rataKepuasan(s) / 400 + p.kampanye.bonusSuara / 100;
  if (nextRandom(s) < peluang) {
    s.status = 'naik_kelas';
    catat('politik', `${s.namaKades} lolos jadi anggota dewan kabupaten. Desa ditinggal untuk karier yang lebih tinggi.`);
    return 'Selamat, kamu naik kelas ke dewan kabupaten!';
  }
  s.popularitas = clamp(s.popularitas - 5);
  return 'Suara caleg tidak cukup. Uang habis, kursi dewan melayang.';
}

export function beliAset(s: VillageState, id: string): string {
  const def = ASET_PRIBADI.find((d) => d.id === id);
  if (!def) throw new GameError('Aset tidak dikenal.');
  const p = s.politik;
  if (p.aset.some((a) => a.id === id)) throw new GameError(`Kamu sudah punya ${def.nama}.`);
  bayarDompet(s, def.harga, def.nama);
  p.aset.push({ id, hariBeli: s.hari, nilai: def.harga });
  if (def.gengsi) s.popularitas = clamp(s.popularitas + def.gengsi / 2);
  if (def.kecurigaan) {
    p.kecurigaan = clamp(p.kecurigaan + def.kecurigaan);
    s.kepuasan.petani = clamp(s.kepuasan.petani - 1);
  }
  return def.jenis === 'gengsi'
    ? `${def.nama} resmi milikmu. Tetangga mulai bertanya-tanya dari mana uangnya.`
    : `${def.nama} dibeli. Penghasilan Rp ${jt(def.penghasilan)} jt per bulan masuk ke uang pribadi.`;
}

export function jualAset(s: VillageState, id: string): string {
  const p = s.politik;
  const a = p.aset.find((x) => x.id === id);
  const def = ASET_PRIBADI.find((d) => d.id === id);
  if (!a || !def) throw new GameError('Kamu tidak punya aset itu.');
  const harga = Math.round(a.nilai * (def.id === 'emas' ? 0.98 : 0.8));
  p.aset = p.aset.filter((x) => x !== a);
  p.dompet += harga;
  return `${def.nama} terjual Rp ${jt(harga)} jt.`;
}

export function nilaiAset(s: VillageState): number {
  return (s.politik.aset ?? []).reduce((t, a) => t + a.nilai, 0);
}

// ---------------------------------------------------------------- rapor Warisan

export interface RaporWarisan {
  desa: number;
  kuasa: number;
  harta: number;
  namaBaik: number;
  /** Tidak berbatas: makin banyak kas dibelanjakan untuk membangun, makin tinggi (skala log). */
  pembangunan: number;
  total: number;
  gelar: string;
  tahunBerkuasa: number;
}

export function raporWarisan(s: VillageState): RaporWarisan {
  const p = s.politik;
  const desa = Math.round((s.indeks.sosial + s.indeks.ekonomi + s.indeks.lingkungan) / 3);
  const tahunBerkuasa = Math.round((s.hari / 360) * 10) / 10;
  const kuasa = Math.round(clamp(tahunBerkuasa * 12.5));
  const harta = Math.round(clamp(Math.max(0, p.dompet + nilaiAset(s)) / (10 * JT)));
  const namaBaik = Math.round(clamp(s.integritas - (s.status === 'ditangkap' ? 40 : 0) - p.pernahKasus * 5));
  const pembangunan = poinPembangunan(s.nilaiPembangunan ?? 0);
  const total = Math.round((desa * 0.3 + kuasa * 0.2 + harta * 0.15 + namaBaik * 0.2 + pembangunan * 0.15) * 10) / 10;
  let gelar: string;
  if (s.status === 'ditangkap') gelar = harta >= 50 ? 'Koruptor Apes' : 'Napi Tipikor';
  else if (s.status === 'naik_kelas') gelar = 'Naik Kelas ke Kabupaten';
  else if (p.pemimpin !== 'pemain' || p.tahunDinasti > 0) gelar = `Dinasti ${Math.max(1, Math.round(tahunBerkuasa))} Tahun`;
  else if (harta >= 60 && namaBaik < 40) gelar = 'Koruptor Lolos';
  else if (desa >= 65 && namaBaik >= 70) gelar = 'Kades Teladan';
  else if (s.status === 'kalah') gelar = 'Tumbang di Pilkades';
  else if (s.status === 'pensiun') gelar = 'Pensiun Tenang';
  else if (harta >= 40) gelar = 'Raja Kecil';
  else gelar = 'Kades Biasa Saja';
  return { desa, kuasa, harta, namaBaik, pembangunan, total, gelar, tahunBerkuasa };
}

/** 250 jt = 10, 1 M = 23, 5 M = 44, 20 M = 63, 100 M = 87, dan terus naik tanpa batas. */
export function poinPembangunan(nilai: number): number {
  return Math.round(10 * Math.log2(1 + Math.max(0, nilai) / (250 * JT)));
}

/** Bocoran tingkat kecurigaan untuk pemain (angka pasti dirahasiakan). */
export function gosip(s: VillageState): 'adem' | 'bisik-bisik' | 'ramai' | 'panas' {
  const k = s.politik.kecurigaan;
  if (k < 15) return 'adem';
  if (k < 35) return 'bisik-bisik';
  if (k < 60) return 'ramai';
  return 'panas';
}
