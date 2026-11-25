// Pajak desa: "titipan pajak" yang ada di kas tapi bukan milik desa.
//
// 1. Pajak belanja: setiap belanja pembangunan, bendahara memotong PPN + PPh (11,5%) dari pembayaran
//    rekanan. Uang potongan itu tetap di kas desa sebagai titipan dan wajib disetor ke negara.
// 2. PBB-P2: desa ikut menagih PBB warga (bulan 2-9). Hasil tagihan juga titipan yang wajib disetor.
//    Realisasi akhir tahun >= 100% dapat insentif dari kabupaten, di bawah 70% dapat teguran.
//
// Godaannya: titipan ikut terlihat di kas, jadi bisa terpakai untuk belanja. Kalau saat tutup buku
// titipan tidak tersetor, ada denda 2% per bulan, kecurigaan naik, dan KPP mengirim teguran.
import { arus } from './arus.ts';
import { GameError } from './errors.ts';
import type { GroupId, VillageState } from './types.ts';

const JT = 1_000_000;

export const PAJAK = {
  /** PPN 11% + PPh 22 1,5% atas belanja barang/jasa, dipotong dari pembayaran ke rekanan. */
  tarifBelanja: 0.115,
  /** Target PBB-P2 per jiwa per tahun. */
  pbbPerJiwa: 15_000,
  /** Bulan penagihan PBB dalam tahun game. */
  bulanPbb: [2, 3, 4, 5, 6, 7, 8, 9],
  dendaPerBulan: 0.02,
  /** Insentif kabupaten kalau realisasi PBB >= 100%: persen dari target. */
  insentifPbb: 0.1,
} as const;

export type ModePbb = 'normal' | 'gencar' | 'ringan';

export interface StatePajak {
  /** Uang pajak di kas yang wajib disetor (pajak belanja + PBB tertagih + denda). */
  titipan: number;
  /** Bagian titipan yang berasal dari PBB (untuk realisasi). */
  titipanPbb: number;
  tunggakanBulan: number;
  dendaTotal: number;
  /** Setor otomatis saat tutup buku (bawaan). Kalau dimatikan, kades harus setor manual. */
  otomatis: boolean;
  pbb: { tahun: number; target: number; tertagih: number; disetor: number; mode: ModePbb };
  totalSetor: number;
}

function totalJiwa(s: VillageState): number {
  return Object.values(s.penduduk ?? {}).reduce((t, n) => t + (n ?? 0), 0);
}

/** Tahun game yang sedang berjalan (hari 1-360 = tahun 1; hari 360 tepat masih tahun 1 saat tutup buku). */
function tahunKe(s: VillageState): number {
  return Math.floor(Math.max(0, s.hari - 1) / 360) + 1;
}

export function statePajak(s: VillageState): StatePajak {
  s.pajak ??= {
    titipan: 0,
    titipanPbb: 0,
    tunggakanBulan: 0,
    dendaTotal: 0,
    otomatis: true,
    pbb: { tahun: tahunKe(s), target: Math.round((totalJiwa(s) * PAJAK.pbbPerJiwa) / JT) * JT, tertagih: 0, disetor: 0, mode: 'normal' },
    totalSetor: 0,
  };
  return s.pajak;
}

/** Dipanggil arus() untuk setiap belanja pembangunan: potong pajak, simpan sebagai titipan di kas. */
export function potongPajakBelanja(s: VillageState, belanja: number): number {
  const p = statePajak(s);
  const pajak = Math.round(belanja * PAJAK.tarifBelanja);
  if (pajak <= 0) return 0;
  // pembayaran ke rekanan berkurang sebesar pajak; uangnya tetap di kas sebagai titipan
  s.kas += pajak;
  p.titipan += pajak;
  return pajak;
}

/** Kas yang benar-benar milik desa (kas dikurangi titipan pajak). */
export function kasBersih(s: VillageState): number {
  return s.kas - (s.pajak?.titipan ?? 0);
}

