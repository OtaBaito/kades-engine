// Kartu seputar wakil kades: isu ijazah sampai persidangan, wakil viral, manuver dengan BPD,
// dan kritik politik dinasti. Semua tokoh dan kejadian fiktif. {wakil} diganti nama wakil yang menjabat.
import type { CardDef } from '../types.ts';

const JT = 1_000_000;

export const KARTU_WAKIL: CardDef[] = [
  {
    id: 'wakil_ijazah_1',
    judul: 'Ijazah Wakil Kades Dipertanyakan',
    teks: 'Seorang pegiat media sosial mengunggah foto ijazah SMA {wakil}. Katanya hurufnya beda dari angkatan yang sama, capnya miring, dan sekolahnya sudah tutup sebelum tahun lulus yang tertulis. Warga ramai bertanya: kades di pihak siapa?',
    kategori: 'politik',
    bobot: 3,
    jedaHari: 60,
    bersambung: true,
    syarat: { flag: 'wk_ijazah' },
    opsi: [
      { id: 'uji', label: 'Minta uji keaslian terbuka ke dinas pendidikan', effect: { kas: -5 * JT, integritas: 2, wakil: { loyalitas: -8, sikapIjazah: 'uji' }, jadwalKartu: { cardId: 'wakil_ijazah_2', setelahHari: 10 } } },
      { id: 'bela', label: 'Pasang badan: "ijazahnya asli, titik"', effect: { kecurigaan: 4, wakil: { loyalitas: 12, sikapIjazah: 'bela' }, jadwalKartu: { cardId: 'wakil_ijazah_2', setelahHari: 10 } } },
      { id: 'diam', label: 'Itu urusan pribadi wakil, kades tidak ikut campur', effect: { popularitas: -1, wakil: { sikapIjazah: 'diam' }, jadwalKartu: { cardId: 'wakil_ijazah_2', setelahHari: 14 } } },
    ],
  },
  {
    id: 'wakil_ijazah_2',
    judul: 'Sidang Gugatan Ijazah Wakil Kades',
    teks: 'Gugatan warga soal ijazah {tergugat} masuk persidangan. Majelis meminta kantor desa menyerahkan berkas pencalonan wakil, termasuk fotokopi ijazah yang dulu dilegalisir. Putusan dibacakan esok hari.',
    kategori: 'politik',
    bobot: 1,
    hanyaLanjutan: true,
    opsi: [
      { id: 'terbuka', label: 'Serahkan semua berkas apa adanya', effect: { integritas: 1, wakil: { sidang: 'terbuka' } } },
      { id: 'tunda', label: 'Bilang berkasnya hilang kena banjir, minta sidang ditunda', effect: { kecurigaan: 5, wakil: { sidang: 'tunda' } } },
      { id: 'lobi', label: 'Titip pesan ke majelis lewat kenalan di kabupaten', effect: { dompet: -15 * JT, kecurigaan: 6, wakil: { sidang: 'lobi' } } },
    ],
  },
  {
    id: 'wakil_viral',
    judul: 'Wakil Kades Viral di Pasar',
    teks: '{wakil} viral setelah membagikan susu kotak dan kaus bergambar wajahnya sendiri di pasar desa. Videonya ditonton ribuan kali, kolom komentar penuh pujian dan sindiran. Ada yang bertanya kenapa wajah kades tidak ada di kaus itu.',
    kategori: 'politik',
    bobot: 2.5,
    jedaHari: 120,
    syarat: { flag: 'wk_panggung' },
    opsi: [
      { id: 'nebeng', label: 'Ikut tampil di video berikutnya', effect: { kas: -5 * JT, popularitas: 2, kepuasan: { pemuda: 2 }, wakil: { panggung: 3 } } },
      { id: 'tegur', label: 'Tegur: kegiatan desa jangan jadi panggung pribadi', effect: { integritas: 1, wakil: { loyalitas: -8, panggung: -5 } } },
      { id: 'biar', label: 'Biarkan saja, toh warga senang', effect: { kepuasan: { pemuda: 1 }, wakil: { panggung: 8, ambisi: 4 } } },
    ],
  },
  {
    id: 'wakil_manuver',
    judul: 'Wakil Kades Rapat Diam-diam dengan BPD',
    teks: 'Sekdes melapor: {wakil} beberapa kali terlihat rapat malam-malam di rumah ketua BPD. Yang dibahas katanya "evaluasi kinerja kades". Beberapa tokoh sudah mulai menyebut namanya untuk pilkades berikutnya.',
    kategori: 'politik',
    bobot: 3,
    jedaHari: 90,
    syarat: { flag: 'wk_belot' },
    opsi: [
      { id: 'rangkul', label: 'Ajak bicara empat mata, beri peran lebih besar', effect: { kas: -3 * JT, wakil: { loyalitas: 15, ambisi: -5 } } },
      { id: 'bongkar', label: 'Bongkar manuvernya di rapat terbuka', effect: { popularitas: 1, kepuasan: { tokoh: 1 }, wakil: { loyalitas: -10, panggung: -8 } } },
      { id: 'makzul', label: 'Usulkan pemakzulan wakil ke BPD', effect: { wakil: { makzul: true } } },
    ],
  },
  {
    id: 'wakil_dinasti',
    judul: 'Mahasiswa Demo Soal Politik Dinasti',
    teks: 'Puluhan mahasiswa membentangkan spanduk di depan kantor desa: "Desa bukan warisan keluarga pejabat." Mereka menyoroti {wakil}, anak pejabat kabupaten, yang dulu lolos jadi wakil setelah syarat umurnya "ditafsirkan ulang" oleh panitia yang diketuai pamannya.',
    kategori: 'politik',
    bobot: 3,
    jedaHari: 150,
    syarat: { flag: 'wk_anak_pejabat' },
    opsi: [
      { id: 'dialog', label: 'Temui mahasiswa, akui kritiknya masuk akal', effect: { integritas: 2, kepuasan: { pemuda: 3 }, wakil: { loyalitas: -6 } } },
      { id: 'bela', label: 'Bela wakil: anak muda juga berhak memimpin', effect: { kepuasan: { pemuda: -2, tokoh: -2 }, setFlag: ['restu_bupati'], wakil: { loyalitas: 8 } } },
      { id: 'bubarkan', label: 'Minta linmas membubarkan demo', effect: { integritas: -3, popularitas: -4, kepuasan: { pemuda: -5 } } },
    ],
  },
  {
    id: 'wakil_pidato',
    judul: 'Wakil Kades Ingin Pidato di Acara Bupati',
    teks: 'Bupati berkunjung untuk meresmikan jalan usaha tani. {wakil} minta jatah pidato sambutan, padahal biasanya cukup kades saja. "Biar warga tahu kita satu tim," katanya.',
    kategori: 'politik',
    bobot: 2,
    jedaHari: 150,
    syarat: { flag: 'wk_ada', minHari: 90 },
    opsi: [
      { id: 'beri', label: 'Beri dia panggung, kades cukup menutup acara', effect: { kepuasan: { pemuda: 1 }, wakil: { loyalitas: 8, panggung: 6 } } },
      { id: 'berdua', label: 'Pidato berdua: tampilkan kekompakan', effect: { popularitas: 2, wakil: { loyalitas: 4, panggung: 3 } } },
      { id: 'tolak', label: 'Tolak, protokolnya hanya kades', effect: { wakil: { loyalitas: -6 } } },
    ],
  },
];
