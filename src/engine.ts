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
import { harianMega, mulaiMega, serahTerimaMega } from './mega.ts';
import { efekWakil } from './wakil.ts';
import { angkatKeluarga, lepasSemuaJabatanKeluarga } from './jabatan.ts';
import { aturInvestasi, batasSilpa, bulananInvestasi } from './investasi.ts';
import { aturPajak, bulananPajak, kasBersih, setorSerahTerima } from './pajak.ts';
import { harianUnjuk, tanganiUnjuk } from './unjuk.ts';
import { bacaBerita, harianBerita, potongEfisiensi, tanggapiPidato } from './berita.ts';
import { aturUsaha, bulananUsaha, harianUsaha } from './usaha.ts';
import { aturBpd, aturPerdes, aturRelasi, aturWakil, bulananRelasi, dukungCalon, faktorTermin, harianRelasi, perdesAktif, responMosi } from './relasi.ts';
import { efekRekananProyek, kontrakRekanan, maksProyek } from './rekanan.ts';
import { berhentikanStaf, cariKandidat, efekKeStaf, isiTokohStaf, pegawaiKeluar, segarkanKandidat, syncPegawai, upgradeKantor } from './kepegawaian.ts';
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
  dorongJagoan,
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
  CardOption,
  CaraRembug,
  PendingCard,
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
    statistik: { tagih: 0, aspirasi: 0, kartu: 0, proyekMulai: 0, proyekSelesai: 0, upgrade: 0, dekorasi: 0, bumdes: 0, rekrut: 0, sowan: 0, rapatBpd: 0, setorPajak: 0, tabung: 0, pidato: 0, izinUsaha: 0, bacaBerita: 0 },
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
  // masa jabatan berakhir: surat yang belum diputuskan tidak bisa diputuskan lagi
  if (state.status !== 'menjabat') state.kotakMasuk = [];
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
      // potongan = separuh kelebihan kas, minimal 25% termin dan paling banyak seluruh termin
      const potongRp = Math.min(jumlah, Math.max(jumlah * 0.25, (kas - batas) * 0.5));
      const potong = Math.round((potongRp / jumlah) * 100);
      jumlah = Math.round(jumlah - potongRp);
      log(state, events, 'buruk', `Sisa anggaran (SiLPA) tahun lalu terlalu besar. Kabupaten memotong termin pertama ${potong}% (${formatRupiah(potongRp)}) karena dana desa dianggap tidak terserap.`);
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
      pesan: `Dana desa yang sempat ditahan akhirnya cair: ${formatRupiah(jumlah)}.`,
      effect: { kas: jumlah, kasDanaDesa: true },
    });
    const alasan = state.alasanTerminDitahan ?? 'akibat keputusan atau kejadian sebelumnya';
    state.alasanTerminDitahan = undefined;
    log(state, events, 'buruk', `Pencairan termin dana desa ${formatRupiah(jumlah)} ditahan kabupaten selama 30 hari: ${alasan}.`);
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
  // jelaskan besarnya termin: porsi tahunan tiap termin berbeda, dan potongan/tambahan tercatat di atas
  const dasar = Math.round(RULES.danaDesaTahunan * persen);
  const selisih = jumlah - dasar;
  const ket = selisih === 0 ? '' : selisih > 0 ? `, ditambah ${formatRupiah(selisih)}` : `, dipotong ${formatRupiah(-selisih)}`;
  log(state, events, 'baik', `Termin dana desa cair: ${formatRupiah(jumlah)} (jatah termin ini ${Math.round(persen * 100)}% dari dana desa tahunan = ${formatRupiah(dasar)}${ket}).`);
}

/** Nama bangunan wajib yang belum selesai dibangun. */
export function programWajibBelum(state: VillageState): string[] {
  return PROJECTS.filter((p) => p.wajib && !isBuilt(state, p.id)).map((p) => p.nama);
}

