import { bulananTugas } from './tugas.ts';
import { CARDS, CARD_BY_ID } from './content/cards.ts';
import { LANJUTAN } from './content/lanjutan.ts';
import { GROUPS, GROUP_IDS } from './content/groups.ts';
import { PROJECTS, PROJECT_BY_ID } from './content/projects.ts';
import { nextRandom, pickWeighted, seedFromString } from './rng.ts';
import { ambilPinjaman, lunasiPinjaman, pinjamanProgram, tagihCicilan } from './kredit.ts';
import { arus, type PosKas } from './arus.ts';
import { bulananPenduduk, jiwaKelompok } from './penduduk.ts';
import { klaimHarian } from './harian.ts';
import { bukaSidang, jawabAuditor } from './sidang.ts';
import { bukaDusun } from './dusun.ts';
import { harianMega, mulaiMega } from './mega.ts';
import { angkatKeluarga } from './jabatan.ts';
import { aturInvestasi, batasSilpa, bulananInvestasi } from './investasi.ts';
import { aturPajak, bulananPajak, kasBersih } from './pajak.ts';
import { harianUnjuk, tanganiUnjuk } from './unjuk.ts';
import { bacaBerita, harianBerita, potongEfisiensi, tanggapiPidato } from './berita.ts';
import { aturUsaha, bulananUsaha, harianUsaha } from './usaha.ts';
import { aturBpd, aturPerdes, aturRelasi, aturWakil, bulananRelasi, dukungCalon, faktorTermin, harianRelasi, perdesAktif, responMosi } from './relasi.ts';
import { efekRekananProyek, kontrakRekanan, maksProyek } from './rekanan.ts';
import { berhentikanStaf, cariKandidat, efekKeStaf, isiTokohStaf, pegawaiKeluar, segarkanKandidat, upgradeKantor } from './kepegawaian.ts';
import { tebakGender,
  POLITIK,
  aksiGelap,
  beliAset,
  buatPolitik,
  jualAset,
  bulananPolitik,
  harianPolitik,
  hitungPilkades,
  lobiAturan,
  mulaiKampanye,
  nyaleg,
  pakaiDompet,
  pilihCalon,
  pilihPenerus,
  promosiKeluarga,
  selesaikanAudit,
} from './politik.ts';
import {
  siapkanMisiMingguan,
  acakGeserHari,
  FITUR,
  bangunBumdes,
  beliDekorasi,
  bonusTargetKepuasan,
  cekPencapaian,
  gajiPegawai,
  hariAspirasi,
  hariBumdes,
  hariKoin,
  hariPegawai,
  klaimMisi,
  normalisasi,
  rekrut,
  siapkanMisi,
  tagih,
  tambahStat,
  tambahXp,
  tanggapi,
  type Catat,
} from './fitur.ts';

export function biayaUpgrade(biayaDasar: number, levelSekarang: number, kontraktor: Contractor): number {
  return Math.round(biayaDasar * 0.5 * levelSekarang * RULES.kontraktor[kontraktor].pengaliBiaya);
}
import type {
  TipeDesa,
  Gender,
  Action,
  CardDef,
  Contractor,
  Effect,
  GroupId,
  IndexId,
  LogEntry,
  StepResult,
  VillageState,
} from './types.ts';

const JT = 1_000_000;

export const RULES = {
  hariPerBulan: 30,
  bulanPerPeriode: 12,
  /** Batas awal; yang berlaku ada di state.politik.maksPeriode (bisa diubah lewat lobi). */
  maksPeriode: 2,
  kotakMasukMaks: 4,
  peluangKartuHarian: 0.35,
  maksProyekBersamaan: 2,
  danaDesaTahunan: 1100 * JT,
  terminPersen: { 1: 0.4, 5: 0.4, 9: 0.2 } as Record<number, number>,
  gajiPerangkatBulanan: 20 * JT,
  operasionalBulanan: 5 * JT,
  kasAwal: 60 * JT,
  kontraktor: {
    murah: { pengaliBiaya: 0.8, kualitas: 0.65 },
    bagus: { pengaliBiaya: 1.15, kualitas: 1 },
  } satisfies Record<Contractor, { pengaliBiaya: number; kualitas: number }>,
  maksJurnal: 80,
} as const;

export const HARI_PER_PERIODE = RULES.hariPerBulan * RULES.bulanPerPeriode;

export { GameError } from './errors.ts';
import { GameError } from './errors.ts';

// ---------------------------------------------------------------- pembuatan

/** Corak desa awal: memberi warna permainan sejak hari pertama. */
export const TIPE_DESA: Record<TipeDesa, { nama: string; teks: string; plus: string; minus: string }> = {
  agraris: { nama: 'Desa Agraris', teks: 'Hamparan sawah, petani jadi tulang punggung.', plus: 'Petani puas', minus: 'Ekonomi pelan' },
  wisata: { nama: 'Desa Wisata', teks: 'Air terjun dan bukit hijau, ramai saat libur.', plus: 'Ekonomi dan lingkungan', minus: 'Petani kurang diperhatikan' },
  pinggiran: { nama: 'Desa Pinggiran Kota', teks: 'Dekat pabrik dan jalan raya, banyak perantau.', plus: 'Kas dan ekonomi besar', minus: 'Lingkungan rusak' },
  religius: { nama: 'Desa Religius', teks: 'Rumah ibadah berbagai agama berdampingan, tokoh agama dan adat disegani.', plus: 'Tokoh puas, integritas', minus: 'Pemuda bosan' },
};

