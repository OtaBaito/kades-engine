// Mekanik "desa hidup": koin retribusi, aspirasi, XP & level, misi, pencapaian, pegawai, dekorasi, upgrade.
import { potonganBumdes } from './tugas.ts';
import { migrasiJabatan } from './jabatan.ts';
import { faktorKoinUnjuk } from './unjuk.ts';
import { MEGA, biayaMega, bonusMega } from './mega.ts';
import { DUSUN } from './dusun.ts';
import { migrasiKeluarga } from './politik.ts';
import { ASPIRASI, BUMDES, DEKORASI, JUMLAH_RUMAH, MISI, MISI_MINGGUAN, PEGAWAI, PENCAPAIAN } from './content/fitur.ts';
import { CARDS } from './content/cards.ts';
import { LANJUTAN } from './content/lanjutan.ts';
import { buatPolitik } from './politik.ts';
import { BASIS_PENDUDUK, jiwaKelompok, totalPenduduk } from './penduduk.ts';
import { gajiStaf, harianSifat, kekuatanPeran, migrasiStaf, rekrutKandidat } from './kepegawaian.ts';
import { arus } from './arus.ts';
import { GROUPS } from './content/groups.ts';
import { PROJECT_BY_ID } from './content/projects.ts';
import { GameError } from './errors.ts';
import { nextRandom, pickWeighted } from './rng.ts';
import type { GroupId, LogEntry, StatKey, VillageState } from './types.ts';

const JT = 1_000_000;

export const FITUR = {
  /** Pajak & retribusi dasar desa per bulan, masuk sebagai koin di balai desa. */
  padesBulanan: 45 * JT,
  /** Jumlah rumah yang menghasilkan koin iuran. */
  rumahIuran: 16,
  /** Koin berhenti bertambah setelah menumpuk sekian hari (ayo rajin menagih). */
  batasKoinHari: 20,
  peluangAspirasi: 0.4,
  maksAspirasi: 4,
  aspirasiKedaluwarsa: 8,
  maksRiwayatKeluhan: 40,
  xp: { kartu: 12, tagih: 1, aspirasi: 6, proyekMulai: 15, proyekSelesai: 40, upgradeSelesai: 30, pencapaian: 25, menang: 150, dekorasi: 10, pegawai: 10 },
  maksLevelBangunan: 3,
} as const;

export type Catat = (jenis: LogEntry['jenis'], teks: string) => void;

export function xpNaikLevel(level: number): number {
  // kurva makin curam: Lv 2 cepat (perkenalan), Lv 10 butuh beberapa bulan game
  return 150 + 100 * (level - 1) + 15 * (level - 1) ** 2;
}

/** Lengkapi state lama (sebelum fitur ini ada) supaya tetap bisa dimainkan. */
/** Geser acak 0..44 hari untuk setiap kartu yang punya syarat minHari (sekali per desa). */
export function acakGeserHari(s: VillageState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of CARDS) if (c.syarat?.minHari !== undefined && !c.id.startsWith('acak_')) out[c.id] = Math.floor(nextRandom(s) * 45);
  return out;
}

/**
 * Isi ulang ingatan keputusan (pilihan terakhir per kartu dan flag cabang) dari teks keputusan lama,
 * urut dari yang terlama. Dipakai untuk desa yang dibuat sebelum kartu bisa berkembang.
 */
export function pulihkanPilihan(s: VillageState, teksKeputusan: string[]): void {
  s.pilihanKartu ??= {};
  for (const teks of teksKeputusan) {
    for (const c of CARDS) {
      if (c.id.startsWith('acak_') || !teks.includes(`${c.judul}: `)) continue;
      const semua = [...c.opsi, ...Object.values(LANJUTAN[c.id] ?? {}).flatMap((l) => l.opsi)];
      const o = semua.find((x) => teks.includes(`${c.judul}: ${x.label}`));
      if (!o) continue;
      s.pilihanKartu[c.id] = o.id;
      for (const f of o.effect.setFlag ?? []) if (!s.flags.includes(f)) s.flags.push(f);
    }
  }
}

