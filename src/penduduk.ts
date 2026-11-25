// Penduduk dinamis: jumlah jiwa tiap kelompok berubah tiap bulan mengikuti keadaan desa.
// Warga yang puas dan ekonomi yang hidup menarik pendatang; desa yang mengecewakan ditinggal merantau.
import { GROUPS } from './content/groups.ts';
import { PROJECT_BY_ID } from './content/projects.ts';
import type { Catat } from './fitur.ts';
import { nextRandom } from './rng.ts';
import type { GroupId, VillageState } from './types.ts';

export const BASIS_PENDUDUK = GROUPS.reduce((t, g) => t + g.jiwa, 0);

export function jiwaKelompok(s: VillageState, g: GroupId): number {
  return s.penduduk?.[g] ?? GROUPS.find((x) => x.id === g)!.jiwa;
}

export function totalPenduduk(s: VillageState): number {
  return GROUPS.reduce((t, g) => t + jiwaKelompok(s, g.id), 0);
}

/** Tutup bulan: hitung kelahiran, kematian, pendatang, dan yang merantau per kelompok. */
export function bulananPenduduk(s: VillageState, catat: Catat): void {
  s.penduduk ??= Object.fromEntries(GROUPS.map((g) => [g.id, g.jiwa])) as Record<GroupId, number>;
  const tersedia = new Set(s.proyekSelesai.flatMap((b) => PROJECT_BY_ID.get(b.proyekId)?.menyediakan ?? []));
  const perubahan: Partial<Record<GroupId, number>> = {};
  let total = 0;
  for (const g of GROUPS) {
    const n = s.penduduk[g.id];
    const kurang = g.kebutuhan.filter((k) => !tersedia.has(k)).length;
    let laju =
      0.0015 + // kelahiran dikurangi kematian
      (s.kepuasan[g.id] - 55) / 2500 +
      (s.indeks.ekonomi - 40) / 6000 -
      kurang * 0.0015;
    // keluarga perantau paling cepat pulang kampung kalau ekonomi desa membaik, dan paling cepat pergi kalau tidak
    if (g.id === 'perantau') laju *= 1.8;
    if (g.id === 'pemuda' && s.indeks.ekonomi < 35) laju -= 0.004;
    const acak = (nextRandom(s) - 0.5) * 0.004;
    const d = Math.round(n * (laju + acak));
    s.penduduk[g.id] = Math.max(Math.round(g.jiwa * 0.3), n + d);
    perubahan[g.id] = d;
    total += d;
  }
  s.perubahanPenduduk = perubahan;
  if (total >= 15) catat('baik', `Penduduk bertambah ${total} jiwa bulan ini. Ada bayi lahir dan keluarga pendatang baru.`);
  else if (total <= -15) catat('buruk', `${-total} warga meninggalkan desa bulan ini, kebanyakan merantau ke kota.`);
}