export function createVillage(params: { seed: string; namaDesa: string; namaKades: string; warisan?: { gelar: string; total: number }; tipe?: TipeDesa; gender?: Gender }): VillageState {
  const state: VillageState = {
    versiEngine: 4,
    koin: {},
    aspirasi: [],
    riwayatKeluhan: [],
    xp: 0,
    level: 1,
    misi: { bulan: -1, daftar: [] },
    statistik: { tagih: 0, aspirasi: 0, kartu: 0, proyekMulai: 0, proyekSelesai: 0, upgrade: 0, dekorasi: 0, bumdes: 0 },
    pencapaian: [],
    pegawai: [],
    staf: [],
    kandidat: {},
    kantorLevel: 1,
    dekorasi: [],
    bumdes: {},
    pinjaman: [],
    statistikKredit: { lunas: 0, telat: 0 },
    namaDesa: params.namaDesa,
    namaKades: params.namaKades,
    rng: seedFromString(params.seed),
    hari: 0,
    periode: 1,
    status: 'menjabat',
    kas: RULES.kasAwal,
    integritas: 70,
    popularitas: 50,
    indeks: { sosial: 26, ekonomi: 22, lingkungan: 35 },
    kepuasan: { petani: 50, pedagang: 50, pemuda: 50, pkk: 50, tokoh: 50, perantau: 50 },
    penduduk: Object.fromEntries(GROUPS.map((g) => [g.id, g.jiwa])) as VillageState['penduduk'],
    pemasukanTambahanBulanan: 0,
    flags: [],
    kotakMasuk: [],
    riwayatKartu: {},
    pilihanKartu: {},
    kartuSiap: {},
    geserHari: {},
    proyekBerjalan: [],
    proyekSelesai: [],
    terjadwal: [],
    bulanIni: { pemasukan: 0, pengeluaran: 0 },
    laporan: [],
    pilkades: [],
    jurnal: [],
    nomorUrut: 1,
    politik: undefined as unknown as VillageState['politik'],
  };
  state.geserHari = acakGeserHari(state);
  state.genderKades = params.gender ?? tebakGender(params.namaKades);
  state.politik = buatPolitik(state);
  // corak desa
  state.tipeDesa = params.tipe ?? 'agraris';
  const naik = (g: GroupId, v: number) => (state.kepuasan[g] = clamp(state.kepuasan[g] + v));
  // komposisi penduduk & usaha bawaan khas corak
  const KOMPOSISI: Record<TipeDesa, Partial<Record<GroupId, number>>> = {
    agraris: { petani: 1.3, pedagang: 0.8, perantau: 0.7 },
    wisata: { pedagang: 1.4, pemuda: 1.2, petani: 0.7 },
    pinggiran: { perantau: 2.5, pedagang: 1.3, pemuda: 1.2, petani: 0.5 },
    religius: { tokoh: 2.5, pkk: 1.1, pemuda: 0.9 },
  };
  for (const [g, x] of Object.entries(KOMPOSISI[state.tipeDesa])) state.penduduk[g as GroupId] = Math.round(state.penduduk[g as GroupId] * x!);
  // usaha bawaan disetarakan: tiap corak dapat sekitar Rp 2,7-3,5 jt per hari
  const USAHA_AWAL: Record<TipeDesa, string[]> = {
    agraris: ['penggilingan'],
    wisata: ['kedai_kopi'],
    pinggiran: ['laundry', 'sewa_tenda'],
    religius: ['sewa_tenda', 'kolam_ikan'],
  };
  for (const id of USAHA_AWAL[state.tipeDesa]) state.bumdes[id] = 1;
  if (state.tipeDesa === 'agraris') {
    naik('petani', 10);
    state.indeks.ekonomi -= 2;
  } else if (state.tipeDesa === 'wisata') {
    state.indeks.ekonomi += 4;
    state.indeks.lingkungan += 6;
    naik('pemuda', 6);
    naik('petani', -6);
    state.kas += 20 * JT;
  } else if (state.tipeDesa === 'pinggiran') {
    state.kas += 40 * JT;
    state.indeks.ekonomi += 6;
    state.indeks.lingkungan -= 10;
    naik('perantau', 8);
    naik('tokoh', -5);
  } else {
    naik('tokoh', 12);
    state.integritas = clamp(state.integritas + 6);
    naik('pemuda', -6);
  }
  // New Game+: warisan desa sebelumnya jadi modal awal
  if (params.warisan && params.warisan.total > 0) {
    const bonusKas = Math.min(150 * JT, Math.round(params.warisan.total) * 2 * JT);
    state.kas += bonusKas;
    state.politik.dompet += Math.round(bonusKas / 5);
    state.warisanSebelum = { gelar: params.warisan.gelar, total: params.warisan.total, bonusKas };
  }
  segarkanKandidat(state);
  const events: LogEntry[] = [];
  log(state, events, 'info', `${params.namaKades} resmi dilantik sebagai kepala desa ${params.namaDesa}.`);
  startOfMonth(state, events);
  spawnCard(state, events, true);
  spawnCard(state, events, true);
  return state;
}

// ---------------------------------------------------------------- waktu

/** Krisis yang menunggu keputusan pemain (audit, mosi pemakzulan). */
export function krisisAktif(state: VillageState): string | null {
  if (state.politik?.kasus) return 'audit inspektorat';
  if (state.relasi?.mosi) return 'mosi pemakzulan BPD';
  return null;
}

/**
 * Majukan desa beberapa hari. Dengan tungguKrisis (dipakai saat pemain offline), waktu berhenti begitu ada
 * krisis yang butuh keputusan, supaya pemain tidak ditangkap atau dimakzulkan saat tidak membuka game.
 */
export function advance(input: VillageState, days: number, opsi: { tungguKrisis?: boolean } = {}): StepResult {
  const state = structuredClone(input);
  normalisasi(state);
  const events: LogEntry[] = [];
  for (let i = 0; i < days && state.status === 'menjabat'; i++) {
    if (opsi.tungguKrisis && krisisAktif(state)) break;
    dailyUpdate(state, events);
    state.hari += 1;
    if (state.hari % RULES.hariPerBulan === 0) {
      closeMonth(state, events);
      if (state.hari % HARI_PER_PERIODE === 0) runElection(state, events);
      if (state.status === 'menjabat') startOfMonth(state, events);
    }
  }
  return { state, events };
}

function bulanDalamPeriode(hari: number): number {
  return Math.floor((hari % HARI_PER_PERIODE) / RULES.hariPerBulan) + 1;
}

