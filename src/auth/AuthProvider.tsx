import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { errorMessage, supabase } from '../lib/supabase'
import type { AppRole, Profile } from '../lib/types'

/** Fiche membre rattachée au compte — absente pour un responsable non-membre. */
export interface MemberLink {
  id: string
  full_name: string
  majlis_id: string | null
}

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  roles: AppRole[]
  member: MemberLink | null
  /** Vrai tant qu'on ne sait pas encore qui est connecté. */
  loading: boolean
  error: string | null
  has: (...roles: AppRole[]) => boolean
  reload: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<AppRole[]>([])
  const [member, setMember] = useState<MemberLink | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /** Identité déjà chargée, pour ne pas refaire les requêtes à chaque refresh de jeton. */
  const loadedFor = useRef<string | null>(null)

  const loadIdentity = useCallback(async (userId: string) => {
    try {
      const [profileResult, rolesResult, memberResult] = await Promise.all([
        supabase.from('profiles').select('id, full_name, phone').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
        supabase
          .from('members')
          .select('id, full_name, majlis_id')
          .eq('user_id', userId)
          .maybeSingle(),
      ])

      const failure = profileResult.error ?? rolesResult.error ?? memberResult.error
      if (failure) throw failure

      setProfile((profileResult.data as Profile | null) ?? null)
      setRoles(((rolesResult.data ?? []) as { role: AppRole }[]).map((row) => row.role))
      setMember((memberResult.data as MemberLink | null) ?? null)
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
      setRoles([])
      setMember(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const apply = async (next: Session | null) => {
      if (cancelled) return
      setSession(next)

      if (!next?.user) {
        loadedFor.current = null
        setProfile(null)
        setRoles([])
        setMember(null)
        setLoading(false)
        return
      }

      if (loadedFor.current === next.user.id) {
        setLoading(false)
        return
      }

      loadedFor.current = next.user.id
      await loadIdentity(next.user.id)
      if (!cancelled) setLoading(false)
    }

    void supabase.auth.getSession().then(({ data }) => apply(data.session))

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      void apply(next)
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [loadIdentity])

  const reload = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) return
    await loadIdentity(userId)
  }, [session?.user?.id, loadIdentity])

  const signOut = useCallback(async () => {
    loadedFor.current = null
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      roles,
      member,
      loading,
      error,
      has: (...wanted: AppRole[]) => wanted.some((role) => roles.includes(role)),
      reload,
      signOut,
    }),
    [session, profile, roles, member, loading, error, reload, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return context
}

/** Nom à afficher : celui de la fiche membre, sinon celui du profil. */
export function useDisplayName(): string {
  const { member, profile, user } = useAuth()
  return member?.full_name || profile?.full_name || user?.email || ''
}