/** Tenggat program wajib (awal bulan ke-4): yang belum dibangun dibangun paksa; kas kurang ditutup utang bank. */
function paksaProgramWajib(state: VillageState, events: LogEntry[]): void {
  const tenggat = RULES.hariPerBulan * 3;
  const sisa = tenggat - state.hari;
  if (sisa === 30 || sisa === 7) {
    const belum = PROJECTS.filter((p) => p.wajib && !isBuilt(state, p.id) && !isRunning(state, p.id));
    if (belum.length) {
      const total = belum.reduce((t, p) => t + Math.round(p.biaya * RULES.kontraktor.bagus.pengaliBiaya), 0);
      log(state, events, 'buruk', `Pengingat program pusat: ${belum.map((p) => p.nama).join(' dan ')} harus mulai dibangun dalam ${sisa} hari. Kalau lewat, dibangun paksa dengan spek mahal (${formatRupiah(total)}) dan kekurangan kas ditutup utang bank.`);
    }
  }
  if (state.hari < tenggat) return;
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
      tambahStat(state, 'upgrade');
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
    // warga makin menuntut tiap periode, tapi tuntutan berhenti naik setelah tiga periode: desa tua yang
    // kebutuhannya terpenuhi tetap bisa puas (dulu tanpa batas, periode 14 memotong target 52 poin)
    const target =
      30 +
      42 * (terpenuhi / g.kebutuhan.length) +
      (state.popularitas - 50) * 0.08 -
      4 * Math.min(3, state.periode - 1) +
      bonusTargetKepuasan(state, g.id);
    state.kepuasan[g.id] = clamp(state.kepuasan[g.id] + (target - state.kepuasan[g.id]) * 0.03);
  }
  if (hasFlag(state, 'wakil_kosong')) addAllKepuasan(state, -0.15);
  if (state.kotakMasuk.length >= RULES.kotakMasukMaks) addAllKepuasan(state, -0.1);

  state.popularitas = clamp(state.popularitas + (50 - state.popularitas) * 0.01);
  // nama baik pulih pelan, tapi tidak selama warga masih bergunjing soal kades
  if (state.integritas < 60 && state.politik.kecurigaan < 40) state.integritas = clamp(state.integritas + 0.06);

  // 3b. babak cerita bersambung yang sudah jatuh tempo masuk kotak masuk (melewati batas acak)
  for (const a of [...(state.antreanKartu ?? [])]) {
    if (a.hari > state.hari) continue;
    state.antreanKartu = (state.antreanKartu ?? []).filter((x) => x !== a);
    const kartu = CARD_BY_ID.get(a.cardId);
    if (!kartu) continue;
    if (kartu.syarat?.tanpaPerdes && (state.relasi?.perdes ?? []).includes(kartu.syarat.tanpaPerdes)) {
      log(state, events, 'info', `${kartu.judul}: rencana ini batal karena bertentangan dengan perdes yang berlaku.`);
      continue;
    }
    state.kotakMasuk.push({ instanceId: `k${state.nomorUrut++}`, cardId: kartu.id, hariMasuk: state.hari });
    state.riwayatKartu[kartu.id] = state.hari;
    log(state, events, 'politik', `Bersambung: ${kartu.judul}.`);
  }

  // gapura dari "proyek titipan" benar-benar berdiri (sebagai dekorasi), walau dibayar mahal
  if (hasFlag(state, 'gapura_titipan')) {
    removeFlag(state, 'gapura_titipan');
    if (!state.dekorasi.includes('gapura')) {
      state.dekorasi.push('gapura');
      log(state, events, 'info', 'Gapura dari kontraktor titipan kabupaten selesai dipasang di pintu masuk desa.');
    }
  }

  // 4. kartu baru
  if (state.kotakMasuk.length < RULES.kotakMasukMaks && nextRandom(state) < RULES.peluangKartuHarian) {
    spawnCard(state, events, false);
  }

  // 5. desa hidup: koin retribusi, aspirasi, pegawai, pencapaian
  const catat: Catat = (j, t) => log(state, events, j, t);
  // jaga-jaga: kalau awal bulan terlewat (mis. desa sempat tamat), misi bulan ini tetap disiapkan
  siapkanMisi(state, Math.floor(state.hari / RULES.hariPerBulan) + 1);
  siapkanMisiMingguan(state);
  hariKoin(state, catat);
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
    if (s.tanpaPerdes && (state.relasi?.perdes ?? []).includes(s.tanpaPerdes)) return false;
    return true;
  });
}

