// ============================================================================
// BASE DE DONNÉES OFFICIELLE : MAPPING DES 114 SOURATES DU CORAN SUR LES 480 ATHMAN
// Certification : Division standard du Mushaf (60 Ahzab x 8 Athman = 480 Athman)
// Précision chirurgicale des intersections et bornes des 114 sourates
// ============================================================================

export interface SurahThmounPoint {
  hizb: number       // 1 à 60
  thmoun: number     // 1 à 8 (dans le Hizb)
  thmoun_id: number  // 1 à 480 (identifiant absolu du Thmoun)
}

export interface SurahMappingItem {
  id: number         // Numéro officiel de la sourate (1 à 114)
  name: string       // Nom de la sourate en arabe
  start: SurahThmounPoint
  end: SurahThmounPoint
}

export const QURAN_SURAHS_MAPPING: SurahMappingItem[] = [
  {
    "id": 1,
    "name": "الفاتحة",
    "start": {
      "hizb": 1,
      "thmoun": 1,
      "thmoun_id": 1
    },
    "end": {
      "hizb": 1,
      "thmoun": 1,
      "thmoun_id": 1
    }
  },
  {
    "id": 2,
    "name": "البقرة",
    "start": {
      "hizb": 1,
      "thmoun": 1,
      "thmoun_id": 1
    },
    "end": {
      "hizb": 5,
      "thmoun": 7,
      "thmoun_id": 39
    }
  },
  {
    "id": 3,
    "name": "آل عمران",
    "start": {
      "hizb": 5,
      "thmoun": 7,
      "thmoun_id": 39
    },
    "end": {
      "hizb": 8,
      "thmoun": 4,
      "thmoun_id": 60
    }
  },
  {
    "id": 4,
    "name": "النساء",
    "start": {
      "hizb": 8,
      "thmoun": 4,
      "thmoun_id": 60
    },
    "end": {
      "hizb": 11,
      "thmoun": 4,
      "thmoun_id": 84
    }
  },
  {
    "id": 5,
    "name": "المائدة",
    "start": {
      "hizb": 11,
      "thmoun": 4,
      "thmoun_id": 84
    },
    "end": {
      "hizb": 13,
      "thmoun": 5,
      "thmoun_id": 101
    }
  },
  {
    "id": 6,
    "name": "الأنعام",
    "start": {
      "hizb": 13,
      "thmoun": 6,
      "thmoun_id": 102
    },
    "end": {
      "hizb": 15,
      "thmoun": 8,
      "thmoun_id": 120
    }
  },
  {
    "id": 7,
    "name": "الأعراف",
    "start": {
      "hizb": 16,
      "thmoun": 1,
      "thmoun_id": 121
    },
    "end": {
      "hizb": 18,
      "thmoun": 4,
      "thmoun_id": 140
    }
  },
  {
    "id": 8,
    "name": "الأنفال",
    "start": {
      "hizb": 18,
      "thmoun": 4,
      "thmoun_id": 140
    },
    "end": {
      "hizb": 19,
      "thmoun": 4,
      "thmoun_id": 148
    }
  },
  {
    "id": 9,
    "name": "التوبة",
    "start": {
      "hizb": 19,
      "thmoun": 4,
      "thmoun_id": 148
    },
    "end": {
      "hizb": 21,
      "thmoun": 5,
      "thmoun_id": 165
    }
  },
  {
    "id": 10,
    "name": "يونس",
    "start": {
      "hizb": 21,
      "thmoun": 5,
      "thmoun_id": 165
    },
    "end": {
      "hizb": 22,
      "thmoun": 8,
      "thmoun_id": 176
    }
  },
  {
    "id": 11,
    "name": "هود",
    "start": {
      "hizb": 22,
      "thmoun": 8,
      "thmoun_id": 176
    },
    "end": {
      "hizb": 24,
      "thmoun": 4,
      "thmoun_id": 188
    }
  },
  {
    "id": 12,
    "name": "يوسف",
    "start": {
      "hizb": 24,
      "thmoun": 4,
      "thmoun_id": 188
    },
    "end": {
      "hizb": 25,
      "thmoun": 6,
      "thmoun_id": 198
    }
  },
  {
    "id": 13,
    "name": "الرعد",
    "start": {
      "hizb": 25,
      "thmoun": 6,
      "thmoun_id": 198
    },
    "end": {
      "hizb": 26,
      "thmoun": 3,
      "thmoun_id": 203
    }
  },
  {
    "id": 14,
    "name": "إبراهيم",
    "start": {
      "hizb": 26,
      "thmoun": 4,
      "thmoun_id": 204
    },
    "end": {
      "hizb": 26,
      "thmoun": 8,
      "thmoun_id": 208
    }
  },
  {
    "id": 15,
    "name": "الحجر",
    "start": {
      "hizb": 27,
      "thmoun": 1,
      "thmoun_id": 209
    },
    "end": {
      "hizb": 27,
      "thmoun": 4,
      "thmoun_id": 212
    }
  },
  {
    "id": 16,
    "name": "النحل",
    "start": {
      "hizb": 27,
      "thmoun": 5,
      "thmoun_id": 213
    },
    "end": {
      "hizb": 28,
      "thmoun": 8,
      "thmoun_id": 224
    }
  },
  {
    "id": 17,
    "name": "الإسراء",
    "start": {
      "hizb": 29,
      "thmoun": 1,
      "thmoun_id": 225
    },
    "end": {
      "hizb": 30,
      "thmoun": 1,
      "thmoun_id": 233
    }
  },
  {
    "id": 18,
    "name": "الكهف",
    "start": {
      "hizb": 30,
      "thmoun": 2,
      "thmoun_id": 234
    },
    "end": {
      "hizb": 31,
      "thmoun": 3,
      "thmoun_id": 243
    }
  },
  {
    "id": 19,
    "name": "مريم",
    "start": {
      "hizb": 31,
      "thmoun": 4,
      "thmoun_id": 244
    },
    "end": {
      "hizb": 31,
      "thmoun": 8,
      "thmoun_id": 248
    }
  },
  {
    "id": 20,
    "name": "طه",
    "start": {
      "hizb": 32,
      "thmoun": 1,
      "thmoun_id": 249
    },
    "end": {
      "hizb": 32,
      "thmoun": 8,
      "thmoun_id": 256
    }
  },
  {
    "id": 21,
    "name": "الأنبياء",
    "start": {
      "hizb": 33,
      "thmoun": 1,
      "thmoun_id": 257
    },
    "end": {
      "hizb": 33,
      "thmoun": 8,
      "thmoun_id": 264
    }
  },
  {
    "id": 22,
    "name": "الحج",
    "start": {
      "hizb": 34,
      "thmoun": 1,
      "thmoun_id": 265
    },
    "end": {
      "hizb": 34,
      "thmoun": 8,
      "thmoun_id": 272
    }
  },
  {
    "id": 23,
    "name": "المؤمنون",
    "start": {
      "hizb": 35,
      "thmoun": 1,
      "thmoun_id": 273
    },
    "end": {
      "hizb": 35,
      "thmoun": 7,
      "thmoun_id": 279
    }
  },
  {
    "id": 24,
    "name": "النور",
    "start": {
      "hizb": 35,
      "thmoun": 7,
      "thmoun_id": 279
    },
    "end": {
      "hizb": 36,
      "thmoun": 7,
      "thmoun_id": 287
    }
  },
  {
    "id": 25,
    "name": "الفرقان",
    "start": {
      "hizb": 36,
      "thmoun": 7,
      "thmoun_id": 287
    },
    "end": {
      "hizb": 37,
      "thmoun": 4,
      "thmoun_id": 292
    }
  },
  {
    "id": 26,
    "name": "الشعراء",
    "start": {
      "hizb": 37,
      "thmoun": 5,
      "thmoun_id": 293
    },
    "end": {
      "hizb": 38,
      "thmoun": 4,
      "thmoun_id": 300
    }
  },
  {
    "id": 27,
    "name": "النمل",
    "start": {
      "hizb": 38,
      "thmoun": 4,
      "thmoun_id": 300
    },
    "end": {
      "hizb": 39,
      "thmoun": 3,
      "thmoun_id": 307
    }
  },
  {
    "id": 28,
    "name": "القصص",
    "start": {
      "hizb": 39,
      "thmoun": 4,
      "thmoun_id": 308
    },
    "end": {
      "hizb": 40,
      "thmoun": 4,
      "thmoun_id": 316
    }
  },
  {
    "id": 29,
    "name": "العنكبوت",
    "start": {
      "hizb": 40,
      "thmoun": 4,
      "thmoun_id": 316
    },
    "end": {
      "hizb": 41,
      "thmoun": 2,
      "thmoun_id": 322
    }
  },
  {
    "id": 30,
    "name": "الروم",
    "start": {
      "hizb": 41,
      "thmoun": 2,
      "thmoun_id": 322
    },
    "end": {
      "hizb": 41,
      "thmoun": 7,
      "thmoun_id": 327
    }
  },
  {
    "id": 31,
    "name": "لقمان",
    "start": {
      "hizb": 41,
      "thmoun": 7,
      "thmoun_id": 327
    },
    "end": {
      "hizb": 42,
      "thmoun": 2,
      "thmoun_id": 330
    }
  },
  {
    "id": 32,
    "name": "السجدة",
    "start": {
      "hizb": 42,
      "thmoun": 2,
      "thmoun_id": 330
    },
    "end": {
      "hizb": 42,
      "thmoun": 4,
      "thmoun_id": 332
    }
  },
  {
    "id": 33,
    "name": "الأحزاب",
    "start": {
      "hizb": 42,
      "thmoun": 4,
      "thmoun_id": 332
    },
    "end": {
      "hizb": 43,
      "thmoun": 6,
      "thmoun_id": 342
    }
  },
  {
    "id": 34,
    "name": "سبأ",
    "start": {
      "hizb": 43,
      "thmoun": 6,
      "thmoun_id": 342
    },
    "end": {
      "hizb": 44,
      "thmoun": 3,
      "thmoun_id": 347
    }
  },
  {
    "id": 35,
    "name": "فاطر",
    "start": {
      "hizb": 44,
      "thmoun": 3,
      "thmoun_id": 347
    },
    "end": {
      "hizb": 44,
      "thmoun": 7,
      "thmoun_id": 351
    }
  },
  {
    "id": 36,
    "name": "يس",
    "start": {
      "hizb": 44,
      "thmoun": 8,
      "thmoun_id": 352
    },
    "end": {
      "hizb": 45,
      "thmoun": 4,
      "thmoun_id": 356
    }
  },
  {
    "id": 37,
    "name": "الصافات",
    "start": {
      "hizb": 45,
      "thmoun": 4,
      "thmoun_id": 356
    },
    "end": {
      "hizb": 46,
      "thmoun": 1,
      "thmoun_id": 361
    }
  },
  {
    "id": 38,
    "name": "ص",
    "start": {
      "hizb": 46,
      "thmoun": 2,
      "thmoun_id": 362
    },
    "end": {
      "hizb": 46,
      "thmoun": 6,
      "thmoun_id": 366
    }
  },
  {
    "id": 39,
    "name": "الزمر",
    "start": {
      "hizb": 46,
      "thmoun": 6,
      "thmoun_id": 366
    },
    "end": {
      "hizb": 47,
      "thmoun": 4,
      "thmoun_id": 372
    }
  },
  {
    "id": 40,
    "name": "غافر",
    "start": {
      "hizb": 47,
      "thmoun": 5,
      "thmoun_id": 373
    },
    "end": {
      "hizb": 48,
      "thmoun": 4,
      "thmoun_id": 380
    }
  },
  {
    "id": 41,
    "name": "فصلت",
    "start": {
      "hizb": 48,
      "thmoun": 4,
      "thmoun_id": 380
    },
    "end": {
      "hizb": 49,
      "thmoun": 1,
      "thmoun_id": 385
    }
  },
  {
    "id": 42,
    "name": "الشورى",
    "start": {
      "hizb": 49,
      "thmoun": 2,
      "thmoun_id": 386
    },
    "end": {
      "hizb": 49,
      "thmoun": 7,
      "thmoun_id": 391
    }
  },
  {
    "id": 43,
    "name": "الزخرف",
    "start": {
      "hizb": 49,
      "thmoun": 7,
      "thmoun_id": 391
    },
    "end": {
      "hizb": 50,
      "thmoun": 4,
      "thmoun_id": 396
    }
  },
  {
    "id": 44,
    "name": "الدخان",
    "start": {
      "hizb": 50,
      "thmoun": 4,
      "thmoun_id": 396
    },
    "end": {
      "hizb": 50,
      "thmoun": 6,
      "thmoun_id": 398
    }
  },
  {
    "id": 45,
    "name": "الجاثية",
    "start": {
      "hizb": 50,
      "thmoun": 6,
      "thmoun_id": 398
    },
    "end": {
      "hizb": 50,
      "thmoun": 8,
      "thmoun_id": 400
    }
  },
  {
    "id": 46,
    "name": "الأحقاف",
    "start": {
      "hizb": 51,
      "thmoun": 1,
      "thmoun_id": 401
    },
    "end": {
      "hizb": 51,
      "thmoun": 4,
      "thmoun_id": 404
    }
  },
  {
    "id": 47,
    "name": "محمد",
    "start": {
      "hizb": 51,
      "thmoun": 4,
      "thmoun_id": 404
    },
    "end": {
      "hizb": 51,
      "thmoun": 7,
      "thmoun_id": 407
    }
  },
  {
    "id": 48,
    "name": "الفتح",
    "start": {
      "hizb": 51,
      "thmoun": 7,
      "thmoun_id": 407
    },
    "end": {
      "hizb": 52,
      "thmoun": 2,
      "thmoun_id": 410
    }
  },
  {
    "id": 49,
    "name": "الحجرات",
    "start": {
      "hizb": 52,
      "thmoun": 3,
      "thmoun_id": 411
    },
    "end": {
      "hizb": 52,
      "thmoun": 5,
      "thmoun_id": 413
    }
  },
  {
    "id": 50,
    "name": "ق",
    "start": {
      "hizb": 52,
      "thmoun": 5,
      "thmoun_id": 413
    },
    "end": {
      "hizb": 52,
      "thmoun": 7,
      "thmoun_id": 415
    }
  },
  {
    "id": 51,
    "name": "الذاريات",
    "start": {
      "hizb": 52,
      "thmoun": 8,
      "thmoun_id": 416
    },
    "end": {
      "hizb": 53,
      "thmoun": 2,
      "thmoun_id": 418
    }
  },
  {
    "id": 52,
    "name": "الطور",
    "start": {
      "hizb": 53,
      "thmoun": 2,
      "thmoun_id": 418
    },
    "end": {
      "hizb": 53,
      "thmoun": 4,
      "thmoun_id": 420
    }
  },
  {
    "id": 53,
    "name": "النجم",
    "start": {
      "hizb": 53,
      "thmoun": 4,
      "thmoun_id": 420
    },
    "end": {
      "hizb": 53,
      "thmoun": 6,
      "thmoun_id": 422
    }
  },
  {
    "id": 54,
    "name": "القمر",
    "start": {
      "hizb": 53,
      "thmoun": 6,
      "thmoun_id": 422
    },
    "end": {
      "hizb": 53,
      "thmoun": 8,
      "thmoun_id": 424
    }
  },
  {
    "id": 55,
    "name": "الرحمن",
    "start": {
      "hizb": 54,
      "thmoun": 1,
      "thmoun_id": 425
    },
    "end": {
      "hizb": 54,
      "thmoun": 3,
      "thmoun_id": 427
    }
  },
  {
    "id": 56,
    "name": "الواقعة",
    "start": {
      "hizb": 54,
      "thmoun": 3,
      "thmoun_id": 427
    },
    "end": {
      "hizb": 54,
      "thmoun": 5,
      "thmoun_id": 429
    }
  },
  {
    "id": 57,
    "name": "الحديد",
    "start": {
      "hizb": 54,
      "thmoun": 5,
      "thmoun_id": 429
    },
    "end": {
      "hizb": 54,
      "thmoun": 8,
      "thmoun_id": 432
    }
  },
  {
    "id": 58,
    "name": "المجادلة",
    "start": {
      "hizb": 55,
      "thmoun": 1,
      "thmoun_id": 433
    },
    "end": {
      "hizb": 55,
      "thmoun": 3,
      "thmoun_id": 435
    }
  },
  {
    "id": 59,
    "name": "الحشر",
    "start": {
      "hizb": 55,
      "thmoun": 3,
      "thmoun_id": 435
    },
    "end": {
      "hizb": 55,
      "thmoun": 5,
      "thmoun_id": 437
    }
  },
  {
    "id": 60,
    "name": "الممتحنة",
    "start": {
      "hizb": 55,
      "thmoun": 6,
      "thmoun_id": 438
    },
    "end": {
      "hizb": 55,
      "thmoun": 7,
      "thmoun_id": 439
    }
  },
  {
    "id": 61,
    "name": "الصف",
    "start": {
      "hizb": 55,
      "thmoun": 8,
      "thmoun_id": 440
    },
    "end": {
      "hizb": 55,
      "thmoun": 8,
      "thmoun_id": 440
    }
  },
  {
    "id": 62,
    "name": "الجمعة",
    "start": {
      "hizb": 56,
      "thmoun": 1,
      "thmoun_id": 441
    },
    "end": {
      "hizb": 56,
      "thmoun": 2,
      "thmoun_id": 442
    }
  },
  {
    "id": 63,
    "name": "المنافقون",
    "start": {
      "hizb": 56,
      "thmoun": 2,
      "thmoun_id": 442
    },
    "end": {
      "hizb": 56,
      "thmoun": 3,
      "thmoun_id": 443
    }
  },
  {
    "id": 64,
    "name": "التغابن",
    "start": {
      "hizb": 56,
      "thmoun": 3,
      "thmoun_id": 443
    },
    "end": {
      "hizb": 56,
      "thmoun": 5,
      "thmoun_id": 445
    }
  },
  {
    "id": 65,
    "name": "الطلاق",
    "start": {
      "hizb": 56,
      "thmoun": 5,
      "thmoun_id": 445
    },
    "end": {
      "hizb": 56,
      "thmoun": 7,
      "thmoun_id": 447
    }
  },
  {
    "id": 66,
    "name": "التحريم",
    "start": {
      "hizb": 56,
      "thmoun": 7,
      "thmoun_id": 447
    },
    "end": {
      "hizb": 56,
      "thmoun": 8,
      "thmoun_id": 448
    }
  },
  {
    "id": 67,
    "name": "الملك",
    "start": {
      "hizb": 57,
      "thmoun": 1,
      "thmoun_id": 449
    },
    "end": {
      "hizb": 57,
      "thmoun": 2,
      "thmoun_id": 450
    }
  },
  {
    "id": 68,
    "name": "القلم",
    "start": {
      "hizb": 57,
      "thmoun": 2,
      "thmoun_id": 450
    },
    "end": {
      "hizb": 57,
      "thmoun": 4,
      "thmoun_id": 452
    }
  },
  {
    "id": 69,
    "name": "الحاقة",
    "start": {
      "hizb": 57,
      "thmoun": 4,
      "thmoun_id": 452
    },
    "end": {
      "hizb": 57,
      "thmoun": 5,
      "thmoun_id": 453
    }
  },
  {
    "id": 70,
    "name": "المعارج",
    "start": {
      "hizb": 57,
      "thmoun": 5,
      "thmoun_id": 453
    },
    "end": {
      "hizb": 57,
      "thmoun": 7,
      "thmoun_id": 455
    }
  },
  {
    "id": 71,
    "name": "نوح",
    "start": {
      "hizb": 57,
      "thmoun": 7,
      "thmoun_id": 455
    },
    "end": {
      "hizb": 57,
      "thmoun": 8,
      "thmoun_id": 456
    }
  },
  {
    "id": 72,
    "name": "الجن",
    "start": {
      "hizb": 58,
      "thmoun": 1,
      "thmoun_id": 457
    },
    "end": {
      "hizb": 58,
      "thmoun": 2,
      "thmoun_id": 458
    }
  },
  {
    "id": 73,
    "name": "المزمل",
    "start": {
      "hizb": 58,
      "thmoun": 2,
      "thmoun_id": 458
    },
    "end": {
      "hizb": 58,
      "thmoun": 3,
      "thmoun_id": 459
    }
  },
  {
    "id": 74,
    "name": "المدثر",
    "start": {
      "hizb": 58,
      "thmoun": 3,
      "thmoun_id": 459
    },
    "end": {
      "hizb": 58,
      "thmoun": 4,
      "thmoun_id": 460
    }
  },
  {
    "id": 75,
    "name": "القيامة",
    "start": {
      "hizb": 58,
      "thmoun": 5,
      "thmoun_id": 461
    },
    "end": {
      "hizb": 58,
      "thmoun": 5,
      "thmoun_id": 461
    }
  },
  {
    "id": 76,
    "name": "الإنسان",
    "start": {
      "hizb": 58,
      "thmoun": 6,
      "thmoun_id": 462
    },
    "end": {
      "hizb": 58,
      "thmoun": 7,
      "thmoun_id": 463
    }
  },
  {
    "id": 77,
    "name": "المرسلات",
    "start": {
      "hizb": 58,
      "thmoun": 7,
      "thmoun_id": 463
    },
    "end": {
      "hizb": 58,
      "thmoun": 8,
      "thmoun_id": 464
    }
  },
  {
    "id": 78,
    "name": "النبأ",
    "start": {
      "hizb": 59,
      "thmoun": 1,
      "thmoun_id": 465
    },
    "end": {
      "hizb": 59,
      "thmoun": 1,
      "thmoun_id": 465
    }
  },
  {
    "id": 79,
    "name": "النازعات",
    "start": {
      "hizb": 59,
      "thmoun": 2,
      "thmoun_id": 466
    },
    "end": {
      "hizb": 59,
      "thmoun": 3,
      "thmoun_id": 467
    }
  },
  {
    "id": 80,
    "name": "عبس",
    "start": {
      "hizb": 59,
      "thmoun": 3,
      "thmoun_id": 467
    },
    "end": {
      "hizb": 59,
      "thmoun": 4,
      "thmoun_id": 468
    }
  },
  {
    "id": 81,
    "name": "التكوير",
    "start": {
      "hizb": 59,
      "thmoun": 4,
      "thmoun_id": 468
    },
    "end": {
      "hizb": 59,
      "thmoun": 5,
      "thmoun_id": 469
    }
  },
  {
    "id": 82,
    "name": "الانفطار",
    "start": {
      "hizb": 59,
      "thmoun": 5,
      "thmoun_id": 469
    },
    "end": {
      "hizb": 59,
      "thmoun": 5,
      "thmoun_id": 469
    }
  },
  {
    "id": 83,
    "name": "المطففين",
    "start": {
      "hizb": 59,
      "thmoun": 5,
      "thmoun_id": 469
    },
    "end": {
      "hizb": 59,
      "thmoun": 6,
      "thmoun_id": 470
    }
  },
  {
    "id": 84,
    "name": "الانشقاق",
    "start": {
      "hizb": 59,
      "thmoun": 6,
      "thmoun_id": 470
    },
    "end": {
      "hizb": 59,
      "thmoun": 7,
      "thmoun_id": 471
    }
  },
  {
    "id": 85,
    "name": "البروج",
    "start": {
      "hizb": 59,
      "thmoun": 7,
      "thmoun_id": 471
    },
    "end": {
      "hizb": 59,
      "thmoun": 8,
      "thmoun_id": 472
    }
  },
  {
    "id": 86,
    "name": "الطارق",
    "start": {
      "hizb": 59,
      "thmoun": 8,
      "thmoun_id": 472
    },
    "end": {
      "hizb": 59,
      "thmoun": 8,
      "thmoun_id": 472
    }
  },
  {
    "id": 87,
    "name": "الأعلى",
    "start": {
      "hizb": 60,
      "thmoun": 1,
      "thmoun_id": 473
    },
    "end": {
      "hizb": 60,
      "thmoun": 1,
      "thmoun_id": 473
    }
  },
  {
    "id": 88,
    "name": "الغاشية",
    "start": {
      "hizb": 60,
      "thmoun": 1,
      "thmoun_id": 473
    },
    "end": {
      "hizb": 60,
      "thmoun": 2,
      "thmoun_id": 474
    }
  },
  {
    "id": 89,
    "name": "الفجر",
    "start": {
      "hizb": 60,
      "thmoun": 2,
      "thmoun_id": 474
    },
    "end": {
      "hizb": 60,
      "thmoun": 2,
      "thmoun_id": 474
    }
  },
  {
    "id": 90,
    "name": "البلد",
    "start": {
      "hizb": 60,
      "thmoun": 3,
      "thmoun_id": 475
    },
    "end": {
      "hizb": 60,
      "thmoun": 3,
      "thmoun_id": 475
    }
  },
  {
    "id": 91,
    "name": "الشمس",
    "start": {
      "hizb": 60,
      "thmoun": 3,
      "thmoun_id": 475
    },
    "end": {
      "hizb": 60,
      "thmoun": 3,
      "thmoun_id": 475
    }
  },
  {
    "id": 92,
    "name": "الليل",
    "start": {
      "hizb": 60,
      "thmoun": 4,
      "thmoun_id": 476
    },
    "end": {
      "hizb": 60,
      "thmoun": 4,
      "thmoun_id": 476
    }
  },
  {
    "id": 93,
    "name": "الضحى",
    "start": {
      "hizb": 60,
      "thmoun": 4,
      "thmoun_id": 476
    },
    "end": {
      "hizb": 60,
      "thmoun": 4,
      "thmoun_id": 476
    }
  },
  {
    "id": 94,
    "name": "الشرح",
    "start": {
      "hizb": 60,
      "thmoun": 5,
      "thmoun_id": 477
    },
    "end": {
      "hizb": 60,
      "thmoun": 5,
      "thmoun_id": 477
    }
  },
  {
    "id": 95,
    "name": "التين",
    "start": {
      "hizb": 60,
      "thmoun": 5,
      "thmoun_id": 477
    },
    "end": {
      "hizb": 60,
      "thmoun": 5,
      "thmoun_id": 477
    }
  },
  {
    "id": 96,
    "name": "العلق",
    "start": {
      "hizb": 60,
      "thmoun": 5,
      "thmoun_id": 477
    },
    "end": {
      "hizb": 60,
      "thmoun": 5,
      "thmoun_id": 477
    }
  },
  {
    "id": 97,
    "name": "القدر",
    "start": {
      "hizb": 60,
      "thmoun": 6,
      "thmoun_id": 478
    },
    "end": {
      "hizb": 60,
      "thmoun": 6,
      "thmoun_id": 478
    }
  },
  {
    "id": 98,
    "name": "البينة",
    "start": {
      "hizb": 60,
      "thmoun": 6,
      "thmoun_id": 478
    },
    "end": {
      "hizb": 60,
      "thmoun": 6,
      "thmoun_id": 478
    }
  },
  {
    "id": 99,
    "name": "الزلزلة",
    "start": {
      "hizb": 60,
      "thmoun": 6,
      "thmoun_id": 478
    },
    "end": {
      "hizb": 60,
      "thmoun": 6,
      "thmoun_id": 478
    }
  },
  {
    "id": 100,
    "name": "العاديات",
    "start": {
      "hizb": 60,
      "thmoun": 6,
      "thmoun_id": 478
    },
    "end": {
      "hizb": 60,
      "thmoun": 7,
      "thmoun_id": 479
    }
  },
  {
    "id": 101,
    "name": "القارعة",
    "start": {
      "hizb": 60,
      "thmoun": 7,
      "thmoun_id": 479
    },
    "end": {
      "hizb": 60,
      "thmoun": 7,
      "thmoun_id": 479
    }
  },
  {
    "id": 102,
    "name": "التكاثر",
    "start": {
      "hizb": 60,
      "thmoun": 7,
      "thmoun_id": 479
    },
    "end": {
      "hizb": 60,
      "thmoun": 7,
      "thmoun_id": 479
    }
  },
  {
    "id": 103,
    "name": "العصر",
    "start": {
      "hizb": 60,
      "thmoun": 7,
      "thmoun_id": 479
    },
    "end": {
      "hizb": 60,
      "thmoun": 7,
      "thmoun_id": 479
    }
  },
  {
    "id": 104,
    "name": "الهمزة",
    "start": {
      "hizb": 60,
      "thmoun": 7,
      "thmoun_id": 479
    },
    "end": {
      "hizb": 60,
      "thmoun": 7,
      "thmoun_id": 479
    }
  },
  {
    "id": 105,
    "name": "الفيل",
    "start": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    },
    "end": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    }
  },
  {
    "id": 106,
    "name": "قريش",
    "start": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    },
    "end": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    }
  },
  {
    "id": 107,
    "name": "الماعون",
    "start": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    },
    "end": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    }
  },
  {
    "id": 108,
    "name": "الكوثر",
    "start": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    },
    "end": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    }
  },
  {
    "id": 109,
    "name": "الكافرون",
    "start": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    },
    "end": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    }
  },
  {
    "id": 110,
    "name": "النصر",
    "start": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    },
    "end": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    }
  },
  {
    "id": 111,
    "name": "المسد",
    "start": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    },
    "end": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    }
  },
  {
    "id": 112,
    "name": "الإخلاص",
    "start": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    },
    "end": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    }
  },
  {
    "id": 113,
    "name": "الفلق",
    "start": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    },
    "end": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    }
  },
  {
    "id": 114,
    "name": "الناس",
    "start": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    },
    "end": {
      "hizb": 60,
      "thmoun": 8,
      "thmoun_id": 480
    }
  }
];