function startOfMonth(state: VillageState, events: LogEntry[]): void {
  siapkanMisi(state, Math.floor(state.hari / RULES.hariPerBulan) + 1);
  segarkanKandidat(state);
  const bulan = bulanDalamPeriode(state.hari);
  if (bulan === POLITIK.bulanKampanye) mulaiKampanye(state, (j, t) => log(state, events, j, t));
  paksaProgramWajib(state, events);
  const persen = RULES.terminPersen[bulan];
  if (!persen) return;
  let jumlah = Math.round(RULES.danaDesaTahunan * persen);
  // SiLPA: anggaran tahun lalu tidak terserap, kabupaten memotong termin pertama tahun berikutnya
  if (bulan === 1 && state.hari >= RULES.hariPerBulan * RULES.bulanPerPeriode) {
    const batas = batasSilpa(state);
    // titipan pajak bukan uang desa, jadi tidak dihitung sebagai sisa anggaran
    const kas = kasBersih(state);
    if (kas > batas) {
      const potong = kas > batas * 2 ? 0.5 : 0.25;
      jumlah = Math.round(jumlah * (1 - potong));
      log(state, events, 'buruk', `Sisa anggaran (SiLPA) tahun lalu terlalu besar. Kabupaten memotong termin pertama ${potong * 100}% karena dana desa dianggap tidak terserap.`);
    }
  }
  // relasi dengan bupati menentukan termin (sampai ±10%)
  // efisiensi anggaran dari pidato presiden: potong 10% sekali
  const fEfisiensi = potongEfisiensi(state);
  if (fEfisiensi < 1) {
    jumlah = Math.round(jumlah * fEfisiensi);
    log(state, events, 'politik', 'Efisiensi anggaran pusat: termin dana desa kali ini dipotong 10%.');
  }
  const fTermin = faktorTermin(state);
  if (Math.abs(fTermin - 1) >= 0.03) {
    jumlah = Math.round(jumlah * fTermin);
    if (fTermin > 1) log(state, events, 'politik', `Bupati yang dekat denganmu "membantu" pencairan: termin dana desa ditambah ${Math.round((fTermin - 1) * 100)}%.`);
    else log(state, events, 'buruk', `Kabupaten memotong termin dana desa ${Math.round((1 - fTermin) * 100)}% dengan alasan "evaluasi kinerja".`);
  }
  if (hasFlag(state, 'potong_termin')) {
    jumlah = Math.round(jumlah * 0.4);
    removeFlag(state, 'potong_termin');
    log(state, events, 'politik', 'Sebagian besar termin dana desa dialihkan ke koperasi wajib.');
  }
  if (hasFlag(state, 'termin_ditahan')) {
    removeFlag(state, 'termin_ditahan');
    state.terjadwal.push({
      hari: state.hari + 30,
      peluang: 1,
      pesan: 'Dana desa yang sempat ditahan akhirnya cair.',
      effect: { kas: jumlah },
    });
    log(state, events, 'buruk', 'Pencairan termin dana desa ditahan sementara oleh kabupaten.');
    return;
  }
  // program wajib pusat: termin ditahan sampai Dapur MBG dan Kopdes berdiri (termin pertama tetap cair)
  const belum = programWajibBelum(state);
  if (state.hari >= RULES.hariPerBulan && belum.length > 0) {
    state.danaTertahan = (state.danaTertahan ?? 0) + jumlah;
    log(state, events, 'buruk', `Termin dana desa ${formatRupiah(jumlah)} DITAHAN pusat: desa belum punya ${belum.join(' dan ')}. Dana cair begitu bangunan wajib berdiri.`);
    return;
  }
  addKas(state, jumlah, 'Dana desa');
  log(state, events, 'baik', `Termin dana desa cair: ${formatRupiah(jumlah)}.`);
}

/** Nama bangunan wajib yang belum selesai dibangun. */
export function programWajibBelum(state: VillageState): string[] {
  return PROJECTS.filter((p) => p.wajib && !isBuilt(state, p.id)).map((p) => p.nama);
}

/** Tenggat program wajib (awal bulan ke-4): yang belum dibangun dibangun paksa; kas kurang ditutup utang bank. */
function paksaProgramWajib(state: VillageState, events: LogEntry[]): void {
  if (state.hari < RULES.hariPerBulan * 3) return;
  for (const def of PROJECTS.filter((p) => p.wajib && !isBuilt(state, p.id) && !isRunning(state, p.id))) {
    const biaya = Math.round(def.biaya * RULES.kontraktor.bagus.pengaliBiaya);
    let utang = 0;
    if (state.kas < biaya) utang = pinjamanProgram(state, biaya - Math.max(0, state.kas), () => `p${state.nomorUrut++}`);
    addKas(state, -biaya, 'Pembangunan');
    state.proyekBerjalan.push({ proyekId: def.id, kontraktor: 'bagus', mulaiHari: state.hari, selesaiHari: state.hari + def.durasiHari });
    log(
      state,
      events,
      'politik',
      utang > 0
        ? `Tenggat program pusat lewat: ${def.nama} dibangun paksa. Kas tidak cukup, desa berutang ${formatRupiah(utang)} ke bank.`
        : `Tenggat program pusat lewat: ${def.nama} dibangun paksa, kas desa terpotong ${formatRupiah(biaya)}.`,
    );
  }
}

