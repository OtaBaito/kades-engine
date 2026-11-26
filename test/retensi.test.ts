import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameError, advance, applyAction, buatRingkasanPergi, createVillage } from '../src/index.ts';
import { CARD_BY_ID } from '../src/content/cards.ts';

const baru = (seed = 'retensi') => createVillage({ seed, namaDesa: 'Sukamaju', namaKades: 'Budi' });

test('hadiah harian: beruntun naik per hari, tidak bisa klaim dua kali, absen hanya memundurkan', () => {
  let s = baru();
  const kas = s.kas;
  s = applyAction(s, { type: 'klaim_harian', tanggal: '2026-11-01' }).state;
  assert.equal(s.hadiahHarian!.beruntun, 1);
  assert.ok(s.kas > kas);
  assert.throws(() => applyAction(s, { type: 'klaim_harian', tanggal: '2026-11-01' }), GameError);
  for (let d = 2; d <= 7; d++) s = applyAction(s, { type: 'klaim_harian', tanggal: `2026-11-0${d}` }).state;
  assert.equal(s.hadiahHarian!.beruntun, 7);
  s = applyAction(s, { type: 'klaim_harian', tanggal: '2026-11-08' }).state;
  assert.equal(s.hadiahHarian!.beruntun, 1, 'siklus 7 hari mulai lagi');
  s = applyAction(s, { type: 'klaim_harian', tanggal: '2026-11-09' }).state;
  s = applyAction(s, { type: 'klaim_harian', tanggal: '2026-11-10' }).state;
  s = applyAction(s, { type: 'klaim_harian', tanggal: '2026-11-13' }).state; // absen 2 hari
  assert.equal(s.hadiahHarian!.beruntun, 1, 'beruntun 3 mundur 2 jadi 1, bukan hangus total');
});

test('ringkasan selama pergi menghitung hari, kas, kartu, dan bisa ditutup', () => {
  const awal = baru('pergi');
  const r = advance(awal, 20);
  const ringkas = buatRingkasanPergi(awal, r.state, 20, r.events);
  assert.equal(ringkas.hari, 20);
  assert.ok(ringkas.koinMenunggu > 0);
  const s = { ...r.state, ringkasanPergi: ringkas };
  const tutup = applyAction(s, { type: 'tutup_ringkasan' }).state;
  assert.equal(tutup.ringkasanPergi, null);
});

test('cerita bersambung: babak 2 datang sesuai jadwal dan teksnya mengikuti pilihan babak 1', async () => {
  const { buildView } = await import('../src/index.ts');
  let s = baru('bersambung');
  s.kas = 500_000_000;
  s.kotakMasuk = [{ instanceId: 'kb1', cardId: 'arc_kas_1', hariMasuk: s.hari }];
  s = applyAction(s, { type: 'putuskan', instanceId: 'kb1', opsiId: 'tutupi' }).state;
  assert.equal(s.antreanKartu?.length, 1);
  s.kotakMasuk = [];
  s = advance(s, 7).state;
  const babak2 = buildView(s).kotakMasuk.find((k) => k.cardId === 'arc_kas_2');
  assert.ok(babak2, 'babak 2 masuk kotak');
  assert.match(babak2!.teks, /ditutupi/);
  assert.equal(babak2!.bersambung, true);
});

test('event musiman hanya muncul di bulannya, New Game+ memberi modal dari warisan', async () => {
  const { CARDS } = await import('../src/index.ts');
  const ramadan = CARDS.find((c) => c.id === 'musim_ramadan')!;
  assert.deepEqual(ramadan.syarat?.bulanTahun, [3]);
  const biasa = baru('ng');
  const ngp = createVillage({ seed: 'ng', namaDesa: 'Sukamaju', namaKades: 'Budi', warisan: { gelar: 'Kades Teladan', total: 60 } });
  assert.ok(ngp.kas > biasa.kas);
  assert.equal(ngp.warisanSebelum?.gelar, 'Kades Teladan');
});

