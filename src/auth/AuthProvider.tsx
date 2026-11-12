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

export interface RoleGrant {
  role: AppRole
  majlis_id: string | null
}

interface MembershipLink {
  majlis_id: string
  status: 'active' | 'pending' | 'rejected'
}

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  roles: AppRole[]
  grants: RoleGrant[]
  memberships: MembershipLink[]
  member: MemberLink | null
  majlisId: string | null
  activeMajlisId: string | null
  isSuperAdmin: boolean
  isMajlisAdmin: boolean
  /** Vrai tant qu'on ne sait pas encore qui est connecté. */
  loading: boolean
  error: string | null
  has: (...roles: AppRole[]) => boolean
  hasRoleInMajlis: (role: AppRole, majlisId: string) => boolean
  selectMajlis: (majlisId: string | null) => void
  reload: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<AppRole[]>([])
  const [grants, setGrants] = useState<RoleGrant[]>([])
  const [memberships, setMemberships] = useState<MembershipLink[]>([])
  const [member, setMember] = useState<MemberLink | null>(null)
  const [majlisId, setMajlisId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const requestGeneration = useRef(0)
  const selectedMajlisKey = (userId: string) => `halaqa.active-majlis:${userId}`

  const loadIdentity = useCallback(async (userId: string) => {
    const generation = ++requestGeneration.current
    try {
      const [profileResult, rolesResult, memberResult] = await Promise.all([
        supabase.from('profiles').select('id, full_name, phone').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role, majlis_id').eq('user_id', userId),
        supabase
          .from('members')
          .select('id, full_name, majlis_id')
          .eq('user_id', userId)
          .maybeSingle(),
      ])

      const failure = profileResult.error ?? rolesResult.error ?? memberResult.error
      if (failure) throw failure

      const nextGrants = (rolesResult.data ?? []) as RoleGrant[]
      const memberData = memberResult.data as MemberLink | null
      const membershipResult = memberData
        ? await supabase.from('majlis_members').select('majlis_id, status').eq('member_id', memberData.id)
        : { data: [], error: null }
      if (membershipResult.error) throw membershipResult.error
      if (generation !== requestGeneration.current) return false

      const nextMemberships = (membershipResult.data ?? []) as MembershipLink[]
      const activeIds = nextMemberships.filter((row) => row.status === 'active').map((row) => row.majlis_id)
      const stored = window.localStorage.getItem(selectedMajlisKey(userId))
      const explicitMajlis = activeIds.includes(stored ?? '')
        ? stored
        : activeIds[0] ?? null

      setProfile((profileResult.data as Profile | null) ?? null)
      setGrants(nextGrants)
      setRoles([...new Set(nextGrants.map((row) => row.role))])
      setMemberships(nextMemberships)
      setMember(memberData)
      setMajlisId(explicitMajlis)
      setError(null)
      return true
    } catch (caught) {
      if (generation !== requestGeneration.current) return false
      setError(errorMessage(caught))
      setRoles([])
      setGrants([])
      setMemberships([])
      setMember(null)
      setMajlisId(null)
      return false
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const apply = async (next: Session | null) => {
      if (cancelled) return
      setSession(next)

      if (!next?.user) {
        requestGeneration.current += 1
        setProfile(null)
        setRoles([])
        setGrants([])
        setMemberships([])
        setMember(null)
        setMajlisId(null)
        setLoading(false)
        return
      }
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
    requestGeneration.current += 1
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setError(errorMessage(signOutError))
      throw signOutError
    }
  }, [])

  const value = useMemo<AuthState>(() => {
    const isSuperAdmin = grants.some(
      (grant) => grant.majlis_id === null && (grant.role === 'super_admin' || grant.role === 'supervisor'),
    )
    const hasRoleInMajlis = (role: AppRole, targetMajlisId: string) =>
      isSuperAdmin ||
      (memberships.some((row) => row.majlis_id === targetMajlisId && row.status === 'active') &&
        grants.some((grant) => grant.role === role && grant.majlis_id === targetMajlisId))
    const isMajlisAdmin = majlisId !== null && hasRoleInMajlis('majlis_admin', majlisId)

    const has = (...wanted: AppRole[]) =>
      wanted.some((role) => {
        if ((role === 'supervisor' || role === 'super_admin') && isSuperAdmin) return true
        return majlisId !== null && hasRoleInMajlis(role, majlisId)
      })

    const selectMajlis = (nextMajlisId: string | null) => {
      if (nextMajlisId !== null && !memberships.some((row) => row.majlis_id === nextMajlisId && row.status === 'active')) return
      setMajlisId(nextMajlisId)
      if (session?.user?.id && nextMajlisId) window.localStorage.setItem(selectedMajlisKey(session.user.id), nextMajlisId)
    }

    return {
      session,
      user: session?.user ?? null,
      profile,
      roles,
      grants,
      memberships,
      member,
      majlisId,
      activeMajlisId: majlisId,
      isSuperAdmin,
      isMajlisAdmin,
      loading,
      error,
      has,
      hasRoleInMajlis,
      selectMajlis,
      reload,
      signOut,
    }
  }, [session, profile, roles, grants, memberships, member, majlisId, loading, error, reload, signOut])

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