function dailyUpdate(state: VillageState, events: LogEntry[]): void {
  harianPolitik(state, (j, t) => log(state, events, j, t));
  if (state.status !== 'menjabat') return;
  // relasi atasan & aparat, pemilu atasan, mosi pemakzulan
  harianRelasi(state, (j, t) => log(state, events, j, t));
  if (state.status !== 'menjabat') return;
  // berita, pidato presiden, dan kawasan usaha
  harianBerita(state, (j, t) => log(state, events, j, t));
  harianUsaha(state, (j, t) => log(state, events, j, t));
  harianMega(state, (j, t) => {
    log(state, events, j, t);
    if (j === 'baik' && t.includes('DIRESMIKAN')) tambahXp(state, FITUR.xp.proyekSelesai * 4, (jj, tt) => log(state, events, jj, tt));
  });
  // aksi massa: demo, mogok, blokade
  harianUnjuk(state, (j, t) => log(state, events, j, t));
  // penanda untuk kartu yang hanya muncul selama ada pembangunan (mis. ormas minta uang keamanan)
  const adaProyek = state.proyekBerjalan.length > 0;
  if (adaProyek !== (state.flags ?? []).includes('proyek_berjalan')) {
    state.flags = adaProyek ? [...(state.flags ?? []), 'proyek_berjalan'] : (state.flags ?? []).filter((f) => f !== 'proyek_berjalan');
  }
  // 1. proyek selesai
  for (const aktif of [...state.proyekBerjalan]) {
    if (aktif.selesaiHari > state.hari) continue;
    const def = PROJECT_BY_ID.get(aktif.proyekId);
    state.proyekBerjalan = state.proyekBerjalan.filter((p) => p !== aktif);
    if (!def) continue;
    const kualitas = RULES.kontraktor[aktif.kontraktor].kualitas;
    const catat: Catat = (j, t) => log(state, events, j, t);
    if (aktif.upgradeKe) {
      const built = state.proyekSelesai.find((b) => b.proyekId === def.id);
      if (built) {
        built.level = aktif.upgradeKe;
        built.kualitas = kualitas;
      }
      applyEffect(state, {
        indeks: scaleRecord(def.indeks, 0.4 * kualitas),
        kepuasan: scaleRecord(def.kepuasan, 0.4 * kualitas),
      });
      log(state, events, 'baik', `${def.nama} naik ke level ${aktif.upgradeKe}.`);
      if (aktif.kontraktor === 'murah') {
        state.terjadwal.push({
          hari: state.hari + 60 + Math.floor(nextRandom(state) * 60),
          peluang: 0.35,
          pesan: `Renovasi murahan ${def.nama} mulai retak. Warga menyindir material spek hemat.`,
          effect: { popularitas: -4, kepuasan: scaleRecord(def.kepuasan, -0.3) },
        });
      }
      tambahXp(state, FITUR.xp.upgradeSelesai, catat);
      continue;
    }
    state.proyekSelesai.push({ proyekId: def.id, kualitas, selesaiHari: state.hari, level: 1 });
    // pemasukan pasar kini datang sebagai koin retribusi yang ditagih (lihat fitur.ts)
    applyEffect(state, {
      indeks: scaleRecord(def.indeks, kualitas),
      kepuasan: scaleRecord(def.kepuasan, kualitas),
    });
    tambahStat(state, 'proyekSelesai');
    log(state, events, 'baik', `${def.nama} selesai dibangun dan diresmikan.`);
    if ((state.danaTertahan ?? 0) > 0 && programWajibBelum(state).length === 0) {
      addKas(state, state.danaTertahan!, 'Dana desa');
      log(state, events, 'baik', `Program wajib lengkap. Dana desa yang tertahan ${formatRupiah(state.danaTertahan!)} akhirnya cair.`);
      state.danaTertahan = 0;
    }
    tambahXp(state, FITUR.xp.proyekSelesai, catat);
    if (aktif.kontraktor === 'murah') {
      state.terjadwal.push({
        hari: state.hari + 60 + Math.floor(nextRandom(state) * 60),
        peluang: 0.35,
        pesan: `${def.nama} mulai rusak. Warga menyindir material spek hemat.`,
        effect: { popularitas: -4, kepuasan: scaleRecord(def.kepuasan, -0.5) },
      });
    }
  }

  // 2. efek tertunda
  const jatuhTempo = state.terjadwal.filter((t) => t.hari <= state.hari);
  state.terjadwal = state.terjadwal.filter((t) => t.hari > state.hari);
  for (const t of jatuhTempo) {
    if (nextRandom(state) < t.peluang) {
      applyEffect(state, t.effect);
      log(state, events, isNegative(t.effect) ? 'buruk' : 'baik', t.pesan);
    }
  }

  // 3. kepuasan bergerak pelan ke arah target yang ditentukan kebutuhan
  const tersedia = new Set(state.proyekSelesai.flatMap((b) => PROJECT_BY_ID.get(b.proyekId)?.menyediakan ?? []));
  for (const g of GROUPS) {
    const terpenuhi = g.kebutuhan.filter((k) => tersedia.has(k)).length;
    // warga makin menuntut tiap periode
    const target =
      30 +
      42 * (terpenuhi / g.kebutuhan.length) +
      (state.popularitas - 50) * 0.08 -
      4 * (state.periode - 1) +
      bonusTargetKepuasan(state, g.id);
    state.kepuasan[g.id] = clamp(state.kepuasan[g.id] + (target - state.kepuasan[g.id]) * 0.03);
  }
  if (hasFlag(state, 'wakil_kosong')) addAllKepuasan(state, -0.15);
  if (state.kotakMasuk.length >= RULES.kotakMasukMaks) addAllKepuasan(state, -0.1);

  state.popularitas = clamp(state.popularitas + (50 - state.popularitas) * 0.01);
  if (state.integritas < 60) state.integritas = clamp(state.integritas + 0.06);

  // 3b. babak cerita bersambung yang sudah jatuh tempo masuk kotak masuk (melewati batas acak)
  for (const a of [...(state.antreanKartu ?? [])]) {
    if (a.hari > state.hari) continue;
    state.antreanKartu = (state.antreanKartu ?? []).filter((x) => x !== a);
    const kartu = CARD_BY_ID.get(a.cardId);
    if (!kartu) continue;
    state.kotakMasuk.push({ instanceId: `k${state.nomorUrut++}`, cardId: kartu.id, hariMasuk: state.hari });
    state.riwayatKartu[kartu.id] = state.hari;
    log(state, events, 'politik', `Bersambung: ${kartu.judul}.`);
  }

  // 4. kartu baru
  if (state.kotakMasuk.length < RULES.kotakMasukMaks && nextRandom(state) < RULES.peluangKartuHarian) {
    spawnCard(state, events, false);
  }

  // 5. desa hidup: koin retribusi, aspirasi, pegawai, pencapaian
  const catat: Catat = (j, t) => log(state, events, j, t);
  siapkanMisiMingguan(state);
  hariKoin(state);
  hariBumdes(state);
  hariAspirasi(state, catat, () => `a${state.nomorUrut++}`);
  hariPegawai(state, catat);
  cekPencapaian(state, catat);
}