test('corak desa mengubah keadaan awal', () => {
  const agraris = createVillage({ seed: 'tipe', namaDesa: 'A', namaKades: 'B', tipe: 'agraris' });
  const pinggiran = createVillage({ seed: 'tipe', namaDesa: 'A', namaKades: 'B', tipe: 'pinggiran' });
  const santri = createVillage({ seed: 'tipe', namaDesa: 'A', namaKades: 'B', tipe: 'religius' });
  assert.ok(agraris.kepuasan.petani > pinggiran.kepuasan.petani);
  assert.ok(pinggiran.kas > agraris.kas);
  assert.ok(pinggiran.indeks.lingkungan < agraris.indeks.lingkungan);
  assert.ok(santri.integritas > agraris.integritas);
  assert.equal(pinggiran.tipeDesa, 'pinggiran');
  // isi desa ikut berubah: komposisi warga, usaha bawaan, dan kejadian khas
  assert.ok(pinggiran.penduduk.perantau > agraris.penduduk.perantau * 2);
  assert.ok(santri.penduduk.tokoh > agraris.penduduk.tokoh * 2);
  assert.equal(pinggiran.bumdes.laundry, 1);
  assert.equal(agraris.bumdes.penggilingan, 1);
});

test('kejadian khas corak hanya muncul di desa yang cocok', () => {
  for (const tipe of ['agraris', 'wisata', 'pinggiran', 'religius'] as const) {
    let s = createVillage({ seed: `khas-${tipe}`, namaDesa: 'A', namaKades: 'B', tipe });
    const muncul = new Set<string>();
    for (let i = 0; i < 40; i++) {
      for (const k of s.kotakMasuk) muncul.add(k.cardId);
      s = advance(s, 30).state;
      for (const k of [...s.kotakMasuk]) {
        if (s.status !== 'menjabat') break;
        muncul.add(k.cardId);
        const opsi = CARD_BY_ID.get(k.cardId)?.opsi.find((o) => !o.syarat) ?? CARD_BY_ID.get(k.cardId)?.opsi[0];
        try {
          if (opsi) s = applyAction(s, { type: 'putuskan', instanceId: k.instanceId, opsiId: opsi.id }).state;
        } catch {
          // opsi kartu lanjutan bisa berbeda; lewati
        }
      }
      if (s.status !== 'menjabat') break;
    }
    for (const id of Object.keys(s.riwayatKartu)) muncul.add(id);
    const prefiks = { agraris: 'agr_', wisata: 'wis_', pinggiran: 'pgr_', religius: 'rel_' };
    const lain = Object.entries(prefiks).filter(([t]) => t !== tipe).map(([, p]) => p);
    assert.ok(![...muncul].some((id) => lain.some((p) => id.startsWith(p))), `${tipe}: muncul kartu corak lain`);
  }
});

test('pelamar: nama unik, kader posyandu selalu perempuan', () => {
  let s = createVillage({ seed: 'pelamar', namaDesa: 'A', namaKades: 'B' });
  for (let b = 0; b < 12; b++) {
    const nama = [...s.staf, ...Object.values(s.kandidat).flat()].map((x) => x.nama.split(' ').slice(1).join(' '));
    assert.equal(new Set(nama).size, nama.length, 'ada nama kembar');
    for (const k of s.kandidat.kader ?? []) assert.match(k.nama, /^(Mbak|Bu|Teh) /);
    s = advance(s, 30).state;
    if (s.status !== 'menjabat') break;
  }
});

test('buzzer peredam menurunkan gosip atau ketahuan', () => {
  let s = createVillage({ seed: 'buzzer', namaDesa: 'A', namaKades: 'B' });
  s.politik.dompet = 100_000_000;
  s.politik.kecurigaan = 40;
  const r = applyAction(s, { type: 'pakai_dompet', tujuan: 'buzzer_redam' });
  assert.notEqual(r.state.politik.kecurigaan, 40);
  assert.equal(r.state.politik.dompet, 85_000_000);
  assert.throws(() => applyAction(r.state, { type: 'pakai_dompet', tujuan: 'buzzer_redam' }), GameError);
});

