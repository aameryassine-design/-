import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        // La session est conservée : indispensable dans l'APK, où l'on ne veut
        // pas ressaisir son mot de passe à chaque ouverture.
        persistSession: true,
        autoRefreshToken: true,
        // Pas de lien magique : l'app utilise e-mail + mot de passe, et le
        // routeur par hash entrerait en conflit avec la détection d'URL.
        detectSessionInUrl: false,
      },
    })
  : (null as unknown as SupabaseClient)

const MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  'Email not confirmed': 'لم يتم تأكيد البريد الإلكتروني بعد',
  'User already registered': 'هذا البريد الإلكتروني مسجَّل من قبل',
  'Password should be at least 6 characters':
    'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
}

export function errorMessage(error: unknown): string {
  if (!error) return ''
  if (typeof error === 'string') return MESSAGES[error] ?? error

  if (typeof error === 'object' && 'message' in error) {
    const raw = String((error as { message: unknown }).message)
    if (MESSAGES[raw]) return MESSAGES[raw]

    // Refus de la RLS : message technique inutile pour l'utilisateur.
    if (raw.includes('row-level security') || raw.includes('violates row-level')) {
      return 'ليست لديك صلاحية للقيام بهذه العملية'
    }
    if (raw.includes('duplicate key')) return 'هذا التسجيل موجود من قبل'
    return raw
  }

  return 'حدث خطأ غير متوقع'
}
