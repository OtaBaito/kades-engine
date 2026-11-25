// Bot sederhana untuk tes dan balancing.
import { applyAction, buildView, GameError, type VillageState } from '../src/index.ts';

export type BotName = 'pasif' | 'acak' | 'serakah' | 'jujur';

function scoreEfek(efek: string[], gaya: BotName): number {
  let s = 0;
  for (const e of efek) {
    const m = e.match(/(-?\+?[\d,.]+)/);
    const raw = m ? Number(m[1].replace('+', '').replace(',', '.')) : 0;
    if (e.startsWith('Kas')) s += (e.includes('-') ? -1 : 1) * 0.5 * Math.abs(raw);
    else if (e.startsWith('Integritas')) s += raw * (gaya === 'jujur' ? 1.5 : gaya === 'serakah' ? 0 : 0.7);
    else if (e.startsWith('Semua warga')) s += raw * 4;
    else if (e.startsWith('Indeks')) s += raw * 1.5;
    else if (e.startsWith('Pemasukan')) s += 4;
    else s += raw;
  }
  return s;
}

function biayaOpsi(efek: string[]): number {
  const kas = efek.find((e) => e.startsWith('Kas -'));
  if (!kas) return 0;
  const m = kas.match(/([\d,]+)\s*(jt|rb|M)/);
  if (!m) return 0;
  const n = Number(m[1].replace(',', '.'));
  return n * (m[2] === 'M' ? 1e9 : m[2] === 'jt' ? 1e6 : 1e3);
}

