import { useAuth } from '../auth/AuthProvider'
import { QuranMemorizationGrid } from '../components/QuranMemorizationGrid'

export function QuranPage() {
  const { user } = useAuth()

  return (
    <section className="page">
      <div className="mobile-head">
        <h2 className="page-header__title">خريطة حفظ القرآن الكريم</h2>
        <p className="page-header__description">متابعة الحفظ والتثبيت بالأثمان (480 ثمناً — 60 حزباً)</p>
      </div>

      <QuranMemorizationGrid userId={user?.id ?? ''} />
    </section>
  )
}
