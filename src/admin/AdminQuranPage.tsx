import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { PageHeader } from '../components/PageHeader'
import { QuranMemorizationGrid } from '../components/QuranMemorizationGrid'
import { useMembers } from '../hooks/useMembers'

export function AdminQuranPage() {
  const { user } = useAuth()
  const { members } = useMembers()
  const [selectedMemberId, setSelectedMemberId] = useState<string>('me')

  const selectedMember = members.find((m) => m.id === selectedMemberId)

  // Identifiant cible pour le stockage et l'enregistrement
  const targetUserId =
    selectedMemberId === 'me'
      ? (user?.id ?? 'supervisor_me')
      : selectedMember?.user_id || selectedMember?.id || selectedMemberId

  const targetName =
    selectedMemberId === 'me'
      ? 'حساب المشرف العام'
      : (selectedMember?.full_name ?? 'العضو المحدد')

  return (
    <div>
      <PageHeader
        title="خريطة حفظ ومراجعة القرآن الكريم (480 ثمناً)"
        description="تتبع دقيق وشامل لجميع أثمان القرآن الـ 480 (60 حزباً × 8 أثمان) مع تلوين تفاعلي بحسب درجة الحفظ"
      />

      {/* Barre de sélection de profil pour le superviseur */}
      <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
        <label htmlFor="member-select" style={{ fontWeight: 600, color: 'var(--text-main)' }}>
          عرض سجل الحفظ لـ :
        </label>
        <select
          id="member-select"
          className="input"
          style={{ maxWidth: '320px', flex: '1 1 200px' }}
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
        >
          <option value="me">حسابي الخاص (المشرف العام)</option>
          <optgroup label="الأعضاء">
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </optgroup>
        </select>
        <span className="hint" style={{ marginRight: 'auto' }}>
          {selectedMemberId === 'me'
            ? 'أنت تعدل وتتابع الآن سجلك الخاص'
            : `أنت تتابع الآن سجل: ${selectedMember?.full_name}`}
        </span>
      </div>

      <QuranMemorizationGrid
        key={targetUserId}
        userId={targetUserId}
        memberName={targetName}
      />
    </div>
  )
}
