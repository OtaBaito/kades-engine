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