function closeMonth(state: VillageState, events: LogEntry[]): void {
  // perawatan naik sesuai level bangunan
  const perawatan = state.proyekSelesai.reduce(
    (sum, b) => sum + (PROJECT_BY_ID.get(b.proyekId)?.perawatanBulanan ?? 0) * (1 + 0.5 * (b.level - 1)),
    0,
  );
  // pemasukan tambahan kini masuk lewat koin retribusi harian (fitur.ts)
  addKas(state, -RULES.gajiPerangkatBulanan, 'Gaji perangkat');
  addKas(state, -RULES.operasionalBulanan, 'Operasional kantor');
  addKas(state, -Math.round(perawatan), 'Perawatan bangunan');
  addKas(state, -gajiPegawai(state), 'Honor pegawai');
  tagihCicilan(state, (j, t) => log(state, events, j, t));
  bulananPajak(state, (j, t) => log(state, events, j, t));

  if (state.kas < 0) {
    addAllKepuasan(state, -4);
    state.popularitas = clamp(state.popularitas - 4);
    log(state, events, 'buruk', 'Kas desa minus. Honor perangkat dan RT terlambat dibayar.');
  }

  bulananPenduduk(state, (j, t) => log(state, events, j, t));
  // gaji kades, kecurigaan, dan audit inspektorat (politik.ts)
  bulananPolitik(state, (j, t) => log(state, events, j, t));
  if (state.status === 'menjabat') {
    bulananRelasi(state, (j, t) => log(state, events, j, t));
    bulananUsaha(state, (j, t) => log(state, events, j, t));
    bulananTugas(state, (j, t) => log(state, events, j, t));
  }
  bulananInvestasi(state, (j, t) => log(state, events, j, t));
  if (state.status !== 'menjabat') return;

  const bulanKe = state.hari / RULES.hariPerBulan;
  state.laporan.push({
    bulan: bulanKe,
    pemasukan: state.bulanIni.pemasukan,
    pengeluaran: state.bulanIni.pengeluaran,
    rincian: { ...(state.bulanIni.rincian ?? {}) },
    kasAkhir: state.kas,
    rataKepuasan: round1(averageKepuasan(state)),
    indeks: { ...state.indeks },
    status: statusDesa(state),
  });
  if (state.laporan.length > 36) state.laporan.shift();
  state.bulanIni = { pemasukan: 0, pengeluaran: 0, rincian: {} };
  log(state, events, 'info', `Tutup buku bulan ke-${bulanKe}. Kas akhir ${formatRupiah(state.kas)}.`);
}

function runElection(state: VillageState, events: LogEntry[]): void {
  const catat: Catat = (j, t) => log(state, events, j, t);
  const hasil = hitungPilkades(state, catat);
  removeFlag(state, 'janji_aspal');
  if (!hasil) return;
  state.pilkades.push({ periode: state.periode, hari: state.hari, menang: hasil.menang, persen: hasil.persen, perKelompok: hasil.perKelompok });
  if (!hasil.menang) return;
  state.periode += 1;
  tambahXp(state, FITUR.xp.menang, catat);
}

// ---------------------------------------------------------------- kartu

/** Opsi kartu yang berlaku sekarang: opsi bisa muncul/hilang mengikuti keputusan dan bangunan sebelumnya. */
function lanjutanKartu(state: VillageState, card: CardDef) {
  const terakhir = state.pilihanKartu?.[card.id];
  return terakhir ? LANJUTAN[card.id]?.[terakhir] : undefined;
}

export function opsiTersedia(state: VillageState, card: CardDef): CardDef['opsi'] {
  const sumber = lanjutanKartu(state, card)?.opsi ?? card.opsi;
  return sumber.filter((o) => {
    const s = o.syarat;
    if (!s) return true;
    if (s.flag && !hasFlag(state, s.flag)) return false;
    if (s.tanpaFlag && hasFlag(state, s.tanpaFlag)) return false;
    if (s.butuhProyek && !isBuilt(state, s.butuhProyek)) return false;
    if (s.tanpaProyek && isBuilt(state, s.tanpaProyek)) return false;
    return true;
  });
}

export function teksKartu(state: VillageState, card: CardDef): string {
  const l = lanjutanKartu(state, card);
  if (l) return l.teks;
  return card.teksLanjutan?.find((t) => hasFlag(state, t.flag))?.teks ?? card.teks;
}

function cardEligible(state: VillageState, card: CardDef): boolean {
  // pengaturan desa sandbox: bencana dimatikan
  if (card.kategori === 'bencana' && state.flags?.includes('sandbox_tanpa_bencana')) return false;
  const s = card.syarat ?? {};
  const terakhir = state.riwayatKartu[card.id];
  if (card.sekali && terakhir !== undefined) return false;
  const siap = state.kartuSiap?.[card.id];
  if (siap !== undefined) {
    if (state.hari < siap) return false;
  } else if (card.jedaHari !== undefined && terakhir !== undefined && state.hari - terakhir < card.jedaHari) return false;
  if (state.kotakMasuk.some((k) => k.cardId === card.id)) return false;
  if (s.minHari !== undefined && state.hari < s.minHari + (state.geserHari?.[card.id] ?? 0)) return false;
  if (s.minIntegritas !== undefined && state.integritas < s.minIntegritas) return false;
  if (s.maxIntegritas !== undefined && state.integritas > s.maxIntegritas) return false;
  if (s.flag && !hasFlag(state, s.flag)) return false;
  if (s.tanpaFlag && hasFlag(state, s.tanpaFlag)) return false;
  const bulan = bulanDalamPeriode(state.hari);
  if (card.kategori === 'kampanye' && bulan < 12) return false;
  if (s.bulanPeriodeMin !== undefined && bulan < s.bulanPeriodeMin) return false;
  if (s.bulanPeriodeMax !== undefined && bulan > s.bulanPeriodeMax) return false;
  if (s.butuhProyek && !isBuilt(state, s.butuhProyek)) return false;
  if (s.tanpaProyek && (isBuilt(state, s.tanpaProyek) || isRunning(state, s.tanpaProyek))) return false;
  if (s.butuhPegawai && !(state.pegawai ?? []).includes(s.butuhPegawai)) return false;
  if (s.butuhSifat && !(state.staf ?? []).some((x) => x.sifat.includes(s.butuhSifat!))) return false;
  if (s.butuhCorak && !s.butuhCorak.includes(state.tipeDesa ?? 'agraris')) return false;
  if (card.hanyaLanjutan) return false;
  if (s.bulanTahun && !s.bulanTahun.includes((Math.floor(state.hari / RULES.hariPerBulan) % 12) + 1)) return false;
  return true;
}

