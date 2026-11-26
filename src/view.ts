// Tampilan state untuk UI dan MCP. Risiko tersembunyi tidak pernah ikut.
import { TUGAS } from './tugas.ts';
import { kasBersih, viewPajak } from './pajak.ts';
import { viewUnjuk } from './unjuk.ts';
import { maksProyek, viewRekanan } from './rekanan.ts';
import { viewSidang } from './sidang.ts';
import { labelPeran } from './politik.ts';
import { viewDusun } from './dusun.ts';
import { viewMega } from './mega.ts';
import { viewJabatan } from './jabatan.ts';
import { batasSilpa, viewInvestasi } from './investasi.ts';
import { CARD_BY_ID } from './content/cards.ts';
import { GROUPS } from './content/groups.ts';
import { PROJECTS, PROJECT_BY_ID } from './content/projects.ts';
import { BUMDES, DEKORASI, JUDUL_MISI, MISI_MINGGUAN, PEGAWAI, PENCAPAIAN } from './content/fitur.ts';
import { CARDS } from './content/cards.ts';
import { LANJUTAN } from './content/lanjutan.ts';

const CARDS_JUMLAH = CARDS.length;
import { KREDIT, cicilanBulanan, limitKredit, sisaLimit, totalUtang } from './kredit.ts';
import { FITUR, biayaBumdes, bonusBumdes, gajiPegawai, kejenuhanBumdes, totalPendapatanBumdes, lajuKoin, pendapatanBumdes, progresMisi, xpNaikLevel } from './fitur.ts';
import { jiwaKelompok, totalPenduduk } from './penduduk.ts';
import { HADIAH_HARIAN } from './harian.ts';
import { KANTOR, SIFAT, infoKantor, isiTokohStaf, kekuatanPeran, slotPeran } from './kepegawaian.ts';
import { AKSI_GELAP, ASET_PRIBADI, BULAN_PANEN_BENGKOK, POLITIK, bolehNyalon, gajiKades, hasilBengkok, siltapKades, tunjanganJabatan, kekuatanEfektif, peluangJagoan, gosip, namaPemimpin, nilaiAset, raporWarisan, surveiElektabilitas } from './politik.ts';
import {
  HARI_PER_PERIODE,
  RULES,
  averageKepuasan,
  biayaUpgrade,
  formatRupiah,
  isBuilt,
  isRunning,
  opsiTersedia,
  judulKartu,
  efekKartuPending,
  bisaDitawar,
  biayaMusyawarah,
  efekKartuBerskala,
  skalaUangKartu,
  skorDesa,
  teksKartu,
  statusDesa,
} from './engine.ts';
import { NAMA_PEMILIHAN, arusBulananRelasi, faktorTermin, viewRelasi } from './relasi.ts';
import { retribusiUsaha, viewUsaha } from './usaha.ts';
import { viewBerita } from './berita.ts';
import type { Effect, GroupId, IndexId, VillageState } from './types.ts';

const NAMA_KELOMPOK = Object.fromEntries(GROUPS.map((g) => [g.id, g.nama])) as Record<GroupId, string>;
const NAMA_INDEKS: Record<IndexId, string> = { sosial: 'Sosial', ekonomi: 'Ekonomi', lingkungan: 'Lingkungan' };

function signed(v: number): string {
  const r = Math.round(v * 10) / 10;
  return r > 0 ? `+${r}` : `${r}`;
}

/** Ringkasan efek yang terlihat oleh pemain (dan AI). */
export function describeEffect(e: Effect): string[] {
  const out: string[] = [];
  if (e.kas) out.push(`Kas ${e.kas > 0 ? '+' : ''}${formatRupiah(e.kas)}`);
  if (e.semuaKepuasan) out.push(`Semua warga ${signed(e.semuaKepuasan)}`);
  for (const [g, v] of Object.entries(e.kepuasan ?? {}) as [GroupId, number][]) {
    out.push(`${NAMA_KELOMPOK[g]} ${signed(v)}`);
  }
  for (const [k, v] of Object.entries(e.indeks ?? {}) as [IndexId, number][]) {
    out.push(`Indeks ${NAMA_INDEKS[k]} ${signed(v)}`);
  }
  if (e.integritas) out.push(`Integritas ${signed(e.integritas)}`);
  if (e.popularitas) out.push(`Popularitas ${signed(e.popularitas)}`);
  if (e.pemasukanBulanan) out.push(`Pemasukan bulanan +${formatRupiah(e.pemasukanBulanan)}`);
  if (e.dompet) out.push(`Uang pribadi kades ${e.dompet > 0 ? '+' : ''}${formatRupiah(e.dompet)}`);
  if (e.kecurigaan) out.push(e.kecurigaan > 0 ? 'Gosip dan kecurigaan naik' : 'Gosip mereda');
  if (e.setFlag?.includes('restu_bupati')) out.push('Relasi bupati +10');
  if (e.setFlag?.includes('dimusuhi_bupati')) out.push('Relasi bupati -10');
  if (e.setFlag?.includes('restu_camat')) out.push('Relasi camat +10');
  if (e.setFlag?.includes('dimusuhi_camat')) out.push('Relasi camat -10');
  if (e.stafKeluar) out.push('Pegawai ini keluar dari kantor desa');
  if (e.pecatPeran) out.push('Pegawai yang bersangkutan diberhentikan');
  if (e.stafKinerja) out.push(`Kinerja pegawai ${e.stafKinerja > 0 ? '+' : ''}${Math.round(e.stafKinerja * 100)}%`);
  if (e.stafGajiX) out.push(`Gaji pegawai ${e.stafGajiX > 1 ? 'naik' : 'turun'} ${Math.round(Math.abs(e.stafGajiX - 1) * 100)}%`);
  if (e.stafHapusSifat) out.push(`Sifat "${SIFAT[e.stafHapusSifat]?.nama ?? e.stafHapusSifat}" hilang`);
  if (e.stafTambahSifat) out.push(`Jadi bersifat "${SIFAT[e.stafTambahSifat]?.nama ?? e.stafTambahSifat}"`);
  return out;
}

