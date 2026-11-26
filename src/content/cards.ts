// PAKET KONTEN CONTOH (dibuat otomatis oleh skrip ekspor, jangan diedit manual).
// Game lengkap Asal Warga Senang memakai 1.300+ kartu; repo ini memuat 58 kartu contoh
// supaya mesin bisa dijalankan dan dites. Tambahkan kartumu sendiri: lihat CONTRIBUTING.md.
import type { CardDef } from '../types.ts';

export const CARDS: CardDef[] = [
  {
    "id": "maling_ayam",
    "judul": "Maling Ayam Beraksi Lagi",
    "teks": "Tiga kandang di dusun kidul kebobolan dalam seminggu. Warga mulai curiga ke pendatang.",
    "teksLanjutan": [
      {
        "flag": "cctv_malam",
        "teks": "Maling ayam beraksi lagi, tapi kamera tembus gelap merekam wajahnya dengan jelas. Warga minta pelakunya ditindak."
      },
      {
        "flag": "cctv_desa",
        "teks": "Maling ayam beraksi lagi. Kamera di perempatan sudah terpasang, tapi rekaman malamnya buram."
      },
      {
        "flag": "ronda_aktif",
        "teks": "Maling ayam beraksi di sela jadwal ronda. Peronda mengeluh capek, senter mati, kopi habis."
      }
    ],
    "kategori": "aduan",
    "bobot": 2,
    "jedaHari": 40,
    "opsi": [
      {
        "id": "ronda",
        "label": "Hidupkan lagi ronda malam bergilir",
        "syarat": {
          "tanpaFlag": "ronda_aktif"
        },
        "effect": {
          "kas": -2000000,
          "setFlag": [
            "ronda_aktif"
          ],
          "kepuasan": {
            "tokoh": 3,
            "petani": 3,
            "pemuda": -2
          }
        }
      },
      {
        "id": "ronda_honor",
        "label": "Beri honor, senter, dan kopi untuk peronda",
        "syarat": {
          "flag": "ronda_aktif"
        },
        "effect": {
          "kas": -4000000,
          "kepuasan": {
            "pemuda": 3,
            "tokoh": 2,
            "petani": 3
          }
        }
      },
      {
        "id": "cctv",
        "label": "Pasang kamera di perempatan",
        "syarat": {
          "tanpaFlag": "cctv_desa"
        },
        "effect": {
          "kas": -9000000,
          "setFlag": [
            "cctv_desa"
          ],
          "kepuasan": {
            "petani": 4,
            "pedagang": 2
          },
          "indeks": {
            "sosial": 1
          }
        }
      },
      {
        "id": "cek_rekaman",
        "label": "Cek rekaman kamera, serahkan ke polisi",
        "syarat": {
          "flag": "cctv_desa"
        },
        "effect": {
          "kas": -1000000,
          "integritas": 1,
          "kepuasan": {
            "petani": 5,
            "pedagang": 2
          }
        }
      },
      {
        "id": "kamera_malam",
        "label": "Ganti kamera dengan yang tembus gelap",
        "syarat": {
          "flag": "cctv_desa",
          "tanpaFlag": "cctv_malam"
        },
        "effect": {
          "kas": -14000000,
          "setFlag": [
            "cctv_malam"
          ],
          "kepuasan": {
            "petani": 6
          },
          "indeks": {
            "sosial": 1
          }
        }
      },
      {
        "id": "tuduh",
        "label": "Data ulang semua pendatang",
        "effect": {
          "kepuasan": {
            "perantau": -6,
            "tokoh": 2
          },
          "integritas": -1
        }
      }
    ]
  },
  {
    "id": "anjing_liar",
    "judul": "Anjing Liar Kejar Anak Sekolah",
    "teks": "Segerombol anjing liar berkeliaran di jalan menuju sekolah. Orang tua minta tindakan cepat.",
    "teksLanjutan": [
      {
        "flag": "penampungan_anjing",
        "teks": "Penampungan anjing desa sudah penuh. Anjing liar baru berdatangan dari desa sebelah."
      }
    ],
    "kategori": "aduan",
    "bobot": 1,
    "jedaHari": 70,
    "opsi": [
      {
        "id": "vaksin",
        "label": "Panggil petugas vaksin dan penampungan",
        "syarat": {
          "tanpaFlag": "penampungan_anjing"
        },
        "effect": {
          "kas": -6000000,
          "setFlag": [
            "penampungan_anjing"
          ],
          "kepuasan": {
            "pkk": 5
          },
          "indeks": {
            "lingkungan": 1
          }
        }
      },
      {
        "id": "adopsi",
        "label": "Gelar hari adopsi anjing penampungan",
        "syarat": {
          "flag": "penampungan_anjing"
        },
        "effect": {
          "kas": -1000000,
          "kepuasan": {
            "pkk": 3,
            "pemuda": 3
          },
          "popularitas": 2
        }
      },
      {
        "id": "antar",
        "label": "Linmas antar-jemput anak sekolah",
        "effect": {
          "kas": -2000000,
          "kepuasan": {
            "pkk": 3,
            "pemuda": -1
          }
        }
      },
      {
        "id": "biar",
        "label": "Suruh warga bawa tongkat",
        "effect": {
          "kepuasan": {
            "pkk": -5
          },
          "popularitas": -2
        }
      }
    ]
  },
  {
    "id": "hajatan_jalan",
    "judul": "Hajatan Tutup Jalan Tiga Hari",
    "teks": "Seorang juragan tanah menggelar pesta nikah anaknya dan menutup jalan utama. Pedagang protes, tamu undangan senang.",
    "kategori": "aduan",
    "bobot": 2,
    "jedaHari": 180,
    "opsi": [
      {
        "id": "izinkan",
        "label": "Izinkan, namanya juga hajatan",
        "effect": {
          "kepuasan": {
            "tokoh": 4,
            "pedagang": -4,
            "perantau": -2
          }
        }
      },
      {
        "id": "satu_lajur",
        "label": "Minta buka satu lajur",
        "effect": {
          "kepuasan": {
            "tokoh": -1,
            "pedagang": 2
          }
        }
      },
      {
        "id": "datang",
        "label": "Datang menyumbang, sekalian pidato",
        "effect": {
          "kas": -1000000,
          "popularitas": 3,
          "kepuasan": {
            "tokoh": 3
          }
        }
      }
    ]
  },
  {
    "id": "beasiswa",
    "judul": "Usulan Beasiswa Anak Petani",
    "teks": "Kelompok tani mengusulkan beasiswa untuk anak petani yang diterima di kampus negeri.",
    "teksLanjutan": [
      {
        "flag": "beasiswa_desa",
        "teks": "Penerima beasiswa desa pertama sudah wisuda. Kelompok tani minta kuotanya ditambah."
      }
    ],
    "kategori": "usulan",
    "bobot": 2,
    "jedaHari": 120,
    "syarat": {
      "tanpaFlag": "beasiswa_kuota"
    },
    "opsi": [
      {
        "id": "setuju",
        "label": "Anggarkan beasiswa tiap tahun",
        "syarat": {
          "tanpaFlag": "beasiswa_desa"
        },
        "effect": {
          "kas": -20000000,
          "setFlag": [
            "beasiswa_desa"
          ],
          "kepuasan": {
            "petani": 6,
            "pemuda": 4
          },
          "indeks": {
            "sosial": 2
          }
        }
      },
      {
        "id": "tambah_kuota",
        "label": "Tambah kuota, alumni wajib mengajar di desa",
        "syarat": {
          "flag": "beasiswa_desa"
        },
        "effect": {
          "kas": -15000000,
          "kepuasan": {
            "petani": 4,
            "pemuda": 5
          },
          "indeks": {
            "sosial": 3
          },
          "setFlag": [
            "beasiswa_kuota"
          ]
        }
      },
      {
        "id": "pinjaman",
        "label": "Jadikan pinjaman tanpa bunga",
        "effect": {
          "kas": -8000000,
          "kepuasan": {
            "petani": 2,
            "pemuda": 1
          }
        }
      },
      {
        "id": "tolak",
        "label": "Dana desa bukan untuk kuliah",
        "effect": {
          "kepuasan": {
            "petani": -4,
            "pemuda": -4
          }
        }
      }
    ]
  },
  {
    "id": "festival_panen",
    "judul": "Festival Panen Raya",
    "teks": "Panen tahun ini bagus. Karang taruna ingin bikin festival dengan panggung dangdut dan lomba.",
    "teksLanjutan": [
      {
        "flag": "festival_tahunan",
        "teks": "Festival tahun lalu ramai sampai viral. Pedagang minta dibuat lebih besar dengan bazar."
      }
    ],
    "kategori": "usulan",
    "bobot": 2,
    "jedaHari": 300,
    "opsi": [
      {
        "id": "meriah",
        "label": "Bikin meriah, undang biduan kondang",
        "syarat": {
          "tanpaFlag": "festival_tahunan"
        },
        "effect": {
          "kas": -25000000,
          "setFlag": [
            "festival_tahunan"
          ],
          "popularitas": 6,
          "kepuasan": {
            "pemuda": 6,
            "pedagang": 4,
            "tokoh": -2
          }
        }
      },
      {
        "id": "bazar",
        "label": "Jadikan festival tahunan bertiket + bazar UMKM",
        "syarat": {
          "flag": "festival_tahunan"
        },
        "effect": {
          "kas": 8000000,
          "popularitas": 4,
          "kepuasan": {
            "pedagang": 6,
            "pemuda": 3
          },
          "indeks": {
            "ekonomi": 2
          }
        }
      },
      {
        "id": "sederhana",
        "label": "Syukuran sederhana di balai",
        "effect": {
          "kas": -5000000,
          "kepuasan": {
            "petani": 3,
            "tokoh": 3
          }
        }
      },
      {
        "id": "batal",
        "label": "Hemat anggaran, tidak usah",
        "effect": {
          "kepuasan": {
            "pemuda": -4,
            "petani": -2
          }
        }
      }
    ]
  },
  {
    "id": "csr_pabrik",
    "judul": "Tawaran CSR Pabrik Air Kemasan",
    "teks": "PT Tirta Jernih Abadi menawarkan dana CSR asal desa mengizinkan pengeboran di mata air bukit.",
    "kategori": "peluang",
    "bobot": 1,
    "jedaHari": 150,
    "opsi": [
      {
        "id": "terima",
        "label": "Terima, dana langsung cair",
        "effect": {
          "kas": 60000000,
          "indeks": {
            "lingkungan": -4
          },
          "kepuasan": {
            "petani": -5,
            "pedagang": 3
          }
        }
      },
      {
        "id": "tawar",
        "label": "Terima dengan syarat kuota air untuk warga",
        "effect": {
          "kas": 25000000,
          "indeks": {
            "lingkungan": -1
          },
          "kepuasan": {
            "petani": 1
          }
        }
      },
      {
        "id": "tolak",
        "label": "Tolak, mata air milik warga",
        "effect": {
          "integritas": 3,
          "kepuasan": {
            "petani": 4,
            "tokoh": 2
          }
        }
      }
    ]
  },
  {
    "id": "pohon_tumbang",
    "judul": "Pohon Tumbang Timpa Kabel Listrik",
    "teks": "Hujan angin semalam merobohkan pohon trembesi. Separuh desa gelap, pompa air mati.",
    "kategori": "bencana",
    "bobot": 1,
    "jedaHari": 80,
    "opsi": [
      {
        "id": "gotong",
        "label": "Gerakkan warga potong pohon malam ini",
        "effect": {
          "kas": -3000000,
          "kepuasan": {
            "pemuda": 2,
            "tokoh": 3
          }
        }
      },
      {
        "id": "lapor",
        "label": "Lapor ke perusahaan listrik, tunggu petugas",
        "effect": {
          "semuaKepuasan": -2
        }
      },
      {
        "id": "genset",
        "label": "Sewa genset untuk rumah ibadah dan posyandu",
        "effect": {
          "kas": -8000000,
          "kepuasan": {
            "pkk": 4,
            "tokoh": 2
          }
        }
      }
    ]
  },
  {
    "id": "grup_wa",
    "judul": "Grup WhatsApp Desa Memanas",
    "teks": "Ada yang menyebar foto lama jalan rusak dan menyebutnya kondisi terbaru. Grup warga ribut.",
    "teksLanjutan": [
      {
        "flag": "kanal_resmi",
        "teks": "Hoaks baru beredar di grup warga, tapi kali ini desa sudah punya kanal informasi resmi."
      }
    ],
    "kategori": "politik",
    "bobot": 2,
    "jedaHari": 180,
    "opsi": [
      {
        "id": "klarifikasi",
        "label": "Kirim klarifikasi dengan foto terbaru",
        "syarat": {
          "tanpaFlag": "kanal_resmi"
        },
        "effect": {
          "popularitas": 2,
          "integritas": 1
        }
      },
      {
        "id": "kanal_resmi",
        "label": "Bikin kanal informasi resmi desa",
        "syarat": {
          "tanpaFlag": "kanal_resmi"
        },
        "effect": {
          "kas": -2000000,
          "setFlag": [
            "kanal_resmi"
          ],
          "popularitas": 3,
          "integritas": 2
        }
      },
      {
        "id": "cek_fakta",
        "label": "Unggah cek fakta di kanal resmi desa",
        "syarat": {
          "flag": "kanal_resmi"
        },
        "effect": {
          "popularitas": 4,
          "integritas": 1
        }
      },
      {
        "id": "keluarkan",
        "label": "Keluarkan penyebar dari grup",
        "effect": {
          "popularitas": -2,
          "kepuasan": {
            "pemuda": -3
          }
        }
      },
      {
        "id": "buzzer",
        "label": "Minta keponakan bikin akun bantahan",
        "effect": {
          "popularitas": 3,
          "integritas": -3
        }
      }
    ]
  },
  {
    "id": "jalan_berlubang",
    "judul": "Jalan Berlubang Makan Korban",
    "teks": "Pak Darto jatuh dari motor di jalan dusun timur yang berlubang. Warga minta jalan segera ditambal.",
    "teksLanjutan": [
      {
        "flag": "jalan_tambal_sulam",
        "teks": "Tambalan jalan bulan lalu sudah bolong lagi kena hujan. Warga menyindir \"proyek tambal sulam\"."
      }
    ],
    "kategori": "aduan",
    "bobot": 3,
    "jedaHari": 45,
    "syarat": {
      "tanpaProyek": "jalan_aspal"
    },
    "opsi": [
      {
        "id": "tambal",
        "label": "Tambal sementara pakai dana desa",
        "effect": {
          "kas": -15000000,
          "setFlag": [
            "jalan_tambal_sulam"
          ],
          "kepuasan": {
            "petani": 3,
            "perantau": 2
          }
        }
      },
      {
        "id": "cor_beton",
        "label": "Cor beton permanen di titik terparah",
        "syarat": {
          "flag": "jalan_tambal_sulam"
        },
        "effect": {
          "kas": -35000000,
          "hapusFlag": [
            "jalan_tambal_sulam"
          ],
          "kepuasan": {
            "petani": 5,
            "perantau": 4
          },
          "indeks": {
            "ekonomi": 1
          }
        }
      },
      {
        "id": "garansi",
        "label": "Tagih garansi ke kontraktor tambalan",
        "syarat": {
          "flag": "jalan_tambal_sulam"
        },
        "effect": {
          "integritas": 2,
          "kepuasan": {
            "petani": 2
          }
        }
      },
      {
        "id": "kerja_bakti",
        "label": "Ajak warga kerja bakti",
        "effect": {
          "kas": -3000000,
          "kepuasan": {
            "petani": 1,
            "tokoh": 3,
            "pemuda": -2
          }
        }
      },
      {
        "id": "janji",
        "label": "Janjikan aspal tahun depan",
        "effect": {
          "popularitas": -3,
          "kepuasan": {
            "petani": -3,
            "perantau": -2
          }
        }
      }
    ]
  },
  {
    "id": "sampah_sungai",
    "judul": "Sampah Menumpuk di Sungai",
    "teks": "Sungai di dusun barat penuh sampah plastik. Ibu-ibu PKK mengeluh bau dan nyamuk.",
    "teksLanjutan": [
      {
        "flag": "bank_sampah",
        "teks": "Sejak kelompok bank sampah warga dibentuk, sungai lebih bersih. Tapi kiriman sampah dari desa hulu masih datang."
      }
    ],
    "kategori": "aduan",
    "bobot": 2,
    "jedaHari": 60,
    "opsi": [
      {
        "id": "bank_sampah",
        "label": "Bentuk kelompok bank sampah warga",
        "syarat": {
          "tanpaFlag": "bank_sampah"
        },
        "effect": {
          "kas": -12000000,
          "setFlag": [
            "bank_sampah"
          ],
          "indeks": {
            "lingkungan": 2
          },
          "kepuasan": {
            "pkk": 6
          }
        }
      },
      {
        "id": "jual_daur",
        "label": "Jual hasil pilahan kelompok bank sampah ke pengepul",
        "syarat": {
          "flag": "bank_sampah"
        },
        "effect": {
          "kas": 6000000,
          "kepuasan": {
            "pkk": 3
          },
          "indeks": {
            "lingkungan": 1
          }
        }
      },
      {
        "id": "jaring",
        "label": "Pasang jaring penahan sampah dari hulu",
        "syarat": {
          "flag": "bank_sampah",
          "tanpaFlag": "jaring_sungai"
        },
        "effect": {
          "kas": -10000000,
          "setFlag": [
            "jaring_sungai"
          ],
          "kepuasan": {
            "pkk": 3,
            "petani": 2
          },
          "indeks": {
            "lingkungan": 3
          }
        }
      },
      {
        "id": "larangan",
        "label": "Pasang papan larangan dan denda",
        "effect": {
          "kas": -2000000,
          "kepuasan": {
            "pkk": 2,
            "pedagang": -2
          }
        }
      },
      {
        "id": "abaikan",
        "label": "Tunggu musim hujan menghanyutkan",
        "effect": {
          "indeks": {
            "lingkungan": -2
          },
          "kepuasan": {
            "pkk": -6
          }
        }
      }
    ]
  },
  {
    "id": "sengketa_tanah",
    "judul": "Sengketa Batas Tanah",
    "teks": "Dua keluarga bertengkar soal patok sawah warisan. Keduanya mengaku punya surat dari zaman kakek.",
    "kategori": "aduan",
    "bobot": 2,
    "jedaHari": 60,
    "opsi": [
      {
        "id": "mediasi",
        "label": "Mediasi di balai desa bersama tokoh adat",
        "effect": {
          "kas": -1000000,
          "kepuasan": {
            "tokoh": 5,
            "petani": 2
          }
        }
      },
      {
        "id": "ukur_ulang",
        "label": "Datangkan juru ukur resmi",
        "effect": {
          "kas": -8000000,
          "kepuasan": {
            "petani": 4
          },
          "integritas": 2
        }
      },
      {
        "id": "menangkan_kenalan",
        "label": "Menangkan pihak yang dekat dengan kades",
        "effect": {
          "integritas": -6,
          "kepuasan": {
            "petani": -4
          }
        },
        "risiko": {
          "setelahHari": 20,
          "peluang": 0.4,
          "pesan": "Rekaman obrolan soal sengketa tanah bocor ke grup WhatsApp warga.",
          "effect": {
            "popularitas": -10,
            "semuaKepuasan": -3
          }
        }
      }
    ]
  },
  {
    "id": "karang_taruna_dana",
    "judul": "Usulan Karang Taruna",
    "teks": "Ketua karang taruna mengajukan dana untuk turnamen voli antar-dusun dan pentas seni.",
    "kategori": "usulan",
    "bobot": 2,
    "jedaHari": 50,
    "syarat": {
      "tanpaFlag": "pemuda_kelola_wisata"
    },
    "opsi": [
      {
        "id": "kasih_penuh",
        "label": "Berikan Rp20 juta penuh",
        "effect": {
          "kas": -20000000,
          "kepuasan": {
            "pemuda": 8
          },
          "popularitas": 3
        }
      },
      {
        "id": "kasih_separuh",
        "label": "Berikan separuh, sisanya cari sponsor",
        "effect": {
          "kas": -10000000,
          "kepuasan": {
            "pemuda": 3
          }
        }
      },
      {
        "id": "tolak",
        "label": "Tolak, anggaran sedang ketat",
        "effect": {
          "kepuasan": {
            "pemuda": -7
          }
        }
      }
    ]
  },
  {
    "id": "stunting",
    "judul": "Bidan Temukan Balita Kurang Gizi",
    "teks": "Saat penimbangan bulanan, bidan desa menemukan beberapa balita dengan berat badan di bawah garis merah. Ia minta program makanan tambahan sebelum jumlahnya bertambah.",
    "kategori": "aduan",
    "bobot": 2,
    "jedaHari": 60,
    "opsi": [
      {
        "id": "pmt",
        "label": "Program makanan tambahan 3 bulan",
        "effect": {
          "kas": -25000000,
          "indeks": {
            "sosial": 3
          },
          "kepuasan": {
            "pkk": 8
          }
        }
      },
      {
        "id": "penyuluhan",
        "label": "Penyuluhan gizi saja",
        "effect": {
          "kas": -3000000,
          "indeks": {
            "sosial": 1
          },
          "kepuasan": {
            "pkk": 2
          }
        }
      },
      {
        "id": "laporan_bagus",
        "label": "Rapikan angka di laporan ke kabupaten",
        "effect": {
          "integritas": -8,
          "indeks": {
            "sosial": -1
          },
          "kepuasan": {
            "pkk": -3
          }
        }
      }
    ]
  },
  {
    "id": "air_kering",
    "judul": "Sumur Warga Kering",
    "teks": "Kemarau panjang membuat sumur di tiga RT kering. Warga antre air dari mobil tangki.",
    "kategori": "bencana",
    "bobot": 2,
    "jedaHari": 90,
    "syarat": {
      "tanpaProyek": "sumur_bor"
    },
    "opsi": [
      {
        "id": "tangki",
        "label": "Sewa mobil tangki dua minggu",
        "effect": {
          "kas": -18000000,
          "kepuasan": {
            "pkk": 4,
            "petani": 2
          }
        }
      },
      {
        "id": "minta_bpbd",
        "label": "Ajukan bantuan ke kabupaten",
        "effect": {
          "kas": -1000000,
          "kepuasan": {
            "pkk": -2
          }
        }
      }
    ]
  },
  {
    "id": "banjir",
    "judul": "Banjir Merendam Dusun Barat",
    "teks": "Hujan semalaman membuat sungai meluap. Puluhan rumah terendam dan sawah gagal panen.",
    "kategori": "bencana",
    "bobot": 1,
    "jedaHari": 120,
    "opsi": [
      {
        "id": "dapur_umum",
        "label": "Dirikan dapur umum dan posko",
        "effect": {
          "kas": -35000000,
          "kepuasan": {
            "petani": 6,
            "pkk": 6,
            "tokoh": 4
          },
          "popularitas": 5
        }
      },
      {
        "id": "foto_dulu",
        "label": "Datang membawa kamera dan sekarung beras",
        "effect": {
          "kas": -5000000,
          "popularitas": 4,
          "kepuasan": {
            "petani": -3,
            "pkk": -3
          }
        }
      },
      {
        "id": "tunggu_bantuan",
        "label": "Tunggu bantuan kabupaten",
        "effect": {
          "semuaKepuasan": -5,
          "indeks": {
            "ekonomi": -1
          }
        }
      }
    ]
  },
  {
    "id": "proyek_titipan",
    "judul": "Proyek Titipan",
    "teks": "Seorang \"orang kabupaten\" menawarkan proyek gapura megah lewat kontraktor kenalannya. Biayanya dari kas desa, dan kades dijanjikan \"uang lelah\" Rp 10 jt.",
    "kategori": "peluang",
    "bobot": 2,
    "jedaHari": 90,
    "opsi": [
      {
        "id": "terima",
        "label": "Terima, gapura juga bagus buat foto",
        "effect": {
          "kas": -60000000,
          "dompet": 10000000,
          "integritas": -15,
          "kecurigaan": 8,
          "popularitas": 3,
          "setFlag": [
            "gapura_titipan"
          ]
        },
        "risiko": {
          "setelahHari": 45,
          "peluang": 0.35,
          "pesan": "Inspektorat menemukan mark-up proyek gapura.",
          "effect": {
            "kas": -40000000,
            "popularitas": -15,
            "semuaKepuasan": -5,
            "integritas": -5
          }
        }
      },
      {
        "id": "tolak_halus",
        "label": "Tolak halus, bilang anggaran sudah habis",
        "effect": {
          "integritas": 3
        }
      },
      {
        "id": "laporkan",
        "label": "Laporkan ke inspektorat",
        "effect": {
          "integritas": 8,
          "popularitas": 4,
          "kepuasan": {
            "tokoh": 4
          }
        }
      }
    ]
  },
  {
    "id": "amplop_kontraktor",
    "judul": "Amplop dari Kontraktor",
    "teks": "Kontraktor yang kalah tender datang ke rumah membawa amplop tebal \"sekadar silaturahmi\".",
    "kategori": "peluang",
    "bobot": 2,
    "jedaHari": 75,
    "opsi": [
      {
        "id": "terima",
        "label": "Terima, catat sebagai sumbangan ke kas desa",
        "effect": {
          "kas": 25000000,
          "integritas": -5,
          "kecurigaan": 4
        },
        "risiko": {
          "setelahHari": 30,
          "peluang": 0.3,
          "pesan": "Video penyerahan amplop beredar di media sosial.",
          "effect": {
            "popularitas": -18,
            "semuaKepuasan": -4
          }
        }
      },
      {
        "id": "kantongi",
        "label": "Kantongi sendiri, tidak usah lewat kas",
        "effect": {
          "dompet": 25000000,
          "integritas": -12,
          "kecurigaan": 14
        },
        "risiko": {
          "setelahHari": 30,
          "peluang": 0.35,
          "pesan": "Sopir kontraktor bercerita soal amplop itu di warung kopi.",
          "effect": {
            "popularitas": -12,
            "kecurigaan": 15
          }
        }
      },
      {
        "id": "kembalikan",
        "label": "Kembalikan di depan saksi",
        "effect": {
          "integritas": 6,
          "kepuasan": {
            "tokoh": 3
          }
        }
      }
    ]
  },
  {
    "id": "tambang_pasir",
    "judul": "Izin Tambang Pasir",
    "teks": "Juragan lokal minta rekomendasi desa untuk tambang pasir di tepi sungai. Ia janji menyumbang untuk desa.",
    "kategori": "peluang",
    "bobot": 1,
    "sekali": true,
    "syarat": {
      "minHari": 60
    },
    "opsi": [
      {
        "id": "beri",
        "label": "Beri rekomendasi",
        "effect": {
          "kas": 80000000,
          "pemasukanBulanan": 4000000,
          "indeks": {
            "lingkungan": -8,
            "ekonomi": 3
          },
          "kepuasan": {
            "pedagang": 4,
            "petani": -6,
            "tokoh": -4
          }
        },
        "risiko": {
          "setelahHari": 90,
          "peluang": 0.5,
          "pesan": "Tebing sungai longsor dekat lokasi tambang. Sawah warga tertimbun.",
          "effect": {
            "semuaKepuasan": -6,
            "indeks": {
              "lingkungan": -4
            },
            "popularitas": -10
          }
        }
      },
      {
        "id": "musdes",
        "label": "Bawa ke musyawarah desa",
        "effect": {
          "kas": -2000000,
          "kepuasan": {
            "tokoh": 4,
            "petani": 2
          },
          "integritas": 2
        }
      },
      {
        "id": "tolak",
        "label": "Tolak tegas",
        "effect": {
          "kepuasan": {
            "pedagang": -4,
            "petani": 3
          },
          "indeks": {
            "lingkungan": 1
          }
        }
      }
    ]
  },
  {
    "id": "wisata_viral",
    "judul": "Air Terjun Desa Viral",
    "teks": "Video air terjun di hutan desa ditonton jutaan kali. Pengunjung mulai berdatangan tanpa fasilitas.",
    "kategori": "peluang",
    "bobot": 1,
    "sekali": true,
    "syarat": {
      "minHari": 90,
      "tanpaProyek": "wisata_air"
    },
    "opsi": [
      {
        "id": "kelola",
        "label": "Kelola lewat BUMDes wisata",
        "effect": {
          "kas": -45000000,
          "pemasukanBulanan": 6000000,
          "indeks": {
            "ekonomi": 4
          },
          "kepuasan": {
            "pemuda": 6,
            "pedagang": 5
          }
        }
      },
      {
        "id": "tiket_liar",
        "label": "Biarkan pemuda pungut tiket sendiri",
        "effect": {
          "kepuasan": {
            "pemuda": 4
          },
          "indeks": {
            "lingkungan": -3
          },
          "integritas": -3
        }
      },
      {
        "id": "tutup",
        "label": "Tutup demi kelestarian",
        "effect": {
          "indeks": {
            "lingkungan": 2
          },
          "kepuasan": {
            "pemuda": -5,
            "pedagang": -4
          }
        }
      }
    ]
  },
  {
    "id": "wakil_mundur",
    "judul": "Wakil Kades Mengundurkan Diri",
    "teks": "Wakil kades menyerahkan surat pengunduran diri setelah berkas lamanya digugat warga. Kursinya kini kosong.",
    "kategori": "politik",
    "bobot": 2,
    "sekali": true,
    "syarat": {
      "minHari": 45,
      "tanpaFlag": "wakil_kosong"
    },
    "opsi": [
      {
        "id": "kubu_juragan",
        "label": "Musdes: angkat calon dari kubu juragan",
        "effect": {
          "kas": 20000000,
          "kepuasan": {
            "pedagang": 8,
            "petani": -5
          },
          "integritas": -4
        }
      },
      {
        "id": "kubu_pemuda",
        "label": "Musdes: angkat ketua karang taruna",
        "effect": {
          "kepuasan": {
            "pemuda": 9,
            "tokoh": -4
          }
        }
      },
      {
        "id": "kosongkan",
        "label": "Biarkan kosong dulu, fokus kerja",
        "effect": {
          "setFlag": [
            "wakil_kosong"
          ],
          "popularitas": -3
        }
      }
    ]
  },
  {
    "id": "kursi_wakil_kosong",
    "judul": "Kursi Wakil Masih Kosong",
    "teks": "Rapat-rapat molor karena tak ada wakil. BPD mendesak kades segera mengisi kursi itu.",
    "kategori": "politik",
    "bobot": 4,
    "jedaHari": 20,
    "syarat": {
      "flag": "wakil_kosong"
    },
    "opsi": [
      {
        "id": "tokoh_agama",
        "label": "Angkat tokoh agama yang disegani",
        "effect": {
          "hapusFlag": [
            "wakil_kosong"
          ],
          "kepuasan": {
            "tokoh": 8,
            "pemuda": -2
          }
        }
      },
      {
        "id": "kerabat",
        "label": "Angkat kerabat sendiri, lebih bisa dipercaya",
        "effect": {
          "hapusFlag": [
            "wakil_kosong"
          ],
          "integritas": -8,
          "popularitas": -6,
          "kepuasan": {
            "tokoh": -3
          }
        }
      },
      {
        "id": "tunda",
        "label": "Tunda lagi",
        "effect": {
          "popularitas": -2
        }
      }
    ]
  },
  {
    "id": "koperasi_wajib",
    "judul": "Instruksi Koperasi Wajib",
    "teks": "Surat dari atas: sebagian besar dana desa termin berikutnya wajib dialihkan untuk mendirikan \"Koperasi Wajib Desa\".",
    "kategori": "politik",
    "bobot": 2,
    "sekali": true,
    "syarat": {
      "minHari": 30
    },
    "opsi": [
      {
        "id": "patuh",
        "label": "Tegak lurus, jalankan instruksi",
        "effect": {
          "setFlag": [
            "potong_termin"
          ],
          "pemasukanBulanan": 3000000,
          "indeks": {
            "ekonomi": 2
          },
          "kepuasan": {
            "petani": -3,
            "pedagang": 3
          }
        }
      },
      {
        "id": "protes",
        "label": "Protes bersama forum kades",
        "effect": {
          "popularitas": 6,
          "kepuasan": {
            "petani": 4
          }
        },
        "risiko": {
          "setelahHari": 25,
          "peluang": 0.4,
          "pesan": "Pencairan dana desa \"ditinjau ulang\" setelah aksi protes forum kades.",
          "effect": {
            "setFlag": [
              "termin_ditahan"
            ]
          }
        }
      },
      {
        "id": "akali",
        "label": "Bentuk koperasi papan nama saja",
        "effect": {
          "integritas": -10
        },
        "risiko": {
          "setelahHari": 40,
          "peluang": 0.45,
          "pesan": "Tim pemeriksa menemukan koperasi desa hanya papan nama.",
          "effect": {
            "kas": -30000000,
            "popularitas": -10
          }
        }
      }
    ]
  },
  {
    "id": "kades_tetangga_viral",
    "judul": "Kades Tetangga Viral",
    "teks": "Video kades desa sebelah berpesta di tempat hiburan viral. Kabupaten mengancam menahan dana desa satu kecamatan.",
    "kategori": "politik",
    "bobot": 1,
    "sekali": true,
    "syarat": {
      "minHari": 100
    },
    "opsi": [
      {
        "id": "kecam",
        "label": "Kecam terbuka di media sosial",
        "effect": {
          "popularitas": 6,
          "kepuasan": {
            "tokoh": 3
          }
        }
      },
      {
        "id": "lobi",
        "label": "Lobi kabupaten agar desamu dikecualikan",
        "effect": {
          "kas": -10000000,
          "integritas": -2
        }
      },
      {
        "id": "diam",
        "label": "Diam, bukan urusan kita",
        "effect": {
          "setFlag": [
            "termin_ditahan"
          ]
        }
      }
    ]
  },
  {
    "id": "anak_kades_viral",
    "judul": "Anak Kades Pamer Mobil",
    "teks": "Anak kades mengunggah foto mobil baru dengan keterangan \"rezeki anak soleh\". Warganet mulai menghitung gaji kades.",
    "kategori": "politik",
    "bobot": 1,
    "sekali": true,
    "syarat": {
      "minHari": 120
    },
    "opsi": [
      {
        "id": "klarifikasi",
        "label": "Klarifikasi terbuka dan minta maaf",
        "effect": {
          "popularitas": -3,
          "kepuasan": {
            "tokoh": 2
          }
        }
      },
      {
        "id": "hapus",
        "label": "Suruh hapus unggahan, jangan komentar",
        "effect": {
          "popularitas": -8
        }
      },
      {
        "id": "buzzer",
        "label": "Sewa buzzer untuk menenggelamkan isu",
        "effect": {
          "kas": -8000000,
          "integritas": -6,
          "popularitas": 2
        }
      }
    ]
  },
  {
    "id": "buzzer_tawaran",
    "judul": "Tawaran Paket Buzzer",
    "teks": "Akun anonim menawarkan \"paket citra positif\": seratus akun yang memuji kades setiap hari.",
    "kategori": "peluang",
    "bobot": 1,
    "jedaHari": 120,
    "opsi": [
      {
        "id": "beli",
        "label": "Ambil paket bulanan",
        "effect": {
          "kas": -12000000,
          "popularitas": 10,
          "integritas": -5
        },
        "risiko": {
          "setelahHari": 30,
          "peluang": 0.35,
          "pesan": "Warganet membongkar akun-akun buzzer desa.",
          "effect": {
            "popularitas": -20
          }
        }
      },
      {
        "id": "tolak",
        "label": "Tolak, kerja nyata saja",
        "effect": {
          "integritas": 2
        }
      }
    ]
  },
  {
    "id": "debat_kandidat",
    "judul": "Debat Calon Kades",
    "teks": "Panitia pilkades menggelar debat terbuka. Lawanmu menuding pembangunan desa jalan di tempat.",
    "kategori": "kampanye",
    "bobot": 6,
    "sekali": false,
    "jedaHari": 30,
    "syarat": {
      "bulanPeriodeMin": 12
    },
    "opsi": [
      {
        "id": "data",
        "label": "Paparkan data capaian",
        "effect": {
          "popularitas": 4,
          "kepuasan": {
            "tokoh": 3
          }
        }
      },
      {
        "id": "serang",
        "label": "Serang balik soal masa lalu lawan",
        "effect": {
          "popularitas": 2,
          "integritas": -3,
          "kepuasan": {
            "pkk": -2
          }
        }
      },
      {
        "id": "janji_besar",
        "label": "Janjikan aspal sampai ke sawah",
        "effect": {
          "popularitas": 6,
          "setFlag": [
            "janji_aspal"
          ]
        }
      }
    ]
  },
  {
    "id": "serangan_fajar",
    "judul": "Tawaran Serangan Fajar",
    "teks": "Tim sukses menyarankan \"uang transport\" untuk pemilih di malam terakhir. Katanya semua calon juga melakukannya.",
    "kategori": "kampanye",
    "bobot": 6,
    "sekali": false,
    "jedaHari": 30,
    "syarat": {
      "bulanPeriodeMin": 12
    },
    "opsi": [
      {
        "id": "lakukan",
        "label": "Lakukan diam-diam",
        "effect": {
          "kas": -50000000,
          "semuaKepuasan": 6,
          "integritas": -15
        },
        "risiko": {
          "setelahHari": 3,
          "peluang": 0.4,
          "pesan": "Panitia pengawas menangkap basah pembagian amplop.",
          "effect": {
            "popularitas": -25,
            "semuaKepuasan": -10
          }
        }
      },
      {
        "id": "tolak",
        "label": "Tolak dan umumkan kampanye bersih",
        "effect": {
          "integritas": 6,
          "popularitas": 3
        }
      }
    ]
  },
  {
    "id": "lapor_sembako",
    "judul": "Lawan Bagi-bagi Sembako",
    "teks": "Warga mengirim foto: tim lawan membagikan paket sembako berstiker nama calon. Tim suksesmu geram.",
    "kategori": "kampanye",
    "bobot": 8,
    "sekali": false,
    "jedaHari": 20,
    "syarat": {
      "flag": "lawan_sembako"
    },
    "opsi": [
      {
        "id": "lapor",
        "label": "Laporkan ke panitia pengawas dengan bukti foto",
        "effect": {
          "integritas": 2,
          "kepuasan": {
            "tokoh": 2
          },
          "setFlag": [
            "lapor_panwas"
          ],
          "hapusFlag": [
            "lawan_sembako"
          ]
        }
      },
      {
        "id": "balas",
        "label": "Balas dengan bagi sembako juga",
        "effect": {
          "dompet": -10000000,
          "popularitas": 3,
          "integritas": -6,
          "kecurigaan": 6,
          "hapusFlag": [
            "lawan_sembako"
          ]
        }
      },
      {
        "id": "biar",
        "label": "Biarkan, warga bisa menilai sendiri",
        "effect": {
          "hapusFlag": [
            "lawan_sembako"
          ]
        }
      }
    ]
  },
  {
    "id": "blusukan",
    "judul": "Blusukan ke Dusun",
    "teks": "Tim menyarankan blusukan ke dusun yang paling jarang dikunjungi kades.",
    "kategori": "kampanye",
    "bobot": 6,
    "sekali": false,
    "jedaHari": 30,
    "syarat": {
      "bulanPeriodeMin": 10
    },
    "opsi": [
      {
        "id": "petani",
        "label": "Turun ke sawah bersama petani",
        "effect": {
          "kas": -2000000,
          "kepuasan": {
            "petani": 6
          }
        }
      },
      {
        "id": "pasar",
        "label": "Belanja dan ngobrol di pasar",
        "effect": {
          "kas": -2000000,
          "kepuasan": {
            "pedagang": 6,
            "pkk": 2
          }
        }
      },
      {
        "id": "nongkrong",
        "label": "Nongkrong dengan pemuda",
        "effect": {
          "kas": -2000000,
          "kepuasan": {
            "pemuda": 7
          }
        }
      }
    ]
  },
  {
    "id": "alat_peraga",
    "judul": "Tim Sukses Minta Dana Alat Peraga",
    "teks": "Masa kampanye baru dibuka. Tim sukses datang membawa contoh baliho, kaus, dan stiker. Katanya, calon lain sudah memasang baliho di tiap tikungan.",
    "kategori": "kampanye",
    "bobot": 6,
    "sekali": false,
    "jedaHari": 45,
    "syarat": {
      "bulanPeriodeMin": 10
    },
    "opsi": [
      {
        "id": "baliho",
        "label": "Pasang baliho besar di jalan utama",
        "effect": {
          "kas": -10000000,
          "popularitas": 3,
          "kepuasan": {
            "pedagang": 1
          }
        }
      },
      {
        "id": "medsos",
        "label": "Cukup kampanye lewat media sosial",
        "effect": {
          "kas": -3000000,
          "kepuasan": {
            "pemuda": 4
          }
        }
      },
      {
        "id": "rumah",
        "label": "Datangi rumah warga satu per satu, tanpa baliho",
        "effect": {
          "kepuasan": {
            "tokoh": 2,
            "pkk": 3
          },
          "integritas": 1
        }
      }
    ]
  },
  {
    "id": "staf_naik_honor",
    "judul": "Perangkat Desa Minta Naik Honor",
    "teks": "Sekdes mewakili perangkat desa: honor belum pernah naik sejak kades dilantik, padahal harga beras sudah dua kali naik.",
    "kategori": "politik",
    "bobot": 2,
    "jedaHari": 120,
    "opsi": [
      {
        "id": "naikkan",
        "label": "Beri tunjangan tambahan tahun ini",
        "effect": {
          "kas": -12000000,
          "kepuasan": {
            "tokoh": 2
          },
          "popularitas": 1
        }
      },
      {
        "id": "bertahap",
        "label": "Janji naik bertahap mulai termin depan",
        "effect": {
          "kas": -4000000
        }
      },
      {
        "id": "tolak",
        "label": "Tolak, kas sedang ketat",
        "effect": {
          "popularitas": -1
        },
        "risiko": {
          "setelahHari": 20,
          "peluang": 0.4,
          "pesan": "Perangkat desa mogok kerja setengah hari. Pelayanan surat tertunda.",
          "effect": {
            "semuaKepuasan": -2,
            "popularitas": -3
          }
        }
      }
    ]
  },
  {
    "id": "staf_bendahara_selisih",
    "judul": "Selisih di Buku Kas Bendahara",
    "teks": "Saat cek rutin, ada selisih Rp 8 jt di buku kas. Bendahara bilang \"lupa catat\", tapi baru saja ganti motor.",
    "kategori": "politik",
    "bobot": 2,
    "jedaHari": 150,
    "grup": "skandal_kas",
    "syarat": {
      "butuhPegawai": "bendahara",
      "tokohTanpaSifat": "jujur"
    },
    "opsi": [
      {
        "id": "audit_internal",
        "label": "Audit internal dan minta dikembalikan",
        "effect": {
          "kas": 6000000,
          "integritas": 2
        }
      },
      {
        "id": "pecat_lapor",
        "label": "Pecat dan laporkan ke polisi",
        "effect": {
          "kas": 8000000,
          "integritas": 4,
          "pegawaiKeluar": "bendahara",
          "kepuasan": {
            "tokoh": 2
          }
        }
      },
      {
        "id": "bagi_dua",
        "label": "Diamkan, asal kades dapat bagian",
        "effect": {
          "dompet": 4000000,
          "kecurigaan": 9,
          "integritas": -4
        }
      }
    ]
  },
  {
    "id": "staf_kaur_mundur",
    "judul": "Kaur Pembangunan Mengundurkan Diri",
    "teks": "Kaur pembangunan diterima kerja di pabrik kota dengan gaji tiga kali lipat. Surat pengunduran diri sudah di meja.",
    "kategori": "politik",
    "bobot": 2,
    "jedaHari": 180,
    "opsi": [
      {
        "id": "bujuk",
        "label": "Bujuk dengan tambahan honor",
        "effect": {
          "kas": -6000000,
          "kepuasan": {
            "tokoh": 1
          }
        }
      },
      {
        "id": "seleksi",
        "label": "Buka seleksi terbuka untuk penggantinya",
        "effect": {
          "kas": -2000000,
          "integritas": 3,
          "kepuasan": {
            "pemuda": 3
          }
        }
      },
      {
        "id": "orang_dekat",
        "label": "Angkat keponakan sendiri",
        "effect": {
          "integritas": -3,
          "kepuasan": {
            "pemuda": -3,
            "tokoh": -1
          },
          "kecurigaan": 3
        }
      }
    ]
  },
  {
    "id": "sifat_main_proyek",
    "judul": "{nama} Ketahuan Jadi Makelar Proyek",
    "teks": "{nama} ({peran}) menawarkan \"jasa pengurusan\" ke kontraktor proyek desa. Kontraktornya mengadu ke kades.",
    "kategori": "politik",
    "bobot": 2.5,
    "jedaHari": 150,
    "syarat": {
      "butuhSifat": "main_proyek"
    },
    "opsi": [
      {
        "id": "pecat",
        "label": "Pecat {nama} di depan perangkat lain",
        "effect": {
          "stafKeluar": true,
          "integritas": 3,
          "kecurigaan": -5
        }
      },
      {
        "id": "tegur",
        "label": "Tegur keras, beri kesempatan terakhir",
        "effect": {
          "stafHapusSifat": "main_proyek",
          "stafKinerja": -0.1,
          "integritas": 1
        }
      },
      {
        "id": "setoran",
        "label": "Biarkan, asal ada setoran ke kades",
        "effect": {
          "dompet": 4000000,
          "kecurigaan": 8,
          "integritas": -3
        }
      }
    ]
  },
  {
    "id": "sifat_pemalas",
    "judul": "{nama} Tidur di Jam Pelayanan",
    "teks": "Warga yang mau mengurus surat menemukan {nama} ({peran}) tertidur di meja. Fotonya sudah beredar di grup RT.",
    "kategori": "aduan",
    "bobot": 2.5,
    "jedaHari": 150,
    "syarat": {
      "butuhSifat": "pemalas"
    },
    "opsi": [
      {
        "id": "sp1",
        "label": "Beri surat peringatan pertama",
        "effect": {
          "stafKinerja": 0.15,
          "integritas": 1
        }
      },
      {
        "id": "potong",
        "label": "Potong gaji bulan ini",
        "effect": {
          "stafGajiX": 0.85,
          "kepuasan": {
            "pedagang": 1
          }
        }
      },
      {
        "id": "pecat",
        "label": "Berhentikan {nama}",
        "effect": {
          "stafKeluar": true,
          "popularitas": 1
        }
      },
      {
        "id": "maklum",
        "label": "Maklum, kerjanya memang berat",
        "effect": {
          "popularitas": -2
        }
      }
    ]
  },
  {
    "id": "sifat_sering_izin",
    "judul": "{nama} Minta Izin Seminggu Lagi",
    "teks": "{nama} ({peran}) kembali minta izin, katanya ada urusan keluarga di luar kota. Ini bukan pertama kalinya.",
    "kategori": "politik",
    "bobot": 2,
    "jedaHari": 150,
    "syarat": {
      "butuhSifat": "sering_izin"
    },
    "opsi": [
      {
        "id": "izinkan",
        "label": "Izinkan, keluarga nomor satu",
        "effect": {
          "stafKinerja": -0.05,
          "popularitas": 1
        }
      },
      {
        "id": "surat",
        "label": "Wajibkan surat keterangan",
        "effect": {
          "integritas": 1,
          "stafKinerja": 0.05
        }
      },
      {
        "id": "tolak",
        "label": "Tolak, pekerjaan menumpuk",
        "effect": {
          "stafKinerja": 0.1
        },
        "risiko": {
          "setelahHari": 20,
          "peluang": 0.35,
          "pesan": "Pegawai yang izinnya ditolak tetap tidak masuk. Kantor jadi bahan omongan.",
          "effect": {
            "popularitas": -2
          }
        }
      }
    ]
  },
  {
    "id": "agr_pupuk_langka",
    "judul": "Pupuk Bersubsidi Menghilang",
    "teks": "Musim tanam tiba, tapi kios pupuk kosong. Petani curiga ada yang menimbun dan menjualnya ke luar desa.",
    "kategori": "aduan",
    "bobot": 4.5,
    "jedaHari": 90,
    "syarat": {
      "butuhCorak": [
        "agraris"
      ]
    },
    "opsi": [
      {
        "id": "sidak",
        "label": "Sidak kios pupuk bersama Babinsa",
        "effect": {
          "kepuasan": {
            "petani": 6
          },
          "integritas": 2,
          "popularitas": 2
        }
      },
      {
        "id": "beli",
        "label": "Beli pupuk nonsubsidi pakai kas desa",
        "effect": {
          "kas": -18000000,
          "kepuasan": {
            "petani": 8
          }
        }
      },
      {
        "id": "titip",
        "label": "Terima \"jatah\" dari penimbun, tutup mata",
        "effect": {
          "dompet": 5000000,
          "kecurigaan": 6,
          "kepuasan": {
            "petani": -8
          }
        }
      }
    ]
  },
  {
    "id": "agr_hama_wereng",
    "judul": "Wereng Menyerang Sawah Lor",
    "teks": "Daun padi menguning dalam seminggu. Kelompok tani minta gerakan semprot massal sebelum menjalar.",
    "kategori": "bencana",
    "bobot": 4,
    "jedaHari": 100,
    "syarat": {
      "butuhCorak": [
        "agraris"
      ]
    },
    "opsi": [
      {
        "id": "semprot",
        "label": "Gerakan semprot serentak, kas desa tanggung obat",
        "effect": {
          "kas": -12000000,
          "kepuasan": {
            "petani": 7
          },
          "indeks": {
            "ekonomi": 1
          }
        }
      },
      {
        "id": "hayati",
        "label": "Lepas musuh alami, lebih ramah lingkungan",
        "effect": {
          "kas": -6000000,
          "indeks": {
            "lingkungan": 3
          },
          "kepuasan": {
            "petani": 2
          }
        }
      },
      {
        "id": "biarkan",
        "label": "Serahkan ke dinas pertanian",
        "effect": {
          "kepuasan": {
            "petani": -6
          },
          "indeks": {
            "ekonomi": -2
          }
        }
      }
    ]
  },
  {
    "id": "wis_viral",
    "judul": "Terasering Desa Viral di Media Sosial",
    "teks": "Video drone terasering ditonton jutaan kali. Akhir pekan ini mobil pengunjung mengular sampai jalan kabupaten.",
    "kategori": "peluang",
    "bobot": 4.5,
    "jedaHari": 90,
    "syarat": {
      "butuhCorak": [
        "wisata"
      ]
    },
    "opsi": [
      {
        "id": "tiket",
        "label": "Tarik tiket masuk resmi lewat BUMDes",
        "effect": {
          "kas": 15000000,
          "pemasukanBulanan": 1500000,
          "kepuasan": {
            "pemuda": 4,
            "petani": -2
          }
        }
      },
      {
        "id": "parkir",
        "label": "Serahkan parkir ke karang taruna",
        "effect": {
          "kepuasan": {
            "pemuda": 7
          },
          "indeks": {
            "ekonomi": 2
          }
        }
      },
      {
        "id": "pungli",
        "label": "Biarkan pungutan liar, asal ada setoran",
        "effect": {
          "dompet": 6000000,
          "kecurigaan": 5,
          "popularitas": -3
        }
      }
    ]
  },
  {
    "id": "wis_sampah",
    "judul": "Sampah Pengunjung Menumpuk di Air Terjun",
    "teks": "Botol plastik dan bungkus mi instan memenuhi kolam air terjun. Foto-foto jorok mulai beredar.",
    "kategori": "aduan",
    "bobot": 4,
    "jedaHari": 80,
    "syarat": {
      "butuhCorak": [
        "wisata"
      ]
    },
    "opsi": [
      {
        "id": "kerja_bakti",
        "label": "Kerja bakti dan pasang tong pilah",
        "effect": {
          "kas": -5000000,
          "indeks": {
            "lingkungan": 5
          },
          "kepuasan": {
            "pkk": 3
          }
        }
      },
      {
        "id": "denda",
        "label": "Terapkan denda buang sampah",
        "effect": {
          "indeks": {
            "lingkungan": 3
          },
          "popularitas": -1,
          "kas": 3000000
        }
      },
      {
        "id": "abaikan",
        "label": "Nanti juga hanyut kena hujan",
        "effect": {
          "indeks": {
            "lingkungan": -6
          },
          "popularitas": -3
        }
      }
    ]
  },
  {
    "id": "pgr_limbah",
    "judul": "Kali Berbusa Gara-gara Limbah Pabrik",
    "teks": "Air kali mendadak berbusa dan berbau. Ikan mati mengapung. Warga menunjuk saluran buangan pabrik lama di pinggir desa.",
    "kategori": "bencana",
    "bobot": 3.5,
    "jedaHari": 240,
    "syarat": {
      "butuhCorak": [
        "pinggiran"
      ]
    },
    "opsi": [
      {
        "id": "lapor",
        "label": "Laporkan ke dinas lingkungan hidup",
        "effect": {
          "indeks": {
            "lingkungan": 4
          },
          "kepuasan": {
            "petani": 4,
            "pkk": 3
          },
          "popularitas": 2
        }
      },
      {
        "id": "kompensasi",
        "label": "Minta pabrik bayar kompensasi ke kas desa",
        "effect": {
          "kas": 25000000,
          "indeks": {
            "lingkungan": -2
          },
          "kepuasan": {
            "pkk": -2
          }
        }
      },
      {
        "id": "amplop",
        "label": "Terima amplop dari manajer pabrik",
        "effect": {
          "dompet": 12000000,
          "kecurigaan": 8,
          "indeks": {
            "lingkungan": -6
          },
          "kepuasan": {
            "petani": -6
          }
        }
      }
    ]
  },
  {
    "id": "pgr_kontrakan",
    "judul": "Kontrakan Liar Tanpa Lapor RT",
    "teks": "Puluhan buruh pabrik tinggal di kontrakan baru tanpa lapor. Warga lama resah soal keamanan dan sampah.",
    "kategori": "aduan",
    "bobot": 3.5,
    "jedaHari": 240,
    "syarat": {
      "butuhCorak": [
        "pinggiran"
      ]
    },
    "opsi": [
      {
        "id": "data",
        "label": "Pendataan penghuni dan iuran kebersihan",
        "effect": {
          "kas": 6000000,
          "pemasukanBulanan": 600000,
          "kepuasan": {
            "perantau": -2,
            "pkk": 3
          }
        }
      },
      {
        "id": "rangkul",
        "label": "Rangkul perantau lewat kegiatan RT",
        "effect": {
          "kepuasan": {
            "perantau": 6
          },
          "indeks": {
            "sosial": 3
          }
        }
      },
      {
        "id": "usir",
        "label": "Razia dan usir yang tak punya surat",
        "effect": {
          "kepuasan": {
            "perantau": -9,
            "tokoh": 3
          },
          "popularitas": -1
        }
      }
    ]
  },
  {
    "id": "rel_hari_raya",
    "judul": "Tiga Hari Raya Berdekatan",
    "teks": "Tahun ini beberapa hari raya jatuh berdekatan. Pengurus rumah ibadah meminta dukungan parkir, air, dan keamanan secara bergiliran.",
    "kategori": "usulan",
    "bobot": 4.5,
    "jedaHari": 150,
    "syarat": {
      "butuhCorak": [
        "religius"
      ]
    },
    "opsi": [
      {
        "id": "semua",
        "label": "Dukung semua secara adil, kas desa tanggung",
        "effect": {
          "kas": -15000000,
          "kepuasan": {
            "tokoh": 9,
            "pedagang": 3
          },
          "indeks": {
            "sosial": 4
          },
          "popularitas": 4
        }
      },
      {
        "id": "bazar",
        "label": "Dukung dan buka bazar UMKM lintas komunitas",
        "effect": {
          "kas": -5000000,
          "kepuasan": {
            "tokoh": 5,
            "pedagang": 7
          },
          "indeks": {
            "ekonomi": 2
          }
        }
      },
      {
        "id": "pilih",
        "label": "Hanya dukung komunitas terbesar",
        "effect": {
          "kepuasan": {
            "tokoh": -6
          },
          "indeks": {
            "sosial": -4
          },
          "popularitas": -2
        }
      }
    ]
  },
  {
    "id": "rel_dangdut",
    "judul": "Pemuda Mau Gelar Konser Dangdut",
    "teks": "Karang taruna minta izin konser dangdut malam minggu. Forum tokoh agama keberatan, takut ada miras dan keributan.",
    "kategori": "politik",
    "bobot": 4,
    "jedaHari": 100,
    "syarat": {
      "butuhCorak": [
        "religius"
      ]
    },
    "opsi": [
      {
        "id": "izinkan",
        "label": "Izinkan, tapi selesai jam 10 malam",
        "effect": {
          "kepuasan": {
            "pemuda": 7,
            "tokoh": -5
          }
        }
      },
      {
        "id": "ganti",
        "label": "Ganti jadi festival musik lintas komunitas tanpa miras",
        "effect": {
          "kepuasan": {
            "pemuda": 2,
            "tokoh": 4
          },
          "indeks": {
            "sosial": 2
          }
        }
      },
      {
        "id": "larang",
        "label": "Larang",
        "effect": {
          "kepuasan": {
            "pemuda": -8,
            "tokoh": 6
          }
        }
      }
    ]
  },
  {
    "id": "sengketa_lahan",
    "judul": "Sengketa Lahan Dusun Baru",
    "teks": "Ahli waris pemilik tanah yang diserobot untuk dusun baru datang membawa pengacara dan sertifikat. Mereka menuntut ganti rugi atau membawa kasus ke pengadilan.",
    "kategori": "aduan",
    "bobot": 1,
    "sekali": false,
    "hanyaLanjutan": true,
    "opsi": [
      {
        "id": "ganti_rugi",
        "label": "Bayar ganti rugi yang layak dari kas desa",
        "effect": {
          "kas": -120000000,
          "integritas": 3,
          "kecurigaan": -6,
          "kepuasan": {
            "petani": 4
          }
        }
      },
      {
        "id": "mediasi",
        "label": "Mediasi lewat camat, bayar separuh",
        "effect": {
          "kas": -60000000,
          "kepuasan": {
            "petani": -2
          },
          "kecurigaan": -2
        }
      },
      {
        "id": "preman",
        "label": "Kirim \"orang lapangan\" untuk menekan ahli waris",
        "effect": {
          "integritas": -6,
          "kecurigaan": 15,
          "popularitas": -5,
          "kepuasan": {
            "petani": -8
          }
        }
      },
      {
        "id": "pengadilan",
        "label": "Biarkan ke pengadilan, desa punya surat",
        "effect": {
          "kas": -15000000,
          "popularitas": -3
        },
        "risiko": {
          "setelahHari": 30,
          "peluang": 0.5,
          "pesan": "Pengadilan memenangkan ahli waris. Desa wajib membayar ganti rugi plus biaya perkara.",
          "effect": {
            "kas": -160000000,
            "popularitas": -4
          }
        }
      }
    ]
  },
  {
    "id": "mega_lahan",
    "judul": "Pembebasan Lahan Proyek Besar Macet",
    "teks": "Tiga keluarga menolak melepas tanah yang dilewati proyek besar. Mereka minta harga dua kali lipat, kontraktor konsorsium mulai mengeluh.",
    "kategori": "politik",
    "bobot": 3,
    "jedaHari": 120,
    "syarat": {
      "flag": "mega_berjalan"
    },
    "opsi": [
      {
        "id": "bayar",
        "label": "Bayar harga yang diminta",
        "effect": {
          "kas": -80000000,
          "kepuasan": {
            "petani": 4
          },
          "integritas": 1
        }
      },
      {
        "id": "musyawarah",
        "label": "Musyawarah dan geser sedikit rute",
        "effect": {
          "kas": -25000000,
          "kepuasan": {
            "petani": 2,
            "tokoh": 2
          },
          "indeks": {
            "sosial": 1
          }
        }
      },
      {
        "id": "paksa",
        "label": "Minta aparat \"mengamankan\" lahan",
        "effect": {
          "integritas": -5,
          "kecurigaan": 8,
          "popularitas": -4,
          "kepuasan": {
            "petani": -8
          }
        }
      }
    ]
  },
  {
    "id": "mega_markup",
    "judul": "Konsorsium Menawarkan \"Pengertian\"",
    "teks": "Pimpinan konsorsium proyek besar mengajak makan malam. Katanya, angka RAB masih bisa \"disesuaikan\" dan kades kebagian.",
    "kategori": "politik",
    "bobot": 2.5,
    "jedaHari": 150,
    "syarat": {
      "flag": "mega_berjalan"
    },
    "opsi": [
      {
        "id": "tolak",
        "label": "Tolak, minta laporan kemajuan mingguan",
        "effect": {
          "integritas": 4,
          "kecurigaan": -3
        }
      },
      {
        "id": "terima",
        "label": "Terima bagian, toh proyeknya tetap jalan",
        "effect": {
          "dompet": 60000000,
          "kecurigaan": 14,
          "integritas": -6
        }
      },
      {
        "id": "lapor",
        "label": "Laporkan ke inspektorat",
        "effect": {
          "integritas": 6,
          "popularitas": 3,
          "kepuasan": {
            "tokoh": 3
          },
          "kas": -10000000
        }
      }
    ]
  },
  {
    "id": "mega_percepat",
    "judul": "Bupati Minta Proyek Besar Dipercepat",
    "teks": "Bupati ingin meresmikan proyek besar desa sebelum musim kampanye kabupaten. Lembur pekerja butuh biaya tambahan.",
    "kategori": "peluang",
    "bobot": 4,
    "jedaHari": 150,
    "syarat": {
      "flag": "mega_jauh"
    },
    "opsi": [
      {
        "id": "lembur",
        "label": "Setuju lembur, selesai 15 hari lebih cepat, kas desa tanggung",
        "effect": {
          "kas": -60000000,
          "setFlag": [
            "restu_bupati",
            "mega_lembur"
          ],
          "popularitas": 2
        }
      },
      {
        "id": "tolak",
        "label": "Tetap sesuai jadwal, kualitas nomor satu",
        "effect": {
          "integritas": 2,
          "setFlag": [
            "dimusuhi_bupati"
          ]
        }
      },
      {
        "id": "janji",
        "label": "Janjikan, tapi tidak dikerjakan",
        "effect": {
          "popularitas": -2,
          "kepuasan": {
            "tokoh": -2
          }
        }
      }
    ]
  },
  {
    "id": "arc_kas_1",
    "judul": "Brankas Kantor Kosong",
    "teks": "Pagi ini brankas kantor ditemukan terbuka. Uang tunai Rp 40 jt raib. Kaur keuangan, {nama}, tidak masuk kerja dan ponselnya mati.",
    "kategori": "politik",
    "bobot": 1.5,
    "sekali": true,
    "grup": "skandal_kas",
    "bersambung": true,
    "syarat": {
      "minHari": 40,
      "butuhPegawai": "bendahara"
    },
    "opsi": [
      {
        "id": "lapor",
        "label": "Lapor polisi hari ini juga",
        "effect": {
          "kas": -40000000,
          "integritas": 2,
          "setFlag": [
            "kas_dilaporkan"
          ],
          "stafKeluar": true,
          "jadwalKartu": {
            "cardId": "arc_kas_2",
            "setelahHari": 5
          }
        }
      },
      {
        "id": "cari_sendiri",
        "label": "Cari sendiri lewat keluarganya",
        "effect": {
          "kas": -42000000,
          "kepuasan": {
            "tokoh": 1
          },
          "stafKeluar": true,
          "jadwalKartu": {
            "cardId": "arc_kas_2",
            "setelahHari": 3
          }
        }
      },
      {
        "id": "tutupi",
        "label": "Tutupi dulu, ganti pakai pos anggaran lain",
        "effect": {
          "kas": -40000000,
          "integritas": -5,
          "kecurigaan": 10,
          "setFlag": [
            "kas_ditutupi"
          ],
          "stafKeluar": true,
          "jadwalKartu": {
            "cardId": "arc_kas_2",
            "setelahHari": 6
          }
        }
      }
    ]
  },
  {
    "id": "arc_kas_2",
    "judul": "Jejak di Terminal Kota",
    "teks": "Seorang ojek melihat kaur keuangan di terminal kota membawa tas besar, hendak naik bus malam ke luar provinsi.",
    "teksLanjutan": [
      {
        "flag": "kas_ditutupi",
        "teks": "Seorang ojek melihat kaur keuangan di terminal kota. Masalahnya, kas sudah \"ditutupi\" dan warga mulai curiga angka laporan tidak cocok."
      },
      {
        "flag": "kas_dilaporkan",
        "teks": "Polisi mendapat kabar kaur keuangan terlihat di terminal kota membawa tas besar, hendak naik bus malam."
      }
    ],
    "kategori": "politik",
    "bobot": 1,
    "sekali": true,
    "hanyaLanjutan": true,
    "bersambung": true,
    "opsi": [
      {
        "id": "kejar",
        "label": "Kejar ke terminal bersama linmas",
        "effect": {
          "kas": -3000000,
          "popularitas": 2,
          "jadwalKartu": {
            "cardId": "arc_kas_3",
            "setelahHari": 3
          }
        }
      },
      {
        "id": "serahkan",
        "label": "Serahkan ke polisi, tunggu kabar",
        "effect": {
          "integritas": 1,
          "jadwalKartu": {
            "cardId": "arc_kas_3",
            "setelahHari": 7
          }
        }
      },
      {
        "id": "relakan",
        "label": "Relakan, anggap pelajaran",
        "effect": {
          "popularitas": -4,
          "kepuasan": {
            "tokoh": -3
          }
        }
      }
    ]
  },
  {
    "id": "arc_kas_3",
    "judul": "Kaur Keuangan Tertangkap",
    "teks": "Kaur keuangan tertangkap. Di depan penyidik ia mengaku uang itu dipakai menutup utang judi online. Sisa uangnya Rp 25 jt.",
    "kategori": "politik",
    "bobot": 1,
    "sekali": true,
    "hanyaLanjutan": true,
    "opsi": [
      {
        "id": "hukum",
        "label": "Proses hukum, uang sisa dikembalikan ke kas",
        "effect": {
          "kas": 25000000,
          "integritas": 3,
          "popularitas": 3,
          "pecatPeran": "bendahara"
        }
      },
      {
        "id": "damai",
        "label": "Damai kekeluargaan, dia cicil sisanya",
        "effect": {
          "kas": 15000000,
          "kepuasan": {
            "tokoh": 3
          },
          "pemasukanBulanan": 1000000,
          "pecatPeran": "bendahara"
        }
      },
      {
        "id": "penyuluhan",
        "label": "Jadikan pelajaran: gelar penyuluhan bahaya judi online",
        "effect": {
          "kas": 20000000,
          "kepuasan": {
            "pemuda": 4,
            "pkk": 4
          },
          "indeks": {
            "sosial": 3
          },
          "pecatPeran": "bendahara"
        }
      }
    ]
  },
  {
    "id": "musim_imlek",
    "judul": "Imlek di Kampung Pecinan",
    "teks": "Warga Tionghoa merayakan Tahun Baru Imlek. Pengurus klenteng mengusulkan pertunjukan barongsai di depan balai desa.",
    "kategori": "usulan",
    "bobot": 3,
    "jedaHari": 300,
    "syarat": {
      "bulanTahun": [
        2
      ]
    },
    "opsi": [
      {
        "id": "barongsai",
        "label": "Dukung barongsai dan pasar lampion",
        "effect": {
          "kas": -5000000,
          "kepuasan": {
            "pedagang": 5,
            "tokoh": 3
          },
          "indeks": {
            "sosial": 2
          },
          "popularitas": 2
        }
      },
      {
        "id": "ucapan",
        "label": "Kunjungi klenteng dan sampaikan ucapan selamat",
        "effect": {
          "kepuasan": {
            "tokoh": 3
          },
          "popularitas": 1
        }
      },
      {
        "id": "lewat",
        "label": "Biarkan berjalan swadaya",
        "effect": {
          "kepuasan": {
            "pedagang": -1
          }
        }
      }
    ]
  },
  {
    "id": "musim_nyepi",
    "judul": "Hari Raya Nyepi",
    "teks": "Umat Hindu di desa akan menjalani Nyepi. Malam sebelumnya ada pawai ogoh-ogoh, dan pecalang minta jalan desa sepi sehari penuh.",
    "kategori": "usulan",
    "bobot": 3,
    "jedaHari": 300,
    "syarat": {
      "bulanTahun": [
        3
      ]
    },
    "opsi": [
      {
        "id": "pawai",
        "label": "Fasilitasi pawai ogoh-ogoh dan tutup jalan saat Nyepi",
        "effect": {
          "kas": -4000000,
          "kepuasan": {
            "tokoh": 5
          },
          "indeks": {
            "sosial": 3,
            "lingkungan": 1
          },
          "popularitas": 2
        }
      },
      {
        "id": "imbauan",
        "label": "Imbau warga lain menghormati hari sepi",
        "effect": {
          "kepuasan": {
            "tokoh": 3,
            "pedagang": -1
          },
          "indeks": {
            "sosial": 1
          }
        }
      },
      {
        "id": "biasa",
        "label": "Jalan desa tetap dibuka seperti biasa",
        "effect": {
          "kepuasan": {
            "tokoh": -5
          }
        }
      }
    ]
  },
  {
    "id": "musim_ramadan",
    "judul": "Ramadan Tiba",
    "teks": "Bulan puasa datang. Masjid minta bantuan takjil, perangkat desa ingin buka bersama, pedagang dadakan memenuhi pinggir jalan.",
    "kategori": "usulan",
    "bobot": 4,
    "jedaHari": 300,
    "syarat": {
      "bulanTahun": [
        3
      ]
    },
    "opsi": [
      {
        "id": "takjil",
        "label": "Bagi takjil gratis tiap sore di masjid",
        "effect": {
          "kas": -8000000,
          "kepuasan": {
            "tokoh": 6,
            "pkk": 2
          },
          "popularitas": 3
        }
      },
      {
        "id": "pasar_ramadan",
        "label": "Tata pasar Ramadan, tarik retribusi kecil",
        "effect": {
          "kas": 3000000,
          "kepuasan": {
            "pedagang": 5
          },
          "indeks": {
            "ekonomi": 1
          }
        }
      },
      {
        "id": "bukber",
        "label": "Buka bersama perangkat dan tokoh",
        "effect": {
          "kas": -3000000,
          "kepuasan": {
            "tokoh": 2
          }
        }
      }
    ]
  },
  {
    "id": "wakil_ijazah_1",
    "judul": "Ijazah Wakil Kades Dipertanyakan",
    "teks": "Seorang pegiat media sosial mengunggah foto ijazah SMA {wakil}. Katanya hurufnya beda dari angkatan yang sama, capnya miring, dan sekolahnya sudah tutup sebelum tahun lulus yang tertulis. Warga ramai bertanya: kades di pihak siapa?",
    "kategori": "politik",
    "bobot": 3,
    "jedaHari": 60,
    "bersambung": true,
    "syarat": {
      "flag": "wk_ijazah"
    },
    "opsi": [
      {
        "id": "uji",
        "label": "Minta uji keaslian terbuka ke dinas pendidikan",
        "effect": {
          "kas": -5000000,
          "integritas": 2,
          "wakil": {
            "loyalitas": -8,
            "sikapIjazah": "uji"
          },
          "jadwalKartu": {
            "cardId": "wakil_ijazah_2",
            "setelahHari": 10
          }
        }
      },
      {
        "id": "bela",
        "label": "Pasang badan: \"ijazahnya asli, titik\"",
        "effect": {
          "kecurigaan": 4,
          "wakil": {
            "loyalitas": 12,
            "sikapIjazah": "bela"
          },
          "jadwalKartu": {
            "cardId": "wakil_ijazah_2",
            "setelahHari": 10
          }
        }
      },
      {
        "id": "diam",
        "label": "Itu urusan pribadi wakil, kades tidak ikut campur",
        "effect": {
          "popularitas": -1,
          "wakil": {
            "sikapIjazah": "diam"
          },
          "jadwalKartu": {
            "cardId": "wakil_ijazah_2",
            "setelahHari": 14
          }
        }
      }
    ]
  },
  {
    "id": "wakil_ijazah_2",
    "judul": "Sidang Gugatan Ijazah Wakil Kades",
    "teks": "Gugatan warga soal ijazah {tergugat} masuk persidangan. Majelis meminta kantor desa menyerahkan berkas pencalonan wakil, termasuk fotokopi ijazah yang dulu dilegalisir. Putusan dibacakan esok hari.",
    "kategori": "politik",
    "bobot": 1,
    "hanyaLanjutan": true,
    "opsi": [
      {
        "id": "terbuka",
        "label": "Serahkan semua berkas apa adanya",
        "effect": {
          "integritas": 1,
          "wakil": {
            "sidang": "terbuka"
          }
        }
      },
      {
        "id": "tunda",
        "label": "Bilang berkasnya hilang kena banjir, minta sidang ditunda",
        "effect": {
          "kecurigaan": 5,
          "wakil": {
            "sidang": "tunda"
          }
        }
      },
      {
        "id": "lobi",
        "label": "Titip pesan ke majelis lewat kenalan di kabupaten",
        "effect": {
          "dompet": -15000000,
          "kecurigaan": 6,
          "wakil": {
            "sidang": "lobi"
          }
        }
      }
    ]
  },
  {
    "id": "wakil_viral",
    "judul": "Wakil Kades Viral di Pasar",
    "teks": "{wakil} viral setelah membagikan susu kotak dan kaus bergambar wajahnya sendiri di pasar desa. Videonya ditonton ribuan kali, kolom komentar penuh pujian dan sindiran. Ada yang bertanya kenapa wajah kades tidak ada di kaus itu.",
    "kategori": "politik",
    "bobot": 2.5,
    "jedaHari": 120,
    "syarat": {
      "flag": "wk_panggung"
    },
    "opsi": [
      {
        "id": "nebeng",
        "label": "Ikut tampil di video berikutnya",
        "effect": {
          "kas": -5000000,
          "popularitas": 2,
          "kepuasan": {
            "pemuda": 2
          },
          "wakil": {
            "panggung": 3
          }
        }
      },
      {
        "id": "tegur",
        "label": "Tegur: kegiatan desa jangan jadi panggung pribadi",
        "effect": {
          "integritas": 1,
          "wakil": {
            "loyalitas": -8,
            "panggung": -5
          }
        }
      },
      {
        "id": "biar",
        "label": "Biarkan saja, toh warga senang",
        "effect": {
          "kepuasan": {
            "pemuda": 1
          },
          "wakil": {
            "panggung": 8,
            "ambisi": 4
          }
        }
      }
    ]
  },
  {
    "id": "acak_tawaran_0_0",
    "judul": "Tawaran Dana Hibah Yayasan",
    "teks": "Ada tawaran dana hibah yayasan untuk desa, cair ke rekening kas. Perantaranya Bu Juminten, yang minta \"dibantu kelancarannya\".",
    "kategori": "peluang",
    "bobot": 0.05,
    "sekali": true,
    "grup": "tawaran",
    "warga": "Bu Juminten",
    "opsi": [
      {
        "id": "terima",
        "label": "Terima lewat jalur resmi",
        "effect": {
          "kas": 3000000,
          "indeks": {
            "ekonomi": 1
          },
          "kepuasan": {
            "tokoh": -1
          }
        }
      },
      {
        "id": "sunat",
        "label": "Terima, sebagian masuk kantong",
        "effect": {
          "kas": 1500000,
          "dompet": 2000000,
          "kecurigaan": 5,
          "integritas": -2
        }
      },
      {
        "id": "tolak",
        "label": "Tolak, banyak syaratnya",
        "effect": {
          "integritas": 2,
          "kepuasan": {
            "tokoh": 1
          }
        }
      }
    ]
  }
];

export const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));
