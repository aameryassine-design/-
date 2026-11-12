import { buildWhatsAppUrl } from '../lib/whatsapp'

interface Props {
  phone: string | null | undefined
  message: string
  memberName: string
  disabled?: boolean
}

export function WhatsAppButton({ phone, message, memberName, disabled = false }: Props) {
  const url = buildWhatsAppUrl(phone, message)
  const unavailable = disabled || !url
  const label = disabled
    ? 'لا توجد متابعة مطلوبة الآن'
    : !url
      ? 'رقم واتساب غير متاح أو غير صالح'
      : `مراسلة ${memberName} عبر واتساب`

  return (
    <a
      className={`whatsapp-button${unavailable ? ' whatsapp-button--disabled' : ''}`}
      href={unavailable ? undefined : url}
      target={unavailable ? undefined : '_blank'}
      rel={unavailable ? undefined : 'noopener noreferrer'}
      aria-label={label}
      aria-disabled={unavailable}
      tabIndex={unavailable ? -1 : undefined}
      title={label}
      onClick={(event) => {
        if (unavailable) event.preventDefault()
      }}
    >
      <span aria-hidden="true">◉</span>
    </a>
  )
}