export type EfekRinci =
  | { jenis: 'kas' | 'pemasukan' | 'dompet'; nilai: number }
  | { jenis: 'gosip'; nilai: number }
  | { jenis: 'staf'; teks: string; nilai: number }
  | { jenis: 'kelompok'; target: GroupId; nilai: number }
  | { jenis: 'semua'; nilai: number }
  | { jenis: 'indeks'; target: IndexId; nilai: number }
  | { jenis: 'integritas' | 'popularitas'; nilai: number };

/** Efek terlihat dalam bentuk terstruktur, untuk ditampilkan sebagai ikon + angka. */
export function effectDetails(e: Effect): EfekRinci[] {
  const out: EfekRinci[] = [];
  if (e.kas) out.push({ jenis: 'kas', nilai: e.kas });
  if (e.semuaKepuasan) out.push({ jenis: 'semua', nilai: e.semuaKepuasan });
  for (const [g, v] of Object.entries(e.kepuasan ?? {}) as [GroupId, number][]) out.push({ jenis: 'kelompok', target: g, nilai: v });
  for (const [k, v] of Object.entries(e.indeks ?? {}) as [IndexId, number][]) out.push({ jenis: 'indeks', target: k, nilai: v });
  if (e.integritas) out.push({ jenis: 'integritas', nilai: e.integritas });
  if (e.popularitas) out.push({ jenis: 'popularitas', nilai: e.popularitas });
  if (e.pemasukanBulanan) out.push({ jenis: 'pemasukan', nilai: e.pemasukanBulanan });
  if (e.dompet) out.push({ jenis: 'dompet', nilai: e.dompet });
  if (e.kecurigaan) out.push({ jenis: 'gosip', nilai: e.kecurigaan > 0 ? 1 : -1 });
  if (e.setFlag?.includes('restu_bupati')) out.push({ jenis: 'staf', teks: 'Relasi bupati +10', nilai: 1 });
  if (e.setFlag?.includes('dimusuhi_bupati')) out.push({ jenis: 'staf', teks: 'Relasi bupati -10', nilai: -1 });
  if (e.setFlag?.includes('restu_camat')) out.push({ jenis: 'staf', teks: 'Relasi camat +10', nilai: 1 });
  if (e.setFlag?.includes('dimusuhi_camat')) out.push({ jenis: 'staf', teks: 'Relasi camat -10', nilai: -1 });
  if (e.stafKeluar) out.push({ jenis: 'staf', teks: 'Keluar', nilai: -1 });
  if (e.stafKinerja) out.push({ jenis: 'staf', teks: `Kinerja ${e.stafKinerja > 0 ? '+' : ''}${Math.round(e.stafKinerja * 100)}%`, nilai: e.stafKinerja });
  if (e.stafGajiX) out.push({ jenis: 'staf', teks: `Gaji ${e.stafGajiX > 1 ? '+' : '-'}${Math.round(Math.abs(e.stafGajiX - 1) * 100)}%`, nilai: 1 - e.stafGajiX });
  if (e.stafHapusSifat) out.push({ jenis: 'staf', teks: `Tak lagi ${SIFAT[e.stafHapusSifat]?.nama.toLowerCase() ?? e.stafHapusSifat}`, nilai: SIFAT[e.stafHapusSifat]?.baik ? -1 : 1 });
  if (e.stafTambahSifat) out.push({ jenis: 'staf', teks: SIFAT[e.stafTambahSifat]?.nama ?? e.stafTambahSifat, nilai: SIFAT[e.stafTambahSifat]?.baik ? 1 : -1 });
  return out;
}

/** Warga di cerita yang kebetulan senama dengan kades diganti nama lain, supaya tidak membingungkan. */
function hindariNamaKades(namaKades: string, teks: string): string {
  const depan = namaKades.trim().split(/\s+/)[0];
  if (!depan || depan.length < 3) return teks;
  const pola = new RegExp(`\\b(Pak|Bu|Mbak|Mas|Mbah|Kang|Teh|Pak Haji) ${depan}\\b`, 'g');
  return teks.replace(pola, (_, sapaan: string) => `${sapaan} ${['Sri', 'Tini', 'Wartini'].includes(depan) ? 'Sumi' : sapaan.startsWith('B') || sapaan.startsWith('Mb') || sapaan === 'Teh' ? 'Sumirah' : 'Sukirno'}`);
}

