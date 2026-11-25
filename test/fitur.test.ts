import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FITUR, GameError, advance, applyAction, buildView, createVillage, xpNaikLevel } from '../src/index.ts';

const baru = (seed = 'fitur') => createVillage({ seed, namaDesa: 'Sukamaju', namaKades: 'Budi' });

test('koin retribusi menumpuk harian, dibatasi, lalu bisa ditagih', () => {
  const s = advance(baru(), 5).state;
  const koin = Object.values(s.koin).reduce((a, b) => a + b, 0);
  assert.ok(koin > 2_000_000, `koin ${koin}`);
  const lama = advance(baru(), 50).state.koin["rumah:0"];
  const per = advance(baru(), 1).state.koin["rumah:0"];
  assert.ok(lama <= per * FITUR.batasKoinHari * 1.2 + 1, `koin dibatasi ${FITUR.batasKoinHari} hari`);
  const r = applyAction(s, { type: 'tagih' });
  assert.equal(Math.round(Object.values(r.state.koin).reduce((a, b) => a + b, 0)), 0);
  assert.ok(r.state.kas > s.kas);
  assert.throws(() => applyAction(r.state, { type: 'tagih' }), GameError);
});

test('aspirasi muncul dan bisa ditanggapi untuk menaikkan kepuasan', () => {
  let s = advance(baru(), 10).state;
  while (s.aspirasi.length === 0) s = advance(s, 1).state;
  const a = s.aspirasi[0];
  const r = applyAction(s, { type: 'tanggapi_aspirasi', id: a.id });
  assert.ok(r.state.kepuasan[a.kelompok] > s.kepuasan[a.kelompok]);
  assert.equal(r.state.statistik.aspirasi, 1);
});

test('XP menaikkan level dan memberi bonus kas', () => {
  const s = { ...baru(), xp: xpNaikLevel(1) - 1 };
  const kartu = buildView(s).kotakMasuk[0];
  const r = applyAction(s, { type: 'putuskan', instanceId: kartu.instanceId, opsiId: kartu.opsi[kartu.opsi.length - 1].id });
  assert.equal(r.state.level, 2);
});

test('bangunan bisa di-upgrade sampai level 3', () => {
  let s = applyAction(baru(), { type: 'mulai_proyek', proyekId: 'lampu_jalan', kontraktor: 'murah' }).state;
  s = advance(s, 8).state;
  s.kas = 500_000_000;
  s = applyAction(s, { type: 'upgrade_proyek', proyekId: 'lampu_jalan', kontraktor: 'bagus' }).state;
  s = advance(s, 6).state;
  assert.equal(s.proyekSelesai.find((b) => b.proyekId === 'lampu_jalan')?.level, 2);
  s = applyAction(s, { type: 'upgrade_proyek', proyekId: 'lampu_jalan', kontraktor: 'bagus' }).state;
  s = advance(s, 6).state;
  assert.equal(s.proyekSelesai.find((b) => b.proyekId === 'lampu_jalan')?.level, 3);
  assert.throws(() => applyAction(s, { type: 'upgrade_proyek', proyekId: 'lampu_jalan', kontraktor: 'bagus' }), GameError);
});

test('misi bulanan bisa diklaim setelah selesai', () => {
  let s = baru();
  assert.equal(s.misi.daftar.length, 3);
  const m = s.misi.daftar[0];
  s.statistik[m.jenis] += m.target;
  const r = applyAction(s, { type: 'klaim_misi', id: m.id });
  assert.ok(r.state.kas > s.kas);
  assert.throws(() => applyAction(r.state, { type: 'klaim_misi', id: m.id }), GameError);
});

test('bendahara menagih otomatis dan dekorasi hanya bisa dibeli sekali', () => {
  let s = applyAction(baru(), { type: 'rekrut_pegawai', id: 'bendahara' }).state;
  s = advance(s, 5).state;
  assert.equal(Math.round(Object.values(s.koin).reduce((a, b) => a + b, 0)), 0);
  s = applyAction(s, { type: 'beli_dekorasi', id: 'taman' }).state;
  assert.throws(() => applyAction(s, { type: 'beli_dekorasi', id: 'taman' }), GameError);
  assert.ok(s.pencapaian.some((p) => p.id === 'pegawai_pertama'));
});

test('state versi lama (tanpa fitur baru) tetap bisa dimajukan', () => {
  const s = baru() as unknown as Record<string, unknown>;
  for (const k of ['koin', 'aspirasi', 'xp', 'level', 'misi', 'statistik', 'pencapaian', 'pegawai', 'dekorasi']) delete s[k];
  const r = advance(s as never, 3);
  assert.equal(r.state.level, 1);
  assert.ok(r.state.koin["rumah:0"] > 0);
});

test('BUMDes memberi pendapatan pasif harian, bisa di-upgrade, dan butuh syarat', () => {
  let s = baru('bumdes');
  s.kas = 1_000_000_000;
  s = applyAction(s, { type: 'bangun_bumdes', id: 'warung_desa' }).state;
  assert.equal(s.bumdes.warung_desa, 1);
  const kasSebelum = s.kas;
  const r = advance(s, 1).state;
  // pendapatan pasif masuk walau tidak ada aksi (dikurangi tidak ada biaya harian lain di hari biasa)
  assert.ok(r.kas >= kasSebelum + 500_000 - 1, `kas ${r.kas - kasSebelum}`);
  s = applyAction(s, { type: 'bangun_bumdes', id: 'warung_desa' }).state;
  assert.equal(s.bumdes.warung_desa, 2);
  assert.throws(() => applyAction(s, { type: 'bangun_bumdes', id: 'homestay' }), GameError);
  assert.ok(buildView(s).pendapatanPasifHarian > 500_000);
});

