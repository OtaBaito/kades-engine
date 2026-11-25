import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CARDS,
  GameError,
  PROJECTS,
  advance,
  applyAction,
  buildView,
  createVillage,
  skorDesa,
  PAJAK,
  kasBersih,
} from '../src/index.ts';

const baru = (seed = 'uji') => createVillage({ seed, namaDesa: 'Sukamaju', namaKades: 'Budi' });

test('seed yang sama menghasilkan desa yang identik (determinis)', () => {
  const a = advance(baru('x'), 200).state;
  const b = advance(baru('x'), 200).state;
  assert.deepEqual(a, b);
});

test('advance tidak mengubah state masukan (fungsi murni)', () => {
  const s = baru();
  const salinan = structuredClone(s);
  advance(s, 50);
  assert.deepEqual(s, salinan);
});

test('termin pertama dana desa cair saat dilantik', () => {
  const s = baru();
  assert.ok(s.kas > 400_000_000);
});

test('pilkades terjadi di hari ke-360 dan desa tanpa kerja kalah', () => {
  const s = advance(baru(), 400).state;
  assert.equal(s.pilkades.length, 1);
  assert.equal(s.status, 'kalah');
  assert.equal(s.hari, 360);
});

test('mulai proyek memotong kas dan selesai sesuai durasi', () => {
  const s = baru();
  const p = PROJECTS.find((x) => x.id === 'lampu_jalan')!;
  const r = applyAction(s, { type: 'mulai_proyek', proyekId: p.id, kontraktor: 'bagus' });
  const biaya = Math.round(p.biaya * 1.15);
  // 11,5% dipotong dari pembayaran rekanan sebagai titipan pajak: kas bersih tetap berkurang sebesar biaya penuh
  assert.equal(kasBersih(r.state), s.kas - biaya);
  assert.equal(r.state.pajak?.titipan, Math.round(biaya * PAJAK.tarifBelanja));
  const sebelum = skorDesa(r.state);
  const jadi = advance(r.state, p.durasiHari + 1).state;
  assert.ok(jadi.proyekSelesai.some((b) => b.proyekId === p.id));
  assert.ok(skorDesa(jadi) > sebelum);
});

test('proyek yang sama tidak bisa dibangun dua kali', () => {
  const s = applyAction(baru(), { type: 'mulai_proyek', proyekId: 'lampu_jalan', kontraktor: 'murah' }).state;
  assert.throws(
    () => applyAction(s, { type: 'mulai_proyek', proyekId: 'lampu_jalan', kontraktor: 'murah' }),
    GameError,
  );
});

test('kas tidak cukup menolak proyek', () => {
  const s = { ...baru(), kas: 10_000_000 };
  assert.throws(() => applyAction(s, { type: 'mulai_proyek', proyekId: 'pasar_desa', kontraktor: 'bagus' }), GameError);
});

test('memutuskan kartu menghapusnya dari kotak masuk dan mencatat alasan', () => {
  const s = baru();
  const kartu = buildView(s).kotakMasuk[0];
  assert.ok(kartu, 'desa baru harus punya kartu');
  const r = applyAction(s, { type: 'putuskan', instanceId: kartu.instanceId, opsiId: kartu.opsi[0].id, alasan: 'uji' });
  assert.ok(!r.state.kotakMasuk.some((k) => k.instanceId === kartu.instanceId));
  assert.match(r.events[0].teks, /Alasan: "uji"/);
});

test('tampilan tidak membocorkan risiko tersembunyi', () => {
  const s = advance(baru(), 300).state;
  const json = JSON.stringify(buildView(s));
  assert.ok(!json.includes('"risiko"'));
  assert.ok(!json.includes('"setelahHari"'));
  assert.ok(!json.includes('"terjadwal"'));
});

test('konten valid: id unik dan setiap kartu punya minimal 2 opsi', () => {
  const ids = new Set(CARDS.map((c) => c.id));
  assert.equal(ids.size, CARDS.length);
  for (const c of CARDS) assert.ok(c.opsi.length >= 2, c.id);
  assert.equal(new Set(PROJECTS.map((p) => p.id)).size, PROJECTS.length);
});