export function buildView(state: VillageState) {
  const bulanKe = Math.floor(state.hari / RULES.hariPerBulan) + 1;
  const hariDalamBulan = (state.hari % RULES.hariPerBulan) + 1;
  const bulanPeriode = Math.floor((state.hari % HARI_PER_PERIODE) / RULES.hariPerBulan) + 1;
  const tersedia = new Set(
    state.proyekSelesai.flatMap((b) => PROJECT_BY_ID.get(b.proyekId)?.menyediakan ?? []),
  );

  return {
    namaDesa: state.namaDesa,
    tipeDesa: state.tipeDesa ?? 'agraris',
    namaKades: state.namaKades,
    status: state.status,
    tanggal: {
      hari: state.hari,
      bulanKe,
      hariDalamBulan,
      bulanPeriode,
      periode: state.periode,
      hariMenujuPilkades: HARI_PER_PERIODE - (state.hari % HARI_PER_PERIODE),
    },
    kas: state.kas,
    kasTeks: formatRupiah(state.kas),
    pemasukanTambahanBulanan: state.pemasukanTambahanBulanan,
    integritas: Math.round(state.integritas),
    popularitas: Math.round(state.popularitas),
    indeks: {
      sosial: Math.round(state.indeks.sosial),
      ekonomi: Math.round(state.indeks.ekonomi),
      lingkungan: Math.round(state.indeks.lingkungan),
    },
    skor: skorDesa(state),
    statusDesa: statusDesa(state),
    rataKepuasan: Math.round(averageKepuasan(state)),
    totalPenduduk: totalPenduduk(state),
    perubahanPenduduk: Object.values(state.perubahanPenduduk ?? {}).reduce((t, v) => t + (v ?? 0), 0),
    kelompok: GROUPS.map((g) => ({
      id: g.id,
      nama: g.nama,
      jiwa: jiwaKelompok(state, g.id),
      perubahanJiwa: state.perubahanPenduduk?.[g.id] ?? 0,
      kepuasan: Math.round(state.kepuasan[g.id]),
      kebutuhan: g.kebutuhan.map((tag) => ({ tag, terpenuhi: tersedia.has(tag) })),
    })),
    kotakMasuk: (state.status === 'menjabat' ? state.kotakMasuk : []).map((k) => {
      const card = CARD_BY_ID.get(k.cardId)!;
      const isi = (t: string) => hindariNamaKades(state.namaKades, isiTokohStaf(state, k.stafId, t));
      const staf = k.stafId ? (state.staf ?? []).find((x) => x.id === k.stafId) : undefined;
      return {
        instanceId: k.instanceId,
        judul: isi(judulKartu(state, card)),
        teks: isi(teksKartu(state, card)),
        kategori: card.kategori,
        hariMasuk: k.hariMasuk,
        cardId: card.id,
        bersambung: Boolean(card.bersambung),
        /** Pegawai yang jadi tokoh kartu (kalau ada): dipakai UI sebagai pembawa kartu. */
        tokohStaf: staf ? { nama: staf.nama, peran: PEGAWAI.find((p) => p.id === staf.peran)?.peran ?? staf.peran, sifat: staf.sifat.map((x) => SIFAT[x]?.nama ?? x) } : null,
        /** Catatan hasil musyawarah, saran tokoh, dan tawar-menawar. */
        catatan: k.catatan ?? [],
        rembug: {
          musyawarah: card.kategori !== 'kampanye' && !k.musyawarah,
          tokoh: !k.tokoh,
          nego: !k.nego && bisaDitawar(state, card),
          biayaMusyawarah: biayaMusyawarah(state),
          musyawarahSiapDalam: Math.max(0, (state.politik.jeda['rembug:musyawarah'] ?? 0) - state.hari),
          tokohSiapDalam: Math.max(0, (state.politik.jeda['rembug:tokoh'] ?? 0) - state.hari),
        },
        opsi: opsiTersedia(state, card).map((o) => {
          const e = efekKartuPending(state, card, o, k);
          const efek = describeEffect(e);
          return { id: o.id, label: isi(o.label), efek: efek.length ? efek : ['Tidak ada efek langsung'], rinci: effectDetails(e) };
        }),
      };
    }),
    proyek: PROJECTS.map((p) => {
      const jalan = state.proyekBerjalan.find((a) => a.proyekId === p.id);
      return {
        id: p.id,
        nama: p.nama,
        deskripsi: p.deskripsi,
        biayaMurah: Math.round(p.biaya * RULES.kontraktor.murah.pengaliBiaya),
        biayaBagus: Math.round(p.biaya * RULES.kontraktor.bagus.pengaliBiaya),
        durasiHari: p.durasiHari,
        perawatanBulanan: p.perawatanBulanan,
        menyediakan: p.menyediakan,
        pemasukanBulanan: p.pemasukanBulanan ?? 0,
        /** Nama dusun yang harus dibuka dulu (null kalau tidak perlu atau sudah dibuka). */
        butuhDusun: p.butuhDusun && !(state.dusun ?? []).includes(p.butuhDusun) ? p.butuhDusun : null,
        wajib: p.wajib ?? false,
        /** Dusun tempat bangunan ini (null = desa lama). */
        dusun: p.butuhDusun ?? null,
        /** Kelompok warga yang kebutuhannya dipenuhi bangunan ini. */
        melayani: GROUPS.filter((g) => g.kebutuhan.some((k) => p.menyediakan.includes(k))).map((g) => g.nama),
        efek: describeEffect({ indeks: p.indeks, kepuasan: p.kepuasan, pemasukanBulanan: p.pemasukanBulanan }),
        rinci: effectDetails({ indeks: p.indeks, kepuasan: p.kepuasan, pemasukanBulanan: p.pemasukanBulanan }),
        kontraktorMurah: state.proyekSelesai.find((b) => b.proyekId === p.id)?.kualitas === RULES.kontraktor.murah.kualitas,
        level: state.proyekSelesai.find((b) => b.proyekId === p.id)?.level ?? 0,
        upgradeKe: jalan?.upgradeKe ?? null,
        biayaUpgradeMurah: biayaUpgrade(p.biaya, state.proyekSelesai.find((b) => b.proyekId === p.id)?.level ?? 1, 'murah'),
        biayaUpgradeBagus: biayaUpgrade(p.biaya, state.proyekSelesai.find((b) => b.proyekId === p.id)?.level ?? 1, 'bagus'),
        /** Perbandingan kontraktor: efek nyata yang didapat (bangun baru & upgrade) dan risiko rusak. */
        pilihanKontraktor: (['murah', 'bagus'] as const).map((jenis) => {
          const kualitas = RULES.kontraktor[jenis].kualitas;
          const skala = (r: Partial<Record<string, number>>, f: number) =>
            Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round((v ?? 0) * f * 10) / 10]));
          return {
            jenis,
            kualitasPersen: Math.round(kualitas * 100),
            rinciBangun: effectDetails({ indeks: skala(p.indeks, kualitas), kepuasan: skala(p.kepuasan, kualitas) }),
            rinciUpgrade: effectDetails({ indeks: skala(p.indeks, 0.4 * kualitas), kepuasan: skala(p.kepuasan, 0.4 * kualitas) }),
            peluangRusakPersen: jenis === 'murah' ? 35 : 0,
          };
        }),
        // bangunan yang sedang di-upgrade tetap berdiri (status selesai) dan punya progres
        status: isBuilt(state, p.id) ? 'selesai' : isRunning(state, p.id) ? 'dibangun' : 'tersedia',
        progres: jalan
          ? Math.min(100, Math.round(((state.hari - jalan.mulaiHari) / (jalan.selesaiHari - jalan.mulaiHari)) * 100))
          : null,
        sisaHari: jalan ? Math.max(0, jalan.selesaiHari - state.hari) : null,
        kontraktor: jalan?.kontraktor ?? null,
      };
    }),
    maksProyekBersamaan: maksProyek(state),
    rekanan: viewRekanan(state),
    dusun: viewDusun(state),
    mega: viewMega(state),
    investasi: viewInvestasi(state),
    pajak: viewPajak(state),
    unjuk: viewUnjuk(state),
    relasi: viewRelasi(state),
    usaha: viewUsaha(state),
    berita: viewBerita(state),
    programWajib: {
      belum: PROJECTS.filter((p) => p.wajib && !isBuilt(state, p.id)).map((p) => ({ id: p.id, nama: p.nama, dikerjakan: isRunning(state, p.id) })),
      tertahan: state.danaTertahan ?? 0,
      tenggatHari: Math.max(0, RULES.hariPerBulan * 3 - state.hari),
    },
    dusunTerbuka: (state.dusun ?? []).length,
    koin: Object.entries(state.koin ?? {})
      .filter(([, v]) => v >= 1000)
      .map(([sumber, jumlah]) => ({ sumber, jumlah: Math.floor(jumlah) })),
    lajuKoinHarian: lajuKoin(state),
    aspirasi: (state.aspirasi ?? []).map((a) => ({ ...a, namaKelompok: NAMA_KELOMPOK[a.kelompok] })),
    riwayatKeluhan: (state.riwayatKeluhan ?? []).map((k) => ({ ...k, namaKelompok: NAMA_KELOMPOK[k.kelompok] })),
    level: state.level ?? 1,
    xp: state.xp ?? 0,
    xpNaik: xpNaikLevel(state.level ?? 1),
    misi: (state.misi?.daftar ?? []).map((m) => ({
      id: m.id,
      judul: JUDUL_MISI[m.jenis](m.target),
      progres: progresMisi(state, m),
      target: m.target,
      hadiahKas: m.hadiahKas,
      hadiahXp: m.hadiahXp,
      diklaim: m.diklaim,
    })),
    misiMingguan: (state.misiMingguan?.daftar ?? []).map((m) => ({
      id: m.id,
      judul: (MISI_MINGGUAN.find((t) => t.jenis === m.jenis)?.judul ?? JUDUL_MISI[m.jenis])(m.target),
      progres: progresMisi(state, m),
      target: m.target,
      hadiahKas: m.hadiahKas,
      hadiahXp: m.hadiahXp,
      diklaim: m.diklaim,
    })),
    hariSisaMinggu: 7 - (state.hari % 7),
    tujuan: tujuanBerikut(state),
    album: {
      pencapaian: (state.pencapaian ?? []).length,
      totalPencapaian: PENCAPAIAN.length,
      sifatDikenal: (state.sifatDikenal ?? []).map((k) => SIFAT[k]?.nama ?? k),
      totalSifat: Object.keys(SIFAT).length,
      kartuDilihat: Object.keys(state.riwayatKartu ?? {}).length,
      totalKartu: CARDS_JUMLAH,
      ceritaBerlanjut: Object.entries(state.pilihanKartu ?? {}).filter(([id, op]) => LANJUTAN[id]?.[op]).length,
      totalCerita: Object.keys(LANJUTAN).length,
    },
    pencapaian: PENCAPAIAN.map((p) => {
      const dapat = (state.pencapaian ?? []).find((x) => x.id === p.id);
      return { id: p.id, judul: p.judul, teks: p.teks, didapat: Boolean(dapat), hari: dapat?.hari ?? null };
    }),
    pegawai: PEGAWAI.map((p) => {
      const staf = (state.staf ?? []).filter((x) => x.peran === p.id);
      const sifat = (ids: string[]) => ids.map((k) => ({ id: k, ...SIFAT[k] }));
      return {
        id: p.id,
        nama: staf[0]?.nama ?? p.nama,
        peran: p.peran,
        efek: p.efek,
        tugas: TUGAS[p.id] ?? { ada: [p.efek], kosong: [] },
        gajiBulanan: p.gajiBulanan,
        biayaRekrut: p.biayaRekrut,
        aktif: staf.length > 0,
        minLevel: p.minLevel ?? 1,
        terbuka: (p.minLevel ?? 1) <= state.level,
        /** Jumlah kursi jabatan ini pada level desa sekarang (maksimal orang yang boleh menjabat). */
        slot: slotPeran(state, p),
        /** Level desa saat jabatan ini mendapat kursi tambahan (null kalau sudah maksimal). */
        slotBerikut: (p.slotLevel ?? [p.minLevel ?? 1]).find((l) => l > state.level) ?? null,
        kekuatan: Math.round(kekuatanPeran(state, p.id) * 100) / 100,
        staf: staf.map((x) => ({ ...x, sifat: sifat(x.sifat) })),
        kandidat: (state.kandidat?.[p.id] ?? []).map((k) => ({ ...k, sifat: sifat(k.sifat) })),
      };
    }),
    kantor: (() => {
      const kini = infoKantor(state);
      const berikut = KANTOR[kini.level] ?? null;
      return {
        level: kini.level,
        nama: kini.nama,
        kapasitas: kini.kapasitas,
        terisi: (state.staf ?? []).length,
        berikut: berikut ? { nama: berikut.nama, kapasitas: berikut.kapasitas, biaya: berikut.biaya, minLevelDesa: berikut.minLevelDesa } : null,
      };
    })(),

    dekorasi: DEKORASI.map((d) => ({
      id: d.id,
      nama: d.nama,
      biaya: d.biaya,
      rinci: effectDetails(d.efek),
      terpasang: (state.dekorasi ?? []).includes(d.id),
      minLevel: d.minLevel ?? 1,
      terbuka: (d.minLevel ?? 1) <= state.level,
    })),
    bumdes: BUMDES.map((b) => {
      const level = state.bumdes?.[b.id] ?? 0;
      return {
        id: b.id,
        nama: b.nama,
        deskripsi: b.deskripsi,
        level,
        maksLevel: b.maksLevel,
        // angka nyata: sudah termasuk bonus manajer dan kejenuhan pasar (level tambahan ikut menjenuhkan pasar)
        pendapatanHarian: Math.round(pendapatanBumdes(b, level) * (1 + bonusBumdes(state)) * kejenuhanBumdes(state)),
        pendapatanBerikut: Math.round(
          pendapatanBumdes(b, Math.min(b.maksLevel, level + 1)) * (1 + bonusBumdes(state)) * kejenuhanBumdes(state, level < b.maksLevel ? 1 : 0),
        ),
        biayaBerikut: level >= b.maksLevel ? null : biayaBumdes(b, level, state),
        syaratProyek: b.syaratProyek ?? null,
        namaSyarat: b.syaratProyek ? (PROJECT_BY_ID.get(b.syaratProyek)?.nama ?? b.syaratProyek) : null,
        minLevel: b.minLevel ?? 1,
        terbuka: level > 0 || (b.minLevel ?? 1) <= state.level,
        syaratTerpenuhi: !b.syaratProyek || isBuilt(state, b.syaratProyek),
      };
    }),
    pendapatanPasifHarian: totalPendapatanBumdes(state),
    kejenuhanBumdes: Math.round(kejenuhanBumdes(state) * 100),
    kredit: KREDIT.map((k) => ({
      id: k.id,
      nama: k.nama,
      jenis: k.jenis,
      deskripsi: k.deskripsi,
      bungaBulanan: k.bungaBulanan,
      tenor: k.tenor,
      limit: limitKredit(state, k),
      sisaLimit: state.pinjaman ? sisaLimit(state, k) : limitKredit(state, k),
      minIntegritas: k.minIntegritas,
      memenuhiSyarat: state.integritas >= k.minIntegritas,
    })),
    pinjaman: (state.pinjaman ?? []).map((p) => ({
      ...p,
      namaSumber: KREDIT.find((k) => k.id === p.sumber)?.nama ?? p.sumber,
      cicilan: cicilanBulanan(p),
      biayaLunas: Math.round(p.sisaPokok + p.pokok * p.bunga),
    })),
    totalUtang: state.pinjaman ? totalUtang(state) : 0,
    laporan: [...state.laporan].reverse(),
    pilkades: state.pilkades.map((p) => ({
      ...p,
      perKelompok: p.perKelompok.map((k) => ({ ...k, nama: NAMA_KELOMPOK[k.kelompok] })),
    })),
    jurnal: [...state.jurnal].reverse(),
    keuangan: ringkasKeuangan(state),
    politik: ringkasPolitik(state),
    warisan: raporWarisan(state),
    nilaiPembangunan: state.nilaiPembangunan ?? 0,
    hadiahHarian: {
      terakhir: state.hadiahHarian?.terakhir ?? null,
      beruntun: state.hadiahHarian?.beruntun ?? 0,
      daftar: HADIAH_HARIAN.map((h, i) => ({ hari: i + 1, kas: h.kas, xp: h.xp, dompet: 'dompet' in h ? h.dompet : 0 })),
    },
    ringkasanPergi: state.ringkasanPergi ?? null,
    warisanSebelum: state.warisanSebelum ?? null,
    bulanTahun: (Math.floor(state.hari / RULES.hariPerBulan) % 12) + 1,
  };
}