function spawnCard(state: VillageState, events: LogEntry[], awal: boolean): void {
  const kandidat = CARDS.filter((c) => cardEligible(state, c) && (!awal || c.kategori === 'aduan' || c.kategori === 'usulan'));
  // pilihan sedikit = desa sedang tenang; jangan langsung memunculkan kartu yang baru terbuka,
  // supaya urutan event tidak bisa ditebak
  if (!awal && kandidat.length < 5 && nextRandom(state) > kandidat.length / 5) return;
  const card = pickWeighted(state, kandidat, (c) => c.bobot);
  if (!card) return;
  if (card.jedaHari !== undefined) state.kartuSiap[card.id] = state.hari + Math.round(card.jedaHari * (0.5 + nextRandom(state)));
  // kartu berbasis sifat: pilih pegawai bersifat itu sebagai tokoh cerita
  const sifat = card.syarat?.butuhSifat;
  const calon = sifat ? state.staf.filter((x) => x.sifat.includes(sifat)) : [];
  const stafId = calon.length ? calon[Math.floor(nextRandom(state) * calon.length)].id : undefined;
  state.kotakMasuk.push({ instanceId: `k${state.nomorUrut++}`, cardId: card.id, hariMasuk: state.hari, ...(stafId ? { stafId } : {}) });
  state.riwayatKartu[card.id] = state.hari;
  log(state, events, card.kategori === 'politik' || card.kategori === 'kampanye' ? 'politik' : 'info', `Masuk: ${isiTokohStaf(state, stafId, card.judul)}.`);
}

// ---------------------------------------------------------------- aksi

export function applyAction(input: VillageState, action: Action): StepResult {
  if (input.status !== 'menjabat') throw new GameError('Masa jabatan sudah berakhir. Mulai desa baru untuk bermain lagi.');
  const state = structuredClone(input);
  normalisasi(state);
  const events: LogEntry[] = [];
  const catat: Catat = (j, t) => log(state, events, j, t);
  const r = jalankanAksi(state, action, events, catat);
  cekPencapaian(state, catat);
  return r;
}