test('event besar tidak selalu muncul di hari yang sama untuk desa berbeda', () => {
  const geser = ['a', 'b', 'c', 'd', 'e'].map((seed) => createVillage({ seed, namaDesa: 'X', namaKades: 'Y' }).geserHari.koperasi_wajib);
  assert.ok(new Set(geser).size > 1, `geser hari sama semua: ${geser.join(',')}`);
});

test('pajak: titipan disetor otomatis saat tutup buku; kalau kas habis menunggak, didenda, dan kecurigaan naik', () => {
  let s = baru();
  s = applyAction(s, { type: 'mulai_proyek', proyekId: 'lampu_jalan', kontraktor: 'bagus' }).state;
  const titipan = s.pajak!.titipan;
  assert.ok(titipan > 0);
  // setor otomatis menyelesaikan titipan di tutup buku
  const lanjut = advance(s, 31).state;
  assert.equal(lanjut.pajak!.titipan, 0);
  assert.ok(lanjut.pajak!.totalSetor >= titipan);
  // titipan terpakai habis untuk belanja: menunggak, denda 2%, kecurigaan naik
  let b = applyAction(baru(), { type: 'mulai_proyek', proyekId: 'lampu_jalan', kontraktor: 'bagus' }).state;
  b = applyAction(b, { type: 'pajak', aksi: 'otomatis_mati' }).state;
  b.kas = 0;
  const curiga = b.politik.kecurigaan;
  const t0 = b.pajak!.titipan;
  b = advance(b, 31).state;
  assert.equal(b.pajak!.tunggakanBulan, 1);
  assert.ok(b.pajak!.titipan > t0, 'ada denda');
  assert.ok(b.politik.kecurigaan > curiga);
  // setor manual melunasi
  b.kas = 1_000_000_000;
  b = applyAction(b, { type: 'pajak', aksi: 'setor' }).state;
  assert.equal(b.pajak!.titipan, 0);
  assert.equal(b.pajak!.tunggakanBulan, 0);
});

test('pajak: PBB ditagih bulan 2-9, realisasi penuh dapat insentif akhir tahun', () => {
  let s = baru();
  s = advance(s, 361).state;
  const log = s.jurnal.map((j) => j.teks).join(' ');
  assert.match(log, /Realisasi PBB/);
  assert.ok((s.pajak?.totalSetor ?? 0) > 0);
});

test('aksi massa: warga yang sangat kecewa berdemo, makin panas kalau dibiarkan, dan bisa ditangani', () => {
  // kelompok petani sangat kecewa: demo pasti muncul dalam beberapa bulan
  let s = baru('demo');
  let ketemu = false;
  for (let i = 0; i < 240 && !ketemu; i++) {
    s.kepuasan.petani = 5;
    s = advance(s, 1).state;
    ketemu = Boolean(s.unjuk);
  }
  assert.ok(ketemu, 'demo muncul');
  const awal = s.unjuk!.intensitas;
  s = advance(s, 2).state;
  if (s.unjuk) assert.ok(s.unjuk.intensitas > awal, 'makin panas');
  // bubarkan dengan polisi: aksi selesai setelah aparat berjaga
  if (s.unjuk) {
    s = applyAction(s, { type: 'tangani_unjuk', cara: 'polisi' }).state;
    assert.equal(s.unjuk?.penanganan?.cara, 'polisi');
    s = advance(s, 3).state;
    assert.equal(s.unjuk ?? null, null);
  }
});

test('aksi massa: mogok buruh memundurkan pembangunan, penuhi tuntutan membubarkan', () => {
  let s = applyAction(baru('mogok'), { type: 'mulai_proyek', proyekId: 'lampu_jalan', kontraktor: 'bagus' }).state;
  s.unjuk = { id: 'uji', jenis: 'mogok_buruh', kelompok: 'pemuda', tuntutan: 'upah', massa: 40, intensitas: 20, mulaiHari: s.hari, penanganan: null };
  s.unjukTerakhir = s.hari;
  const selesai = s.proyekBerjalan[0].selesaiHari;
  s = advance(s, 3).state;
  assert.ok(s.proyekBerjalan[0].selesaiHari >= selesai + 3, 'proyek mundur selama mogok');
  const kas = s.kas;
  s = applyAction(s, { type: 'tangani_unjuk', cara: 'penuhi' }).state;
  assert.ok(s.kas < kas);
  s = advance(s, 2).state;
  assert.equal(s.unjuk ?? null, null);
});

