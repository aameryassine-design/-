import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { ErrorBanner, Loading } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { QuranMemorizationGrid } from '../components/QuranMemorizationGrid'
import { useToast } from '../components/Toast'
import { useAsync, unwrap } from '../hooks/useAsync'
import { useMembers } from '../hooks/useMembers'
import { formatShortDate, todayISO } from '../lib/dates'
import { errorMessage, supabase } from '../lib/supabase'
import type { MemorizationEntry, MemorizationProgress } from '../lib/types'

interface Board {
  progress: MemorizationProgress[]
  recent: MemorizationEntry[]
}

async function loadBoard(): Promise<Board> {
  const [progressResult, entriesResult] = await Promise.all([
    supabase.from('memorization_progress').select('*'),
    supabase
      .from('memorization_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .limit(30),
  ])

  return {
    progress: unwrap<MemorizationProgress[]>(progressResult),
    recent: unwrap<MemorizationEntry[]>(entriesResult),
  }
}

export function MemorizationPage() {
  const toast = useToast()
  const { user } = useAuth()
  const { members } = useMembers()
  const board = useAsync(loadBoard, [])

  const [memberId, setMemberId] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  // Membre actuellement sélectionné pour l'affichage unifié de la grille des 480 أثمان
  const [activeTargetId, setActiveTargetId] = useState<string>('me')

  const programs = board.data?.progress ?? []
  const memberName = (id: string) => members.find((m) => m.id === id)?.full_name ?? '—'
  const withoutProgram = members.filter(
    (member) => !programs.some((program) => program.member_id === member.id && program.is_active),
  )

  const activeMember = members.find((m) => m.id === activeTargetId)
  const activeProgram = programs.find((p) => p.member_id === activeTargetId)

  // Identifiant cible pour le stockage Supabase
  const targetUserId =
    activeTargetId === 'me'
      ? (user?.id ?? 'supervisor_me')
      : activeMember?.user_id || activeMember?.id || activeTargetId

  const targetDisplayName =
    activeTargetId === 'me'
      ? 'حساب المشرف العام'
      : (activeMember?.full_name ?? 'العضو المحدد')

  const createProgram = async () => {
    if (!memberId || !title.trim()) return
    setBusy(true)
    const { error } = await supabase
      .from('memorization_programs')
      .insert({ member_id: memberId, title: title.trim() })
    setBusy(false)
    if (error) {
      toast(errorMessage(error), 'error')
      return
    }
    setTitle('')
    setMemberId('')
    toast('تم إنشاء البرنامج بنجاح')
    board.refresh()
  }

  const addThumn = async (programId: string) => {
    const { error } = await supabase
      .from('memorization_entries')
      .insert({ program_id: programId, thumn_count: 1, entry_date: todayISO() })
    if (error) toast(errorMessage(error), 'error')
    else {
      toast('تم تسجيل ثمن إضافي بنجاح')
      board.refresh()
    }
  }

  return (
    <section className="page">
      <PageHeader
        title="برنامج الحفظ وخريطة الأثمان (480 ثمناً)"
        description="شاشة موحدة لإدارة برامج حفظ الأعضاء ومتابعة خريطة الأثمان التفصيلية (60 حزباً) مباشرة دون الحاجة للتنقل بين الصفحات."
      >
        <button
          type="button"
          className="btn btn--ghost"
          onClick={board.refresh}
          disabled={board.loading}
        >
          تحديث البيانات
        </button>
      </PageHeader>

      <ErrorBanner message={board.error} />

      {/* Barre de sélection rapide du membre & intégration Hifz / Athman */}
      <div
        className="card"
        style={{
          marginBottom: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <label htmlFor="member-athman-select" style={{ fontWeight: 600, color: 'var(--text)' }}>
            عرض خريطة الأثمان والبرنامج لـ:
          </label>
          <select
            id="member-athman-select"
            className="input"
            style={{ minWidth: '240px' }}
            value={activeTargetId}
            onChange={(e) => setActiveTargetId(e.target.value)}
          >
            <option value="me">حسابي الخاص (المشرف)</option>
            <optgroup label="أعضاء المجلس">
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {activeProgram ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className="pill pill--good">
              البرنامج: <strong>{activeProgram.title}</strong>
            </span>
            <span className="pill pill--neutral">
              مجموع الأثمان: <strong>{activeProgram.total_thumns}</strong>
            </span>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => void addThumn(activeProgram.program_id)}
            >
              + تسجيل ثمن
            </button>
          </div>
        ) : activeTargetId !== 'me' ? (
          <span className="hint" style={{ color: 'var(--mid)' }}>
            لم يُعيّن برنامج حفظ رسمي لهذا العضو بعد (يمكنك إضافته بالأسفل)
          </span>
        ) : null}
      </div>

      {/* Grille unifiée des 480 Athman */}
      <div style={{ marginBottom: '2rem' }}>
        <QuranMemorizationGrid
          key={targetUserId}
          userId={targetUserId}
          memberName={targetDisplayName}
        />
      </div>

      {/* Section Gestion des Programmes & Suivi */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="card__title" style={{ marginBottom: '0.75rem' }}>
          إدارة برامج الحفظ وتسجيل الأثمان
        </h3>
        <p className="card__hint" style={{ marginBottom: '1rem' }}>
          أنشئ برنامجاً جديداً للأعضاء، وسجّل إنجازاتهم. النقر على أي عضو في الجدول يفتح خريطته بالأعلى مباشرة.
        </p>

        <form
          className="member-form"
          style={{ marginBottom: '1.5rem' }}
          onSubmit={(event) => {
            event.preventDefault()
            void createProgram()
          }}
        >
          <label>
            <span className="label">العضو</span>
            <select
              className="input"
              value={memberId}
              required
              onChange={(event) => setMemberId(event.target.value)}
            >
              <option value="">اختر عضواً…</option>
              {withoutProgram.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="grow">
            <span className="label">اسم البرنامج</span>
            <input
              className="input"
              value={title}
              required
              placeholder="مثال: المفصل، أو البقرة وآل عمران"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'جارٍ…' : '+ إنشاء برنامج جديد'}
          </button>
        </form>

        {board.loading ? <Loading /> : null}

        {!board.loading ? (
          <div className="table-wrap">
            <table className="sheet">
              <thead>
                <tr>
                  <th className="sheet__col-name">العضو</th>
                  <th>البرنامج</th>
                  <th>الأثمان المنجزة</th>
                  <th>الموضع الحالي</th>
                  <th>آخر تسجيل</th>
                  <th className="sheet__col-actions">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((program) => {
                  const isSelected = program.member_id === activeTargetId
                  return (
                    <tr
                      key={program.program_id}
                      className={`${program.is_active ? '' : 'is-archived'} ${
                        isSelected ? 'is-selected' : ''
                      }`}
                      style={
                        isSelected
                          ? { backgroundColor: 'var(--primary-soft)' }
                          : undefined
                      }
                    >
                      <td className="sheet__name">
                        <button
                          type="button"
                          className="btn-link"
                          style={{
                            fontWeight: isSelected ? 700 : 500,
                            color: 'var(--primary-dark)',
                            cursor: 'pointer',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            textAlign: 'inherit',
                          }}
                          onClick={() => setActiveTargetId(program.member_id)}
                          title="عرض خريطة الأثمان لهذا العضو"
                        >
                          {memberName(program.member_id)} {isSelected ? '📍' : ''}
                        </button>
                      </td>
                      <td>{program.title}</td>
                      <td className="sheet__total">{program.total_thumns}</td>
                      <td>{program.current_position ?? '—'}</td>
                      <td>
                        {program.last_entry_date ? formatShortDate(program.last_entry_date) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => setActiveTargetId(program.member_id)}
                          >
                            🗺️ الخريطة
                          </button>
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            onClick={() => void addThumn(program.program_id)}
                          >
                            + ثمن
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {programs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="hint" style={{ textAlign: 'center', padding: '2rem' }}>
                      لا توجد برامج حفظ مسجلة بعد.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  )
}