export function normalisasi(s: VillageState): void {
  s.kartuSiap ??= {};
  s.penduduk ??= Object.fromEntries(GROUPS.map((g) => [g.id, g.jiwa])) as VillageState['penduduk'];
  s.pilihanKartu ??= {};
  s.politik ??= buatPolitik(s);
  s.politik.aset ??= [];
  migrasiKeluarga(s);
  migrasiJabatan(s);
  // desa lama: perkirakan total belanja pembangunan dari bangunan yang sudah berdiri
  if (s.nilaiPembangunan === undefined) {
    const proyek = (s.proyekSelesai ?? []).reduce((t, b) => t + (PROJECT_BY_ID.get(b.proyekId)?.biaya ?? 0) * Math.max(1, b.level ?? 1), 0);
    const hitung = new Map<string, number>();
    const mega = (s.megaSelesai ?? []).reduce((t, id) => {
      const k = hitung.get(id) ?? 0;
      hitung.set(id, k + 1);
      const d = MEGA.find((m) => m.id === id);
      return t + (d ? biayaMega(d, k) : 0);
    }, 0);
    const dusun = (s.dusun ?? []).reduce((t, id) => t + (DUSUN.find((d) => d.id === id)?.biaya ?? 0), 0);
    s.nilaiPembangunan = proyek + mega + dusun + (s.investasi?.modalBumdes ?? 0);
  }
  // migrasi: keputusan lama (sebelum ada cabang opsi) tetap diingat lewat jurnal
  if ((s.versiEngine ?? 0) < 3) {
    for (const c of CARDS) {
      for (const o of c.opsi) {
        for (const f of o.effect.setFlag ?? []) {
          if (!s.flags.includes(f) && s.jurnal.some((j) => j.teks.startsWith(`${c.judul}: ${o.label}`))) s.flags.push(f);
        }
      }
    }
    s.versiEngine = 3;
  }
  // migrasi: isi pilihan terakhir per kartu dari jurnal (jurnal tersimpan terbaru di belakang)
  if ((s.versiEngine ?? 0) < 4) {
    pulihkanPilihan(
      s,
      s.jurnal.filter((j) => j.jenis === 'keputusan').map((j) => j.teks),
    );
    s.versiEngine = 4;
  }
  s.geserHari ??= acakGeserHari(s);
  s.koin ??= {};
  s.aspirasi ??= [];
  s.riwayatKeluhan ??= s.aspirasi.map((a) => ({ id: a.id, kelompok: a.kelompok, teks: a.teks, hari: a.hari, status: 'menunggu' as const }));
  s.xp ??= 0;
  s.level ??= 1;
  s.misi ??= { bulan: -1, daftar: [] };
  s.statistik ??= { tagih: 0, aspirasi: 0, kartu: 0, proyekMulai: 0, proyekSelesai: 0, upgrade: 0, dekorasi: 0, bumdes: 0 };
  s.statistik.bumdes ??= 0;
  s.pencapaian ??= [];
  s.pegawai ??= [];
  migrasiStaf(s);
  s.dekorasi ??= [];
  s.bumdes ??= {};
  s.pinjaman ??= [];
  s.statistikKredit ??= { lunas: 0, telat: 0 };
  for (const b of s.proyekSelesai) b.level ??= 1;
}

export function tambahXp(s: VillageState, n: number, catat: Catat): void {
  s.xp += n;
  while (s.xp >= xpNaikLevel(s.level)) {
    s.xp -= xpNaikLevel(s.level);
    s.level += 1;
    const bonus = 1 * JT * s.level;
    arus(s, 'Bonus & hadiah', bonus);
    catat('baik', `Naik ke level ${s.level}! Bonus kas ${Math.round(bonus / JT)} jt.`);
  }
}