test('relasi: sowan menaikkan relasi, kritik menurunkan, dan bupati menentukan termin', () => {
  let s = baru('relasi');
  s.politik.dompet = 200_000_000;
  s = applyAction(s, { type: 'relasi', aksi: 'sowan', tokoh: 'bupati' }).state;
  assert.ok(s.relasi!.tokoh.bupati.relasi > 50);
  assert.throws(() => applyAction(s, { type: 'relasi', aksi: 'sowan', tokoh: 'bupati' }), GameError, 'jeda sowan');
  s = applyAction(s, { type: 'relasi', aksi: 'kritik', tokoh: 'camat' }).state;
  assert.ok(s.relasi!.tokoh.camat.relasi < 50);
  assert.throws(() => applyAction(s, { type: 'relasi', aksi: 'sowan', tokoh: 'presiden' }), GameError, 'presiden butuh popularitas');
});

test('relasi: pemilu atasan dimulai sesuai jadwal dan hasilnya memengaruhi relasi', () => {
  let s = baru('pilbup');
  s.politik.dompet = 500_000_000;
  let p = null;
  for (let i = 0; i < 200 && !p; i++) {
    s = advance(s, 1).state;
    p = s.relasi?.pemilihan ?? null;
  }
  assert.ok(p, 'pemilihan dimulai');
  const jenis = p.jenis;
  s = applyAction(s, { type: 'dukung_calon', calonId: p.calon[0].id, cara: 'kerahkan' }).state;
  assert.throws(() => applyAction(s, { type: 'dukung_calon', calonId: null, cara: 'netral' }), GameError);
  s = advance(s, 31).state;
  const rel = s.relasi!.tokoh[jenis].relasi;
  assert.ok(rel >= 80 || rel <= 15, `relasi ekstrem setelah kerahkan: ${rel}`);
});

test('relasi: perdes disahkan BPD dan berefek tiap bulan; wakil kades bisa dipilih', () => {
  let s = baru('perdes');
  s.relasi = undefined;
  s = applyAction(s, { type: 'bpd', aksi: 'rapat_terbuka' }).state;
  s.relasi!.bpd = 100;
  s = applyAction(s, { type: 'perdes', id: 'retribusi_pasar', aksi: 'usul' }).state;
  assert.ok(s.relasi!.perdes.includes('retribusi_pasar'));
  const kandidat = s.relasi!.kandidatWakil[0];
  s = applyAction(s, { type: 'wakil', aksi: 'pilih', id: kandidat.id }).state;
  assert.equal(s.relasi!.wakil?.nama, kandidat.nama);
  const v = buildView(s);
  assert.equal(v.relasi.wakil?.id, kandidat.id);
});

test('relasi: BPD yang muak memakzulkan kades kalau bupati tidak melindungi', () => {
  let s = advance(baru('makzul'), 100).state;
  s.relasi!.mosi = { mulaiHari: s.hari, batasHari: s.hari + 2, respon: [], dilindungi: false };
  s.relasi!.bpd = 0;
  s.relasi!.tokoh.bupati.relasi = 30;
  // tahan supaya BPD tidak pulih
  s.popularitas = 0;
  s = advance(s, 3).state;
  assert.equal(s.status, 'dimakzulkan');
  // dengan perlindungan bupati kades selamat
  let t = advance(baru('makzul2'), 100).state;
  t.relasi!.mosi = { mulaiHari: t.hari, batasHari: t.hari + 2, respon: [], dilindungi: false };
  t.relasi!.bpd = 0;
  t.relasi!.tokoh.bupati.relasi = 80;
  t = applyAction(t, { type: 'mosi', cara: 'perlindungan' }).state;
  t = advance(t, 3).state;
  assert.equal(t.status, 'menjabat');
});

