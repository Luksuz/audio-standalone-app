'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/auth/login' 
}: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (!mounted) return

        if (error) {
          console.error('Auth error:', error)
          setUser(null)
        } else {
          setUser(user)
        }

        // If auth is required but no user, redirect to login
        if (requireAuth && !user && !error) {
          setRedirecting(true)
          router.push(redirectTo)
          return
        }

        setLoading(false)
      } catch (error) {
        console.error('Auth check failed:', error)
        if (!mounted) return
        
        setUser(null)
        setLoading(false)
        
        if (requireAuth) {
          setRedirecting(true)
          router.push(redirectTo)
        }
      }
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return
        
        console.log('Auth state change:', event)
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          setLoading(false)
          setRedirecting(false)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          if (requireAuth) {
            setRedirecting(true)
            router.push(redirectTo)
          } else {
            setLoading(false)
            setRedirecting(false)
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [requireAuth, redirectTo, router])

  // Show loading spinner while checking auth or redirecting
  if (loading || redirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {redirecting ? 'Redirecting to login...' : 'Checking authentication...'}
          </p>
        </div>
      </div>
    )
  }

  // If auth is required but user is not authenticated, show message (shouldn't happen due to middleware)
  if (requireAuth && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Access denied. Please log in.</p>
          <button
            onClick={() => router.push(redirectTo)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // Render children if auth check passes
  return <>{children}</>
} 