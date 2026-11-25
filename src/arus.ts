// Arus kas desa dengan pos/kategori, supaya laporan bulanan punya rincian per pos.
import type { VillageState } from './types.ts';

export type PosKas =
  | 'Dana desa'
  | 'Iuran & retribusi'
  | 'Usaha BUMDes'
  | 'Bonus & hadiah'
  | 'Keputusan & kejadian'
  | 'Pinjaman cair'
  | 'Sumbangan kades'
  | 'Gaji perangkat'
  | 'Operasional kantor'
  | 'Perawatan bangunan'
  | 'Honor pegawai'
  | 'Pembangunan'
  | 'Usaha BUMDes (modal)'
  | 'Dekorasi'
  | 'Rekrut pegawai'
  | 'Cicilan & pelunasan'
  | 'Tunjangan kades'
  | 'Bocor (mark-up)'
  | 'Dana cadangan'
  | 'Penyertaan modal'
  | 'Investasi kripto'
  | 'Lainnya';

const POS_BANGUN = new Set<PosKas>(['Pembangunan', 'Usaha BUMDes (modal)', 'Penyertaan modal', 'Dekorasi']);

/** Ubah kas dan catat ke pos laporan bulan berjalan. Pinjaman cair tidak dihitung pemasukan. */
export function arus(s: VillageState, pos: PosKas, jumlah: number): void {
  if (!jumlah) return;
  s.kas += jumlah;
  s.bulanIni.rincian ??= {};
  s.bulanIni.rincian[pos] = (s.bulanIni.rincian[pos] ?? 0) + jumlah;
  // perpindahan kas ke/dari simpanan bukan pemasukan atau pengeluaran sungguhan
  if (pos === 'Pinjaman cair' || pos === 'Dana cadangan' || pos === 'Investasi kripto') return;
  if (jumlah < 0 && POS_BANGUN.has(pos)) s.nilaiPembangunan = (s.nilaiPembangunan ?? 0) - jumlah;
  if (jumlah >= 0) s.bulanIni.pemasukan += jumlah;
  else s.bulanIni.pengeluaran += -jumlah;
}