test('kontraktor: kursi proyek naik per level dan bertambah lewat rekanan', async () => {
  const { maksProyek } = await import('../src/index.ts');
  let s = createVillage({ seed: 'rekanan', namaDesa: 'A', namaKades: 'B' });
  s.kas = 2_000_000_000;
  assert.equal(maksProyek(s), 2);
  s.level = 4;
  assert.equal(maksProyek(s), 3);
  s = applyAction(s, { type: 'kontrak_rekanan', id: 'cv_lokal' }).state;
  assert.equal(maksProyek(s), 4);
  assert.throws(() => applyAction(s, { type: 'kontrak_rekanan', id: 'cv_lokal' }), GameError);
  assert.throws(() => applyAction(s, { type: 'kontrak_rekanan', id: 'pt_besar' }), GameError);
  const gosip = s.politik.kecurigaan;
  s = applyAction(s, { type: 'kontrak_rekanan', id: 'cv_kerabat' }).state;
  assert.ok(s.politik.kecurigaan > gosip);
  assert.equal(maksProyek(s), 5);
  s = advance(s, 200).state;
  if (s.status === 'menjabat') assert.ok(maksProyek(s) <= kursiPlus(s.level) + 1);
});
function kursiPlus(level: number) {
  return level >= 7 ? 4 : level >= 4 ? 3 : 2;
}

test('sidang audit: bisa ngeles, makin sering diaudit makin sulit', async () => {
  const { SOAL_AUDIT, aturanSidang } = await import('../src/sidang.ts');
  assert.ok(aturanSidang(1).jumlahSoal < aturanSidang(5).jumlahSoal);
  assert.ok(aturanSidang(1).salahMaks > aturanSidang(5).salahMaks);
  assert.ok(aturanSidang(1).kekuatanMin < aturanSidang(5).kekuatanMin);
  const terkuat = (id: string) => SOAL_AUDIT.find((x) => x.id === id)!.jawaban.reduce((a, b) => (b.kekuatan > a.kekuatan ? b : a)).id;
  // audit pertama: jawab yang paling meyakinkan, lolos
  let s = createVillage({ seed: 'sidang', namaDesa: 'A', namaKades: 'B' });
  s.politik.kasus = { mulai: 0, batas: 30, nilai: 20_000_000 };
  s.politik.pernahKasus = 1;
  s = applyAction(s, { type: 'hadapi_audit', pilihan: 'ngeles' }).state;
  while (s.politik.kasus?.sidang) {
    const sd = s.politik.kasus.sidang;
    s = applyAction(s, { type: 'jawab_auditor', jawaban: terkuat(sd.soal[sd.ke]) }).state;
  }
  assert.equal(s.politik.kasus, null);
  assert.equal(s.status, 'menjabat');
  // audit kelima: alasan lama sudah basi, jawaban lemah langsung gagal
  s.politik.kasus = { mulai: s.hari, batas: s.hari + 30, nilai: 20_000_000 };
  s.politik.pernahKasus = 5;
  s = applyAction(s, { type: 'hadapi_audit', pilihan: 'ngeles' }).state;
  const sd = s.politik.kasus!.sidang!;
  const lemah = SOAL_AUDIT.find((x) => x.id === sd.soal[0])!.jawaban.find((j) => j.kekuatan === 1)!.id;
  s = applyAction(s, { type: 'jawab_auditor', jawaban: lemah }).state;
  assert.equal(s.politik.kasus!.ngelesGagal, true);
  assert.equal(s.politik.kasus!.nilai, 30_000_000);
  assert.throws(() => applyAction(s, { type: 'hadapi_audit', pilihan: 'ngeles' }), GameError);
});

