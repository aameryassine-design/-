import { useCallback, useEffect, useMemo, useState } from 'react'
import { CommitInput } from '../components/CommitInput'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { StatusPicker } from '../components/StatusPicker'
import { useToast } from '../components/Toast'
import { useMemberSheet } from '../hooks/useMemberSheet'
import { useMembers } from '../hooks/useMembers'
import { READING_OPTIONS } from '../lib/constants'
import { todayISO } from '../lib/dates'
import { errorMessage, supabase } from '../lib/supabase'
import type { Book, BookProgress, ReadingStatus } from '../lib/types'

export function BooksPage() {
  const toast = useToast()
  const { members, loading: membersLoading, error: membersError } = useMembers()
  const [books, setBooks] = useState<Book[]>([])
  const [booksLoading, setBooksLoading] = useState(true)
  const [booksError, setBooksError] = useState<string | null>(null)
  const [bookId, setBookId] = useState<string | null>(null)
  const [managing, setManaging] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAuthor, setNewAuthor] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Book | null>(null)

  const loadBooks = useCallback(async () => {
    setBooksLoading(true)
    const { data, error: queryError } = await supabase
      .from('books')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (queryError) setBooksError(errorMessage(queryError))
    else {
      setBooksError(null)
      setBooks((data ?? []) as Book[])
    }
    setBooksLoading(false)
  }, [])

  useEffect(() => {
    void loadBooks()
  }, [loadBooks])

  const activeBooks = useMemo(() => books.filter((book) => book.is_active), [books])

  useEffect(() => {
    setBookId((current) => {
      if (activeBooks.length === 0) return null
      if (current && activeBooks.some((book) => book.id === current)) return current
      return activeBooks[0].id
    })
  }, [activeBooks])

  const { rows, loading, error, pending, save } = useMemberSheet<BookProgress>(
    'book_reading_progress',
    bookId ? { book_id: bookId } : null,
    'book_id,member_id',
  )

  const addBook = async () => {
    const title = newTitle.trim()
    if (!title) return
    const { error: insertError } = await supabase.from('books').insert({
      title,
      author: newAuthor.trim() || null,
      sort_order: books.length,
    })
    if (insertError) {
      toast(errorMessage(insertError), 'error')
      return
    }
    setNewTitle('')
    setNewAuthor('')
    toast('تمت إضافة الكتاب')
    await loadBooks()
  }

  const updateBook = async (id: string, patch: Partial<Book>) => {
    setBooks((current) => current.map((book) => (book.id === id ? { ...book, ...patch } : book)))
    const { error: updateError } = await supabase.from('books').update(patch).eq('id', id)
    if (updateError) {
      toast(errorMessage(updateError), 'error')
      void loadBooks()
    }
  }

  const deleteBook = async (id: string) => {
    const { error: deleteError } = await supabase.from('books').delete().eq('id', id)
    if (deleteError) {
      toast(errorMessage(deleteError), 'error')
      return
    }
    toast('تم حذف الكتاب')
    await loadBooks()
  }

  const counts = useMemo(() => {
    const tally = new Map<ReadingStatus, number>()
    for (const member of members) {
      const status = rows[member.id]?.status
      if (status) tally.set(status, (tally.get(status) ?? 0) + 1)
    }
    return tally
  }, [members, rows])

  return (
    <section className="page">
      <PageHeader
        title="قراءة الكتب المبرمجة"
        description="تقدّم كل عضو في الكتب المبرمجة للمجموعة."
      >
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setManaging((open) => !open)}
        >
          {managing ? 'إغلاق إدارة الكتب' : 'إدارة الكتب'}
        </button>
      </PageHeader>

      <ErrorBanner message={membersError ?? booksError ?? error} />

      {managing ? (
        <div className="card">
          <form
            className="member-form"
            onSubmit={(event) => {
              event.preventDefault()
              void addBook()
            }}
          >
            <label className="grow">
              <span className="label">عنوان الكتاب *</span>
              <input
                className="input"
                value={newTitle}
                required
                placeholder="مثال: رياض الصالحين"
                onChange={(event) => setNewTitle(event.target.value)}
              />
            </label>
            <label className="grow">
              <span className="label">المؤلف</span>
              <input
                className="input"
                value={newAuthor}
                placeholder="اختياري"
                onChange={(event) => setNewAuthor(event.target.value)}
              />
            </label>
            <button type="submit" className="btn btn--primary">
              + إضافة كتاب
            </button>
          </form>

          {books.length > 0 ? (
            <div className="table-wrap">
              <table className="sheet">
                <thead>
                  <tr>
                    <th className="sheet__col-name">العنوان</th>
                    <th>المؤلف</th>
                    <th>مبرمج حالياً</th>
                    <th className="sheet__col-actions">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map((book) => (
                    <tr key={book.id} className={book.is_active ? '' : 'is-archived'}>
                      <td className="sheet__name">
                        <CommitInput
                          value={book.title}
                          ariaLabel="عنوان الكتاب"
                          onCommit={(title) => {
                            const trimmed = title.trim()
                            if (trimmed) void updateBook(book.id, { title: trimmed })
                          }}
                        />
                      </td>
                      <td>
                        <CommitInput
                          value={book.author ?? ''}
                          ariaLabel="المؤلف"
                          placeholder="—"
                          onCommit={(author) =>
                            void updateBook(book.id, { author: author.trim() || null })
                          }
                        />
                      </td>
                      <td>
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={book.is_active}
                            onChange={(event) =>
                              void updateBook(book.id, { is_active: event.target.checked })
                            }
                          />
                          {book.is_active ? 'نعم' : 'لا'}
                        </label>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--danger-ghost btn--sm"
                          onClick={() => setPendingDelete(book)}
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {booksLoading || membersLoading ? <Loading /> : null}

      {!booksLoading && activeBooks.length === 0 ? (
        <EmptyState
          title="لا توجد كتب مبرمجة"
          hint="افتح «إدارة الكتب» وأضف الكتاب الأول."
        />
      ) : null}

      {activeBooks.length > 0 ? (
        <div className="chip-row">
          {activeBooks.map((book) => (
            <button
              key={book.id}
              type="button"
              className={`btn btn--tab${book.id === bookId ? ' is-active' : ''}`}
              onClick={() => setBookId(book.id)}
            >
              {book.title}
            </button>
          ))}
        </div>
      ) : null}

      {!membersLoading && members.length === 0 ? (
        <EmptyState title="لا يوجد أعضاء نشطون" hint="أضف الأعضاء من صفحة «الأعضاء» أولاً." />
      ) : null}

      {bookId && members.length > 0 && !loading ? (
        <>
          <div className="sheet-toolbar">
            <div className="sheet-toolbar__stats">
              {READING_OPTIONS.map((option) =>
                counts.get(option.value) ? (
                  <span key={option.value} className={`pill pill--${option.tone}`}>
                    {option.value}: {counts.get(option.value)}
                  </span>
                ) : null,
              )}
            </div>
          </div>

          <div className="table-wrap">
            <table className="sheet">
              <thead>
                <tr>
                  <th className="sheet__col-name">العضو</th>
                  <th>الحالة</th>
                  <th>تاريخ الإنهاء</th>
                  <th className="sheet__col-note">ملاحظة</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const row = rows[member.id]
                  return (
                    <tr key={member.id} className={pending.includes(member.id) ? 'is-saving' : ''}>
                      <td className="sheet__name">{member.full_name}</td>
                      <td>
                        <StatusPicker
                          options={READING_OPTIONS}
                          value={row?.status ?? 'لم يبدأ'}
                          onChange={(status) =>
                            void save(member.id, {
                              status,
                              finished_date:
                                status === 'أنهى'
                                  ? (row?.finished_date ?? todayISO())
                                  : null,
                            })
                          }
                        />
                      </td>
                      <td className="sheet__col-narrow">
                        <CommitInput
                          type="date"
                          value={row?.finished_date ?? ''}
                          disabled={row?.status !== 'أنهى'}
                          ariaLabel={`تاريخ الإنهاء ${member.full_name}`}
                          onCommit={(value) =>
                            void save(member.id, { finished_date: value || null })
                          }
                        />
                      </td>
                      <td>
                        <CommitInput
                          value={row?.note ?? ''}
                          ariaLabel={`ملاحظة ${member.full_name}`}
                          placeholder="ملاحظة…"
                          onCommit={(note) => void save(member.id, { note: note.trim() || null })}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        danger
        title="حذف الكتاب"
        message={
          pendingDelete
            ? `سيتم حذف «${pendingDelete.title}» وكل تسجيلات القراءة المرتبطة به. يمكنك بدل ذلك إلغاء تحديد «مبرمج حالياً».`
            : undefined
        }
        confirmLabel="حذف"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const book = pendingDelete
          setPendingDelete(null)
          if (book) void deleteBook(book.id)
        }}
      />
    </section>
  )
}