/**
 * Récupère le mapping d'une sourate par son numéro (1 à 114)
 */
export function getSurahMapping(surahId: number): SurahMappingItem | undefined {
  return QURAN_SURAHS_MAPPING[surahId - 1];
}

/**
 * Récupère toutes les sourates qui traversent un Hizb donné (1 à 60)
 */
export function getSurahsCrossingHizb(hizbNumber: number): {
  surah: SurahMappingItem;
  startQuarter: number; // 1 à 8 dans ce Hizb
  endQuarter: number;   // 1 à 8 dans ce Hizb
}[] {
  const minThmounId = (hizbNumber - 1) * 8 + 1;
  const maxThmounId = hizbNumber * 8;

  const result: { surah: SurahMappingItem; startQuarter: number; endQuarter: number }[] = [];

  for (const surah of QURAN_SURAHS_MAPPING) {
    if (surah.start.thmoun_id <= maxThmounId && surah.end.thmoun_id >= minThmounId) {
      const startQuarter = Math.max(1, surah.start.thmoun_id - minThmounId + 1);
      const endQuarter = Math.min(8, surah.end.thmoun_id - minThmounId + 1);
      result.push({ surah, startQuarter, endQuarter });
    }
  }

  return result;
}

/**
 * Récupère les sourates associées à un Thmoun absolu (1 à 480)
 */
export function getSurahsInThmoun(thmounId: number): SurahMappingItem[] {
  return QURAN_SURAHS_MAPPING.filter(
    (s) => s.start.thmoun_id <= thmounId && s.end.thmoun_id >= thmounId
  );
}