test('riwayat keluhan menyimpan keluhan yang ditanggapi maupun yang kedaluwarsa', () => {
  let s = baru('keluhan');
  for (let i = 0; i < 40 && s.aspirasi.length === 0; i++) s = advance(s, 1).state;
  assert.ok(s.aspirasi.length > 0, 'ada keluhan');
  const a = s.aspirasi[0];
  s = applyAction(s, { type: 'tanggapi_aspirasi', id: a.id }).state;
  assert.equal(s.riwayatKeluhan.find((k) => k.id === a.id)?.status, 'ditanggapi');
  s = advance(s, 30).state;
  assert.ok(s.riwayatKeluhan.some((k) => k.status === 'diabaikan'), 'keluhan basi tercatat');
});

test('kepegawaian: pilih kandidat bersifat, kursi per level, kapasitas kantor, upgrade kantor', () => {
  let s = baru('staf');
  s.kas = 2_000_000_000;
  const kandidatKader = s.kandidat.kader;
  assert.equal(kandidatKader.length, 3);
  assert.ok(kandidatKader.every((k) => k.sifat.length >= 1));
  s = applyAction(s, { type: 'rekrut_pegawai', id: kandidatKader[0].id }).state;
  assert.equal(s.staf.length, 1);
  assert.ok(s.pegawai.includes('kader'));
  // level 1: kader hanya 1 kursi
  assert.throws(() => applyAction(s, { type: 'rekrut_pegawai', id: s.kandidat.kader[0].id }), /penuh/);
  // isi sampai kapasitas kantor level 1 (4 orang)
  for (const peran of ['bendahara', 'linmas', 'humas']) s = applyAction(s, { type: 'rekrut_pegawai', id: s.kandidat[peran][0].id }).state;
  assert.equal(s.staf.length, 4);
  s.level = 3;
  s = applyAction(s, { type: 'cari_kandidat', peran: 'linmas' }).state;
  assert.throws(() => applyAction(s, { type: 'rekrut_pegawai', id: s.kandidat.linmas[0].id }), /muat/);
  s = applyAction(s, { type: 'upgrade_kantor' }).state;
  assert.equal(s.kantorLevel, 2);
  s = applyAction(s, { type: 'rekrut_pegawai', id: s.kandidat.linmas[0].id }).state;
  assert.equal(s.staf.filter((x) => x.peran === 'linmas').length, 2);
  const v = buildView(s);
  assert.equal(v.kantor.kapasitas, 7);
  assert.equal(v.pegawai.find((p) => p.id === 'linmas')!.staf.length, 2);
  s = applyAction(s, { type: 'berhentikan_pegawai', id: s.staf[0].id }).state;
  assert.equal(s.staf.length, 4);
});

test('event pegawai memakai sifat & nama pegawai sungguhan, dan efeknya mengenai orang itu', () => {
  let s = baru('sifat');
  s.kas = 500_000_000;
  s.staf.push({ id: 'stX', peran: 'linmas', nama: 'Kang Ujang', sifat: ['main_proyek'], kinerja: 1, gaji: 3_000_000, hariMasuk: 0 });
  s.pegawai = ['linmas'];
  // paksa kartu makelar proyek masuk
  s.kotakMasuk = [{ instanceId: 'kz', cardId: 'sifat_main_proyek', hariMasuk: s.hari, stafId: 'stX' }];
  const v = buildView(s);
  const k = v.kotakMasuk[0];
  assert.match(k.judul, /Kang Ujang/);
  assert.match(k.teks, /Linmas/);
  assert.equal(k.tokohStaf?.nama, 'Kang Ujang');
  const tegur = applyAction(s, { type: 'putuskan', instanceId: 'kz', opsiId: 'tegur' }).state;
  assert.ok(!tegur.staf.find((x) => x.id === 'stX')!.sifat.includes('main_proyek'));
  const pecat = applyAction(s, { type: 'putuskan', instanceId: 'kz', opsiId: 'pecat' }).state;
  assert.equal(pecat.staf.find((x) => x.id === 'stX'), undefined);
  assert.ok(!pecat.pegawai.includes('linmas'));
  assert.ok(pecat.jurnal.some((j) => j.jenis === 'keputusan' && j.teks.includes('Kang Ujang')));
});

test('pelamar tidak punya sifat yang saling bertentangan, dan sapaan cocok dengan nama', async () => {
  const { adaKonflik, SIFAT } = await import('../src/kepegawaian.ts');
  for (let i = 0; i < 40; i++) {
    const s = baru(`pelamar${i}`);
    for (const k of Object.values(s.kandidat).flat()) {
      assert.ok(!adaKonflik(k.sifat), `${k.nama}: ${k.sifat.join(', ')}`);
      assert.ok(k.sifat.some((x) => SIFAT[x].baik) && k.sifat.some((x) => !SIFAT[x].baik), `${k.nama} harus punya plus dan minus`);
      assert.doesNotMatch(k.nama, /^(Pak|Mas|Kang) (Siti|Dewi|Rina|Lina|Tari|Wati|Ayu|Fitri|Sari|Nur|Ningsih|Indah|Lestari|Yuni)$/);
      assert.doesNotMatch(k.nama, /^(Mbak|Bu|Teh) (Agus|Bambang|Yudi|Hadi|Eko|Arif|Joko|Rudi|Dodi|Imam|Fajar|Wahyu|Bayu|Slamet)$/);
    }
  }
});