test('ekspansi dusun: berurutan, menambah warga, membuka bangunan, serobot memicu sengketa', async () => {
  const { totalPenduduk } = await import('../src/penduduk.ts');
  let s = createVillage({ seed: 'dusun', namaDesa: 'A', namaKades: 'B' });
  s.kas = 5_000_000_000;
  assert.throws(() => applyAction(s, { type: 'buka_dusun', id: 'dusun_mekar', cara: 'beli' }), GameError); // level kurang
  s.level = 10;
  assert.throws(() => applyAction(s, { type: 'buka_dusun', id: 'dusun_harapan', cara: 'beli' }), GameError); // harus berurutan
  assert.throws(() => applyAction(s, { type: 'mulai_proyek', proyekId: 'pasar_dusun', kontraktor: 'bagus' }), GameError);
  const warga = totalPenduduk(s);
  s = applyAction(s, { type: 'buka_dusun', id: 'dusun_mekar', cara: 'beli' }).state;
  assert.ok(totalPenduduk(s) > warga);
  s = applyAction(s, { type: 'mulai_proyek', proyekId: 'pasar_dusun', kontraktor: 'bagus' }).state;
  const gosip = s.politik.kecurigaan;
  s = applyAction(s, { type: 'buka_dusun', id: 'dusun_harapan', cara: 'serobot' }).state;
  assert.ok(s.politik.kecurigaan > gosip);
  assert.ok((s.antreanKartu ?? []).some((k) => k.cardId === 'sengketa_lahan'));
  assert.deepEqual(s.dusun, ['dusun_mekar', 'dusun_harapan']);
});

test('keluarga: pasangan berlawanan gender dengan kades, desa lama dimigrasi', async () => {
  const { migrasiKeluarga } = await import('../src/politik.ts');
  const pak = createVillage({ seed: 'g1', namaDesa: 'A', namaKades: 'Budi', gender: 'l' });
  const bu = createVillage({ seed: 'g1', namaDesa: 'A', namaKades: 'Siti', gender: 'p' });
  assert.equal(pak.politik.keluarga.find((k) => k.peran === 'pasangan')!.gender, 'p');
  assert.equal(bu.politik.keluarga.find((k) => k.peran === 'pasangan')!.gender, 'l');
  // desa lama: kades Budi dengan pasangan bernama Bayu (laki-laki) jadi istri
  const lama = createVillage({ seed: 'g2', namaDesa: 'A', namaKades: 'Budi' });
  delete lama.genderKades;
  const ps = lama.politik.keluarga.find((k) => k.peran === 'pasangan')!;
  ps.nama = 'Bayu';
  delete ps.gender;
  migrasiKeluarga(lama);
  assert.equal(lama.genderKades, 'l');
  assert.equal(ps.gender, 'p');
  assert.notEqual(ps.nama, 'Bayu');
});

test('proyek besar: bayar bertahap, mangkrak kalau kas kurang, efek permanen saat selesai', async () => {
  const { MEGA } = await import('../src/index.ts');
  const def = MEGA.find((m) => m.id === 'jalan_tembus')!;
  let s = createVillage({ seed: 'mega', namaDesa: 'A', namaKades: 'B' });
  s.level = 9;
  s.kas = 400_000_000;
  s = applyAction(s, { type: 'mulai_megaproyek', id: 'jalan_tembus' }).state;
  assert.ok(s.mega);
  assert.throws(() => applyAction(s, { type: 'mulai_megaproyek', id: 'pasar_modern' }), GameError);
  // kas dikuras: tahap kedua tidak terbayar, proyek mangkrak
  s.kas = 0;
  // jatuh tempo lewat, kontraktor memberi tenggang 7 hari, baru setelah itu proyek mangkrak
  s = advance(s, 25 + 8).state;
  assert.equal(s.mega?.mangkrak, true);
  const selesaiMundur = s.mega!.selesaiHari;
  // kas diisi lagi: lanjut dan akhirnya diresmikan
  s.kas = 5_000_000_000;
  const pedagangSebelum = s.kepuasan.pedagang;
  s = advance(s, def.durasi + 40).state;
  assert.equal(s.mega, null);
  assert.ok(s.megaSelesai?.includes('jalan_tembus'));
  assert.ok(selesaiMundur > def.durasi);
  assert.ok(s.pemasukanTambahanBulanan >= def.pemasukanBulanan);
  assert.ok(s.kepuasan.pedagang > 0 && pedagangSebelum > 0);
});