/** Perkiraan arus kas per bulan + neraca sederhana untuk layar laporan keuangan. */
function ringkasKeuangan(state: VillageState) {
  const laju = lajuKoin(state);
  const iuran = Object.entries(laju).filter(([k]) => k.startsWith('rumah:')).reduce((t, [, v]) => t + v * 30, 0);
  const dariBangunan = PROJECTS.filter((p) => laju[p.id]).map((p) => ({ pos: p.nama, jumlah: Math.round(laju[p.id] * 30) }));
  const usahaLain = (laju.balai ?? 0) * 30;
  const relasiArus = arusBulananRelasi(state);
  // termin dana desa ikut relasi bupati dan efisiensi pusat yang sedang berlaku (potongan SiLPA hanya di awal tahun)
  const danaDesa = (RULES.danaDesaTahunan / 12) * faktorTermin(state) * (state.nasional?.efek.efisiensi_termin ? 0.9 : 1);
  const bumdes = totalPendapatanBumdes(state) * 30;
  // tanpa bendahara, iuran dan retribusi baru masuk kas kalau ditagih kades (dan hangus setelah menumpuk 20 hari)
  const manual = !state.pegawai.includes('bendahara');
  const ket = manual ? ' (harus ditagih, belum ada bendahara)' : '';
  const pemasukan = [
    { pos: 'Dana desa (rata-rata per bulan, belum termasuk potongan SiLPA)', jumlah: Math.round(danaDesa) },
    { pos: `Iuran & retribusi warga${ket}`, jumlah: Math.round(iuran) },
    ...dariBangunan.map((x) => ({ ...x, pos: `${x.pos}${ket}` })),
    { pos: `Retribusi balai desa${ket}`, jumlah: Math.round(usahaLain) },
    { pos: 'Retribusi perusahaan (PT)', jumlah: retribusiUsaha(state) },
    { pos: 'Pemasukan dari perdes', jumlah: relasiArus.masukPerdes },
    { pos: 'Usaha BUMDes', jumlah: Math.round(bumdes) },
  ].filter((x) => x.jumlah > 0);
  const perawatan = state.proyekSelesai.reduce(
    (sum, b) => sum + (PROJECT_BY_ID.get(b.proyekId)?.perawatanBulanan ?? 0) * (1 + 0.5 * (b.level - 1)),
    0,
  );
  const cicilan = (state.pinjaman ?? []).reduce((t, p) => t + cicilanBulanan(p), 0);
  const pengeluaran = [
    { pos: 'Gaji perangkat desa', jumlah: RULES.gajiPerangkatBulanan },
    { pos: 'Operasional kantor', jumlah: RULES.operasionalBulanan },
    { pos: 'Perawatan bangunan', jumlah: Math.round(perawatan) },
    { pos: 'Honor pegawai', jumlah: gajiPegawai(state) },
    { pos: 'Cicilan utang', jumlah: cicilan },
    { pos: 'Tunjangan kades', jumlah: state.politik?.tunjangan ? POLITIK.tunjanganKades : 0 },
    { pos: 'Tunjangan wakil kades', jumlah: relasiArus.wakil },
    { pos: 'Subsidi program perdes', jumlah: relasiArus.keluarPerdes },
  ].filter((x) => x.jumlah > 0);
  const totalMasuk = pemasukan.reduce((t, x) => t + x.jumlah, 0);
  const totalKeluar = pengeluaran.reduce((t, x) => t + x.jumlah, 0);
  // nilai aset: bangunan dihitung dari biaya pembangunan, BUMDes dari modal yang ditanam
  const bangunan = state.proyekSelesai.map((b) => {
    const def = PROJECT_BY_ID.get(b.proyekId);
    let nilai = def?.biaya ?? 0;
    for (let l = 1; l < b.level; l++) nilai += biayaUpgrade(def?.biaya ?? 0, l, 'bagus') * 0.8;
    return { nama: def?.nama ?? b.proyekId, level: b.level, nilai: Math.round(nilai) };
  });
  const usaha = BUMDES.filter((b) => (state.bumdes?.[b.id] ?? 0) > 0).map((b) => {
    const lv = state.bumdes[b.id];
    let nilai = 0;
    for (let l = 0; l < lv; l++) nilai += biayaBumdes(b, l);
    return { nama: b.nama, level: lv, nilai };
  });
  const utang = state.pinjaman ? totalUtang(state) : 0;
  const totalAset = state.kas + bangunan.reduce((t, x) => t + x.nilai, 0) + usaha.reduce((t, x) => t + x.nilai, 0);
  return {
    bulanIni: { pemasukan: state.bulanIni.pemasukan, pengeluaran: state.bulanIni.pengeluaran, rincian: state.bulanIni.rincian ?? {} },
    perkiraan: { pemasukan, pengeluaran, totalMasuk, totalKeluar, bersih: totalMasuk - totalKeluar },
    neraca: { kas: state.kas, bangunan, usaha, utang, totalAset, asetBersih: totalAset - utang },
    batasKoinHari: FITUR.batasKoinHari,
    /** Iuran dan retribusi yang menumpuk belum ditagih, dan berapa sumber yang sudah penuh (berhenti bertambah). */
    retribusiBelumDitagih: Math.round(Object.values(state.koin ?? {}).reduce((t, v) => t + v, 0)),
    sumberPenuh: Object.entries(lajuKoin(state)).filter(([k, per]) => (state.koin?.[k] ?? 0) >= per * FITUR.batasKoinHari - 1).length,
    tagihManual: manual,
  };
}

