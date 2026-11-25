# Berkontribusi

Terima kasih sudah tertarik. Beberapa aturan supaya engine tetap rapi:

1. **Tetap deterministik.** Semua keacakan lewat `rng.ts` (`nextRandom(state)`), jangan `Math.random()` atau jam sistem.
2. **Fungsi murni.** Aksi menerima state dan mengembalikan state baru plus daftar kejadian. Tidak ada I/O di engine.
3. **Tes dulu.** Tambahkan tes di `test/` untuk mekanik baru. `npm test` dan `npm run typecheck` harus lulus.
4. **Keadilan peringkat.** Engine tidak boleh membaca status pembayaran atau kosmetik apa pun. Apa pun yang memengaruhi skor harus bisa didapat semua pemain lewat bermain.
5. **Bahasa.** Nama variabel dan teks dalam bahasa Indonesia, mengikuti gaya kode yang ada.

## Menulis kartu kejadian

Kartu berupa data (`CardDef` di `src/types.ts`): judul, teks, kategori, syarat muncul, dan dua sampai empat opsi
dengan efek (kas, kepuasan kelompok, indeks, integritas, kecurigaan, flag) dan risiko tersembunyi opsional.
Lihat contoh di `src/content/cards.ts`. Konten harus fiktif: jangan menyebut tokoh, partai, atau merek nyata.

## Melaporkan masalah keamanan

Jangan buka issue publik. Kirim ke tim OtaByte lewat https://otabyte.net.