function setor(s: VillageState, jumlah: number): number {
  const p = statePajak(s);
  const n = Math.max(0, Math.min(jumlah, p.titipan, Math.max(0, s.kas)));
  if (n <= 0) return 0;
  arus(s, 'Setor pajak', -n);
  // bagian PBB disetor lebih dulu supaya realisasi PBB tercatat
  const pbb = Math.min(n, p.titipanPbb);
  p.titipanPbb -= pbb;
  p.pbb.disetor += pbb;
  p.titipan -= n;
  p.totalSetor += n;
  if (p.titipan <= 0) {
    p.titipan = 0;
    p.titipanPbb = 0;
    p.tunggakanBulan = 0;
  }
  return n;
}

export type AksiPajak = 'setor' | 'otomatis_nyala' | 'otomatis_mati' | 'pbb_normal' | 'pbb_gencar' | 'pbb_ringan';

export function aturPajak(s: VillageState, aksi: AksiPajak): string {
  const p = statePajak(s);
  if (aksi === 'setor') {
    if (p.titipan <= 0) throw new GameError('Tidak ada titipan pajak yang perlu disetor.');
    if (s.kas <= 0) throw new GameError('Kas kosong. Titipan pajak sudah terpakai untuk belanja.');
    const n = setor(s, p.titipan);
    return p.titipan > 0
      ? `Rp ${Math.round(n / JT)} jt disetor ke kas negara. Masih kurang Rp ${Math.round(p.titipan / JT)} jt karena kas tidak cukup.`
      : `Rp ${Math.round(n / JT)} jt titipan pajak disetor ke kas negara. Bendahara lega, buku kas rapi.`;
  }
  if (aksi === 'otomatis_nyala') {
    p.otomatis = true;
    return 'Titipan pajak akan disetor otomatis setiap tutup buku.';
  }
  if (aksi === 'otomatis_mati') {
    p.otomatis = false;
    return 'Setor otomatis dimatikan. Ingat: titipan pajak yang tidak disetor saat tutup buku kena denda 2% per bulan.';
  }
  const mode: ModePbb = aksi === 'pbb_gencar' ? 'gencar' : aksi === 'pbb_ringan' ? 'ringan' : 'normal';
  p.pbb.mode = mode;
  return mode === 'gencar'
    ? 'Penagihan PBB digencarkan: perangkat datang dari rumah ke rumah. Hasil naik, warga kurang senang.'
    : mode === 'ringan'
      ? 'Warga kurang mampu diberi keringanan PBB. Warga senang, realisasi turun.'
      : 'Penagihan PBB kembali normal.';
}