function ringkasPolitik(state: VillageState) {
  const p = state.politik;
  const kampanye = p.kampanye;
  return {
    dompet: p.dompet,
    gosip: gosip(state),
    /** Angka kecurigaan 0-100 (UI memakai label gosip; angka ini untuk pemain AI). */
    kecurigaan: Math.round(state.politik.kecurigaan),
    pemimpin: p.pemimpin,
    namaPemimpin: namaPemimpin(state),
    bayangan: p.pemimpin !== 'pemain',
    periodePemain: p.periodePemain,
    maksPeriode: p.maksPeriode,
    bolehNyalon: bolehNyalon(state, 'pemain'),
    tunjangan: p.tunjangan,
    penerusId: p.penerusId,
    jabatan: viewJabatan(state),
    keluarga: p.keluarga.map((k) => ({
      ...k,
      label: labelPeran(k.peran, k.gender),
      elektabilitas: Math.round(k.elektabilitas),
      kompetensi: Math.round(k.kompetensi),
      periode: p.periodeKeluarga[k.id] ?? 0,
      bolehNyalon: bolehNyalon(state, k.id),
      jeda: {
        baliho: Math.max(0, (p.jeda[`promosi:${k.id}:baliho`] ?? 0) - state.hari),
        blusukan: Math.max(0, (p.jeda[`promosi:${k.id}:blusukan`] ?? 0) - state.hari),
        sekolah: Math.max(0, (p.jeda[`promosi:${k.id}:sekolah`] ?? 0) - state.hari),
      },
    })),
    kasus: p.kasus
      ? { sisaHari: Math.max(0, p.kasus.batas - state.hari), nilai: p.kasus.nilai, biayaSuap: Math.round(15_000_000 + p.kasus.nilai * 0.6), sidang: viewSidang(state) }
      : null,
    kampanye: kampanye
      ? {
          calon: kampanye.calon,
          bonusSuara: kampanye.bonusSuara,
          dukungId: kampanye.calon === 'dukung_lawan' ? (kampanye.dukungId ?? kampanye.lawan[0].id) : null,
          dorongan: kampanye.dorongan ?? 0,
          peluangJagoan: Math.round(peluangJagoan(state) * 100),
          jedaBlusukan: Math.max(0, (p.jeda['kampanye:blusukan'] ?? 0) - state.hari),
          lawan: kampanye.lawan.map((l) => ({ ...l, kekuatan: Math.round(l.kekuatan), kekuatanEfektif: Math.round(kekuatanEfektif(state)[l.id] ?? l.kekuatan) })),
        }
      : null,
    bulanKampanye: POLITIK.bulanKampanye,
    aksiGelap: (Object.keys(AKSI_GELAP) as (keyof typeof AKSI_GELAP)[]).map((id) => ({
      id,
      ...AKSI_GELAP[id],
      siapDalam: Math.max(0, (p.jeda[`gelap:${id}`] ?? 0) - state.hari),
      butuhProyek: id === 'markup' || id === 'fee_kontraktor',
    })),
    survei: surveiElektabilitas(state),
    nilaiAset: nilaiAset(state),
    hartaBersih: p.dompet + nilaiAset(state),
    /** Rincian penghasilan resmi kades per bulan. */
    rincianGaji: { siltap: siltapKades(), tunjanganJabatan: tunjanganJabatan(state), bengkokPerPanen: hasilBengkok(state), bulanPanen: BULAN_PANEN_BENGKOK },
    penghasilanPribadi:
      gajiKades(state) +
      Math.round(hasilBengkok(state) / 4) +
      (p.tunjangan ? POLITIK.tunjanganKades : 0) +
      (p.aset ?? []).reduce((t, a) => t + (ASET_PRIBADI.find((d) => d.id === a.id)?.penghasilan ?? 0), 0),
    asetPribadi: ASET_PRIBADI.map((d) => {
      const milik = (p.aset ?? []).find((a) => a.id === d.id);
      return { ...d, dimiliki: Boolean(milik), nilaiSekarang: milik?.nilai ?? d.harga };
    }),
    jedaDompet: {
      masjid: Math.max(0, (p.jeda['dompet:masjid'] ?? 0) - state.hari),
      aparat: Math.max(0, (p.jeda['dompet:aparat'] ?? 0) - state.hari),
      cawe: Math.max(0, (p.jeda['dompet:cawe'] ?? 0) - state.hari),
      buzzer: Math.max(0, (p.jeda['dompet:buzzer'] ?? 0) - state.hari),
      buzzerRedam: Math.max(0, (p.jeda['dompet:buzzer_redam'] ?? 0) - state.hari),
      buzzerDipakai: p.jeda['buzzer:pakai'] ?? 0,
      baliho: Math.max(0, (p.jeda['dompet:baliho'] ?? 0) - state.hari),
      lobi: Math.max(0, (p.jeda['lobi:periode'] ?? 0) - state.hari),
    },
  };
}

