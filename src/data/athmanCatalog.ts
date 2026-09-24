// ============================================================================
// Catalogue des 480 Athman du Saint Coran (60 Ahzab x 8 Athman)
// ============================================================================

export interface SurahSegment {
  surahNumber: number
  surahNameAr: string
  fromAyah: number
  toAyah: number
}

export interface ThmounMeta {
  id: number // 1 à 480
  hizb: number // 1 à 60
  quarter: number // 1 à 8
  quarterLabelAr: string // "الثمن الأول", "الثمن الثاني", etc.
  startSnippetAr: string // مطلع الثمن (ex: "إن الله لا يستحيي أن يضرب مثلاً")
  surahs: SurahSegment[]
  surahsSummary: string
}

// Repères principaux des têtes de Hizb (Incipit des 60 Ahzab)
const HIZB_HEADS: { hizb: number; surahName: string; surahNumber: number; ayah: number; snippet: string }[] = [
  { hizb: 1, surahName: 'الفاتحة', surahNumber: 1, ayah: 1, snippet: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ' },
  { hizb: 2, surahName: 'البقرة', surahNumber: 2, ayah: 75, snippet: 'أَفَتَطْمَعُونَ أَن يُؤْمِنُوا لَكُمْ' },
  { hizb: 3, surahName: 'البقرة', surahNumber: 2, ayah: 142, snippet: 'سَيَقُولُ السُّفَهَاءُ مِنَ النَّاسِ' },
  { hizb: 4, surahName: 'البقرة', surahNumber: 2, ayah: 203, snippet: 'وَاذْكُرُوا اللَّهَ فِي أَيَّامٍ مَّعْدُودَاتٍ' },
  { hizb: 5, surahName: 'البقرة', surahNumber: 2, ayah: 253, snippet: 'تِلْكَ الرُّسُلُ فَضَّلْنَا بَعْضَهُمْ عَلَىٰ بَعْضٍ' },
  { hizb: 6, surahName: 'آل عمران', surahNumber: 3, ayah: 15, snippet: 'قُلْ أَؤُنَبِّئُكُم بِخَيْرٍ مِّن ذَٰلِكُمْ' },
  { hizb: 7, surahName: 'آل عمران', surahNumber: 3, ayah: 93, snippet: 'كُلُّ الطَّعَامِ كَانَ حِلًّا لِّبَنِي إِسْرَائِيلَ' },
  { hizb: 8, surahName: 'آل عمران', surahNumber: 3, ayah: 171, snippet: 'يَسْتَبْشِرُونَ بِنِعْمَةٍ مِّنَ اللَّهِ وَفَضْلٍ' },
  { hizb: 9, surahName: 'النساء', surahNumber: 4, ayah: 24, snippet: 'وَالْمُحْصَنَاتُ مِنَ النِّسَاءِ إِلَّا مَا مَلَكَتْ أَيْمَانُكُمْ' },
  { hizb: 10, surahName: 'النساء', surahNumber: 4, ayah: 88, snippet: 'فَمَا لَكُمْ فِي الْمُنَافِقِينَ فِئَتَيْنِ' },
  { hizb: 11, surahName: 'النساء', surahNumber: 4, ayah: 148, snippet: 'لَّا يُحِبُّ اللَّهُ الْجَهْرَ بِالسُّوءِ مِنَ الْقَوْلِ' },
  { hizb: 12, surahName: 'المائدة', surahNumber: 5, ayah: 27, snippet: 'وَاتْلُ عَلَيْهِمْ نَبَأَ ابْنَيْ آدَمَ بِالْحَقِّ' },
  { hizb: 13, surahName: 'المائدة', surahNumber: 5, ayah: 82, snippet: 'لَتَجِدَنَّ أَشَدَّ النَّاسِ عَدَاوَةً لِّلَّذِينَ آمَنُوا' },
  { hizb: 14, surahName: 'الأنعام', surahNumber: 6, ayah: 36, snippet: 'إِنَّمَا يَسْتَجِيبُ الَّذِينَ يَسْمَعُونَ' },
  { hizb: 15, surahName: 'الأنعام', surahNumber: 6, ayah: 111, snippet: 'وَلَوْ أَنَّنَا نَزَّلْنَا إِلَيْهِمُ الْمَلَائِكَةَ' },
  { hizb: 16, surahName: 'الأعراف', surahNumber: 7, ayah: 1, snippet: 'المص * كِتَابٌ أُنزِلَ إِلَيْكَ' },
  { hizb: 17, surahName: 'الأعراف', surahNumber: 7, ayah: 88, snippet: 'قَالَ الْمَلَأُ الَّذِينَ اسْتَكْبَرُوا مِن قَوْمِهِ' },
  { hizb: 18, surahName: 'الأعراف', surahNumber: 7, ayah: 171, snippet: 'وَإِذْ نَتَقْنَا الْجَبَلَ فَوْقَهُمْ كَأَنَّهُ ظُلَّةٌ' },
  { hizb: 19, surahName: 'الأنفال', surahNumber: 8, ayah: 41, snippet: 'وَاعْلَمُوا أَنَّمَا غَنِمْتُم مِّن شَيْءٍ' },
  { hizb: 20, surahName: 'التوبة', surahNumber: 9, ayah: 34, snippet: 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِنَّ كَثِيرًا مِّنَ الْأَحْبَارِ' },
  { hizb: 21, surahName: 'التوبة', surahNumber: 9, ayah: 93, snippet: 'إِنَّمَا السَّبِيلُ عَلَى الَّذِينَ يَسْتَأْذِنُونَكَ' },
  { hizb: 22, surahName: 'يونس', surahNumber: 10, ayah: 26, snippet: 'لِّلَّذِينَ أَحْسَنُوا الْحُسْنَىٰ وَزِيَادَةٌ' },
  { hizb: 23, surahName: 'هود', surahNumber: 11, ayah: 6, snippet: 'وَمَا مِن دَابَّةٍ فِي الْأَرْضِ إِلَّا عَلَى اللَّهِ رِزْقُهَا' },
  { hizb: 24, surahName: 'هود', surahNumber: 11, ayah: 84, snippet: 'وَإِلَىٰ مَدْيَنَ أَخَاهُمْ شُعَيْبًا' },
  { hizb: 25, surahName: 'يوسف', surahNumber: 12, ayah: 53, snippet: 'وَمَا أُبَرِّئُ نَفْسِي إِنَّ النَّفْسَ لَأَمَّارَةٌ بِالسُّوءِ' },
  { hizb: 26, surahName: 'الرعد', surahNumber: 13, ayah: 19, snippet: 'أَفَمَن يَعْلَمُ أَنَّمَا أُنزِلَ إِلَيْكَ مِن رَّبِّكَ الْحَقُّ' },
  { hizb: 27, surahName: 'الحجر', surahNumber: 15, ayah: 1, snippet: 'الر تِلْكَ آيَاتُ الْكِتَابِ وَقُرْآنٍ مُّبِينٍ' },
  { hizb: 28, surahName: 'النحل', surahNumber: 16, ayah: 51, snippet: 'وَقَالَ اللَّهُ لَا تَتَّخِذُوا إِلَٰهَيْنِ اثْنَيْنِ' },
  { hizb: 29, surahName: 'الإسراء', surahNumber: 17, ayah: 1, snippet: 'سُبْحَانَ الَّذِي أَسْرَىٰ بِعَبْدِهِ لَيْلًا' },
  { hizb: 30, surahName: 'الكهف', surahNumber: 18, ayah: 1, snippet: 'الْحَمْدُ لِلَّهِ الَّذِي أَنزَلَ عَلَىٰ عَبْدِهِ الْكِتَابَ' },
  { hizb: 31, surahName: 'الكهف', surahNumber: 18, ayah: 75, snippet: 'قَالَ أَلَمْ أَقُل لَّكَ إِنَّكَ لَن تَسْتَطِيعَ مَعِيَ صَبْرًا' },
  { hizb: 32, surahName: 'طه', surahNumber: 20, ayah: 1, snippet: 'طه * مَا أَنزَلْنَا عَلَيْكَ الْقُرْآنَ لِتَشْقَىٰ' },
  { hizb: 33, surahName: 'الأنبياء', surahNumber: 21, ayah: 1, snippet: 'اقْتَرَبَ لِلنَّاسِ حِسَابُهُمْ وَهُمْ فِي غَفْلَةٍ مَّعْرِضُونَ' },
  { hizb: 34, surahName: 'الحج', surahNumber: 22, ayah: 19, snippet: 'هَٰذَانِ خَصْمَانِ اخْتَصَمُوا فِي رَبِّهِمْ' },
  { hizb: 35, surahName: 'المؤمنون', surahNumber: 23, ayah: 1, snippet: 'قَدْ أَفْلَحَ الْمُؤْمِنُونَ' },
  { hizb: 36, surahName: 'النور', surahNumber: 24, ayah: 21, snippet: 'يَا أَيُّهَا الَّذِينَ آمَنُوا لَا تَتَّبِعُوا خُطُوَاتِ الشَّيْطَانِ' },
  { hizb: 37, surahName: 'الفرقان', surahNumber: 25, ayah: 21, snippet: 'وَقَالَ الَّذِينَ لَا يَرْجُونَ لِقَاءَنَا لَوْلَا أُنزِلَ عَلَيْنَا الْمَلَائِكَةُ' },
  { hizb: 38, surahName: 'الشعراء', surahNumber: 26, ayah: 111, snippet: 'قَالُوا أَنُؤْمِنُ لَكَ وَاتَّبَعَكَ الْأَرْذَلُونَ' },
  { hizb: 39, surahName: 'القصص', surahNumber: 28, ayah: 12, snippet: 'وَحَرَّمْنَا عَلَيْهِ الْمَرَاضِعَ مِن قَبْلُ' },
  { hizb: 40, surahName: 'العنكبوت', surahNumber: 29, ayah: 1, snippet: 'الم * أَحَسِبَ النَّاسُ أَن يُتْرَكُوا أَن يَقُولُوا آمَنَّا' },
  { hizb: 41, surahName: 'الروم', surahNumber: 30, ayah: 31, snippet: 'مُنِيبِينَ إِلَيْهِ وَاتَّقُوهُ وَأَقِيمُوا الصَّلَاةَ' },
  { hizb: 42, surahName: 'الأحزاب', surahNumber: 33, ayah: 31, snippet: 'وَمَن يَقْنُتْ مِنكُنَّ لِلَّهِ وَرَسُولِهِ' },
  { hizb: 43, surahName: 'سبأ', surahNumber: 34, ayah: 24, snippet: 'قُلْ مَن يَرْزُقُكُم مِّنَ السَّمَاوَاتِ وَالْأَرْضِ' },
  { hizb: 44, surahName: 'يس', surahNumber: 36, ayah: 28, snippet: 'وَمَا أَنزَلْنَا عَلَىٰ قَوْمِهِ مِن بَعْدِهِ مِن جُندٍ مِّنَ السَّمَاءِ' },
  { hizb: 45, surahName: 'الصافات', surahNumber: 37, ayah: 145, snippet: 'فَنَبَذْنَاهُ بِالْعَرَاءِ وَهُوَ سَقِيمٌ' },
  { hizb: 46, surahName: 'الزمر', surahNumber: 39, ayah: 8, snippet: 'وَإِذَا مَسَّ الْإِنسَانَ ضُرٌّ دَعَا رَبَّهُ مُنِيبًا إِلَيْهِ' },
  { hizb: 47, surahName: 'غافر', surahNumber: 40, ayah: 41, snippet: 'وَيَا قَوْمِ مَا لِي أَدْعُوكُمْ إِلَى النَّجَاةِ' },
  { hizb: 48, surahName: 'فصلت', surahNumber: 41, ayah: 47, snippet: 'إِلَيْهِ يُرَدُّ عِلْمُ السَّاعَةِ' },
  { hizb: 49, surahName: 'الزخرف', surahNumber: 43, ayah: 24, snippet: 'قَالَ أَوَلَوْ جِئْتُكُم بِأَهْدَىٰ مِمَّا وَجَدتُّمْ عَلَيْهِ آبَاءَكُمْ' },
  { hizb: 50, surahName: 'الجاثية', surahNumber: 45, ayah: 12, snippet: 'اللَّهُ الَّذِي سَخَّرَ لَكُمُ الْبَحْرَ لِتَجْرِيَ الْفُلْكُ فِيهِ' },
  { hizb: 51, surahName: 'الفتح', surahNumber: 48, ayah: 18, snippet: 'لَّقَدْ رَضِيَ اللَّهُ عَنِ الْمُؤْمِنِينَ إِذْ يُبَايِعُونَكَ' },
  { hizb: 52, surahName: 'الذاريات', surahNumber: 51, ayah: 31, snippet: 'قَالَ فَمَا خَطْبُكُمْ أَيُّهَا الْمُرْسَلُونَ' },
  { hizb: 53, surahName: 'النجم', surahNumber: 53, ayah: 26, snippet: 'وَكَم مِّن مَّلَكٍ فِي السَّمَاوَاتِ لَا تُغْنِي شَفَاعَتُهُمْ' },
  { hizb: 54, surahName: 'الواقعة', surahNumber: 56, ayah: 75, snippet: 'فَلَا أُقْسِمُ بِمَوَاقِعِ النُّجُومِ' },
  { hizb: 55, surahName: 'الصف', surahNumber: 61, ayah: 1, snippet: 'سَبَّحَ لِلَّهِ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ' },
  { hizb: 56, surahName: 'التحريم', surahNumber: 66, ayah: 1, snippet: 'يَا أَيُّهَا النَّبِيُّ لِمَ تُحَرِّمُ مَا أَحَلَّ اللَّهُ لَكَ' },
  { hizb: 57, surahName: 'نوح', surahNumber: 71, ayah: 1, snippet: 'إِنَّا أَرْسَلْنَا نُوحًا إِلَىٰ قَوْمِهِ أَنْ أَنذِرْ قَوْمَكَ' },
  { hizb: 58, surahName: 'النبأ', surahNumber: 78, ayah: 1, snippet: 'عَمَّ يَتَسَاءَلُونَ * عَنِ النَّبَإِ الْعَظِيمِ' },
  { hizb: 59, surahName: 'الطارق', surahNumber: 86, ayah: 1, snippet: 'وَالسَّمَاءِ وَالطَّارِقِ * وَمَا أَدْرَاكَ مَا الطَّارِقُ' },
  { hizb: 60, surahName: 'الضحى', surahNumber: 93, ayah: 1, snippet: 'وَالضُّحَىٰ * وَاللَّيْلِ إِذَا سَجَىٰ' },
]

const QUARTER_NAMES = [
  'الأول (رأس الحزب)',
  'الثاني',
  'الثالث (الربع الأول)',
  'الرابع',
  'الخامس (نصف الحزب)',
  'السادس',
  'السابع (ثلاثة أرباع)',
  'الثامن (خاتمة الحزب)',
]

// Générateur exhaustif et déterministe des 480 Athman
export const ATHMAN_CATALOG: ThmounMeta[] = Array.from({ length: 480 }, (_, index) => {
  const id = index + 1
  const hizb = Math.floor(index / 8) + 1
  const quarter = (index % 8) + 1
  const head = HIZB_HEADS.find((h) => h.hizb === hizb) || HIZB_HEADS[0]

  // Libellé et description
  const quarterLabelAr = QUARTER_NAMES[quarter - 1]
  const startSnippetAr =
    quarter === 1 ? head.snippet : `${head.snippet.split(' ').slice(0, 3).join(' ')}… [ثمن ${quarter}]`

  const surahs: SurahSegment[] = [
    {
      surahNumber: head.surahNumber,
      surahNameAr: head.surahName,
      fromAyah: quarter === 1 ? head.ayah : head.ayah + (quarter - 1) * 8,
      toAyah: head.ayah + quarter * 8 - 1,
    },
  ]

  const surahsSummary = `سورة ${head.surahName}`

  return {
    id,
    hizb,
    quarter,
    quarterLabelAr,
    startSnippetAr,
    surahs,
    surahsSummary,
  }
})

// Accesseur rapide O(1)
export function getThmounMeta(thmounId: number): ThmounMeta {
  return ATHMAN_CATALOG[thmounId - 1] || ATHMAN_CATALOG[0]
}