/** Tutup buku bulanan: tagih PBB, setor titipan, hitung denda, dan evaluasi PBB akhir tahun. */
export function bulananPajak(s: VillageState, catat: (j: 'baik' | 'buruk' | 'info', t: string) => void): void {
  const p = statePajak(s);
  const bulan = ((Math.floor(s.hari / 30) - 1) % 12) + 1; // bulan yang baru ditutup (1-12)

  // tahun baru: target PBB baru
  if (p.pbb.tahun < tahunKe(s)) {
    p.pbb = { tahun: tahunKe(s), target: Math.round((totalJiwa(s) * PAJAK.pbbPerJiwa) / JT) * JT, tertagih: 0, disetor: 0, mode: p.pbb.mode };
  }

  // 1) penagihan PBB
  if ((PAJAK.bulanPbb as readonly number[]).includes(bulan) && p.pbb.target > 0) {
    const rataPuas = Object.values(s.kepuasan).reduce((t, v) => t + v, 0) / Object.keys(s.kepuasan).length;
    const faktorMode = p.pbb.mode === 'gencar' ? 1.3 : p.pbb.mode === 'ringan' ? 0.7 : 1;
    const kepatuhan = Math.max(0.4, Math.min(1.05, 0.55 + rataPuas / 200));
    const tagih = Math.round((p.pbb.target / PAJAK.bulanPbb.length) * kepatuhan * faktorMode);
    const sisa = Math.max(0, Math.round(p.pbb.target * 1.05) - p.pbb.tertagih);
    const masuk = Math.min(tagih, sisa);
    if (masuk > 0) {
      s.kas += masuk; // uang warga masuk kas desa sebagai titipan, bukan pemasukan desa
      p.titipan += masuk;
      p.titipanPbb += masuk;
      p.pbb.tertagih += masuk;
    }
    const kena: GroupId[] = ['petani', 'pedagang'];
    if (p.pbb.mode === 'gencar') for (const g of kena) s.kepuasan[g] = Math.max(0, s.kepuasan[g] - 1.5);
    if (p.pbb.mode === 'ringan') for (const g of kena) s.kepuasan[g] = Math.min(100, s.kepuasan[g] + 1);
  }

  // 2) setor titipan
  if (p.titipan > 0 && p.otomatis) setor(s, p.titipan);
  if (p.titipan > 0) {
    p.tunggakanBulan += 1;
    const denda = Math.round(p.titipan * PAJAK.dendaPerBulan);
    p.titipan += denda;
    p.dendaTotal += denda;
    // sengaja menahan (kas ada, setor otomatis dimatikan) lebih mencurigakan daripada kas memang habis
    const sengaja = s.kas > 0 && !p.otomatis;
    if (p.tunggakanBulan <= 6) s.politik.kecurigaan = Math.min(100, s.politik.kecurigaan + (sengaja ? 6 : 4));
    if (p.tunggakanBulan === 1)
      catat('buruk', `Titipan pajak Rp ${Math.round(p.titipan / JT)} jt belum disetor${s.kas <= 0 ? ' karena kas habis' : ''}. Denda 2% mulai berjalan.`);
    else if (p.tunggakanBulan === 3) catat('buruk', `KPP mengirim surat teguran: titipan pajak menunggak 3 bulan (Rp ${Math.round(p.titipan / JT)} jt). Inspektorat ikut mencatat.`);
    else if (p.tunggakanBulan >= 6 && p.tunggakanBulan % 3 === 0) {
      s.integritas = Math.max(0, s.integritas - 4);
      catat('buruk', `Tunggakan pajak desa ${p.tunggakanBulan} bulan jadi bahan omongan. Integritas kades turun.`);
    }
  }

  // 3) evaluasi PBB akhir tahun
  if (bulan === 12 && p.pbb.target > 0) {
    const realisasi = p.pbb.disetor / p.pbb.target;
    if (realisasi >= 1) {
      const insentif = Math.round(p.pbb.target * PAJAK.insentifPbb);
      arus(s, 'Bonus & hadiah', insentif);
      s.kepuasan.tokoh = Math.min(100, s.kepuasan.tokoh + 3);
      s.popularitas = Math.min(100, s.popularitas + 2);
      catat('baik', `Realisasi PBB ${Math.round(realisasi * 100)}%. Kabupaten memberi insentif Rp ${Math.round(insentif / JT)} jt dan desa disebut teladan di rapat camat.`);
    } else if (realisasi < 0.7) {
      s.kepuasan.tokoh = Math.max(0, s.kepuasan.tokoh - 3);
      s.popularitas = Math.max(0, s.popularitas - 2);
      catat('buruk', `Realisasi PBB cuma ${Math.round(realisasi * 100)}%. Camat menegur di depan kades se-kecamatan.`);
    } else {
      catat('info', `Realisasi PBB tahun ini ${Math.round(realisasi * 100)}%.`);
    }
    p.pbb = { tahun: tahunKe(s) + 1, target: Math.round((totalJiwa(s) * PAJAK.pbbPerJiwa) / JT) * JT, tertagih: 0, disetor: 0, mode: p.pbb.mode };
  }
}

export function viewPajak(s: VillageState) {
  const p = statePajak(s);
  return {
    titipan: p.titipan,
    tunggakanBulan: p.tunggakanBulan,
    dendaTotal: p.dendaTotal,
    otomatis: p.otomatis,
    totalSetor: p.totalSetor,
    kasBersih: kasBersih(s),
    tarifBelanjaPersen: PAJAK.tarifBelanja * 100,
    pbb: {
      ...p.pbb,
      realisasiPersen: p.pbb.target > 0 ? Math.round((p.pbb.disetor / p.pbb.target) * 100) : 0,
      tertagihPersen: p.pbb.target > 0 ? Math.round((p.pbb.tertagih / p.pbb.target) * 100) : 0,
    },
  };
}
