import { useState, type ChangeEvent } from 'react'
import { CommitInput } from '../components/CommitInput'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { useAsync, unwrap } from '../hooks/useAsync'
import { errorMessage, supabase } from '../lib/supabase'
import type { Book, BookProgram } from '../lib/types'

interface Library {
  books: Book[]
  programs: BookProgram[]
}

async function loadLibrary(): Promise<Library> {
  const [bookResult, programResult] = await Promise.all([
    supabase.from('books').select('*').order('sort_order').order('title'),
    supabase.from('book_programs').select('*'),
  ])

  return {
    books: unwrap<Book[]>(bookResult),
    programs: unwrap<BookProgram[]>(programResult),
  }
}

export function BooksPage() {
  const toast = useToast()
  const library = useAsync(loadLibrary, [])

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Book | null>(null)

  const books = library.data?.books ?? []
  const programs = library.data?.programs ?? []
  const activeProgram = (bookId: string) =>
    programs.find((program) => program.book_id === bookId && program.is_active) ?? null

  const addBook = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    setBusy(true)

    let pdfPath: string | null = null

    if (file) {
      if (file.type !== 'application/pdf') {
        toast('الملف يجب أن يكون PDF', 'error')
        setBusy(false)
        return
      }
      const path = `${crypto.randomUUID()}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('books')
        .upload(path, file, { contentType: 'application/pdf', upsert: false })

      if (uploadError) {
        toast(errorMessage(uploadError), 'error')
        setBusy(false)
        return
      }
      pdfPath = path
    }

    const { error } = await supabase.from('books').insert({
      title: title.trim(),
      author: author.trim() || null,
      pdf_path: pdfPath,
    })

    setBusy(false)

    if (error) {
      toast(errorMessage(error), 'error')
      return
    }

    setTitle('')
    setAuthor('')
    setFile(null)
    toast('تمت إضافة الكتاب')
    library.refresh()
  }

  const replacePdf = async (book: Book, event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0]
    event.target.value = ''
    if (!next) return

    const path = `${crypto.randomUUID()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('books')
      .upload(path, next, { contentType: 'application/pdf' })

    if (uploadError) {
      toast(errorMessage(uploadError), 'error')
      return
    }

    const { error } = await supabase.from('books').update({ pdf_path: path }).eq('id', book.id)
    if (error) {
      toast(errorMessage(error), 'error')
      return
    }

    if (book.pdf_path) await supabase.storage.from('books').remove([book.pdf_path])
    toast('تم استبدال الملف')
    library.refresh()
  }

  const openPdf = async (book: Book) => {
    if (!book.pdf_path) return
    const { data, error } = await supabase.storage
      .from('books')
      .createSignedUrl(book.pdf_path, 60 * 10)
    if (error || !data) {
      toast(errorMessage(error), 'error')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  const updateBook = async (book: Book, patch: Partial<Book>) => {
    const { error } = await supabase.from('books').update(patch).eq('id', book.id)
    if (error) toast(errorMessage(error), 'error')
    else library.refresh()
  }

  /** Créer/mettre à jour le ورد : le trigger SQL génère la tâche de lecture. */
  const setProgram = async (book: Book, pagesPerDay: number) => {
    const existing = activeProgram(book.id)

    if (pagesPerDay <= 0) {
      if (!existing) return
      const { error } = await supabase
        .from('book_programs')
        .update({ is_active: false })
        .eq('id', existing.id)
      if (error) toast(errorMessage(error), 'error')
      else {
        toast('تم إيقاف برنامج القراءة')
        library.refresh()
      }
      return
    }

    const { error } = existing
      ? await supabase
          .from('book_programs')
          .update({ pages_per_day: pagesPerDay })
          .eq('id', existing.id)
      : await supabase
          .from('book_programs')
          .insert({ book_id: book.id, pages_per_day: pagesPerDay })

    if (error) toast(errorMessage(error), 'error')
    else {
      toast(existing ? 'تم تعديل الورد' : 'تمت برمجة الكتاب وإنشاء واجب القراءة')
      library.refresh()
    }
  }

  const removeBook = async (book: Book) => {
    const { error } = await supabase.from('books').delete().eq('id', book.id)
    if (error) {
      toast(
        errorMessage(error).includes('foreign key')
          ? 'لا يمكن حذف كتاب مبرمَج. أوقف برنامج القراءة أولاً.'
          : errorMessage(error),
        'error',
      )
      return
    }
    if (book.pdf_path) await supabase.storage.from('books').remove([book.pdf_path])
    toast('تم حذف الكتاب')
    library.refresh()
  }

  return (
    <section className="page">
      <PageHeader
        title="الكتب المبرمجة"
        description="ارفع الكتاب بصيغة PDF، ثم حدّد الورد اليومي بعدد الصفحات ليظهر واجب «قراءة الورد» للأعضاء."
      />

      <ErrorBanner message={library.error} />

      <form className="card member-form" onSubmit={addBook}>
        <label className="grow">
          <span className="label">عنوان الكتاب *</span>
          <input
            className="input"
            value={title}
            required
            placeholder="مثال: رياض الصالحين"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="grow">
          <span className="label">المؤلف</span>
          <input
            className="input"
            value={author}
            placeholder="اختياري"
            onChange={(event) => setAuthor(event.target.value)}
          />
        </label>
        <label className="grow">
          <span className="label">ملف PDF</span>
          <input
            className="input"
            type="file"
            accept="application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'جارٍ الرفع…' : '+ إضافة كتاب'}
        </button>
      </form>

      {library.loading ? <Loading /> : null}

      {!library.loading && books.length === 0 ? (
        <EmptyState title="لا كتب بعد" hint="أضف أول كتاب باستعمال النموذج أعلاه." />
      ) : null}

      {books.length > 0 ? (
        <div className="table-wrap">
          <table className="sheet">
            <thead>
              <tr>
                <th className="sheet__col-name">الكتاب</th>
                <th>الملف</th>
                <th className="sheet__col-narrow">الورد (صفحة/يوم)</th>
                <th>الحالة</th>
                <th className="sheet__col-actions">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => {
                const program = activeProgram(book.id)
                return (
                  <tr key={book.id} className={book.is_active ? '' : 'is-archived'}>
                    <td className="sheet__name">
                      {book.title}
                      {book.author ? <span className="sheet__hint">{book.author}</span> : null}
                    </td>
                    <td>
                      {book.pdf_path ? (
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => void openPdf(book)}
                          >
                            فتح
                          </button>
                          <label className="btn btn--ghost btn--sm">
                            استبدال
                            <input
                              type="file"
                              accept="application/pdf"
                              hidden
                              onChange={(event) => void replacePdf(book, event)}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="btn btn--ghost btn--sm">
                          رفع PDF
                          <input
                            type="file"
                            accept="application/pdf"
                            hidden
                            onChange={(event) => void replacePdf(book, event)}
                          />
                        </label>
                      )}
                    </td>
                    <td>
                      <CommitInput
                        type="number"
                        min="0"
                        value={program ? String(program.pages_per_day) : ''}
                        ariaLabel={`ورد ${book.title}`}
                        placeholder="0 = بلا برنامج"
                        onCommit={(value) => void setProgram(book, Number(value) || 0)}
                      />
                    </td>
                    <td>
                      <span className={`pill pill--${program ? 'good' : 'neutral'}`}>
                        {program ? 'مبرمَج' : 'غير مبرمَج'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => void updateBook(book, { is_active: !book.is_active })}
                        >
                          {book.is_active ? 'أرشفة' : 'إعادة'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger-ghost btn--sm"
                          onClick={() => setPendingDelete(book)}
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="legend">
        الملفات محفوظة في مخزن خاص: لا يفتحها إلا صاحب حساب له دور، عبر رابط موقَّت. تعديل الورد
        يعدّل واجب القراءة تلقائياً، ووضع 0 يوقفه.
      </p>

      <ConfirmDialog
        open={pendingDelete !== null}
        danger
        title="حذف الكتاب"
        message={
          pendingDelete
            ? `سيُحذف «${pendingDelete.title}» وملفه. إن كان مبرمَجاً فسيرفض النظام الحذف حفاظاً على تسجيلات القراءة.`
            : undefined
        }
        confirmLabel="حذف"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const book = pendingDelete
          setPendingDelete(null)
          if (book) void removeBook(book)
        }}
      />
    </section>
  )
}