export function tambahStat(s: VillageState, k: StatKey, n = 1): void {
  s.statistik[k] += n;
}

// ---------------------------------------------------------------- koin retribusi

function levelBangunan(s: VillageState, id: string): number {
  return s.proyekSelesai.find((b) => b.proyekId === id)?.level ?? 0;
}

/** Laju koin per hari untuk tiap sumber. */
export function lajuKoin(s: VillageState): Record<string, number> {
  // iuran & pajak warga muncul sebagai koin di beberapa rumah (seperti koin per kamar di game idle)
  const laju: Record<string, number> = {};
  // iuran ikut jumlah penduduk: desa yang ramai, iurannya juga besar
  const skala = totalPenduduk(s) / BASIS_PENDUDUK;
  for (let i = 0; i < FITUR.rumahIuran; i++) laju[`rumah:${i}`] = (FITUR.padesBulanan * skala) / FITUR.rumahIuran / 30;
  // pemasukan usaha desa lain (wisata, koperasi, tambang) masuk lewat balai desa
  if (s.pemasukanTambahanBulanan > 0) laju.balai = s.pemasukanTambahanBulanan / 30;
  // setiap bangunan yang punya pemasukan (pasar, wisata, gedung sewa, dll.) menghasilkan koin di lokasinya
  for (const b of s.proyekSelesai) {
    const dasar = PROJECT_BY_ID.get(b.proyekId)?.pemasukanBulanan ?? 0;
    if (dasar > 0) laju[b.proyekId] = (dasar * (1 + 0.5 * (b.level - 1))) / 30;
  }
  return laju;
}

export function hariKoin(s: VillageState): void {
  // mogok perangkat atau blokade jalan menahan iuran dan retribusi
  const f = faktorKoinUnjuk(s);
  for (const [sumber, per] of Object.entries(lajuKoin(s))) {
    const batas = per * FITUR.batasKoinHari;
    const n = per * (sumber.startsWith('rumah:') ? f.rumah : f.usaha);
    s.koin[sumber] = Math.min(batas, (s.koin[sumber] ?? 0) + n);
  }
}

export function tagih(s: VillageState, sumber: string | undefined, catat: Catat): number {
  const daftar = sumber ? [sumber] : Object.keys(s.koin);
  let total = 0;
  let kali = 0;
  for (const k of daftar) {
    const v = Math.floor(s.koin[k] ?? 0);
    if (v < 1000) continue;
    total += v;
    kali += 1;
    s.koin[k] = 0;
  }
  if (total > 0) {
    arus(s, 'Iuran & retribusi', total);
    tambahStat(s, 'tagih', kali);
    tambahXp(s, FITUR.xp.tagih * kali, catat);
  }
  return total;
}

// ---------------------------------------------------------------- aspirasi

function tandaiKeluhan(s: VillageState, id: string, status: VillageState['riwayatKeluhan'][number]['status']) {
  const k = s.riwayatKeluhan.find((x) => x.id === id);
  if (k) {
    k.status = status;
    k.hariSelesai = s.hari;
  }
}

