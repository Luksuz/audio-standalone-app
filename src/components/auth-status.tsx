'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { LogOut, Settings, Shield, User as UserIcon } from 'lucide-react'
import Link from 'next/link'

interface Profile {
  id: number
  user_id: string
  is_admin: boolean
  created_at: string
}

export function AuthStatus() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let timeoutId: NodeJS.Timeout

    const getUser = async () => {
      try {
        console.log("🔄 [AUTH] Starting auth check...")
        
        console.log("📡 [AUTH] Supabase client created:", {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'URL_SET' : 'URL_MISSING',
          anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'KEY_SET' : 'KEY_MISSING'
        })
        
        console.log("🔑 [AUTH] Calling supabase.auth.getUser()...")
        
        // Add timeout to prevent infinite hanging
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Auth timeout')), 5000)
        })
        
        const authPromise = supabase.auth.getUser()
        
        const { data: { user }, error: authError } = await Promise.race([
          authPromise,
          timeoutPromise
        ]) as any
        
        clearTimeout(timeoutId)
        
        console.log("✅ [AUTH] Auth call completed:", { 
          user: user ? user.email : null, 
          error: authError?.message 
        })
        
        if (authError) {
          console.error("❌ [AUTH] Auth error:", authError)
          setError(authError.message)
          setLoading(false)
          return
        }
        
        await handleUserUpdate(user, supabase)
        
      } catch (error: any) {
        console.error('💥 [AUTH] Fatal error in getUser:', error)
        if (error.message === 'Auth timeout') {
          console.log("⏰ [AUTH] Timeout - relying on auth state listener")
          // Don't set error for timeout, let auth state listener handle it
        } else {
          setError(error.message || 'Unknown error')
        }
      } finally {
        console.log("🏁 [AUTH] Auth check completed")
        // Don't set loading to false here if we timed out - let auth state listener handle it
        if (!timeoutId) {
          setLoading(false)
        }
      }
    }

    const handleUserUpdate = async (user: User | null, supabaseClient = supabase) => {
      setUser(user)
      
      if (user) {
        console.log("👤 [AUTH] User found, fetching profile...")

        console.log("User", user)
        
        try {
          console.log("🔍 [PROFILE] Starting profile fetch for user:", user.id)
          
          // Add timeout for profile fetch too
          const profileTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
          })
          
          const profilePromise = supabaseClient
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()
          
          console.log("📡 [PROFILE] Profile query initiated...")

          const { data: profile, error: profileError } = await Promise.race([
            profilePromise,
            profileTimeoutPromise
          ]) as any
          
          console.log("📋 [AUTH] Profile fetch result:", { 
            profile: profile ? { is_admin: profile.is_admin } : null, 
            error: profileError?.message 
          })
          
          if (profileError && profileError.code !== 'PGRST116') {
            console.error("❌ [AUTH] Profile error:", profileError)
          }
          
          setProfile(profile)
        } catch (profileError: any) {
          console.error("❌ [AUTH] Profile fetch failed:", profileError)
          if (profileError.message === 'Profile fetch timeout') {
            console.log("⏰ [PROFILE] Profile fetch timed out - continuing without profile")
          }
          // Continue without profile data
          setProfile(null)
        }
      } else {
        setProfile(null)
      }
      
      setLoading(false)
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        console.log("🔔 [AUTH] Auth state change:", { event, user: session?.user?.email })
        
        if (event === 'SIGNED_IN' && session?.user) {
          await handleUserUpdate(session.user)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
        <span className="text-xs text-gray-500">Loading auth...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="flex items-center gap-1">
          <span>⚠️ Auth Error</span>
        </Badge>
        <span className="text-xs text-red-600">{error}</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="flex items-center gap-1">
          <UserIcon className="h-3 w-3" />
          Not authenticated
        </Badge>
        <Link href="/auth/login">
          <Button variant="outline" size="sm" className="rounded-lg hover:bg-purple-50 hover:border-purple-200">
            Login
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Badge variant="default" className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-blue-600">
          <UserIcon className="h-3 w-3" />
          {user.email}
        </Badge>
        
        {profile?.is_admin && (
          <Badge variant="destructive" className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-pink-500">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {profile?.is_admin && (
          <Link href="/admin">
            <Button variant="outline" size="sm" className="flex items-center gap-1 rounded-lg hover:bg-purple-50 hover:border-purple-200">
              <Settings className="h-3 w-3" />
              Admin Panel
            </Button>
          </Link>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-1 rounded-lg hover:bg-red-50 hover:border-red-200"
        >
          <LogOut className="h-3 w-3" />
          Logout
        </Button>
      </div>
    </div>
  )
} 