export type VillageView = ReturnType<typeof buildView>;

/**
 * Satu tujuan terdekat yang paling memotivasi untuk ditampilkan di layar utama:
 * pilih yang progresnya paling dekat selesai (tapi belum selesai).
 */
function tujuanBerikut(state: VillageState): { teks: string; progres: number; tab: 'misi' | 'bangun' | 'pegawai' | 'kades' | 'keuangan' | 'politik' } | null {
  const calon: { teks: string; progres: number; tab: 'misi' | 'bangun' | 'pegawai' | 'kades' | 'keuangan' | 'politik' }[] = [];
  const xpNaik = xpNaikLevel(state.level ?? 1);
  calon.push({ teks: `${xpNaik - (state.xp ?? 0)} XP lagi ke Lv ${(state.level ?? 1) + 1}`, progres: (state.xp ?? 0) / xpNaik, tab: 'misi' });
  for (const m of [...(state.misi?.daftar ?? []), ...(state.misiMingguan?.daftar ?? [])]) {
    if (m.diklaim) continue;
    const p = progresMisi(state, m);
    if (p >= m.target) calon.push({ teks: 'Hadiah misi siap diambil', progres: 0.999, tab: 'misi' });
    else calon.push({ teks: `${m.target - p} lagi: ${JUDUL_MISI[m.jenis](m.target).toLowerCase()}`, progres: p / m.target, tab: 'misi' });
  }
  const kantor = KANTOR[(state.kantorLevel ?? 1)];
  if (kantor && state.level >= kantor.minLevelDesa && state.kas < kantor.biaya && state.kas > 0) {
    calon.push({ teks: `${formatRupiah(kantor.biaya - state.kas)} lagi untuk ${kantor.nama}`, progres: state.kas / kantor.biaya, tab: 'pegawai' });
  }
  const proyek = PROJECTS.filter((p) => !isBuilt(state, p.id) && !isRunning(state, p.id) && (!p.butuhDusun || (state.dusun ?? []).includes(p.butuhDusun)))
    .map((p) => ({ p, biaya: Math.round(p.biaya * RULES.kontraktor.bagus.pengaliBiaya) }))
    .filter((x) => x.biaya > state.kas && state.kas > 0)
    .sort((a, b) => a.biaya - b.biaya)[0];
  if (proyek) calon.push({ teks: `${formatRupiah(proyek.biaya - state.kas)} lagi untuk ${proyek.p.nama}`, progres: state.kas / proyek.biaya, tab: 'bangun' });
  // peringatan SiLPA mengalahkan tujuan lain: kas menumpuk menjelang tutup tahun bisa memotong dana desa
  const bulan = Math.floor((state.hari % HARI_PER_PERIODE) / RULES.hariPerBulan) + 1;
  const batas = batasSilpa(state);
  const rl = state.relasi;
  if (rl?.mosi) return { teks: `BPD menggulirkan mosi pemakzulan: ${Math.max(0, rl.mosi.batasHari - state.hari)} hari lagi`, progres: 0.05, tab: 'politik' };
  const tw = state.usaha?.tawaran;
  if (tw) return { teks: `Ada perusahaan minta izin masuk desa (${Math.max(0, tw.batasHari - state.hari)} hari lagi)`, progres: 0.5, tab: 'bangun' };
  if (rl?.pemilihan && !rl.pemilihan.dukung) {
    return { teks: `${NAMA_PEMILIHAN[rl.pemilihan.jenis]}: tentukan sikapmu`, progres: 1 - Math.max(0, rl.pemilihan.hasilHari - state.hari) / 30, tab: 'politik' };
  }
  const pj = state.pajak;
  if (pj && pj.tunggakanBulan > 0 && pj.titipan > 0) {
    return { teks: `Titipan pajak ${formatRupiah(pj.titipan)} menunggak ${pj.tunggakanBulan} bln: setor sekarang`, progres: 0.1, tab: 'keuangan' };
  }
  const kasDesa = kasBersih(state);
  if (bulan >= 9 && kasDesa > batas) {
    return { teks: `Kas menganggur ${formatRupiah(kasDesa - batas)}: bangun sesuatu`, progres: Math.min(0.99, batas / kasDesa), tab: 'keuangan' };
  }
  // program wajib pusat lebih dulu: dana desa ditahan sampai berdiri
  const wajibBelum = PROJECTS.filter((x) => x.wajib && !isBuilt(state, x.id) && !isRunning(state, x.id));
  if (wajibBelum.length > 0) {
    const tenggat = RULES.hariPerBulan * 3 - state.hari;
    return {
      teks: (state.danaTertahan ?? 0) > 0 ? `Dana desa ${formatRupiah(state.danaTertahan!)} tertahan: bangun ${wajibBelum.map((x) => x.nama.split(' ')[0] === 'Dapur' ? 'Dapur MBG' : 'Kopdes').join(' & ')}` : `Wajib: bangun ${wajibBelum.map((x) => (x.id === 'dapur_mbg' ? 'Dapur MBG' : 'Kopdes')).join(' & ')}${tenggat > 0 ? ` (${tenggat} hari lagi)` : ''}`,
      progres: Math.max(0.01, Math.min(0.99, state.hari / (RULES.hariPerBulan * 3))),
      tab: 'bangun',
    };
  }
  // periode terakhir tanpa penerus: dinasti butuh persiapan berbulan-bulan, ingatkan sejak awal periode
  const p = state.politik;
  if (p && p.pemimpin === 'pemain' && p.periodePemain >= p.maksPeriode && !p.penerusId && bulan < 10) {
    return { teks: 'Periode terakhirmu! Siapkan penerus dari keluarga sebelum kampanye', progres: bulan / 10, tab: 'kades' };
  }
  const terbaik = calon.filter((c) => c.progres < 1).sort((a, b) => b.progres - a.progres)[0];
  return terbaik ? { ...terbaik, progres: Math.round(terbaik.progres * 100) / 100 } : null;
}