function jalankanAksi(state: VillageState, action: Action, events: LogEntry[], catat: Catat): StepResult {
  if (action.type === 'tagih') {
    const total = tagih(state, action.sumber, catat);
    if (total <= 0) throw new GameError('Belum ada retribusi yang bisa ditagih.');
    events.unshift({ hari: state.hari, jenis: 'baik', teks: `Retribusi masuk kas: ${formatRupiah(total)}.` });
    return { state, events };
  }

  if (action.type === 'tanggapi_aspirasi') {
    const a = state.aspirasi.find((x) => x.id === action.id);
    if (!a || !tanggapi(state, action.id, catat)) throw new GameError('Aspirasi sudah tidak ada.');
    events.unshift({ hari: state.hari, jenis: 'baik', teks: `Aspirasi ditanggapi. Warga merasa didengar.` });
    return { state, events };
  }

  if (action.type === 'klaim_misi') {
    const pesan = klaimMisi(state, action.id, catat);
    events.unshift({ hari: state.hari, jenis: 'baik', teks: pesan });
    return { state, events };
  }

  if (action.type === 'rekrut_pegawai') {
    const pesan = rekrut(state, action.id);
    tambahXp(state, FITUR.xp.pegawai, catat);
    log(state, events, 'keputusan', pesan);
    return { state, events };
  }

  if (action.type === 'berhentikan_pegawai') {
    log(state, events, 'keputusan', berhentikanStaf(state, action.id));
    return { state, events };
  }
  if (action.type === 'klaim_harian') {
    log(state, events, 'baik', klaimHarian(state, action.tanggal, (n) => tambahXp(state, n, catat)));
    return { state, events };
  }
  if (action.type === 'tutup_ringkasan') {
    state.ringkasanPergi = null;
    return { state, events };
  }
  if (action.type === 'mulai_megaproyek') {
    log(state, events, 'keputusan', mulaiMega(state, action.id));
    tambahXp(state, FITUR.xp.proyekMulai * 3, catat);
    return { state, events };
  }

  if (action.type === 'buka_dusun') {
    log(state, events, action.cara === 'serobot' ? 'buruk' : 'baik', bukaDusun(state, action.id, action.cara));
    tambahXp(state, FITUR.xp.proyekSelesai * 2, catat);
    return { state, events };
  }

  if (action.type === 'kontrak_rekanan') {
    log(state, events, 'keputusan', kontrakRekanan(state, action.id));
    return { state, events };
  }

  if (action.type === 'upgrade_kantor') {
    log(state, events, 'baik', upgradeKantor(state));
    tambahXp(state, FITUR.xp.proyekSelesai, catat);
    return { state, events };
  }
  if (action.type === 'cari_kandidat') {
    log(state, events, 'info', cariKandidat(state, action.peran));
    return { state, events };
  }

  if (action.type === 'ambil_pinjaman') {
    log(state, events, 'keputusan', ambilPinjaman(state, action.sumber, action.jumlah, () => `p${state.nomorUrut++}`));
    return { state, events };
  }

  // ---- politik bebas
  const politik = (teks: string, jenis: LogEntry['jenis'] = 'politik') => {
    log(state, events, jenis, teks);
    return { state, events };
  };
  if (action.type === 'aksi_gelap') {
    const teks = aksiGelap(state, action.jenis);
    // perdes keterbukaan anggaran: permainan anggaran lebih cepat tercium
    if (perdesAktif(state, 'transparansi')) state.politik.kecurigaan = Math.min(100, state.politik.kecurigaan + 5);
    return politik(teks, 'buruk');
  }
  if (action.type === 'usaha') return politik(aturUsaha(state, action.id, action.aksi), 'politik');
  if (action.type === 'tanggapi_pidato') return politik(tanggapiPidato(state, action.tanggapan), 'politik');
  if (action.type === 'baca_berita') {
    bacaBerita(state);
    return { state, events };
  }
  if (action.type === 'relasi') return politik(aturRelasi(state, action.aksi, action.tokoh), 'politik');
  if (action.type === 'dukung_calon') return politik(dukungCalon(state, action.calonId, action.cara), 'politik');
  if (action.type === 'bpd') return politik(aturBpd(state, action.aksi), 'politik');
  if (action.type === 'perdes') return politik(aturPerdes(state, action.id, action.aksi), 'politik');
  if (action.type === 'mosi') return politik(responMosi(state, action.cara), 'politik');
  if (action.type === 'wakil') return politik(aturWakil(state, action.aksi, action.id), 'politik');
  if (action.type === 'pakai_dompet') return politik(pakaiDompet(state, action.tujuan, action.jumlah));
  if (action.type === 'hadapi_audit') return politik(action.pilihan === 'ngeles' ? bukaSidang(state) : selesaikanAudit(state, action.pilihan, catat));
  if (action.type === 'jawab_auditor') {
    const r = jawabAuditor(state, action.jawaban);
    log(state, events, r.selesai === 'gagal' ? 'buruk' : r.selesai === 'lolos' ? 'baik' : 'politik', r.pesan);
    return { state, events };
  }
  if (action.type === 'promosi_keluarga') return politik(promosiKeluarga(state, action.id, action.cara));
  if (action.type === 'tangani_unjuk') return politik(tanganiUnjuk(state, action.cara), 'politik');
  if (action.type === 'pajak') return politik(aturPajak(state, action.aksi), 'info');
  if (action.type === 'investasi') return politik(aturInvestasi(state, action.jenis, action.arah, action.jumlah), 'info');
  if (action.type === 'angkat_keluarga') return politik(angkatKeluarga(state, action.id, action.jabatan));
  if (action.type === 'pilih_penerus') return politik(pilihPenerus(state, action.id));
  if (action.type === 'pilih_calon') return politik(pilihCalon(state, action.calon));
  if (action.type === 'lobi_aturan') return politik(lobiAturan(state, action.jenis));
  if (action.type === 'nyaleg') return politik(nyaleg(state, catat));
  if (action.type === 'beli_aset') return politik(beliAset(state, action.id), 'info');
  if (action.type === 'jual_aset') return politik(jualAset(state, action.id), 'info');

  if (action.type === 'lunasi_pinjaman') {
    log(state, events, 'baik', lunasiPinjaman(state, action.id));
    return { state, events };
  }

  if (action.type === 'bangun_bumdes') {
    const r = bangunBumdes(state, action.id, (p) => isBuilt(state, p));
    applyEffect(state, { kepuasan: { [r.kelompok]: 2 }, indeks: { ekonomi: 1 } });
    tambahStat(state, 'bumdes');
    tambahXp(state, FITUR.xp.proyekMulai, catat);
    log(state, events, 'keputusan', r.pesan);
    return { state, events };
  }

  if (action.type === 'beli_dekorasi') {
    const { pesan, efek } = beliDekorasi(state, action.id);
    applyEffect(state, efek);
    tambahXp(state, FITUR.xp.dekorasi, catat);
    log(state, events, 'keputusan', pesan);
    return { state, events };
  }

  if (action.type === 'upgrade_proyek') {
    const def = PROJECT_BY_ID.get(action.proyekId);
    const built = state.proyekSelesai.find((b) => b.proyekId === action.proyekId);
    if (!def || !built) throw new GameError('Bangunan belum ada, bangun dulu.');
    if (built.level >= FITUR.maksLevelBangunan) throw new GameError(`${def.nama} sudah level maksimal.`);
    if (isRunning(state, def.id)) throw new GameError(`${def.nama} sedang dikerjakan.`);
    if (state.proyekBerjalan.length >= maksProyek(state)) {
      throw new GameError(`Semua kontraktor sibuk (${maksProyek(state)} proyek berjalan). Tunggu selesai atau kontrak rekanan baru.`);
    }
    const kontraktor = RULES.kontraktor[action.kontraktor];
    if (!kontraktor) throw new GameError('Pilihan kontraktor tidak valid.');
    const biaya = biayaUpgrade(def.biaya, built.level, action.kontraktor);
    if (state.kas < biaya) throw new GameError(`Kas tidak cukup. Butuh ${formatRupiah(biaya)}.`);
    addKas(state, -biaya, 'Pembangunan');
    state.proyekBerjalan.push({
      proyekId: def.id,
      kontraktor: action.kontraktor,
      mulaiHari: state.hari,
      selesaiHari: state.hari + efekRekananProyek(state, Math.ceil(def.durasiHari * 0.6)),
      upgradeKe: built.level + 1,
    });
    tambahStat(state, 'upgrade');
    tambahXp(state, FITUR.xp.proyekMulai, catat);
    log(state, events, 'keputusan', `Mulai meningkatkan ${def.nama} ke level ${built.level + 1} (${formatRupiah(biaya)}).`);
    return { state, events };
  }

  if (action.type === 'putuskan') {
    const pending = state.kotakMasuk.find((k) => k.instanceId === action.instanceId);
    if (!pending) throw new GameError('Kartu keputusan tidak ditemukan atau sudah diputuskan.');
    const card = CARD_BY_ID.get(pending.cardId);
    const tersedia = card ? opsiTersedia(state, card) : [];
    const opsi = tersedia.find((o) => o.id === action.opsiId);
    if (!card || !opsi) throw new GameError('Opsi keputusan tidak valid.');
    const biaya = Math.max(0, -(opsi.effect.kas ?? 0));
    const biayaTermurah = Math.min(...tersedia.map((o) => Math.max(0, -(o.effect.kas ?? 0))));
    if (biaya > biayaTermurah && state.kas < biaya) {
      throw new GameError(`Kas tidak cukup untuk opsi ini. Butuh ${formatRupiah(biaya)}.`);
    }
    // isi nama pegawai tokoh sebelum efek (pegawainya bisa saja dipecat)
    const judulIsi = isiTokohStaf(state, pending.stafId, card.judul);
    const labelIsi = isiTokohStaf(state, pending.stafId, opsi.label);
    applyEffect(state, opsi.effect);
    efekKeStaf(state, pending.stafId, opsi.effect);
    state.pilihanKartu[card.id] = opsi.id;
    if (opsi.risiko) {
      state.terjadwal.push({
        hari: state.hari + opsi.risiko.setelahHari,
        peluang: opsi.risiko.peluang,
        pesan: opsi.risiko.pesan,
        effect: opsi.risiko.effect,
      });
    }
    state.kotakMasuk = state.kotakMasuk.filter((k) => k !== pending);
    const alasan = action.alasan ? ` Alasan: "${action.alasan.slice(0, 280)}"` : '';
    log(state, events, 'keputusan', `${judulIsi}: ${labelIsi}.${alasan}`);
    tambahStat(state, 'kartu');
    tambahXp(state, FITUR.xp.kartu, catat);
    return { state, events };
  }

  if (action.type === 'mulai_proyek') {
    const def = PROJECT_BY_ID.get(action.proyekId);
    if (!def) throw new GameError('Proyek tidak dikenal.');
    if (isBuilt(state, def.id)) throw new GameError(`${def.nama} sudah ada di desa.`);
    if (def.butuhDusun && !(state.dusun ?? []).includes(def.butuhDusun)) throw new GameError(`${def.nama} butuh dusun baru dibuka dulu.`);
    if (isRunning(state, def.id)) throw new GameError(`${def.nama} sedang dikerjakan.`);
    if (state.proyekBerjalan.length >= maksProyek(state)) {
      throw new GameError(`Semua kontraktor sibuk (${maksProyek(state)} proyek berjalan). Tunggu selesai atau kontrak rekanan baru.`);
    }
    const kontraktor = RULES.kontraktor[action.kontraktor];
    if (!kontraktor) throw new GameError('Pilihan kontraktor tidak valid.');
    const biaya = Math.round(def.biaya * kontraktor.pengaliBiaya);
    if (state.kas < biaya) throw new GameError(`Kas tidak cukup. Butuh ${formatRupiah(biaya)}.`);
    addKas(state, -biaya, 'Pembangunan');
    state.proyekBerjalan.push({
      proyekId: def.id,
      kontraktor: action.kontraktor,
      mulaiHari: state.hari,
      selesaiHari: state.hari + efekRekananProyek(state, def.durasiHari),
    });
    const alasan = action.alasan ? ` Alasan: "${action.alasan.slice(0, 280)}"` : '';
    log(state, events, 'keputusan', `Mulai membangun ${def.nama} (spek ${action.kontraktor === 'murah' ? 'hemat' : 'berkualitas'}, ${formatRupiah(biaya)}).${alasan}`);
    tambahStat(state, 'proyekMulai');
    tambahXp(state, FITUR.xp.proyekMulai, catat);
    return { state, events };
  }

  throw new GameError('Aksi tidak dikenal.');
}

