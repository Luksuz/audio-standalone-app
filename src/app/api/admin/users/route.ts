import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'
import { getUsers, createUser, getUserProfiles } from '../../../../../lib/supabase/admin'

// GET /api/admin/users - Get all users
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()
    
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get users and profiles
    const [usersResult, profilesResult] = await Promise.all([
      getUsers(),
      getUserProfiles()
    ])
    
    if (usersResult.error) {
      return NextResponse.json({ error: usersResult.error.message }, { status: 500 })
    }
    
    if (profilesResult.error) {
      return NextResponse.json({ error: profilesResult.error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      users: usersResult.users,
      profiles: profilesResult.profiles
    })
    
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()
    
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Parse request body
    const body = await request.json()
    const { email, password, isAdmin } = body
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    
    // Create user
    const result = await createUser(email, password, isAdmin)
    
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      message: 'User created successfully',
      user: result.user
    })
    
  } catch (error) {
    console.error('Error in POST /api/admin/users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 