test('program wajib: dana ditahan, dibangun paksa dengan utang, dana tertahan cair setelah berdiri', () => {
  let s = createVillage({ seed: 'wajib', namaDesa: 'A', namaKades: 'B' });
  s.kas = 50_000_000; // tidak cukup untuk Dapur MBG + Kopdes
  const utangAwal = s.pinjaman.length;
  s = advance(s, 95).state; // lewat tenggat awal bulan ke-4
  const dikerjakan = s.proyekBerjalan.map((p) => p.proyekId);
  const sudah = s.proyekSelesai.map((p) => p.proyekId);
  assert.ok(['dapur_mbg', 'kopdes'].every((id) => dikerjakan.includes(id) || sudah.includes(id)));
  assert.ok(s.pinjaman.length > utangAwal, 'kas kurang harus ditutup utang');
  // termin bulan 5: kalau masih ada yang belum selesai, ditahan; lalu cair setelah keduanya berdiri
  s = advance(s, 60).state;
  assert.ok(['dapur_mbg', 'kopdes'].every((id) => s.proyekSelesai.some((p) => p.proyekId === id)));
  assert.equal(s.danaTertahan ?? 0, 0);
});

test('jabatan keluarga: pilih posisi, gantikan pemegang lama, termasuk pegawai kantor', () => {
  let s = createVillage({ seed: 'jabatan', namaDesa: 'A', namaKades: 'Budi', gender: 'l' });
  const anak = s.politik.keluarga.find((k) => k.peran === 'anak')!;
  const istri = s.politik.keluarga.find((k) => k.peran === 'pasangan')!;
  const integ = s.integritas;
  s = applyAction(s, { type: 'angkat_keluarga', id: anak.id, jabatan: 'ketua_bumdes' }).state;
  assert.equal(s.jabatanDesa?.ketua_bumdes, `kel:${anak.id}`);
  assert.ok(s.integritas < integ);
  // istri memimpin PKK: lazim, tanpa penalti integritas
  const integ2 = s.integritas;
  s = applyAction(s, { type: 'angkat_keluarga', id: istri.id, jabatan: 'ketua_pkk' }).state;
  assert.equal(s.integritas, integ2);
  // posisi yang sudah dipegang keluarga tidak bisa diambil anggota lain
  assert.throws(() => applyAction(s, { type: 'angkat_keluarga', id: istri.id, jabatan: 'ketua_bumdes' }), GameError);
  // gantikan pegawai kantor
  s.kas = 1_000_000_000;
  const k = Object.values(s.kandidat).flat()[0];
  s = applyAction(s, { type: 'rekrut_pegawai', id: k.id }).state;
  const staf = s.staf[0];
  s = applyAction(s, { type: 'angkat_keluarga', id: anak.id, jabatan: `staf:${staf.id}` }).state;
  assert.ok(!s.staf.some((x) => x.id === staf.id));
  assert.ok(s.staf.some((x) => x.keluargaId === anak.id && x.sifat.includes('kerabat')));
  assert.notEqual(s.jabatanDesa?.ketua_bumdes, `kel:${anak.id}`, 'jabatan lama dilepas saat pindah');
});

test('investasi kas: cadangan tidak dihitung SiLPA, modal BUMDes tidak bisa ditarik', async () => {
  const { batasSilpa } = await import('../src/investasi.ts');
  let s = createVillage({ seed: 'invest', namaDesa: 'A', namaKades: 'B' });
  s.kas = 2_000_000_000;
  assert.ok(batasSilpa(s) >= 550_000_000);
  s = applyAction(s, { type: 'investasi', jenis: 'cadangan', arah: 'simpan', jumlah: 300_000_000 }).state;
  assert.equal(s.kas, 1_700_000_000);
  assert.throws(() => applyAction(s, { type: 'investasi', jenis: 'cadangan', arah: 'simpan', jumlah: 100_000_000 }), GameError); // lewat batas 330 jt
  s = applyAction(s, { type: 'investasi', jenis: 'modal_bumdes', arah: 'simpan', jumlah: 100_000_000 }).state;
  assert.throws(() => applyAction(s, { type: 'investasi', jenis: 'modal_bumdes', arah: 'tarik', jumlah: 10_000_000 }), GameError);
  const gosip = s.politik.kecurigaan;
  s = applyAction(s, { type: 'investasi', jenis: 'kripto', arah: 'simpan', jumlah: 50_000_000 }).state;
  assert.ok(s.politik.kecurigaan > gosip);
  s = advance(s, 31).state;
  assert.ok(s.investasi!.cadangan > 300_000_000, 'cadangan berbunga');
});

