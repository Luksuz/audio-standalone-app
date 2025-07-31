import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'

export function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const supabase = createClient()
    
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', session.user.id)
        .single()

      setIsAdmin(profile?.is_admin || false)
      setLoading(false)
    }

    checkAdminStatus()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setIsAdmin(false)
        setLoading(false)
      } else if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true)
        checkAdminStatus()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { isAdmin, loading }
} 