/** Judul kartu, ikut berubah kalau cerita lanjutan punya judul sendiri. */
export function judulKartu(state: VillageState, card: CardDef): string {
  return lanjutanKartu(state, card)?.judul ?? card.judul;
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
  if (card.grup) {
    // kartu acak dengan judul sama (variasi lokasi) tidak muncul lagi dalam setahun
    const j = state.riwayatKartu[`judul:${card.judul}`];
    if (j !== undefined && state.hari - j < 360) return false;
    const g = state.riwayatKartu[`grup:${card.grup}`];
    if (g !== undefined && state.hari - g < (JEDA_KHUSUS[card.grup] ?? JEDA_GRUP)) return false;
    // variasi lokasi dari templat dan masalah yang sama (mis. "Angin Kencang Melanda RT 03" lalu "RT 07")
    const varian = state.riwayatKartu[`varian:${card.id.replace(/(_\d+)+$/, '')}`];
    if (card.id.startsWith('acak_') && varian !== undefined && state.hari - varian < 300) return false;
    const warga = card.warga ? state.riwayatKartu[`warga:${card.warga}`] : undefined;
    if (warga !== undefined && state.hari - warga < 60) return false;
    if (state.kotakMasuk.some((k) => k.cardId.startsWith(`acak_${card.grup}_`))) return false;
  }
  if (s.minHari !== undefined && state.hari < s.minHari + (state.geserHari?.[card.id] ?? 0)) return false;
  if (s.minIntegritas !== undefined && state.integritas < s.minIntegritas) return false;
  if (s.maxIntegritas !== undefined && state.integritas > s.maxIntegritas) return false;
  if (s.flag && !hasFlag(state, s.flag)) return false;
  if (s.tanpaFlag && hasFlag(state, s.tanpaFlag)) return false;
  const bulan = bulanDalamPeriode(state.hari);
  // kartu kampanye hanya untuk kades (atau penerusnya) yang benar-benar mencalonkan diri, sejak kampanye dibuka
  if (card.kategori === 'kampanye' && (bulan < POLITIK.bulanKampanye || !['pemain', 'penerus'].includes(state.politik.kampanye?.calon ?? ''))) return false;
  if (s.bulanPeriodeMin !== undefined && bulan < s.bulanPeriodeMin) return false;
  if (s.bulanPeriodeMax !== undefined && bulan > s.bulanPeriodeMax) return false;
  if (s.butuhProyek && !isBuilt(state, s.butuhProyek)) return false;
  if (s.tanpaProyek && (isBuilt(state, s.tanpaProyek) || isRunning(state, s.tanpaProyek))) return false;
  if (s.butuhPegawai && !(state.pegawai ?? []).includes(s.butuhPegawai)) return false;
  if (s.butuhSifat && !(state.staf ?? []).some((x) => x.sifat.includes(s.butuhSifat!) && (!s.peranCocok || s.peranCocok.includes(x.peran)))) return false;
  if (s.butuhCorak && !s.butuhCorak.includes(state.tipeDesa ?? 'agraris')) return false;
  if (s.tanpaPerdes && (state.relasi?.perdes ?? []).includes(s.tanpaPerdes)) return false;
  if (s.butuhProyekBerjalan && !state.proyekBerjalan.some((p) => !p.upgradeKe)) return false;
  if (s.satuPegawai && (state.staf ?? []).filter((x) => x.peran === s.satuPegawai).length !== 1) return false;
  if ((s.butuhPegawai || s.butuhSifat) && calonTokoh(state, card).length === 0 && (s.tokohTanpaSifat || card.opsi.some((o) => o.effect.stafTambahSifat))) return false;
  if (s.maxRataKepuasan !== undefined) {
    const v = Object.values(state.kepuasan);
    if (v.reduce((t, x) => t + x, 0) / Math.max(1, v.length) >= s.maxRataKepuasan) return false;
  }
  if (card.hanyaLanjutan) return false;
  if (s.bulanTahun && !s.bulanTahun.includes((Math.floor(state.hari / RULES.hariPerBulan) % 12) + 1)) return false;
  return true;
}

/**
 * Skala uang kartu keputusan mengikuti level desa: desa besar, masalahnya juga lebih mahal (+15% per level).
 * Kartu yang menyebut angka rupiah di teks atau labelnya tidak diskalakan supaya angkanya tetap cocok.
 */
export function skalaUangKartu(state: VillageState, card: CardDef, opsi: { label: string }): number {
  const sebutAngka = /\d\s*(jt|juta)|Rp\s*\d/;
  // satu label menyebut angka (mis. "Rp20 juta penuh"): seluruh kartu tidak diskalakan, supaya "separuh" tetap separuh
  if (sebutAngka.test(card.teks) || sebutAngka.test(opsi.label) || card.opsi.some((o) => sebutAngka.test(o.label))) return 1;
  // desa besar dengan kas tipis (mis. baru diteruskan kades baru) tidak langsung dibebani biaya besar
  const menurutLevel = 1 + 0.15 * Math.max(0, (state.level ?? 1) - 1);
  // pakai rata-rata pemasukan 3 bulan terakhir, bukan kas saat ini, supaya biaya tidak bisa "diakali"
  // dengan menunda kartu sampai kas kosong
  const lap = (state.laporan ?? []).slice(-3);
  const rataMasuk = lap.length ? lap.reduce((t, l) => t + (l.pemasukan ?? 0), 0) / lap.length : 0;
  const menurutPendapatan = Math.max(1, rataMasuk / (100 * 1_000_000));
  return Math.min(menurutLevel, menurutPendapatan);
}

/** Biaya musyawarah warga (konsumsi, undangan, sound system): ikut ukuran pemasukan desa, minimal Rp 2 jt. */
export function biayaMusyawarah(state: VillageState): number {
  const lap = (state.laporan ?? []).slice(-3);
  const rataMasuk = lap.length ? lap.reduce((t, l) => t + (l.pemasukan ?? 0), 0) / lap.length : 0;
  return Math.max(2 * JT, Math.round((rataMasuk * 0.01) / 500_000) * 500_000);
}