export function hariAspirasi(s: VillageState, catat: Catat, nomor: () => string): void {
  // aspirasi kedaluwarsa: warga kecewa sedikit
  const basi = s.aspirasi.filter((a) => s.hari - a.hari >= FITUR.aspirasiKedaluwarsa);
  for (const a of basi) {
    s.kepuasan[a.kelompok] = Math.max(0, s.kepuasan[a.kelompok] - 1);
    tandaiKeluhan(s, a.id, 'diabaikan');
  }
  s.aspirasi = s.aspirasi.filter((a) => !basi.includes(a));

  if (s.aspirasi.length < FITUR.maksAspirasi && nextRandom(s) < FITUR.peluangAspirasi) {
    const g = pickWeighted(s, GROUPS, (x) => jiwaKelompok(s, x.id) * (110 - s.kepuasan[x.id]))!;
    const baris = ASPIRASI[g.id];
    const teks = baris[Math.floor(nextRandom(s) * baris.length)];
    const dipakai = new Set(s.aspirasi.map((a) => a.rumah));
    let rumah = Math.floor(nextRandom(s) * JUMLAH_RUMAH);
    for (let i = 0; i < JUMLAH_RUMAH && dipakai.has(rumah); i++) rumah = (rumah + 1) % JUMLAH_RUMAH;
    const id = nomor();
    s.aspirasi.push({ id, kelompok: g.id, rumah, teks, hari: s.hari });
    s.riwayatKeluhan.unshift({ id, kelompok: g.id, teks, hari: s.hari, status: 'menunggu' });
    if (s.riwayatKeluhan.length > FITUR.maksRiwayatKeluhan) s.riwayatKeluhan.length = FITUR.maksRiwayatKeluhan;
  }

  // pegawai humas menanggapi satu aspirasi per hari
  if (s.pegawai.includes('humas') && s.aspirasi.length > 0) {
    tanggapi(s, s.aspirasi[0].id, catat, false);
  }
}

export function tanggapi(s: VillageState, id: string, catat: Catat, olehKades = true): boolean {
  const a = s.aspirasi.find((x) => x.id === id);
  if (!a) return false;
  s.aspirasi = s.aspirasi.filter((x) => x !== a);
  tandaiKeluhan(s, a.id, olehKades ? 'ditanggapi' : 'diwakilkan');
  s.kepuasan[a.kelompok] = Math.min(100, s.kepuasan[a.kelompok] + (olehKades ? 1 : 0.6));
  s.popularitas = Math.min(100, s.popularitas + 0.2);
  if (olehKades) {
    tambahStat(s, 'aspirasi');
    tambahXp(s, FITUR.xp.aspirasi, catat);
  }
  return true;
}

// ---------------------------------------------------------------- pegawai

export function bonusTargetKepuasan(s: VillageState, g: GroupId): number {
  let b = 0;
  if (s.pegawai.includes('kader') && (g === 'pkk' || g === 'tokoh')) b += (g === 'pkk' ? 5 : 3) * kekuatanPeran(s, 'kader');
  if (s.pegawai.includes('linmas')) b += 2 * kekuatanPeran(s, 'linmas');
  for (const p of PEGAWAI) if (s.pegawai.includes(p.id)) b += (p.kepuasanTarget?.[g] ?? 0) * kekuatanPeran(s, p.id);
  // proyek besar yang sudah diresmikan menaikkan target kepuasan secara permanen
  b += bonusMega(s, g);
  // bangunan yang di-upgrade memenuhi kebutuhan lebih baik
  const def = GROUPS.find((x) => x.id === g)!;
  for (const built of s.proyekSelesai) {
    const p = PROJECT_BY_ID.get(built.proyekId);
    if (p && p.menyediakan.some((t) => def.kebutuhan.includes(t))) b += 2 * (built.level - 1);
  }
  return b;
}

export function gajiPegawai(s: VillageState): number {
  return gajiStaf(s);
}

export function hariPegawai(s: VillageState, catat: Catat): void {
  if (s.pegawai.includes('bendahara')) {
    // bendahara menagih tanpa XP untuk kades
    for (const k of Object.keys(s.koin)) {
      const v = Math.floor(s.koin[k]);
      if (v <= 0) continue;
      arus(s, 'Iuran & retribusi', v);
      s.koin[k] = 0;
    }
  }
  if (s.pegawai.includes('humas')) s.popularitas = Math.min(100, s.popularitas + 0.03 * kekuatanPeran(s, 'humas'));
  harianSifat(s);
  for (const p of PEGAWAI) {
    if (!s.pegawai.includes(p.id) || !p.bulanan) continue;
    const kuat = kekuatanPeran(s, p.id);
    if (p.bulanan.kecurigaan && s.politik) s.politik.kecurigaan = Math.max(0, s.politik.kecurigaan + (p.bulanan.kecurigaan * kuat) / 30);
    for (const [k, v] of Object.entries(p.bulanan.indeks ?? {})) {
      const id = k as keyof VillageState['indeks'];
      s.indeks[id] = Math.min(100, s.indeks[id] + ((v ?? 0) * kuat) / 30);
    }
  }
  void catat;
}

