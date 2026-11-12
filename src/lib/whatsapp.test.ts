import { describe, expect, it } from 'vitest'
import { buildWhatsAppUrl, normalizeWhatsAppPhone } from './whatsapp'

describe('WhatsApp phone handling', () => {
  it('converts a Moroccan local number to wa.me format', () => {
    expect(normalizeWhatsAppPhone('06 12-34-56-78')).toBe('212612345678')
  })

  it('keeps valid international numbers and encodes Arabic text', () => {
    const url = buildWhatsAppUrl('+212612345678', 'السلام عليكم')
    expect(url).toBe('https://wa.me/212612345678?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85')
  })

  it('rejects absent and malformed phone numbers', () => {
    expect(normalizeWhatsAppPhone(null)).toBeNull()
    expect(normalizeWhatsAppPhone('phone-number')).toBeNull()
  })
})