/** Satu "sesi buka game": putuskan semua kartu lalu mungkin mulai proyek. */
export function botTurn(state: VillageState, bot: BotName, rand: () => number): VillageState {
  if (bot === 'pasif' || state.status !== 'menjabat') return state;
  let s = state;
  const coba = (a: Parameters<typeof applyAction>[1]) => {
    try {
      s = applyAction(s, a).state;
    } catch (err) {
      if (!(err instanceof GameError)) throw err;
    }
  };
  // aksi massa: jujur menemui atau memenuhi tuntutan, serakah memanggil aparat/ormas, acak sembarang
  if (s.unjuk && !s.unjuk.penanganan) {
    const urutan: ('temui' | 'penuhi' | 'polisi' | 'tentara' | 'ormas' | 'biarkan')[] =
      bot === 'jujur' ? ['temui', 'penuhi', 'polisi'] : bot === 'serakah' ? ['ormas', 'polisi', 'tentara'] : [(['temui', 'penuhi', 'polisi', 'tentara', 'ormas', 'biarkan'] as const)[Math.floor(rand() * 6)]];
    for (const cara of urutan) {
      const sebelum: VillageState["unjuk"] = s.unjuk;
      coba({ type: 'tangani_unjuk', cara });
      if (s.unjuk?.penanganan || s.unjuk !== sebelum) break;
    }
  }
  // audit inspektorat: jujur mengembalikan, serakah menyuap, acak sembarang
  if (s.politik.kasus) {
    const urut: ('kembalikan' | 'suap' | 'kambing_hitam' | 'pasrah' | 'ngeles')[] =
      bot === 'jujur' ? ['kembalikan', 'pasrah'] : bot === 'serakah' ? ['suap', 'kambing_hitam', 'kembalikan', 'pasrah'] : [(['kembalikan', 'suap', 'kambing_hitam', 'ngeles', 'pasrah'] as const)[Math.floor(rand() * 5)], 'pasrah'];
    for (const pilihan of urut) {
      if (!s.politik.kasus) break;
      coba({ type: 'hadapi_audit', pilihan });
    }
  }
  // politik ke atas: jujur netral dan rajin rapat terbuka; serakah melobi dan mengerahkan; acak sembarang
  const rl = s.relasi;
  if (rl) {
    if (!rl.wakil && rl.kandidatWakil.length) {
      const k = bot === 'acak' ? rl.kandidatWakil[Math.floor(rand() * rl.kandidatWakil.length)] : [...rl.kandidatWakil].sort((a, b) => nilaiWakil(b, bot) - nilaiWakil(a, bot))[0];
      coba({ type: 'wakil', aksi: 'pilih', id: k.id });
    }
    if (rl.pemilihan && !rl.pemilihan.dukung) {
      const c = rl.pemilihan.calon[rl.pemilihan.calon[0].kekuatan >= rl.pemilihan.calon[1].kekuatan ? 0 : 1];
      if (bot === 'jujur') coba({ type: 'dukung_calon', calonId: null, cara: 'netral' });
      else if (bot === 'serakah') coba({ type: 'dukung_calon', calonId: c.id, cara: 'kerahkan' });
      else coba({ type: 'dukung_calon', calonId: rl.pemilihan.calon[Math.floor(rand() * 2)].id, cara: (['netral', 'restu', 'kerahkan'] as const)[Math.floor(rand() * 3)] });
    }
    if (rl.mosi) {
      for (const cara of ['dialog', 'perlindungan', 'lobi'] as const) coba({ type: 'mosi', cara });
    }
    if (bot === 'jujur' || (bot === 'acak' && rand() < 0.2)) coba({ type: 'bpd', aksi: 'rapat_terbuka' });
    if (bot === 'serakah') {
      coba({ type: 'bpd', aksi: 'jamuan' });
      coba({ type: 'relasi', aksi: 'sowan', tokoh: 'bupati' });
      coba({ type: 'relasi', aksi: 'sowan', tokoh: 'kapolsek' });
    }
    if (bot === 'jujur' && rl.perdes.length === 0) coba({ type: 'perdes', id: 'transparansi', aksi: 'usul' });
    if (bot === 'acak' && rand() < 0.05) coba({ type: 'perdes', id: ['retribusi_pasar', 'jam_malam', 'musdes_rutin', 'larangan_tambang'][Math.floor(rand() * 4)], aksi: 'usul' });
    if (rl.wakil && rl.wakil.loyalitas < 35 && bot !== 'acak') coba({ type: 'wakil', aksi: 'rangkul' });
  }
  // kawasan usaha: jujur minta CSR (kecuali tambang), serakah minta pelicin, acak sembarang
  const tw = s.usaha?.tawaran;
  if (tw) {
    const aksi = bot === 'jujur' ? (tw.id === 'tambang' ? 'tolak' : 'csr') : bot === 'serakah' ? (tw.id === 'dahono' || tw.id === 'sabako' ? 'setujui' : 'pelicin') : (['setujui', 'csr', 'pelicin', 'tolak'] as const)[Math.floor(rand() * 4)];
    coba({ type: 'usaha', id: tw.id, aksi });
    if (s.usaha?.tawaran) coba({ type: 'usaha', id: tw.id, aksi: 'tolak' });
  }
  if (s.nasional?.pidato && !s.nasional.pidato.tanggapan) {
    coba({ type: 'tanggapi_pidato', tanggapan: bot === 'acak' ? (['dukung', 'diam', 'kritik'] as const)[Math.floor(rand() * 3)] : bot === 'jujur' ? 'diam' : 'dukung' });
  }
  // pegawai: isi jabatan penting dulu, perbesar kantor kalau kas longgar
  if (bot !== 'acak' || rand() < 0.3) {
    const URUT = ['bendahara', 'linmas', 'kader', 'humas', 'operator', 'penyuluh_tani', 'kebersihan', 'pelatih', 'guru_paud', 'penyuluh_agama', 'manajer_bumdes', 'pendamping_hukum'];
    const v0 = buildView(s);
    const peg = (v0 as unknown as { pegawai: { id: string; terbuka: boolean; aktif: boolean; kandidat: { id: string; biayaRekrut: number }[] }[] }).pegawai;
    if (v0.kantor.terisi < v0.kantor.kapasitas) {
      for (const id of URUT) {
        const p = peg.find((x) => x.id === id);
        if (!p || !p.terbuka || p.aktif || !p.kandidat.length) continue;
        if (s.kas < p.kandidat[0].biayaRekrut + 40_000_000) break;
        coba({ type: 'rekrut_pegawai', id: p.kandidat[0].id });
        break;
      }
    } else if (v0.kantor.berikut && s.level >= v0.kantor.berikut.minLevelDesa && s.kas > v0.kantor.berikut.biaya + 150_000_000) {
      coba({ type: 'upgrade_kantor' });
    }
  }
  // rutinitas kecil: tagih, tanggapi aspirasi, klaim misi
  coba({ type: 'tagih' });
  for (const a of buildView(s).aspirasi) if (bot !== 'acak' || rand() < 0.5) coba({ type: 'tanggapi_aspirasi', id: a.id });
  for (const m of buildView(s).misi) if (!m.diklaim && m.progres >= m.target) coba({ type: 'klaim_misi', id: m.id });
  const view = buildView(s);
  for (const kartu of view.kotakMasuk) {
    const urutan =
      bot === 'acak'
        ? [...kartu.opsi].sort(() => rand() - 0.5)
        : [...kartu.opsi].sort((a, b) => scoreEfek(b.efek, bot) - scoreEfek(a.efek, bot));
    const termurah = Math.min(...kartu.opsi.map((o) => biayaOpsi(o.efek)));
    for (const opsi of urutan) {
      // bot pintar tidak mau kas jatuh di bawah cadangan Rp40 jt demi satu kartu
      if (bot !== 'acak' && biayaOpsi(opsi.efek) > termurah && s.kas - biayaOpsi(opsi.efek) < 40_000_000) continue;
      try {
        s = applyAction(s, { type: 'putuskan', instanceId: kartu.instanceId, opsiId: opsi.id }).state;
        break;
      } catch (err) {
        if (!(err instanceof GameError)) throw err;
      }
    }
  }
  const v2 = buildView(s);
  const berjalan = v2.proyek.filter((p) => p.status === 'dibangun').length;
  if (berjalan < v2.maksProyekBersamaan) {
    const kandidat = v2.proyek
      .filter((p) => p.status === 'tersedia')
      .sort((a, b) => (bot === 'acak' ? rand() - 0.5 : a.biayaBagus - b.biayaBagus));
    // semua proyek sudah ada: tingkatkan bangunan termurah
    if (kandidat.length === 0) {
      const up = v2.proyek
        .filter((p) => p.status === 'selesai' && p.level < 3)
        .sort((a, b) => a.biayaUpgradeBagus - b.biayaUpgradeBagus)[0];
      if (up && (bot === 'acak' || s.kas - up.biayaUpgradeBagus > 60_000_000)) {
        coba({ type: 'upgrade_proyek', proyekId: up.id, kontraktor: 'bagus' });
      }
    }
    for (const p of kandidat) {
      const kontraktor = bot === 'acak' ? (rand() < 0.5 ? 'murah' : 'bagus') : s.kas > p.biayaBagus + 80_000_000 ? 'bagus' : 'murah';
      const biaya = kontraktor === 'bagus' ? p.biayaBagus : p.biayaMurah;
      // bot pintar menyisakan cadangan kas untuk gaji dan kejadian mendadak
      if (bot !== 'acak' && s.kas - biaya < 60_000_000) continue;
      try {
        s = applyAction(s, { type: 'mulai_proyek', proyekId: p.id, kontraktor }).state;
        break;
      } catch (err) {
        if (!(err instanceof GameError)) throw err;
      }
    }
  }
  return s;
}

const WAKIL_KOTOR = new Set(['anak_juragan', 'keponakan_bupati', 'kader_partai']);
function nilaiWakil(w: { latar: string; loyalitas: number; ambisi: number }, bot: BotName): number {
  return w.loyalitas - w.ambisi + (bot === 'jujur' && WAKIL_KOTOR.has(w.latar) ? -100 : 0) + (bot === 'serakah' && WAKIL_KOTOR.has(w.latar) ? 40 : 0);
}
