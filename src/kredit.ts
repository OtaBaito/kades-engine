// Kredit desa: bank, koperasi, pinjol, rentenir. Semua lembaga fiktif.
import { GameError } from './errors.ts';
import { arus } from './arus.ts';
import type { Catat } from './fitur.ts';
import type { GroupId, VillageState } from './types.ts';

const JT = 1_000_000;
const jt = (n: number) => (Math.round((n / JT) * 10) / 10).toString().replace('.', ',');

export interface SumberKredit {
  id: string;
  nama: string;
  jenis: 'bank' | 'koperasi' | 'pinjol' | 'rentenir';
  deskripsi: string;
  /** Bunga flat per bulan dari pokok awal. */
  bungaBulanan: number;
  tenor: number; // bulan
  limitDasar: number;
  limitPerLevel: number;
  minIntegritas: number;
  /** Denda keterlambatan: persen dari sisa pokok, ditambahkan ke utang. */
  denda: number;
  efekAmbil?: { integritas?: number; popularitas?: number };
  efekTelat: { pesan: string; popularitas: number; semuaKepuasan?: number; kepuasan?: Partial<Record<GroupId, number>> };
}

export const KREDIT: SumberKredit[] = [
  {
    id: 'bank',
    nama: 'Bank Desa Makmur',
    jenis: 'bank',
    deskripsi: 'Bunga paling rendah, tenor panjang. Syarat: integritas desa bagus.',
    bungaBulanan: 0.01,
    tenor: 12,
    limitDasar: 150 * JT,
    limitPerLevel: 15 * JT,
    minIntegritas: 45,
    denda: 0.01,
    efekTelat: { pesan: 'Bank mengirim surat teguran resmi ke balai desa. Nama desa masuk daftar pantauan.', popularitas: -3 },
  },
  {
    id: 'koperasi',
    nama: 'Koperasi Simpan Pinjam',
    jenis: 'koperasi',
    deskripsi: 'Bunga ringan, proses kekeluargaan. Plafon tidak besar.',
    bungaBulanan: 0.015,
    tenor: 6,
    limitDasar: 80 * JT,
    limitPerLevel: 5 * JT,
    minIntegritas: 30,
    denda: 0.02,
    efekTelat: { pesan: 'Pengurus koperasi mengeluh di rapat anggota. Warga ikut kecewa.', popularitas: -2, kepuasan: { pedagang: -2 } },
  },
  {
    id: 'pinjol',
    nama: 'Pinjol KilatCair',
    jenis: 'pinjol',
    deskripsi: 'Cair dalam lima menit tanpa syarat. Bunganya bikin pusing.',
    bungaBulanan: 0.08,
    tenor: 3,
    limitDasar: 100 * JT,
    limitPerLevel: 10 * JT,
    minIntegritas: 0,
    denda: 0.1,
    efekAmbil: { popularitas: -2 },
    efekTelat: {
      pesan: 'Penagih pinjol menelepon seluruh kontak HP kades. Grup WhatsApp warga heboh.',
      popularitas: -7,
      semuaKepuasan: -2,
    },
  },
  {
    id: 'rentenir',
    nama: 'Juragan Lintah Darat',
    jenis: 'rentenir',
    deskripsi: 'Uang tunai besar tanpa tanda tangan. Telat bayar, urusannya panjang.',
    bungaBulanan: 0.15,
    tenor: 2,
    limitDasar: 250 * JT,
    limitPerLevel: 0,
    minIntegritas: 0,
    denda: 0.15,
    efekAmbil: { integritas: -4 },
    efekTelat: {
      pesan: 'Anak buah juragan menongkrongi balai desa dan menyita motor dinas.',
      popularitas: -10,
      kepuasan: { tokoh: -4, pkk: -2 },
    },
  },
];

export function sumberKredit(id: string): SumberKredit {
  const s = KREDIT.find((k) => k.id === id);
  if (!s) throw new GameError('Sumber pinjaman tidak dikenal.');
  return s;
}

export function limitKredit(s: VillageState, k: SumberKredit): number {
  return k.limitDasar + k.limitPerLevel * ((s.level ?? 1) - 1);
}

export function sisaLimit(s: VillageState, k: SumberKredit): number {
  const terpakai = (s.pinjaman ?? []).filter((p) => p.sumber === k.id).reduce((t, p) => t + p.sisaPokok, 0);
  return Math.max(0, limitKredit(s, k) - terpakai);
}

export function cicilanBulanan(p: VillageState['pinjaman'][number]): number {
  return Math.round(p.cicilanPokok + p.pokok * p.bunga);
}

