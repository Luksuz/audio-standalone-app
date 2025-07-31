import { createClient } from '@supabase/supabase-js'

// Admin client with service role key for user management
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// User management functions
export async function getUsers() {
  const supabase = createAdminClient()
  
  try {
    const { data, error } = await supabase.auth.admin.listUsers()
    if (error) throw error
    return { users: data.users, error: null }
  } catch (error) {
    console.error('Error fetching users:', error)
    return { users: [], error: error as Error }
  }
}

export async function deleteUser(userId: string) {
  const supabase = createAdminClient()
  
  try {
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('Error deleting user:', error)
    return { success: false, error: error as Error }
  }
}

export async function createUser(email: string, password: string, isAdmin: boolean = false) {
  const supabase = createAdminClient()
  
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    
    if (error) throw error
    
    // Create profile entry
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          is_admin: isAdmin
        })
      
      if (profileError) {
        console.error('Error creating profile:', profileError)
        // Don't throw here as the user was created successfully
      }
    }
    
    return { user: data.user, error: null }
  } catch (error) {
    console.error('Error creating user:', error)
    return { user: null, error: error as Error }
  }
}

export async function getUserProfiles() {
  const supabase = createAdminClient()
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { profiles: data, error: null }
  } catch (error) {
    console.error('Error fetching profiles:', error)
    return { profiles: [], error: error as Error }
  }
}

export async function updateUserProfile(userId: string, updates: { is_admin?: boolean }) {
  const supabase = createAdminClient()
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
    
    if (error) throw error
    return { profile: data[0], error: null }
  } catch (error) {
    console.error('Error updating profile:', error)
    return { profile: null, error: error as Error }
  }
} 