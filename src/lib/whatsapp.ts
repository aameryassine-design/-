const MOROCCAN_LOCAL_NUMBER = /^0(\d{9})$/

/** Returns a wa.me-compatible international phone number without changing stored data. */
export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const compact = phone.trim().replace(/[\s\-().]/g, '').replace(/^\+/, '')
  if (!/^\d+$/.test(compact)) return null
  const localMatch = compact.match(MOROCCAN_LOCAL_NUMBER)
  const normalized = localMatch ? `212${localMatch[1]}` : compact
  return normalized.length >= 8 && normalized.length <= 15 ? normalized : null
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  const normalized = normalizeWhatsAppPhone(phone)
  return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : null
}

export const absenceWhatsAppMessage = (name: string) =>
  `السلام عليكم أخي ${name}، غبت اليوم عن المجلس، عسى المانع خيرا إن شاء الله.`

export const tasksWhatsAppMessage = (name: string) =>
  `السلام عليكم أخي ${name}، لاحظنا تعثرا في إنجاز الواجبات الفردية مؤخرا، يسر الله أمرك.`