/** Efek akhir satu opsi kartu: skala uang, biaya kampanye, hasil nego, dan hasil musyawarah. */
export function efekKartuPending(state: VillageState, card: CardDef, opsi: CardOption, pending?: PendingCard): Effect {
  let e: Effect = efekKampanye(card, efekKartuBerskala(opsi.effect, skalaUangKartu(state, card, opsi)));
  if (!pending) return e;
  if (pending.nego && pending.nego !== 1) {
    const f = pending.nego;
    e = {
      ...e,
      // hanya uang dari penawar yang masuk kas; uang pribadi kades tidak ikut ditawar
      kas: e.kas && e.kas > 0 && !(e.dompet && e.dompet > 0) ? Math.round((e.kas * f) / 100_000) * 100_000 : e.kas,
    };
  }
  if (pending.musyawarah && pending.ditolakWarga !== opsi.id) {
    // keputusan hasil rembug: warga yang kalah suara tetap merasa didengar
    const lunak = (v: number) => (v < 0 ? Math.round(v * 0.5) : v);
    const kepuasan = e.kepuasan ? Object.fromEntries(Object.entries(e.kepuasan).map(([g, v]) => [g, lunak(v as number)]).filter(([, v]) => v !== 0)) : undefined;
    e = {
      ...e,
      kepuasan,
      semuaKepuasan: e.semuaKepuasan ? lunak(e.semuaKepuasan) || undefined : undefined,
      popularitas: e.popularitas ? lunak(e.popularitas) || undefined : undefined,
      indeks: { ...(e.indeks ?? {}), sosial: (e.indeks?.sosial ?? 0) + 1 },
    };
  }
  if (pending.tokoh) e = { ...e, kepuasan: { ...(e.kepuasan ?? {}), tokoh: ((e.kepuasan?.tokoh as number) ?? 0) + 1 } };
  return e;
}

/** Kartu tawaran dari pihak luar desa (yang bisa ditawar), dan kartu suap (yang tidak). */
const PIHAK_LUAR = /CSR|hibah|investor|sponsor|donasi|yayasan|perusahaan|pabrik|bank|swasta|\bPT\b|konsorsium|developer|pengembang|tawaran|menawarkan/i;
const SUAP = /amplop|suap|pelicin|setoran|uang terima kasih|uang lelah/i;

/** Apakah salah satu opsi kartu ini membawa uang masuk yang bisa ditawar. */
export function bisaDitawar(state: VillageState, card: CardDef): boolean {
  // hanya tawaran dari pihak luar (CSR, hibah, investor), bukan kasus seperti uang yang dikembalikan
  if (card.kategori !== 'peluang') return false;
  const teks = `${card.judul} ${card.teks}`;
  if (!PIHAK_LUAR.test(teks) || SUAP.test(teks)) return false;
  return opsiTersedia(state, card).some((o) => (efekKartuBerskala(o.effect, skalaUangKartu(state, card, o)).kas ?? 0) > 0);
}

function totalKepuasan(e: Effect): number {
  return Object.values(e.kepuasan ?? {}).reduce((a, b) => a + (b as number), 0) + (e.semuaKepuasan ?? 0) * 6;
}