export function rekrut(s: VillageState, id: string): string {
  return rekrutKandidat(s, id);
}

// ---------------------------------------------------------------- dekorasi

export function beliDekorasi(s: VillageState, id: string): { pesan: string; efek: (typeof DEKORASI)[number]['efek'] } {
  const d = DEKORASI.find((x) => x.id === id);
  if (!d) throw new GameError('Dekorasi tidak dikenal.');
  if (s.dekorasi.includes(id)) throw new GameError(`${d.nama} sudah terpasang.`);
  if ((d.minLevel ?? 1) > s.level) throw new GameError(`${d.nama} terbuka di level ${d.minLevel}.`);
  if (s.kas < d.biaya) throw new GameError(`Kas tidak cukup untuk ${d.nama}.`);
  arus(s, 'Dekorasi', -d.biaya);
  s.dekorasi.push(id);
  tambahStat(s, 'dekorasi');
  return { pesan: `${d.nama} terpasang. Warga berfoto di sana.`, efek: d.efek };
}

// ---------------------------------------------------------------- misi

export function siapkanMisi(s: VillageState, bulan: number): void {
  if (s.misi.bulan === bulan) return;
  // kalau kaur keuangan sudah menagih otomatis, misi "tagih iuran" tidak mungkin selesai
  const pool = MISI.filter((m) => m.jenis !== 'tagih' || !s.pegawai.includes('bendahara'));
  const daftar = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(nextRandom(s) * pool.length);
    const t = pool.splice(idx, 1)[0];
    const target = t.target[0] + Math.floor(nextRandom(s) * (t.target[1] - t.target[0] + 1));
    daftar.push({
      id: `m${bulan}-${i}`,
      jenis: t.jenis,
      target,
      awal: s.statistik[t.jenis],
      hadiahKas: t.hadiahKas,
      hadiahXp: t.hadiahXp,
      diklaim: false,
    });
  }
  s.misi = { bulan, daftar };
}

/** Misi mingguan berganti tiap 7 hari game (2 misi). */
export function siapkanMisiMingguan(s: VillageState): void {
  const minggu = Math.floor(s.hari / 7);
  if (s.misiMingguan?.minggu === minggu) return;
  const pool = MISI_MINGGUAN.filter((m) => m.jenis !== 'tagih' || !s.pegawai.includes('bendahara'));
  const daftar = [];
  for (let i = 0; i < 2 && pool.length > 0; i++) {
    const t = pool.splice(Math.floor(nextRandom(s) * pool.length), 1)[0];
    const target = t.target[0] + Math.floor(nextRandom(s) * (t.target[1] - t.target[0] + 1));
    daftar.push({ id: `w${minggu}-${i}`, jenis: t.jenis, target, awal: s.statistik[t.jenis], hadiahKas: t.hadiahKas, hadiahXp: t.hadiahXp, diklaim: false });
  }
  s.misiMingguan = { minggu, daftar };
}

export function progresMisi(s: VillageState, m: VillageState['misi']['daftar'][number]): number {
  return Math.min(m.target, s.statistik[m.jenis] - m.awal);
}