test('usaha: PT melamar, disetujui, dibangun, lalu menyerap tenaga kerja dan bayar retribusi', () => {
  let s = baru('pt');
  s.level = 5;
  let tw = null;
  for (let i = 0; i < 120 && !tw; i++) {
    s = advance(s, 1).state;
    tw = s.usaha?.tawaran ?? null;
  }
  assert.ok(tw, 'ada PT yang melamar');
  s.kas = 1_000_000_000;
  s.relasi!.perdes = [];
  s = applyAction(s, { type: 'usaha', id: tw.id, aksi: 'setujui' }).state;
  const u = s.usaha!.daftar.find((x) => x.id === tw.id)!;
  assert.equal(u.status, 'dibangun');
  s = advance(s, u.selesaiHari - s.hari + 1).state;
  assert.equal(s.usaha!.daftar.find((x) => x.id === tw.id)!.status, 'beroperasi');
  const v = buildView(s);
  assert.ok(v.usaha.lapanganKerja > 0);
  assert.ok(v.berita.daftar.some((b) => b.judul.includes('Beroperasi')));
});

test('usaha: mitra bersih menolak uang pelicin dan melaporkannya', () => {
  const s = baru('bersih');
  s.usaha = { daftar: [], tawaran: { id: 'dahono', hari: 0, batasHari: 20 }, tawaranBerikut: 999, jeda: {} };
  const curiga = s.politik.kecurigaan;
  const r = applyAction(s, { type: 'usaha', id: 'dahono', aksi: 'pelicin' }).state;
  assert.equal(r.usaha!.tawaran, null);
  assert.equal(r.usaha!.daftar.length, 0);
  assert.ok(r.politik.kecurigaan > curiga);
});

test('berita & pidato: presiden berpidato, efeknya berlaku, dan kades bisa menanggapi', () => {
  let s = baru('pidato');
  for (let i = 0; i < 200 && !s.nasional?.pidato; i++) s = advance(s, 1).state;
  assert.ok(s.nasional?.pidato, 'pidato muncul');
  assert.ok(s.nasional!.berita.length > 0, 'ada berita');
  const v = buildView(s);
  assert.ok(v.berita.pidato?.kutipan.length);
  s = applyAction(s, { type: 'tanggapi_pidato', tanggapan: 'kritik' }).state;
  assert.equal(s.nasional!.pidato!.tanggapan, 'kritik');
  assert.throws(() => applyAction(s, { type: 'tanggapi_pidato', tanggapan: 'dukung' }), GameError);
  s = applyAction(s, { type: 'baca_berita' }).state;
  assert.equal(buildView(s).berita.belumDibaca, 0);
});

test('pegawai: kursi kosong berakibat, kursi terisi berpengaruh nyata', async () => {
  const { bulananTugas, faktorAuditPegawai, faktorPemicuPegawai, redamUnjuk, TUGAS } = await import('../src/tugas.ts');
  const { PEGAWAI } = await import('../src/content/fitur.ts');
  for (const p of PEGAWAI) assert.ok(TUGAS[p.id]?.ada.length && TUGAS[p.id]?.kosong.length, `${p.id} punya tugas dan akibat kosong`);
  // desa level tinggi tanpa pegawai: banyak kejadian buruk dalam setahun
  let s = baru('kosong');
  s.level = 6;
  s.staf = [];
  s.pegawai = [];
  const curiga = s.politik.kecurigaan;
  const log: string[] = [];
  for (let i = 0; i < 12; i++) bulananTugas(s, (_j, t) => log.push(t));
  assert.ok(log.length >= 2, `ada kejadian buruk: ${log.length}`);
  assert.ok(s.politik.kecurigaan > curiga, 'tanpa bendahara gosip naik');
  assert.equal(faktorAuditPegawai(s), 1);
  // dengan linmas dan bendahara
  s.staf = [
    { id: 'x1', peran: 'linmas', nama: 'Pak A', sifat: [], kinerja: 1, gaji: 3e6, sejakHari: 0 },
    { id: 'x2', peran: 'bendahara', nama: 'Bu B', sifat: [], kinerja: 1, gaji: 4e6, sejakHari: 0 },
  ] as never;
  assert.ok(faktorAuditPegawai(s) < 1);
  assert.ok(faktorPemicuPegawai(s) < 1);
  assert.ok(redamUnjuk(s) > 0);
});