// ---------------------------------------------------------------- efek & util

export function applyEffect(state: VillageState, e: Effect): void {
  if (e.kas) addKas(state, e.kas);
  if (e.semuaKepuasan) addAllKepuasan(state, e.semuaKepuasan);
  if (e.kepuasan) {
    for (const [g, v] of Object.entries(e.kepuasan) as [GroupId, number][]) {
      state.kepuasan[g] = clamp(state.kepuasan[g] + v);
    }
  }
  if (e.indeks) {
    for (const [k, v] of Object.entries(e.indeks) as [IndexId, number][]) {
      state.indeks[k] = clamp(state.indeks[k] + v);
    }
  }
  if (e.integritas) state.integritas = clamp(state.integritas + e.integritas);
  if (e.popularitas) state.popularitas = clamp(state.popularitas + e.popularitas);
  if (e.pemasukanBulanan) state.pemasukanTambahanBulanan += e.pemasukanBulanan;
  if (e.dompet) state.politik.dompet += e.dompet;
  if (e.kecurigaan) state.politik.kecurigaan = clamp(state.politik.kecurigaan + e.kecurigaan);
  if (e.pegawaiKeluar) pegawaiKeluar(state, e.pegawaiKeluar);
  if (e.jadwalKartu) (state.antreanKartu ??= []).push({ cardId: e.jadwalKartu.cardId, hari: state.hari + e.jadwalKartu.setelahHari });
  for (const f of e.setFlag ?? []) if (!hasFlag(state, f)) state.flags.push(f);
  for (const f of e.hapusFlag ?? []) removeFlag(state, f);
}

function addKas(state: VillageState, amount: number, pos: PosKas = 'Keputusan & kejadian'): void {
  arus(state, pos, amount);
}

function addAllKepuasan(state: VillageState, delta: number): void {
  for (const g of GROUP_IDS) state.kepuasan[g] = clamp(state.kepuasan[g] + delta);
}

function hasFlag(state: VillageState, f: string): boolean {
  return state.flags.includes(f);
}

function removeFlag(state: VillageState, f: string): void {
  state.flags = state.flags.filter((x) => x !== f);
}

export function isBuilt(state: VillageState, proyekId: string): boolean {
  return state.proyekSelesai.some((b) => b.proyekId === proyekId);
}

export function isRunning(state: VillageState, proyekId: string): boolean {
  return state.proyekBerjalan.some((p) => p.proyekId === proyekId);
}

function isNegative(e: Effect): boolean {
  const total =
    (e.kas ?? 0) / JT +
    (e.semuaKepuasan ?? 0) * 3 +
    (e.popularitas ?? 0) +
    Object.values(e.kepuasan ?? {}).reduce((a, b) => a + (b ?? 0), 0) +
    Object.values(e.indeks ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  return total < 0;
}

function scaleRecord<K extends string>(rec: Partial<Record<K, number>>, factor: number): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  for (const [k, v] of Object.entries(rec) as [K, number][]) out[k] = round1(v * factor);
  return out;
}

function log(state: VillageState, events: LogEntry[], jenis: LogEntry['jenis'], teks: string): void {
  const entry: LogEntry = { hari: state.hari, jenis, teks };
  state.jurnal.push(entry);
  if (state.jurnal.length > RULES.maksJurnal) state.jurnal.shift();
  events.push(entry);
}

function clamp(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v * 100) / 100));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export function averageKepuasan(state: VillageState): number {
  // rata-rata tertimbang jumlah jiwa
  let sum = 0;
  let jiwa = 0;
  for (const g of GROUPS) {
    sum += state.kepuasan[g.id] * jiwaKelompok(state, g.id);
    jiwa += jiwaKelompok(state, g.id);
  }
  return sum / jiwa;
}

export function skorDesa(state: VillageState): number {
  return round1((state.indeks.sosial + state.indeks.ekonomi + state.indeks.lingkungan) / 3);
}

export function statusDesa(state: VillageState): string {
  const s = skorDesa(state);
  if (s < 30) return 'Sangat Tertinggal';
  if (s < 45) return 'Tertinggal';
  if (s < 60) return 'Berkembang';
  if (s < 75) return 'Maju';
  return 'Mandiri';
}

export function formatRupiah(n: number): string {
  const neg = n < 0 ? '-' : '';
  const a = Math.abs(n);
  const desimal = (x: number) => x.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1').replace('.', ',');
  if (a >= 1e12) return `${neg}Rp ${desimal(a / 1e12)} T`;
  if (a >= 1e9) return `${neg}Rp ${desimal(a / 1e9)} M`;
  if (a >= JT) return `${neg}Rp ${(Math.round((a / JT) * 10) / 10).toString().replace('.', ',')} jt`;
  if (a >= 1000) return `${neg}Rp ${Math.round(a / 1000)} rb`;
  return `${neg}Rp ${a}`;
}

export { PROJECTS, CARDS, GROUPS };
