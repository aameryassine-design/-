import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { StatusPicker } from '../components/StatusPicker'
import { useToast } from '../components/Toast'
import { useAsync, unwrap } from '../hooks/useAsync'
import { READING_OPTIONS } from '../lib/constants'
import { todayISO } from '../lib/dates'
import { downloadFile } from '../lib/platform'
import { errorMessage, supabase } from '../lib/supabase'
import type { Book, BookProgram, BookProgress, ReadingStatus } from '../lib/types'

interface Library {
  books: Book[]
  programs: BookProgram[]
  progress: BookProgress[]
}

async function loadLibrary(memberId: string | null): Promise<Library> {
  const [bookResult, programResult] = await Promise.all([
    supabase.from('books').select('*').eq('is_active', true).order('sort_order').order('title'),
    supabase.from('book_programs').select('*').eq('is_active', true),
  ])

  const progress = memberId
    ? unwrap<BookProgress[]>(
        await supabase.from('book_reading_progress').select('*').eq('member_id', memberId),
      )
    : []

  return {
    books: unwrap<Book[]>(bookResult),
    programs: unwrap<BookProgram[]>(programResult),
    progress,
  }
}

export function BooksListPage() {
  const { member } = useAuth()
  const toast = useToast()
  const memberId = member?.id ?? null
  const library = useAsync(() => loadLibrary(memberId), [memberId])

  const books = library.data?.books ?? []

  const programOf = (bookId: string) =>
    library.data?.programs.find((program) => program.book_id === bookId) ?? null

  const progressOf = (bookId: string) =>
    library.data?.progress.find((row) => row.book_id === bookId) ?? null

  const setStatus = async (bookId: string, status: ReadingStatus) => {
    if (!memberId) return
    const { error } = await supabase.from('book_reading_progress').upsert(
      {
        book_id: bookId,
        member_id: memberId,
        status,
        finished_date: status === 'أنهى' ? todayISO() : null,
      },
      { onConflict: 'book_id,member_id' },
    )
    if (error) toast(errorMessage(error), 'error')
    else library.refresh()
  }

  const download = async (book: Book) => {
    if (!book.pdf_path) return
    const { data, error } = await supabase.storage
      .from('books')
      .createSignedUrl(book.pdf_path, 60 * 10, { download: `${book.title}.pdf` })

    if (error || !data) {
      toast(errorMessage(error), 'error')
      return
    }
    await downloadFile(data.signedUrl, `${book.title}.pdf`)
  }

  return (
    <section className="page">
      <div className="mobile-head">
        <h2 className="page-header__title">الكتب</h2>
        <p className="page-header__description">اقرأ داخل التطبيق أو نزّل النسخة الكاملة.</p>
      </div>

      <ErrorBanner message={library.error} />

      {library.loading ? <Loading /> : null}

      {!library.loading && books.length === 0 ? (
        <EmptyState title="لا كتب متاحة" hint="سيضيفها المشرف العام عند برمجتها." />
      ) : null}

      <div className="task-list">
        {books.map((book) => {
          const program = programOf(book.id)
          const progress = progressOf(book.id)
          return (
            <article key={book.id} className="card book-card">
              <div className="task-row__head">
                <h3 className="task-row__title">{book.title}</h3>
                {program ? (
                  <span className="pill pill--good">{program.pages_per_day} ص/يوم</span>
                ) : null}
              </div>
              {book.author ? <p className="hint">{book.author}</p> : null}

              <div className="row-actions">
                {book.pdf_path ? (
                  <>
                    <Link className="btn btn--primary btn--sm" to={`/app/books/${book.id}`}>
                      قراءة
                    </Link>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => void download(book)}
                    >
                      تنزيل
                    </button>
                  </>
                ) : (
                  <span className="hint">لم يُرفع الملف بعد</span>
                )}
              </div>

              {memberId ? (
                <StatusPicker
                  compact
                  options={READING_OPTIONS}
                  value={progress?.status ?? null}
                  onChange={(status) => void setStatus(book.id, status)}
                />
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