export function ambilPinjaman(s: VillageState, sumber: string, jumlah: number, nomor: () => string): string {
  const k = sumberKredit(sumber);
  if (!Number.isFinite(jumlah) || jumlah < 5 * JT) throw new GameError('Pinjaman minimal Rp 5 jt.');
  if (s.integritas < k.minIntegritas) throw new GameError(`${k.nama} menolak: integritas desa di bawah ${k.minIntegritas}.`);
  const sisa = sisaLimit(s, k);
  if (jumlah > sisa) throw new GameError(`Plafon ${k.nama} tersisa Rp ${Math.floor(sisa / JT)} jt.`);
  const pokok = Math.round(jumlah);
  s.pinjaman.push({
    id: nomor(),
    sumber: k.id,
    pokok,
    sisaPokok: pokok,
    bunga: k.bungaBulanan,
    tenor: k.tenor,
    sisaBulan: k.tenor,
    cicilanPokok: Math.round(pokok / k.tenor),
    telat: 0,
    hariAmbil: s.hari,
  });
  // uang pinjaman bukan pendapatan: tidak dihitung sebagai pemasukan bulanan
  arus(s, 'Pinjaman cair', pokok);
  if (k.efekAmbil?.integritas) s.integritas = Math.max(0, s.integritas + k.efekAmbil.integritas);
  if (k.efekAmbil?.popularitas) s.popularitas = Math.max(0, s.popularitas + k.efekAmbil.popularitas);
  return `Pinjaman ${k.nama} cair Rp ${Math.round(pokok / JT)} jt. Cicilan Rp ${jt(cicilanBulanan(s.pinjaman[s.pinjaman.length - 1]))} jt per bulan selama ${k.tenor} bulan.`;
}

export function lunasiPinjaman(s: VillageState, id: string): string {
  const p = s.pinjaman.find((x) => x.id === id);
  if (!p) throw new GameError('Pinjaman tidak ditemukan.');
  const k = sumberKredit(p.sumber);
  // pelunasan dipercepat: sisa pokok + bunga satu bulan
  const total = Math.round(p.sisaPokok + p.pokok * p.bunga);
  if (s.kas < total) throw new GameError(`Kas tidak cukup untuk melunasi. Butuh Rp ${jt(total)} jt.`);
  arus(s, 'Cicilan & pelunasan', -total);
  s.pinjaman = s.pinjaman.filter((x) => x !== p);
  s.statistikKredit.lunas += 1;
  return `Pinjaman ${k.nama} lunas. Lega rasanya.`;
}

/** Dipanggil saat tutup buku bulanan: tarik cicilan, catat keterlambatan dan dendanya. */
export function tagihCicilan(s: VillageState, catat: Catat): void {
  for (const p of [...s.pinjaman]) {
    const k = sumberKredit(p.sumber);
    const cicilan = cicilanBulanan(p);
    if (s.kas >= cicilan) {
      arus(s, 'Cicilan & pelunasan', -cicilan);
      p.sisaPokok = Math.max(0, p.sisaPokok - p.cicilanPokok);
      p.sisaBulan -= 1;
      if (p.sisaBulan <= 0 || p.sisaPokok <= 0) {
        s.pinjaman = s.pinjaman.filter((x) => x !== p);
        s.statistikKredit.lunas += 1;
        catat('baik', `Cicilan terakhir ${k.nama} dibayar. Utang lunas.`);
      }
      continue;
    }
    // telat bayar
    p.telat += 1;
    s.statistikKredit.telat += 1;
    const denda = Math.round(p.sisaPokok * k.denda);
    p.sisaPokok += denda;
    s.popularitas = Math.max(0, s.popularitas + k.efekTelat.popularitas);
    if (k.efekTelat.semuaKepuasan) {
      for (const g of Object.keys(s.kepuasan) as GroupId[]) s.kepuasan[g] = Math.max(0, s.kepuasan[g] + k.efekTelat.semuaKepuasan);
    }
    for (const [g, v] of Object.entries(k.efekTelat.kepuasan ?? {}) as [GroupId, number][]) {
      s.kepuasan[g] = Math.max(0, s.kepuasan[g] + v);
    }
    catat('buruk', `Telat bayar ${k.nama}: denda Rp ${jt(denda)} jt. ${k.efekTelat.pesan}`);
    // bank yang ditunggak tiga kali menahan pencairan dana desa berikutnya
    if (k.jenis === 'bank' && p.telat >= 3 && !s.flags.includes('termin_ditahan')) {
      s.flags.push('termin_ditahan');
      catat('buruk', 'Rekening desa dibekukan sementara karena tunggakan bank.');
    }
  }
}

export function totalUtang(s: VillageState): number {
  return (s.pinjaman ?? []).reduce((t, p) => t + p.sisaPokok, 0);
}

/** Pinjaman paksa untuk program wajib: lewat bank, tanpa cek integritas dan plafon. */
export function pinjamanProgram(s: VillageState, jumlah: number, nomor: () => string): number {
  const k = sumberKredit('bank');
  const pokok = Math.max(5 * JT, Math.ceil(jumlah / JT) * JT);
  s.pinjaman.push({
    id: nomor(),
    sumber: k.id,
    pokok,
    sisaPokok: pokok,
    bunga: k.bungaBulanan,
    tenor: k.tenor,
    sisaBulan: k.tenor,
    cicilanPokok: Math.round(pokok / k.tenor),
    telat: 0,
    hariAmbil: s.hari,
  });
  arus(s, 'Pinjaman cair', pokok);
  return pokok;
}