/** Rembug sebelum memutuskan: musyawarah warga, minta saran tokoh, atau tawar tawaran. */
function rembugKartu(state: VillageState, instanceId: string, cara: CaraRembug, catat: Catat): string {
  const pending = state.kotakMasuk.find((k) => k.instanceId === instanceId);
  if (!pending) throw new GameError('Kartu keputusan tidak ditemukan atau sudah diputuskan.');
  const card = CARD_BY_ID.get(pending.cardId);
  if (!card) throw new GameError('Kartu keputusan tidak valid.');
  const opsi = opsiTersedia(state, card);
  const judul = isiTokohStaf(state, pending.stafId, judulKartu(state, card));
  const label = (o: CardOption) => isiTokohStaf(state, pending.stafId, o.label);
  pending.catatan ??= [];
  if (cara === 'musyawarah') {
    if (card.kategori === 'kampanye') throw new GameError('Urusan kampanye tidak dibawa ke musyawarah desa.');
    if (pending.musyawarah) throw new GameError('Surat ini sudah dimusyawarahkan.');
    const siapM = state.politik.jeda['rembug:musyawarah'];
    if (siapM !== undefined && state.hari < siapM) throw new GameError(`Warga baru bisa dikumpulkan lagi untuk musyawarah dalam ${siapM - state.hari} hari.`);
    const biaya = biayaMusyawarah(state);
    if (state.kas < biaya) throw new GameError(`Kas tidak cukup untuk musyawarah (${formatRupiah(biaya)}).`);
    addKas(state, -biaya, 'Operasional kantor');
    state.politik.jeda['rembug:musyawarah'] = state.hari + 5;
    pending.musyawarah = true;
    const urut = [...opsi].sort((a, b) => totalKepuasan(efekKartuBerskala(b.effect, 1)) - totalKepuasan(efekKartuBerskala(a.effect, 1)));
    const ditolak = urut.length > 1 ? urut[urut.length - 1] : undefined;
    pending.ditolakWarga = ditolak?.id;
    const suara = `Rembug warga di balai: kebanyakan condong ke "${label(urut[0])}"` + (ditolak ? `, paling banyak yang keberatan dengan "${label(ditolak)}".` : '.');
    pending.catatan.push(
      `${suara} Warga merasa dilibatkan: dampak buruk ke warga diperlunak separuh` + (ditolak ? `, kecuali kalau kades tetap memilih "${label(ditolak)}" yang ditolak di balai.` : '.'),
    );
    tambahStat(state, 'rapatBpd');
    return `${judul}: dibawa ke musyawarah warga. ${suara}`;
  }
  if (cara === 'tokoh') {
    if (pending.tokoh) throw new GameError('Tokoh masyarakat sudah dimintai saran untuk surat ini.');
    const siap = state.politik.jeda['rembug:tokoh'];
    if (siap !== undefined && state.hari < siap) throw new GameError(`Para tokoh baru bisa diajak rembug lagi dalam ${siap - state.hari} hari.`);
    state.politik.jeda['rembug:tokoh'] = state.hari + 2;
    pending.tokoh = true;
    // yang tidak terlihat di label: risiko tersembunyi, urusan yang akan kembali, dan buntut jangka panjang
    const bisik: string[] = [];
    for (const o of opsi) {
      const e = o.effect;
      if (o.risiko) bisik.push(`"${label(o)}" ${o.risiko.peluang >= 0.5 ? 'besar kemungkinan' : 'bisa jadi'} berbuntut: ${o.risiko.pesan.replace(/\.$/, '')}.`);
      if (e.jadwalKartu) bisik.push(`"${label(o)}" belum menuntaskan masalah; urusannya akan kembali sekitar ${e.jadwalKartu.setelahHari} hari lagi.`);
      if ((e.kecurigaan ?? 0) >= 5) bisik.push(`"${label(o)}" akan jadi bahan omongan warga; gosip tentang kades naik.`);
      if ((e.pemasukanBulanan ?? 0) > 0) bisik.push(`"${label(o)}" memberi pemasukan rutin tiap bulan.`);
      if ((e.pemasukanBulanan ?? 0) < 0) bisik.push(`"${label(o)}" menambah beban rutin tiap bulan.`);
      if (e.setFlag?.some((f) => f.startsWith('dimusuhi_'))) bisik.push(`"${label(o)}" membuat pejabat di atas tersinggung.`);
      if (e.setFlag?.some((f) => f.startsWith('restu_'))) bisik.push(`"${label(o)}" disukai pejabat di atas.`);
    }
    // kelompok paling dirugikan tiap opsi, supaya kades tahu siapa yang perlu didatangi sesudahnya
    const rugi = opsi
      .map((o) => {
        const k = Object.entries(o.effect.kepuasan ?? {}).sort((a, b) => (a[1] as number) - (b[1] as number))[0];
        return k && (k[1] as number) <= -4 ? `"${label(o)}" melukai hati ${GROUPS.find((g) => g.id === k[0])?.nama ?? k[0]}; datangi mereka sesudahnya.` : null;
      })
      .filter(Boolean) as string[];
    const saran = [...bisik, ...rugi].slice(0, 4).join(' ') || 'Semua pilihan sudah terang; tidak ada buntut tersembunyi yang mereka lihat.';
    const nilai = (o: CardOption) => (o.effect.kepuasan?.tokoh ?? 0) * 2 + (o.effect.integritas ?? 0) + (o.effect.indeks?.sosial ?? 0) - (o.risiko ? 5 : 0) - (o.effect.jadwalKartu ? 2 : 0);
    const pilihan = [...opsi].sort((a, b) => nilai(b) - nilai(a))[0];
    pending.catatan.push(`Saran tokoh masyarakat: ${saran} Mereka sendiri condong ke "${label(pilihan)}".`);
    return `${judul}: tokoh masyarakat dimintai saran. ${saran}`;
  }
  if (!bisaDitawar(state, card)) throw new GameError('Tidak ada tawaran uang yang bisa ditawar di surat ini.');
  if (pending.nego) throw new GameError('Tawaran ini sudah ditawar sekali.');
  const peluang = Math.max(0.1, Math.min(0.8, 0.3 + (state.popularitas - 50) / 200 + (state.integritas - 50) / 250 + (pending.musyawarah ? 0.15 : 0)));
  if (nextRandom(state) < peluang) {
    pending.nego = 1.3;
    pending.catatan.push('Hasil tawar-menawar: penawar setuju menaikkan nilai tawaran 30%.');
    return `${judul}: tawar-menawar berhasil, nilai tawaran naik 30%.`;
  }
  if (card.kategori === 'peluang' && !card.bersambung && nextRandom(state) < 0.4) {
    state.kotakMasuk = state.kotakMasuk.filter((k) => k !== pending);
    catat('buruk', `${judul}: penawar tersinggung ditawar terlalu tinggi dan menarik tawarannya.`);
    return `${judul}: tawar-menawar gagal, penawar menarik tawarannya.`;
  }
  pending.nego = 0.85;
  pending.catatan.push('Hasil tawar-menawar: penawar tersinggung dan menurunkan nilai tawaran 15%.');
  return `${judul}: tawar-menawar gagal, nilai tawaran turun 15%.`;
}