test('pertumbuhan tanpa batas: proyek besar bisa dikembangkan bertahap, skor Pembangunan terus naik', async () => {
  const { MEGA, raporWarisan } = await import('../src/index.ts');
  const def = MEGA.find((m) => m.id === 'jalan_tembus')!;
  let s = createVillage({ seed: 'tumbuh', namaDesa: 'A', namaKades: 'B' });
  s.level = 9;
  s.kas = 50_000_000_000;
  const skor0 = raporWarisan(s).pembangunan;
  s = applyAction(s, { type: 'mulai_megaproyek', id: 'jalan_tembus' }).state;
  s = advance(s, def.durasi + 5).state;
  const skor1 = raporWarisan(s).pembangunan;
  assert.ok(skor1 > skor0);
  // tahap kedua: lebih mahal, tetap bisa dimulai
  s = applyAction(s, { type: 'mulai_megaproyek', id: 'jalan_tembus' }).state;
  assert.ok((s.mega?.biaya ?? 0) > def.biaya);
  s = advance(s, def.durasi + 5).state;
  assert.equal(s.megaSelesai?.filter((x) => x === 'jalan_tembus').length, 2);
  // tahap pengembangan memberi separuh pemasukan proyek awal
  assert.ok(s.pemasukanTambahanBulanan >= def.pemasukanBulanan * 1.5);
  assert.ok(raporWarisan(s).pembangunan > skor1);
});

test('rembug kartu: musyawarah melunakkan dampak, tokoh membuka risiko, nego mengubah nilai tawaran', () => {
  let s = baru('rembug');
  s.kotakMasuk = [{ instanceId: 'r1', cardId: 'acak_tawaran_0_0', hariMasuk: s.hari }];
  const kas = s.kas;
  s = applyAction(s, { type: 'rembug_kartu', instanceId: 'r1', cara: 'musyawarah' }).state;
  assert.equal(s.kas, kas - 2_000_000);
  assert.ok(s.kotakMasuk[0].musyawarah);
  assert.throws(() => applyAction(s, { type: 'rembug_kartu', instanceId: 'r1', cara: 'musyawarah' }), GameError);
  s = applyAction(s, { type: 'rembug_kartu', instanceId: 'r1', cara: 'tokoh' }).state;
  assert.ok(s.kotakMasuk[0].catatan!.some((c) => c.startsWith('Saran tokoh')));
  s = applyAction(s, { type: 'rembug_kartu', instanceId: 'r1', cara: 'nego' }).state;
  const k = s.kotakMasuk.find((x) => x.instanceId === 'r1');
  assert.ok(!k || k.nego === 1.3 || k.nego === 0.85);
});

test('aksi gelap baru: beking narkoba memberi uang besar dan menaikkan kecurigaan', () => {
  let s = baru('gelap');
  const dompet = s.politik.dompet;
  const curiga = s.politik.kecurigaan;
  s = applyAction(s, { type: 'aksi_gelap', jenis: 'beking_narkoba' }).state;
  assert.equal(s.politik.dompet, dompet + 50_000_000);
  assert.ok(s.politik.kecurigaan >= curiga + 18);
  assert.throws(() => applyAction(s, { type: 'aksi_gelap', jenis: 'beking_narkoba' }), GameError);
});

test('ganti kades: utang proyek besar mangkrak tidak diwariskan, manfaat proporsional', async () => {
  const { lanjutkanDesa } = await import('../src/index.ts');
  let s = createVillage({ seed: 'mega2', namaDesa: 'A', namaKades: 'B' });
  s.level = 9;
  s.kas = 400_000_000;
  s = applyAction(s, { type: 'mulai_megaproyek', id: 'jalan_tembus' }).state;
  s.kas = 0;
  s = advance(s, 25 + 8).state;
  assert.equal(s.mega?.mangkrak, true);
  s.kas = 10_000_000;
  s.status = 'pensiun' as typeof s.status;
  const n = lanjutkanDesa(s, 'Sulastri');
  assert.equal(n.mega?.mangkrak, false);
  assert.equal(n.mega!.dibayar, n.mega!.biaya, 'tidak ada sisa tagihan');
  assert.ok((n.mega!.porsi ?? 1) < 1);
  assert.ok(n.jurnal.some((l) => /dirampingkan/.test(l.teks)));
  const kas = n.kas;
  const akhir = advance(n, 120).state;
  assert.equal(akhir.mega, null, 'proyek tetap selesai');
  assert.ok(akhir.megaSelesai?.includes('jalan_tembus'));
  assert.ok(kas > 0);
});

