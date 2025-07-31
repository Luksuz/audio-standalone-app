'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import { type User } from '@supabase/supabase-js'
import { Shield, AlertTriangle, Home } from 'lucide-react'

interface AdminGuardProps {
  children: React.ReactNode
  fallbackPath?: string
}

export function AdminGuard({ children, fallbackPath = '/' }: AdminGuardProps) {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    
    const checkAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        router.push(`/auth/login?redirectTo=${encodeURIComponent(window.location.pathname)}`)
        return
      }

      setUser(session.user)

      // Check admin status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', session.user.id)
        .single()

      if (!profile?.is_admin) {
        router.push(fallbackPath)
        return
      }

      setIsAdmin(true)
      setLoading(false)
    }

    checkAdminAccess()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/auth/login')
      } else if (event === 'SIGNED_IN' && session?.user) {
        checkAdminAccess()
      }
    })

    return () => subscription.unsubscribe()
  }, [router, fallbackPath])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Checking Admin Access</h2>
          <p className="text-gray-600">Verifying your permissions...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Access Required</h2>
          <p className="text-gray-600 mb-4">
            You need admin privileges to access this area.
          </p>
          <button
            onClick={() => router.push(fallbackPath)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go to Main App
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 