export function klaimMisi(s: VillageState, id: string, catat: Catat): string {
  const m = s.misi.daftar.find((x) => x.id === id) ?? s.misiMingguan?.daftar.find((x) => x.id === id);
  if (!m) throw new GameError('Misi tidak ditemukan.');
  if (m.diklaim) throw new GameError('Hadiah misi ini sudah diambil.');
  if (progresMisi(s, m) < m.target) throw new GameError('Misi belum selesai.');
  m.diklaim = true;
  arus(s, 'Bonus & hadiah', m.hadiahKas);
  tambahXp(s, m.hadiahXp, catat);
  return `Hadiah misi diambil: +${Math.round(m.hadiahKas / JT)} jt dan ${m.hadiahXp} XP.`;
}

// ---------------------------------------------------------------- pencapaian

export function cekPencapaian(s: VillageState, catat: Catat): void {
  for (const p of PENCAPAIAN) {
    if (s.pencapaian.some((x) => x.id === p.id)) continue;
    if (!p.syarat(s)) continue;
    s.pencapaian.push({ id: p.id, hari: s.hari });
    catat('baik', `Pencapaian baru: ${p.judul}.`);
    tambahXp(s, FITUR.xp.pencapaian, catat);
  }
}

// ---------------------------------------------------------------- BUMDes (pendapatan pasif)

export function bonusBumdes(s: VillageState): number {
  return PEGAWAI.filter((p) => s.pegawai.includes(p.id)).reduce((t, p) => t + (p.bonusBumdes ?? 0) * kekuatanPeran(s, p.id), 0) + potonganBumdes(s);
}

export function pendapatanBumdes(def: (typeof BUMDES)[number], level: number): number {
  return level <= 0 ? 0 : Math.round(def.pendapatanHarian * (1 + 0.5 * (level - 1)));
}

export function biayaBumdes(def: (typeof BUMDES)[number], level: number): number {
  // level 0 -> bangun baru; selanjutnya upgrade makin mahal
  return Math.round(def.biaya * Math.pow(1.6, level));
}

/** Pendapatan pasif harian: langsung masuk kas, tetap jalan saat game ditutup. */
export function hariBumdes(s: VillageState): number {
  let total = 0;
  for (const def of BUMDES) total += pendapatanBumdes(def, s.bumdes[def.id] ?? 0);
  total = Math.round(total * (1 + bonusBumdes(s)));
  if (total > 0) {
    arus(s, 'Usaha BUMDes', total);
  }
  return total;
}

export function bangunBumdes(s: VillageState, id: string, sudahAda: (proyekId: string) => boolean): { pesan: string; level: number; kelompok: GroupId } {
  const def = BUMDES.find((b) => b.id === id);
  if (!def) throw new GameError('Usaha BUMDes tidak dikenal.');
  const level = s.bumdes[id] ?? 0;
  if (level >= def.maksLevel) throw new GameError(`${def.nama} sudah level maksimal.`);
  if (level === 0 && (def.minLevel ?? 1) > s.level) throw new GameError(`${def.nama} terbuka di level ${def.minLevel}.`);
  if (def.syaratProyek && !sudahAda(def.syaratProyek)) {
    throw new GameError(`${def.nama} butuh ${PROJECT_BY_ID.get(def.syaratProyek)?.nama ?? def.syaratProyek} dulu.`);
  }
  const biaya = biayaBumdes(def, level);
  if (s.kas < biaya) throw new GameError(`Kas tidak cukup. Butuh Rp ${Math.round(biaya / JT)} jt.`);
  arus(s, 'Usaha BUMDes (modal)', -biaya);
  s.bumdes[id] = level + 1;
  const per = pendapatanBumdes(def, level + 1);
  return {
    pesan: level === 0 ? `${def.nama} dibuka! Pendapatan Rp ${String(Math.round((per / JT) * 10) / 10).replace(".", ",")} jt per hari.` : `${def.nama} naik ke level ${level + 1}. Pendapatan kini Rp ${String(Math.round((per / JT) * 10) / 10).replace(".", ",")} jt per hari.`,
    level: level + 1,
    kelompok: def.kelompok,
  };
}