/** Kartu kampanye: biayanya uang pribadi calon, bukan kas desa. */
export function efekKampanye<E extends { kas?: number; dompet?: number }>(card: CardDef, e: E): E {
  if (card.kategori !== 'kampanye' || !e.kas || e.kas > 0) return e;
  return { ...e, kas: undefined, dompet: (e.dompet ?? 0) + e.kas };
}

export function efekKartuBerskala<E extends { kas?: number }>(e: E, f: number): E {
  // hanya biaya yang ikut membesar; uang masuk (harga jual, sumbangan) tetap sesuai cerita kartu
  if (f === 1 || !e.kas || e.kas > 0) return e;
  return { ...e, kas: Math.round((e.kas * f) / 100_000) * 100_000 };
}

/**
 * Pegawai yang cocok jadi tokoh kartu: punya sifat yang diminta (atau memegang jabatan yang diminta),
 * jabatannya cocok, tidak punya sifat yang dilarang, dan belum punya sifat yang akan diberikan kartu.
 */
function calonTokoh(state: VillageState, card: CardDef) {
  const s = card.syarat ?? {};
  const tambah = card.opsi.map((o) => o.effect.stafTambahSifat).filter(Boolean) as string[];
  return (state.staf ?? []).filter((x) => {
    if (s.butuhSifat) {
      if (!x.sifat.includes(s.butuhSifat)) return false;
      if (s.peranCocok && !s.peranCocok.includes(x.peran)) return false;
    } else if (s.butuhPegawai) {
      if (x.peran !== s.butuhPegawai || x.keluargaId) return false;
    } else return false;
    if (s.tokohTanpaSifat && x.sifat.includes(s.tokohTanpaSifat)) return false;
    if (tambah.length && tambah.every((t) => x.sifat.includes(t))) return false;
    return true;
  });
}

/** Kartu sejenis berbagi jeda (variasi templat acak, atau kelompok cerita yang mirip seperti skandal kas). */
const JEDA_KHUSUS: Record<string, number> = { skandal_kas: 360 };

/** Jeda antar kartu sejenis (variasi templat yang sama), supaya cerita yang mirip tidak beruntun. */
const JEDA_GRUP = 90;

function spawnCard(state: VillageState, events: LogEntry[], awal: boolean): void {
  const kandidat = CARDS.filter((c) => cardEligible(state, c) && (!awal || c.kategori === 'aduan' || c.kategori === 'usulan'));
  // pilihan sedikit = desa sedang tenang; jangan langsung memunculkan kartu yang baru terbuka,
  // supaya urutan event tidak bisa ditebak
  if (!awal && kandidat.length < 5 && nextRandom(state) > kandidat.length / 5) return;
  // bulan kampanye: kartu kampanye diutamakan, supaya tidak tenggelam di antara ratusan kartu desa besar
  const card = pickWeighted(state, kandidat, (c) => (c.kategori === 'kampanye' ? c.bobot * 3 : c.bobot));
  if (!card) return;
  if (card.jedaHari !== undefined) state.kartuSiap[card.id] = state.hari + Math.round(Math.max(card.jedaHari, card.syarat?.bulanTahun || card.kategori === 'kampanye' ? 0 : 240) * (1 + 0.5 * nextRandom(state)));
  // kartu berbasis sifat: pilih pegawai bersifat itu sebagai tokoh cerita
  const calon = calonTokoh(state, card);
  const stafId = calon.length ? calon[Math.floor(nextRandom(state) * calon.length)].id : undefined;
  state.kotakMasuk.push({ instanceId: `k${state.nomorUrut++}`, cardId: card.id, hariMasuk: state.hari, ...(stafId ? { stafId } : {}) });
  state.riwayatKartu[card.id] = state.hari;
  if (card.grup) {
    state.riwayatKartu[`grup:${card.grup}`] = state.hari;
    state.riwayatKartu[`judul:${card.judul}`] = state.hari;
    if (card.warga) state.riwayatKartu[`warga:${card.warga}`] = state.hari;
    if (card.id.startsWith('acak_')) state.riwayatKartu[`varian:${card.id.replace(/(_\d+)+$/, '')}`] = state.hari;
  }
  log(state, events, card.kategori === 'politik' || card.kategori === 'kampanye' ? 'politik' : 'info', `Masuk: ${isiTokohStaf(state, stafId, judulKartu(state, card))}.`);
}

// ---------------------------------------------------------------- aksi

/**
 * Lanjutkan desa yang sudah tamat (pensiun atau kalah) dengan kades baru. Bangunan, warga, pegawai, BUMDes,
 * PT, dan perdes tetap; kas, reputasi, keluarga, dan relasi pribadi dengan pejabat mulai dari awal.
 */