test('kartu bupati percepat: lembur memajukan selesai, ganti kades membawa SiLPA terbatas', async () => {
  const { lanjutkanDesa } = await import('../src/index.ts');
  let s = createVillage({ seed: 'mega3', namaDesa: 'A', namaKades: 'B' });
  s.level = 9;
  s.kas = 2_000_000_000;
  s = applyAction(s, { type: 'mulai_megaproyek', id: 'jalan_tembus' }).state;
  const target = s.mega!.selesaiHari;
  s.flags = [...s.flags, 'mega_lembur'];
  s = advance(s, 1).state;
  assert.equal(s.mega!.selesaiHari, target - 15);
  assert.ok(!s.flags.includes('mega_lembur'));
  s.mega = null;
  s.kas = 900_000_000;
  s.status = 'pensiun' as typeof s.status;
  const n = lanjutkanDesa(s, 'Sulastri');
  assert.equal(n.kas, 60_000_000 + 150_000_000);
  assert.ok(n.jurnal.some((l) => /SiLPA dari kades lama/.test(l.teks)));
});

test('ganti kades: titipan pajak disetor dari kas lama, kekurangannya tetap jadi tunggakan', async () => {
  const { lanjutkanDesa } = await import('../src/index.ts');
  let s = createVillage({ seed: 'pajak-ganti', namaDesa: 'A', namaKades: 'B' });
  s = applyAction(s, { type: 'pajak', aksi: 'otomatis_mati' }).state;
  s.pajak!.titipan = 50_000_000;
  s.kas = 30_000_000;
  s.status = 'pensiun' as typeof s.status;
  const n = lanjutkanDesa(s, 'Sulastri');
  assert.equal(n.pajak!.titipan, 20_000_000);
  assert.ok(n.jurnal.some((l) => /tunggakan titipan pajak/.test(l.teks)));
  s.kas = 300_000_000;
  const m = lanjutkanDesa(s, 'Sulastri');
  assert.equal(m.pajak!.titipan, 0);
  assert.equal(m.kas, 60_000_000 + 150_000_000);
});

test('ekonomi akhir: biaya proyek besar ikut kemampuan desa, BUMDes jenuh tapi naik level selalu menambah', async () => {
  const { MEGA } = await import('../src/index.ts');
  const { biayaMega } = await import('../src/mega.ts');
  const { kejenuhanBumdes } = await import('../src/fitur.ts');
  const def = MEGA[0];
  const s = createVillage({ seed: 'eko', namaDesa: 'A', namaKades: 'B' });
  assert.equal(biayaMega(def, 0, s), def.biaya, 'desa biasa: harga dasar');
  s.laporan = [1, 2, 3].map((b) => ({ bulan: b, pemasukan: 700_000_000 }) as (typeof s.laporan)[number]);
  assert.equal(biayaMega(def, 0, s), def.biaya * 2);
  s.bumdes = { warung_desa: 1 };
  assert.equal(kejenuhanBumdes(s), 1, 'satu usaha belum jenuh');
  // naik level selalu menambah pendapatan total, walau makin pelan
  const { BUMDES } = await import('../src/content/fitur.ts');
  const { totalPendapatanBumdes } = await import('../src/fitur.ts');
  s.bumdes = {};
  let sebelum = 0;
  for (let putaran = 0; putaran < 8; putaran++) {
    for (const d of BUMDES) {
      if ((s.bumdes[d.id] ?? 0) >= d.maksLevel) continue;
      s.bumdes = { ...s.bumdes, [d.id]: (s.bumdes[d.id] ?? 0) + 1 };
      const kini = totalPendapatanBumdes(s);
      assert.ok(kini > sebelum, `naik ${d.id} ke ${s.bumdes[d.id]}: ${kini} <= ${sebelum}`);
      sebelum = kini;
    }
  }
});
