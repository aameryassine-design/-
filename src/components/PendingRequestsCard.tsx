import { formatShortDate } from '../lib/dates'
import { useMajlisMembers, type MembershipRequest } from '../hooks/useMajlisMembers'
import { useToast } from './Toast'
import { Loading } from './Feedback'

interface Props {
  majlisId?: string | null
  title?: string
  showEmpty?: boolean
  onUpdated?: () => void
}

export function PendingRequestsCard({
  majlisId,
  title = 'طلبات الانضمام في الانتظار',
  showEmpty = false,
  onUpdated,
}: Props) {
  const toast = useToast()
  const { pendingRequests, loading, busyId, approveRequest, rejectRequest, refresh } =
    useMajlisMembers(majlisId)

  const handleApprove = async (req: MembershipRequest) => {
    const success = await approveRequest(req.id)
    if (success) {
      toast(`تمت الموافقة على انضمام ${req.member?.full_name || 'العضو'} بنجاح`, 'ok')
      onUpdated?.()
    } else {
      toast('تعذر قبول الطلب، يرجى المحاولة مرة أخرى', 'error')
    }
  }

  const handleReject = async (req: MembershipRequest) => {
    const success = await rejectRequest(req.id)
    if (success) {
      toast(`تم رفض طلب انضمام ${req.member?.full_name || 'العضو'}`, 'ok')
      onUpdated?.()
    } else {
      toast('تعذر رفض الطلب، يرجى المحاولة مرة أخرى', 'error')
    }
  }

  if (loading && pendingRequests.length === 0) {
    return (
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <Loading />
      </div>
    )
  }

  if (pendingRequests.length === 0) {
    if (!showEmpty) return null
    return (
      <div className="card" style={{ marginBottom: '1.25rem', textAlign: 'center', padding: '1.5rem' }}>
        <p className="hint" style={{ margin: 0 }}>
          لا توجد طلبات انضمام معلقة حالياً لهذا المجلس.
        </p>
      </div>
    )
  }

  return (
    <div
      className="card"
      style={{
        marginBottom: '1.5rem',
        border: '1px solid #f59e0b',
        background: '#fffbeb',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>⏳</span>
          <h3 className="card__title" style={{ margin: 0, color: '#92400e' }}>
            {title} ({pendingRequests.length})
          </h3>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => void refresh()}
          style={{ borderColor: '#fde68a', color: '#92400e' }}
        >
          تحديث الطلبات
        </button>
      </div>

      <p className="card__hint" style={{ color: '#b45309', marginBottom: '1rem' }}>
        تنص قواعد المنظومة على أن العضو يدخل مجلسه الأول مباشرة، في حين تتطلب محاولة الانضمام إلى مجلس ثانٍ موافقة مشرف المجلس.
      </p>

      <div className="requests-grid">
        {pendingRequests.map((req) => (
          <div key={req.id} className="request-card">
            <div className="request-card__header">
              <h4 className="request-card__title">
                {req.member?.full_name || 'عضو غير مسمى'}
              </h4>
              {req.majlis_name ? (
                <span className="pill pill--neutral">{req.majlis_name}</span>
              ) : null}
            </div>

            <div className="request-card__meta">
              {req.member?.email ? (
                <span dir="ltr">✉️ {req.member.email}</span>
              ) : null}
              {req.member?.phone ? (
                <span dir="ltr">📞 {req.member.phone}</span>
              ) : null}
              <span>
                تاريخ الطلب:{' '}
                {req.created_at ? formatShortDate(req.created_at) : '—'}
              </span>
            </div>

            <div className="request-card__actions">
              <button
                type="button"
                className="btn btn--primary btn--sm grow"
                disabled={busyId === req.id}
                onClick={() => void handleApprove(req)}
              >
                {busyId === req.id ? 'جارٍ المعالجة…' : '✓ قبول الانضمام'}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
                disabled={busyId === req.id}
                onClick={() => void handleReject(req)}
              >
                ✕ رفض
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