/** Batas sisa kas kades lama yang ikut ke kades baru. */
const SILPA_GANTI_KADES = 150 * JT;

export function lanjutkanDesa(input: VillageState, namaKades: string, gender?: Gender): VillageState {
  if (input.status === 'menjabat') throw new GameError('Desa ini masih punya kades yang menjabat.');
  if (namaKades.trim().toLowerCase() === input.namaKades.trim().toLowerCase()) throw new GameError('Kades baru harus orang lain. Pakai nama yang berbeda dari kades sebelumnya.');
  const state = structuredClone(input);
  normalisasi(state);
  const events: LogEntry[] = [];
  const namaLama = state.namaKades;
  lepasSemuaJabatanKeluarga(state);
  state.status = 'menjabat';
  state.namaKades = namaKades;
  state.genderKades = gender ?? tebakGender(namaKades);
  if ((state.hari % HARI_PER_PERIODE) === 0 || state.pilkades.at(-1)?.periode === state.periode) state.periode += 1;
  const pajakLama = setorSerahTerima(state);
  const kasBebasLama = Math.max(0, state.kas - (state.pajak?.titipan ?? 0));
  const pesanMega = serahTerimaMega(state, kasBebasLama);
  // sisa kas bebas (setelah melunasi proyek besar) ikut sebagai SiLPA, dibatasi supaya kades baru tetap mulai dari bawah
  const terpakaiMega = pesanMega ? Math.min(kasBebasLama, (state.mega?.dibayar ?? 0) - (input.mega?.dibayar ?? 0)) : 0;
  const silpa = Math.min(SILPA_GANTI_KADES, Math.max(0, kasBebasLama - terpakaiMega));
  // kekurangan setor pajak kades lama tetap tercatat sebagai titipan (utang): kas bebas kades baru berkurang sebesar itu
  state.kas = RULES.kasAwal + silpa;
  state.integritas = 70;
  state.popularitas = 50;
  state.politik = buatPolitik(state);
  state.politik.periodePemain = 1;
  state.politik.mulaiHari = state.hari;
  // urusan pribadi kades lama (ormas yang dibayar, dilaporkan, atau dirangkul) tidak ikut ke kades baru
  state.flags = state.flags.filter((f) => !f.startsWith('ormas_'));
  // pegawai yang dulu "kerabat" kades lama bukan kerabat kades baru
  for (const x of state.staf ?? []) if (x.sifat.includes('kerabat')) x.sifat = x.sifat.filter((k) => k !== 'kerabat');
  // misi mengikuti bulan berjalan (bulan saat desa tamat sempat terlewat)
  siapkanMisi(state, Math.floor(state.hari / RULES.hariPerBulan) + 1);
  siapkanMisiMingguan(state);
  const r = state.relasi;
  if (r) {
    for (const t of Object.values(r.tokoh)) t.relasi = 50;
    r.bpd = 50;
    r.wakil = null;
    r.mosi = null;
    r.makzulWakil = null;
    r.kasusIjazah = null;
    r.kandidatWakil = [];
  }
  state.ringkasanPergi = undefined;
  log(state, events, 'politik', `${namaKades} dilantik sebagai kades baru ${state.namaDesa}, meneruskan desa peninggalan ${namaLama}. Kepercayaan warga dimulai dari awal.`);
  if (pajakLama.disetor > 0) log(state, events, 'info', `Titipan pajak kades lama ${formatRupiah(pajakLama.disetor)} disetor ke kas negara saat serah terima.`);
  if (pajakLama.sisa > 0) log(state, events, 'buruk', `Kades lama meninggalkan tunggakan titipan pajak ${formatRupiah(pajakLama.sisa)}. Tunggakan ini tetap wajib disetor dan kena denda kalau dibiarkan.`);
  if (pesanMega) log(state, events, 'info', pesanMega);
  if (silpa > 0) log(state, events, 'info', `SiLPA dari kades lama ${formatRupiah(silpa)} ikut masuk kas awal${kasBebasLama - terpakaiMega > silpa ? ' (sisanya dikembalikan ke kas daerah)' : ''}.`);
  return state;
}

export function applyAction(input: VillageState, action: Action): StepResult {
  if (input.status !== 'menjabat') throw new GameError('Masa jabatan sudah berakhir. Mulai desa baru untuk bermain lagi.');
  const state = structuredClone(input);
  normalisasi(state);
  const events: LogEntry[] = [];
  const catat: Catat = (j, t) => log(state, events, j, t);
  const r = jalankanAksi(state, action, events, catat);
  catatStatAksi(state, action);
  cekPencapaian(state, catat);
  return r;
}

