// ============================================================================
// Mapping officiel des 114 Sourates du Coran à travers les 60 Ahzab (480 Athman)
// Permet de superposer géométriquement les barres de Sourates sur les 8 blocs
// ============================================================================

export interface SurahMiniInfo {
  surahNumber: number
  surahNameAr: string
}

export interface HizbSurahSpan {
  surahNumber: number
  surahNameAr: string
  startQuarter: number // 1 à 8 (indice du thmoun dans ce Hizb)
  endQuarter: number   // 1 à 8 (indice du thmoun dans ce Hizb)
  flexWeight?: number  // Ratio flex pour l'alignement géométrique au-dessus des 8 blocs
  ayahRangeAr?: string
  isStartOfSurah?: boolean
  isEndOfSurah?: boolean
  clusterSurahs?: SurahMiniInfo[] // Petites sourates regroupées dans le même intervalle
}

export const HIZB_SURAHS_MAP: Record<number, HizbSurahSpan[]> = {
  1: [
    { surahNumber: 1, surahNameAr: 'الفاتحة', startQuarter: 1, endQuarter: 1, flexWeight: 0.85, ayahRangeAr: '1-7', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 2, surahNameAr: 'البقرة', startQuarter: 1, endQuarter: 8, flexWeight: 7.15, ayahRangeAr: '1-74', isStartOfSurah: true },
  ],
  2: [
    { surahNumber: 2, surahNameAr: 'البقرة', startQuarter: 1, endQuarter: 8, ayahRangeAr: '75-141' },
  ],
  3: [
    { surahNumber: 2, surahNameAr: 'البقرة', startQuarter: 1, endQuarter: 8, ayahRangeAr: '142-202' },
  ],
  4: [
    { surahNumber: 2, surahNameAr: 'البقرة', startQuarter: 1, endQuarter: 8, ayahRangeAr: '203-252' },
  ],
  5: [
    { surahNumber: 2, surahNameAr: 'البقرة', startQuarter: 1, endQuarter: 6, ayahRangeAr: '253-286', isEndOfSurah: true },
    { surahNumber: 3, surahNameAr: 'آل عمران', startQuarter: 7, endQuarter: 8, ayahRangeAr: '1-14', isStartOfSurah: true },
  ],
  6: [
    { surahNumber: 3, surahNameAr: 'آل عمران', startQuarter: 1, endQuarter: 8, ayahRangeAr: '15-92' },
  ],
  7: [
    { surahNumber: 3, surahNameAr: 'آل عمران', startQuarter: 1, endQuarter: 8, ayahRangeAr: '93-170' },
  ],
  8: [
    { surahNumber: 3, surahNameAr: 'آل عمران', startQuarter: 1, endQuarter: 5, ayahRangeAr: '171-200', isEndOfSurah: true },
    { surahNumber: 4, surahNameAr: 'النساء', startQuarter: 6, endQuarter: 8, ayahRangeAr: '1-23', isStartOfSurah: true },
  ],
  9: [
    { surahNumber: 4, surahNameAr: 'النساء', startQuarter: 1, endQuarter: 8, ayahRangeAr: '24-87' },
  ],
  10: [
    { surahNumber: 4, surahNameAr: 'النساء', startQuarter: 1, endQuarter: 8, ayahRangeAr: '88-147' },
  ],
  11: [
    { surahNumber: 4, surahNameAr: 'النساء', startQuarter: 1, endQuarter: 8, ayahRangeAr: '148-176', isEndOfSurah: true },
  ],
  12: [
    { surahNumber: 5, surahNameAr: 'المائدة', startQuarter: 1, endQuarter: 8, ayahRangeAr: '1-81', isStartOfSurah: true },
  ],
  13: [
    { surahNumber: 5, surahNameAr: 'المائدة', startQuarter: 1, endQuarter: 8, ayahRangeAr: '82-120', isEndOfSurah: true },
  ],
  14: [
    { surahNumber: 6, surahNameAr: 'الأنعام', startQuarter: 1, endQuarter: 8, ayahRangeAr: '1-110', isStartOfSurah: true },
  ],
  15: [
    { surahNumber: 6, surahNameAr: 'الأنعام', startQuarter: 1, endQuarter: 8, ayahRangeAr: '111-165', isEndOfSurah: true },
  ],
  16: [
    { surahNumber: 7, surahNameAr: 'الأعراف', startQuarter: 1, endQuarter: 8, ayahRangeAr: '1-87', isStartOfSurah: true },
  ],
  17: [
    { surahNumber: 7, surahNameAr: 'الأعراف', startQuarter: 1, endQuarter: 8, ayahRangeAr: '88-170' },
  ],
  18: [
    { surahNumber: 7, surahNameAr: 'الأعراف', startQuarter: 1, endQuarter: 8, ayahRangeAr: '171-206', isEndOfSurah: true },
  ],
  19: [
    { surahNumber: 8, surahNameAr: 'الأنفال', startQuarter: 1, endQuarter: 8, ayahRangeAr: '1-75', isStartOfSurah: true, isEndOfSurah: true },
  ],
  20: [
    { surahNumber: 9, surahNameAr: 'التوبة', startQuarter: 1, endQuarter: 8, ayahRangeAr: '1-92', isStartOfSurah: true },
  ],
  21: [
    { surahNumber: 9, surahNameAr: 'التوبة', startQuarter: 1, endQuarter: 8, ayahRangeAr: '93-129', isEndOfSurah: true },
  ],
  22: [
    { surahNumber: 10, surahNameAr: 'يونس', startQuarter: 1, endQuarter: 8, ayahRangeAr: '1-109', isStartOfSurah: true, isEndOfSurah: true },
  ],
  23: [
    { surahNumber: 11, surahNameAr: 'هود', startQuarter: 1, endQuarter: 8, ayahRangeAr: '1-83', isStartOfSurah: true },
  ],
  24: [
    { surahNumber: 11, surahNameAr: 'هود', startQuarter: 1, endQuarter: 5, ayahRangeAr: '84-123', isEndOfSurah: true },
    { surahNumber: 12, surahNameAr: 'يوسف', startQuarter: 6, endQuarter: 8, ayahRangeAr: '1-52', isStartOfSurah: true },
  ],
  25: [
    { surahNumber: 12, surahNameAr: 'يوسف', startQuarter: 1, endQuarter: 8, ayahRangeAr: '53-111', isEndOfSurah: true },
  ],
  26: [
    { surahNumber: 13, surahNameAr: 'الرعد', startQuarter: 1, endQuarter: 4, ayahRangeAr: '1-43', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 14, surahNameAr: 'إبراهيم', startQuarter: 5, endQuarter: 8, ayahRangeAr: '1-52', isStartOfSurah: true, isEndOfSurah: true },
  ],
  27: [
    { surahNumber: 15, surahNameAr: 'الحجر', startQuarter: 1, endQuarter: 4, ayahRangeAr: '1-99', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 16, surahNameAr: 'النحل', startQuarter: 5, endQuarter: 8, ayahRangeAr: '1-50', isStartOfSurah: true },
  ],
  28: [
    { surahNumber: 16, surahNameAr: 'النحل', startQuarter: 1, endQuarter: 8, ayahRangeAr: '51-128', isEndOfSurah: true },
  ],
  29: [
    { surahNumber: 17, surahNameAr: 'الإسراء', startQuarter: 1, endQuarter: 8, ayahRangeAr: '1-111', isStartOfSurah: true, isEndOfSurah: true },
  ],
  30: [
    { surahNumber: 18, surahNameAr: 'الكهف', startQuarter: 1, endQuarter: 8, ayahRangeAr: '1-74', isStartOfSurah: true },
  ],
  31: [
    { surahNumber: 18, surahNameAr: 'الكهف', startQuarter: 1, endQuarter: 6, ayahRangeAr: '75-110', isEndOfSurah: true },
    { surahNumber: 19, surahNameAr: 'مريم', startQuarter: 7, endQuarter: 8, ayahRangeAr: '1-98', isStartOfSurah: true, isEndOfSurah: true },
  ],
  32: [
    { surahNumber: 20, surahNameAr: 'طه', startQuarter: 1, endQuarter: 8, ayahRangeAr: '1-135', isStartOfSurah: true, isEndOfSurah: true },
  ],
  33: [
    { surahNumber: 21, surahNameAr: 'الأنبياء', startQuarter: 1, endQuarter: 8, ayahRangeAr: '1-112', isStartOfSurah: true, isEndOfSurah: true },
  ],
  34: [
    { surahNumber: 22, surahNameAr: 'الحج', startQuarter: 1, endQuarter: 8, ayahRangeAr: '1-78', isStartOfSurah: true, isEndOfSurah: true },
  ],
  35: [
    { surahNumber: 23, surahNameAr: 'المؤمنون', startQuarter: 1, endQuarter: 8, ayahRangeAr: '1-118', isStartOfSurah: true, isEndOfSurah: true },
  ],
  36: [
    { surahNumber: 24, surahNameAr: 'النور', startQuarter: 1, endQuarter: 8, ayahRangeAr: '1-64', isStartOfSurah: true, isEndOfSurah: true },
  ],
  37: [
    { surahNumber: 25, surahNameAr: 'الفرقان', startQuarter: 1, endQuarter: 6, ayahRangeAr: '1-77', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 26, surahNameAr: 'الشعراء', startQuarter: 7, endQuarter: 8, ayahRangeAr: '1-110', isStartOfSurah: true },
  ],
  38: [
    { surahNumber: 26, surahNameAr: 'الشعراء', startQuarter: 1, endQuarter: 5, ayahRangeAr: '111-227', isEndOfSurah: true },
    { surahNumber: 27, surahNameAr: 'النمل', startQuarter: 6, endQuarter: 8, ayahRangeAr: '1-55', isStartOfSurah: true },
  ],
  39: [
    { surahNumber: 27, surahNameAr: 'النمل', startQuarter: 1, endQuarter: 4, ayahRangeAr: '56-93', isEndOfSurah: true },
    { surahNumber: 28, surahNameAr: 'القصص', startQuarter: 5, endQuarter: 8, ayahRangeAr: '1-50', isStartOfSurah: true },
  ],
  40: [
    { surahNumber: 28, surahNameAr: 'القصص', startQuarter: 1, endQuarter: 5, ayahRangeAr: '51-88', isEndOfSurah: true },
    { surahNumber: 29, surahNameAr: 'العنكبوت', startQuarter: 6, endQuarter: 8, ayahRangeAr: '1-45', isStartOfSurah: true },
  ],
  41: [
    { surahNumber: 29, surahNameAr: 'العنكبوت', startQuarter: 1, endQuarter: 2, ayahRangeAr: '46-69', isEndOfSurah: true },
    { surahNumber: 30, surahNameAr: 'الروم', startQuarter: 3, endQuarter: 6, ayahRangeAr: '1-60', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 31, surahNameAr: 'لقمان', startQuarter: 7, endQuarter: 8, ayahRangeAr: '1-21', isStartOfSurah: true },
  ],
  42: [
    { surahNumber: 31, surahNameAr: 'لقمان', startQuarter: 1, endQuarter: 1, ayahRangeAr: '22-34', isEndOfSurah: true },
    { surahNumber: 32, surahNameAr: 'السجدة', startQuarter: 2, endQuarter: 3, ayahRangeAr: '1-30', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 33, surahNameAr: 'الأحزاب', startQuarter: 4, endQuarter: 8, ayahRangeAr: '1-50', isStartOfSurah: true },
  ],
  43: [
    { surahNumber: 33, surahNameAr: 'الأحزاب', startQuarter: 1, endQuarter: 4, ayahRangeAr: '51-73', isEndOfSurah: true },
    { surahNumber: 34, surahNameAr: 'سبأ', startQuarter: 5, endQuarter: 8, ayahRangeAr: '1-54', isStartOfSurah: true, isEndOfSurah: true },
  ],
  44: [
    { surahNumber: 35, surahNameAr: 'فاطر', startQuarter: 1, endQuarter: 5, ayahRangeAr: '1-45', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 36, surahNameAr: 'يس', startQuarter: 6, endQuarter: 8, ayahRangeAr: '1-83', isStartOfSurah: true, isEndOfSurah: true },
  ],
  45: [
    { surahNumber: 37, surahNameAr: 'الصافات', startQuarter: 1, endQuarter: 7, ayahRangeAr: '1-182', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 38, surahNameAr: 'ص', startQuarter: 8, endQuarter: 8, ayahRangeAr: '1-20', isStartOfSurah: true },
  ],
  46: [
    { surahNumber: 38, surahNameAr: 'ص', startQuarter: 1, endQuarter: 4, ayahRangeAr: '21-88', isEndOfSurah: true },
    { surahNumber: 39, surahNameAr: 'الزمر', startQuarter: 5, endQuarter: 8, ayahRangeAr: '1-75', isStartOfSurah: true, isEndOfSurah: true },
  ],
  47: [
    { surahNumber: 40, surahNameAr: 'غافر', startQuarter: 1, endQuarter: 8, ayahRangeAr: '1-85', isStartOfSurah: true, isEndOfSurah: true },
  ],
  48: [
    { surahNumber: 41, surahNameAr: 'فصلت', startQuarter: 1, endQuarter: 6, ayahRangeAr: '1-54', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 42, surahNameAr: 'الشورى', startQuarter: 7, endQuarter: 8, ayahRangeAr: '1-26', isStartOfSurah: true },
  ],
  49: [
    { surahNumber: 42, surahNameAr: 'الشورى', startQuarter: 1, endQuarter: 3, ayahRangeAr: '27-53', isEndOfSurah: true },
    { surahNumber: 43, surahNameAr: 'الزخرف', startQuarter: 4, endQuarter: 8, ayahRangeAr: '1-89', isStartOfSurah: true, isEndOfSurah: true },
  ],
  50: [
    { surahNumber: 44, surahNameAr: 'الدخان', startQuarter: 1, endQuarter: 3, ayahRangeAr: '1-59', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 45, surahNameAr: 'الجاثية', startQuarter: 4, endQuarter: 6, ayahRangeAr: '1-37', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 46, surahNameAr: 'الأحقاف', startQuarter: 7, endQuarter: 8, ayahRangeAr: '1-20', isStartOfSurah: true },
  ],
  51: [
    { surahNumber: 46, surahNameAr: 'الأحقاف', startQuarter: 1, endQuarter: 2, ayahRangeAr: '21-35', isEndOfSurah: true },
    { surahNumber: 47, surahNameAr: 'محمد', startQuarter: 3, endQuarter: 5, ayahRangeAr: '1-38', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 48, surahNameAr: 'الفتح', startQuarter: 6, endQuarter: 8, ayahRangeAr: '1-29', isStartOfSurah: true, isEndOfSurah: true },
  ],
  52: [
    { surahNumber: 49, surahNameAr: 'الحجرات', startQuarter: 1, endQuarter: 2, ayahRangeAr: '1-18', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 50, surahNameAr: 'ق', startQuarter: 3, endQuarter: 5, ayahRangeAr: '1-45', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 51, surahNameAr: 'الذاريات', startQuarter: 6, endQuarter: 8, ayahRangeAr: '1-60', isStartOfSurah: true, isEndOfSurah: true },
  ],
  53: [
    { surahNumber: 52, surahNameAr: 'الطور', startQuarter: 1, endQuarter: 2, ayahRangeAr: '1-49', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 53, surahNameAr: 'النجم', startQuarter: 3, endQuarter: 4, ayahRangeAr: '1-62', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 54, surahNameAr: 'القمر', startQuarter: 5, endQuarter: 6, ayahRangeAr: '1-55', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 55, surahNameAr: 'الرحمن', startQuarter: 7, endQuarter: 8, ayahRangeAr: '1-78', isStartOfSurah: true, isEndOfSurah: true },
  ],
  54: [
    { surahNumber: 56, surahNameAr: 'الواقعة', startQuarter: 1, endQuarter: 4, ayahRangeAr: '1-96', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 57, surahNameAr: 'الحديد', startQuarter: 5, endQuarter: 8, ayahRangeAr: '1-29', isStartOfSurah: true, isEndOfSurah: true },
  ],
  55: [
    { surahNumber: 58, surahNameAr: 'المجادلة', startQuarter: 1, endQuarter: 3, ayahRangeAr: '1-22', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 59, surahNameAr: 'الحشر', startQuarter: 4, endQuarter: 6, ayahRangeAr: '1-24', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 60, surahNameAr: 'الممتحنة', startQuarter: 7, endQuarter: 8, ayahRangeAr: '1-13', isStartOfSurah: true, isEndOfSurah: true },
  ],
  56: [
    { surahNumber: 61, surahNameAr: 'الصف', startQuarter: 1, endQuarter: 2, ayahRangeAr: '1-14', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 62, surahNameAr: 'الجمعة', startQuarter: 3, endQuarter: 3, ayahRangeAr: '1-11', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 63, surahNameAr: 'المنافقون', startQuarter: 4, endQuarter: 4, ayahRangeAr: '1-11', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 64, surahNameAr: 'التغابن', startQuarter: 5, endQuarter: 6, ayahRangeAr: '1-18', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 65, surahNameAr: 'الطلاق', startQuarter: 7, endQuarter: 7, ayahRangeAr: '1-12', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 66, surahNameAr: 'التحريم', startQuarter: 8, endQuarter: 8, ayahRangeAr: '1-12', isStartOfSurah: true, isEndOfSurah: true },
  ],
  57: [
    { surahNumber: 67, surahNameAr: 'الملك', startQuarter: 1, endQuarter: 2, ayahRangeAr: '1-30', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 68, surahNameAr: 'القلم', startQuarter: 3, endQuarter: 4, ayahRangeAr: '1-52', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 69, surahNameAr: 'الحاقة', startQuarter: 5, endQuarter: 6, ayahRangeAr: '1-52', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 70, surahNameAr: 'المعارج', startQuarter: 7, endQuarter: 8, ayahRangeAr: '1-44', isStartOfSurah: true, isEndOfSurah: true },
  ],
  58: [
    { surahNumber: 71, surahNameAr: 'نوح', startQuarter: 1, endQuarter: 2, ayahRangeAr: '1-28', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 72, surahNameAr: 'الجن', startQuarter: 3, endQuarter: 4, ayahRangeAr: '1-28', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 73, surahNameAr: 'المزمل', startQuarter: 5, endQuarter: 6, ayahRangeAr: '1-20', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 74, surahNameAr: 'المدثر', startQuarter: 7, endQuarter: 7, ayahRangeAr: '1-56', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 75, surahNameAr: 'القيامة', startQuarter: 8, endQuarter: 8, ayahRangeAr: '1-40', isStartOfSurah: true, isEndOfSurah: true },
  ],
  59: [
    { surahNumber: 76, surahNameAr: 'الإنسان', startQuarter: 1, endQuarter: 2, ayahRangeAr: '1-31', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 77, surahNameAr: 'المرسلات', startQuarter: 3, endQuarter: 4, ayahRangeAr: '1-50', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 78, surahNameAr: 'النبأ', startQuarter: 5, endQuarter: 5, ayahRangeAr: '1-40', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 79, surahNameAr: 'النازعات', startQuarter: 6, endQuarter: 6, ayahRangeAr: '1-46', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 80, surahNameAr: 'عبس', startQuarter: 7, endQuarter: 7, ayahRangeAr: '1-42', isStartOfSurah: true, isEndOfSurah: true },
    { surahNumber: 81, surahNameAr: 'التكوير', startQuarter: 8, endQuarter: 8, ayahRangeAr: '1-29', isStartOfSurah: true, isEndOfSurah: true },
  ],
  60: [
    {
      surahNumber: 82,
      surahNameAr: 'الانفطار',
      startQuarter: 1,
      endQuarter: 1,
      clusterSurahs: [
        { surahNumber: 82, surahNameAr: 'الانفطار' },
        { surahNumber: 83, surahNameAr: 'المطففين' },
        { surahNumber: 84, surahNameAr: 'الانشقاق' },
      ],
    },
    {
      surahNumber: 85,
      surahNameAr: 'البروج',
      startQuarter: 2,
      endQuarter: 2,
      clusterSurahs: [
        { surahNumber: 85, surahNameAr: 'البروج' },
        { surahNumber: 86, surahNameAr: 'الطارق' },
        { surahNumber: 87, surahNameAr: 'الأعلى' },
      ],
    },
    {
      surahNumber: 88,
      surahNameAr: 'الغاشية',
      startQuarter: 3,
      endQuarter: 3,
      clusterSurahs: [
        { surahNumber: 88, surahNameAr: 'الغاشية' },
        { surahNumber: 89, surahNameAr: 'الفجر' },
      ],
    },
    {
      surahNumber: 90,
      surahNameAr: 'البلد',
      startQuarter: 4,
      endQuarter: 4,
      clusterSurahs: [
        { surahNumber: 90, surahNameAr: 'البلد' },
        { surahNumber: 91, surahNameAr: 'الشمس' },
        { surahNumber: 92, surahNameAr: 'الليل' },
      ],
    },
    {
      surahNumber: 93,
      surahNameAr: 'الضحى',
      startQuarter: 5,
      endQuarter: 5,
      clusterSurahs: [
        { surahNumber: 93, surahNameAr: 'الضحى' },
        { surahNumber: 94, surahNameAr: 'الشرح' },
        { surahNumber: 95, surahNameAr: 'التين' },
        { surahNumber: 96, surahNameAr: 'العلق' },
      ],
    },
    {
      surahNumber: 97,
      surahNameAr: 'القدر',
      startQuarter: 6,
      endQuarter: 6,
      clusterSurahs: [
        { surahNumber: 97, surahNameAr: 'القدر' },
        { surahNumber: 98, surahNameAr: 'البينة' },
        { surahNumber: 99, surahNameAr: 'الزلزلة' },
        { surahNumber: 100, surahNameAr: 'العاديات' },
      ],
    },
    {
      surahNumber: 101,
      surahNameAr: 'القارعة',
      startQuarter: 7,
      endQuarter: 7,
      clusterSurahs: [
        { surahNumber: 101, surahNameAr: 'القارعة' },
        { surahNumber: 102, surahNameAr: 'التكاثر' },
        { surahNumber: 103, surahNameAr: 'العصر' },
        { surahNumber: 104, surahNameAr: 'الهمزة' },
        { surahNumber: 105, surahNameAr: 'الفيل' },
      ],
    },
    {
      surahNumber: 106,
      surahNameAr: 'قريش',
      startQuarter: 8,
      endQuarter: 8,
      clusterSurahs: [
        { surahNumber: 106, surahNameAr: 'قريش' },
        { surahNumber: 107, surahNameAr: 'الماعون' },
        { surahNumber: 108, surahNameAr: 'الكوثر' },
        { surahNumber: 109, surahNameAr: 'الكافرون' },
        { surahNumber: 110, surahNameAr: 'النصر' },
        { surahNumber: 111, surahNameAr: 'المسد' },
        { surahNumber: 112, surahNameAr: 'الإخلاص' },
        { surahNumber: 113, surahNameAr: 'الفلق' },
        { surahNumber: 114, surahNameAr: 'الناس' },
      ],
    },
  ],
}

export function getSurahsForHizb(hizbNumber: number): HizbSurahSpan[] {
  return HIZB_SURAHS_MAP[hizbNumber] || []
}
