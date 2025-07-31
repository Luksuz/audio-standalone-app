import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '../../../../../lib/supabase/server'

// Helper function to check if user is admin
async function checkAdminAccess() {
  const supabase = await createClient()
  const { data: { user } = {} } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }

  // Check if user is admin using service role client to bypass RLS
  const serviceSupabase = createServiceRoleClient()
  const { data: profile, error } = await serviceSupabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (error || !profile?.is_admin) {
    throw new Error('Admin access required')
  }

  return { user, supabase, serviceSupabase }
}

// GET /api/admin/users - List all users from auth.users
export async function GET(request: NextRequest) {
  try {
    const { serviceSupabase } = await checkAdminAccess()

    // Get all users from auth.users using service role client
    const { data: { users }, error } = await serviceSupabase.auth.admin.listUsers()

    if (error) {
      throw new Error(`Auth error: ${error.message}`)
    }

    // Transform the auth.users data to match our interface
    const transformedUsers = users.map(user => ({
      id: user.id, // This is the UUID from auth.users
      user_id: user.id, // Keep for compatibility
      email: user.email,
      is_admin: false, // We'll need to check profiles table for admin status
      created_at: user.created_at
    }))

    // Get admin status for each user from profiles table
    const userIds = transformedUsers.map(u => u.id)
    const { data: profiles } = await serviceSupabase
      .from('profiles')
      .select('user_id, is_admin')
      .in('user_id', userIds)

    // Merge admin status
    const usersWithAdminStatus = transformedUsers.map(user => ({
      ...user,
      is_admin: profiles?.find(p => p.user_id === user.id)?.is_admin || false
    }))

    return NextResponse.json({
      users: usersWithAdminStatus,
      total: usersWithAdminStatus.length
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'Admin access required') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const { serviceSupabase } = await checkAdminAccess()
    const userData = await request.json()

    // Validate required fields
    const required = ['email', 'password']
    for (const field of required) {
      if (!userData[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Create user in Supabase Auth using service role client
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        // No longer collecting full_name
      }
    })

    if (authError) {
      throw new Error(`Auth error: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('Failed to create user')
    }

    // Update profile with admin status if specified using service role client
    if (userData.is_admin !== undefined) {
      const { error: profileError } = await serviceSupabase
        .from('profiles')
        .update({ 
          is_admin: userData.is_admin
        })
        .eq('user_id', authData.user.id)

      if (profileError) {
        console.error('Error updating profile:', profileError)
        // Don't fail the request, just log the error
      }
    }

    // Fetch the created profile using service role client
    const { data: profile, error: fetchError } = await serviceSupabase
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()

    if (fetchError) {
      console.error('Error fetching created profile:', fetchError)
    }

    return NextResponse.json({
      success: true,
      user: profile || {
        user_id: authData.user.id,
        email: authData.user.email,
        is_admin: userData.is_admin || false,
        created_at: authData.user.created_at
      }
    })

  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : error.message === 'Admin access required' ? 403 : 500 }
    )
  }
} 