/** Hitungan aksi untuk misi (dipanggil hanya kalau aksi berhasil). */
function catatStatAksi(state: VillageState, a: Action): void {
  if (a.type === 'rekrut_pegawai') tambahStat(state, 'rekrut');
  else if (a.type === 'relasi' && a.aksi === 'sowan') tambahStat(state, 'sowan');
  else if (a.type === 'bpd' && a.aksi === 'rapat_terbuka') tambahStat(state, 'rapatBpd');
  else if (a.type === 'pajak' && a.aksi === 'setor') tambahStat(state, 'setorPajak');
  else if (a.type === 'investasi' && a.jenis === 'cadangan' && a.arah === 'simpan') tambahStat(state, 'tabung');
  else if (a.type === 'tanggapi_pidato') tambahStat(state, 'pidato');
  else if (a.type === 'usaha' && (a.aksi === 'setujui' || a.aksi === 'csr' || a.aksi === 'pelicin')) tambahStat(state, 'izinUsaha');
  else if (a.type === 'baca_berita') tambahStat(state, 'bacaBerita');
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
  if (action.type === 'relasi') return politik(aturRelasi(state, action.aksi, action.tokoh, action.dana), 'politik');
  if (action.type === 'dukung_calon') return politik(dukungCalon(state, action.calonId, action.cara), 'politik');
  if (action.type === 'bpd') return politik(aturBpd(state, action.aksi, action.dana), 'politik');
  if (action.type === 'perdes') return politik(aturPerdes(state, action.id, action.aksi), 'politik');
  if (action.type === 'mosi') return politik(responMosi(state, action.cara), 'politik');
  if (action.type === 'wakil') return politik(aturWakil(state, action.aksi, action.id, action.dana, action.tugas), 'politik');
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
  if (action.type === 'pilih_calon') return politik(pilihCalon(state, action.calon, action.lawanId));
  if (action.type === 'dorong_jagoan') return politik(dorongJagoan(state));
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
    // misi "tingkatkan bangunan" baru dihitung saat upgrade selesai, bukan saat dimulai
    tambahXp(state, FITUR.xp.proyekMulai, catat);
    log(state, events, 'keputusan', `Mulai meningkatkan ${def.nama} ke level ${built.level + 1} (${formatRupiah(biaya)}).`);
    return { state, events };
  }

  if (action.type === 'rembug_kartu') {
    const pesan = rembugKartu(state, action.instanceId, action.cara, catat);
    events.unshift({ hari: state.hari, jenis: 'info', teks: pesan });
    return { state, events };
  }

  if (action.type === 'putuskan') {
    const pending = state.kotakMasuk.find((k) => k.instanceId === action.instanceId);
    if (!pending) throw new GameError('Kartu keputusan tidak ditemukan atau sudah diputuskan.');
    const card = CARD_BY_ID.get(pending.cardId);
    const tersedia = card ? opsiTersedia(state, card) : [];
    const opsi = tersedia.find((o) => o.id === action.opsiId);
    if (!card || !opsi) throw new GameError('Opsi keputusan tidak valid.');
    const efek = efekKartuPending(state, card, opsi, pending);
    if (card.kategori === 'kampanye' && (efek.dompet ?? 0) < 0 && state.politik.dompet < -(efek.dompet ?? 0)) {
      throw new GameError(`Uang pribadimu kurang untuk biaya kampanye ini. Butuh ${formatRupiah(-(efek.dompet ?? 0))}.`);
    }
    const biaya = Math.max(0, -(efek.kas ?? 0));
    const biayaTermurah = Math.min(...tersedia.map((o) => Math.max(0, -(efekKartuBerskala(o.effect, skalaUangKartu(state, card, o)).kas ?? 0))));
    if (biaya > biayaTermurah && state.kas < biaya) {
      throw new GameError(`Kas tidak cukup untuk opsi ini. Butuh ${formatRupiah(biaya)}.`);
    }
    // isi nama pegawai tokoh sebelum efek (pegawainya bisa saja dipecat)
    const judulIsi = isiTokohStaf(state, pending.stafId, judulKartu(state, card));
    const labelIsi = isiTokohStaf(state, pending.stafId, opsi.label);
    applyEffect(state, efek);
    efekKeStaf(state, pending.stafId, efek);
    state.pilihanKartu[card.id] = opsi.id;
    if (opsi.risiko) {
      state.terjadwal.push({
        hari: state.hari + opsi.risiko.setelahHari,
        peluang: opsi.risiko.peluang,
        pesan: opsi.risiko.pesan,
        effect: efekKartuBerskala(opsi.risiko.effect, skalaUangKartu(state, card, opsi)),
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
  if (e.kas) addKas(state, e.kas, e.kasDanaDesa ? 'Dana desa' : 'Keputusan & kejadian');
  if (e.pecatPeran) {
    const x = (state.staf ?? []).find((st) => st.peran === e.pecatPeran && !st.keluargaId);
    if (x) {
      state.staf = state.staf.filter((st) => st !== x);
      syncPegawai(state);
    }
  }
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
  if (e.wakil) efekWakil(state, e.wakil);
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
