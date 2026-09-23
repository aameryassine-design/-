import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { ErrorBanner, Loading } from '../components/Feedback'
import { errorMessage, supabase } from '../lib/supabase'
import type { Book } from '../lib/types'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export function BookReaderPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const { member } = useAuth()

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const docRef = useRef<PDFDocumentProxy | null>(null)
  const loadingRef = useRef<PDFDocumentLoadingTask | null>(null)
  const taskRef = useRef<RenderTask | null>(null)

  const [book, setBook] = useState<Book | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 1. Le livre, son URL signée, et le document PDF.
  useEffect(() => {
    if (!bookId) return
    let cancelled = false

    const open = async () => {
      setLoading(true)
      try {
        const { data: bookRow, error: bookError } = await supabase
          .from('books')
          .select('*')
          .eq('id', bookId)
          .single()
        if (bookError) throw bookError

        const found = bookRow as Book
        if (!found.pdf_path) throw new Error('لم يُرفع ملف هذا الكتاب بعد')
        if (cancelled) return
        setBook(found)

        const { data: signed, error: signError } = await supabase.storage
          .from('books')
          .createSignedUrl(found.pdf_path, 60 * 60)
        if (signError || !signed) throw signError ?? new Error('تعذّر فتح الملف')

        const loadingTask = pdfjs.getDocument({ url: signed.signedUrl })
        loadingRef.current = loadingTask

        const doc = await loadingTask.promise
        if (cancelled) {
          void loadingTask.destroy()
          return
        }

        docRef.current = doc
        setPageCount(doc.numPages)
        setError(null)

        // Reprise à la dernière page lue.
        if (member) {
          const { data: progress } = await supabase
            .from('book_reading_progress')
            .select('last_page')
            .eq('book_id', bookId)
            .eq('member_id', member.id)
            .maybeSingle()
          const last = (progress as { last_page: number | null } | null)?.last_page
          if (!cancelled && last && last >= 1 && last <= doc.numPages) setPage(last)
        }
      } catch (caught) {
        if (!cancelled) setError(errorMessage(caught))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void open()

    return () => {
      cancelled = true
      taskRef.current?.cancel()
      void loadingRef.current?.destroy()
      loadingRef.current = null
      docRef.current = null
    }
  }, [bookId, member])

  // 2. Rendu de la page courante, ajusté à la largeur de l'écran.
  const render = useCallback(async () => {
    const doc = docRef.current
    const canvas = canvasRef.current
    const frame = frameRef.current
    if (!doc || !canvas || !frame) return

    taskRef.current?.cancel()

    try {
      const pdfPage = await doc.getPage(page)
      const base = pdfPage.getViewport({ scale: 1 })
      const fit = (frame.clientWidth - 8) / base.width
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      const viewport = pdfPage.getViewport({ scale: fit * zoom * ratio })

      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      canvas.style.width = `${Math.floor(viewport.width / ratio)}px`
      canvas.style.height = `${Math.floor(viewport.height / ratio)}px`

      const task = pdfPage.render({ canvas, viewport })
      taskRef.current = task
      await task.promise
      taskRef.current = null
    } catch (caught) {
      // Une annulation (changement de page rapide) n'est pas une erreur.
      if ((caught as { name?: string })?.name !== 'RenderingCancelledException') {
        setError(errorMessage(caught))
      }
    }
  }, [page, zoom])

  useEffect(() => {
    void render()
  }, [render, pageCount])

  useEffect(() => {
    const onResize = () => void render()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [render])

  // 3. Mémorisation de la page lue (le membre seul a une fiche de lecture).
  useEffect(() => {
    if (!member || !bookId || pageCount === 0) return
    const timer = window.setTimeout(() => {
      void supabase.from('book_reading_progress').upsert(
        {
          book_id: bookId,
          member_id: member.id,
          last_page: page,
          status: page >= pageCount ? 'أنهى' : 'قيد القراءة',
        },
        { onConflict: 'book_id,member_id' },
      )
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [member, bookId, page, pageCount])

  const go = (next: number) => setPage(Math.min(Math.max(next, 1), pageCount || 1))

  return (
    <section className="page reader">
      <div className="reader__bar">
        <Link className="btn btn--ghost btn--sm" to="/app/books">
          ‹ الكتب
        </Link>
        <span className="reader__title">{book?.title}</span>
        <div className="row-actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
            aria-label="تصغير"
          >
            −
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
            aria-label="تكبير"
          >
            +
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />
      {loading ? <Loading label="جارٍ فتح الكتاب…" /> : null}

      <div className="reader__frame" ref={frameRef}>
        <canvas ref={canvasRef} className="reader__canvas" />
      </div>

      {pageCount > 0 ? (
        <div className="reader__nav">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={page <= 1}
            onClick={() => go(page - 1)}
          >
            ‹ السابقة
          </button>

          <label className="reader__page">
            <input
              className="input"
              type="number"
              min={1}
              max={pageCount}
              value={page}
              onChange={(event) => go(Number(event.target.value))}
              aria-label="رقم الصفحة"
            />
            <span className="hint">/ {pageCount}</span>
          </label>

          <button
            type="button"
            className="btn btn--ghost"
            disabled={page >= pageCount}
            onClick={() => go(page + 1)}
          >
            التالية ›
          </button>
        </div>
      ) : null}
    </section>
  )
}
