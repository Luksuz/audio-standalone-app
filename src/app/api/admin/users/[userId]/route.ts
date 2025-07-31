import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '../../../../../../lib/supabase/server'

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

// PATCH /api/admin/users/[userId] - Update user profile
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { serviceSupabase, user: currentUser } = await checkAdminAccess()
    const updateData = await request.json()

    // Prevent self-demotion from admin - userId is the user_id (UUID), not the profile id
    if (currentUser.id === userId && updateData.is_admin === false) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove admin privileges from your own account' },
        { status: 400 }
      )
    }

    // Clean update data - only allow specific fields
    const allowedFields = ['full_name', 'is_admin']
    const cleanData: any = {}
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        cleanData[field] = updateData[field]
      }
    }

    if (Object.keys(cleanData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update profile using service role client - userId is the user_id (UUID)
    const { data: profile, error } = await serviceSupabase
      .from('profiles')
      .update(cleanData)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      user: profile
    })

  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : error.message === 'Admin access required' ? 403 : 500 }
    )
  }
}

// DELETE /api/admin/users/[userId] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { serviceSupabase, user: currentUser } = await checkAdminAccess()
    
    // Prevent self-deletion - userId is actually the user_id (UUID), not the profile id
    if (currentUser.id === userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Delete user from auth using service role client (this will cascade to profiles due to foreign key)
    // userId parameter should be the user_id (UUID) from the profiles table
    const { error } = await serviceSupabase.auth.admin.deleteUser(userId)

    if (error) {
      throw new Error(`Auth error: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : error.message === 'Admin access required' ? 403 : 500 }
    )
  }
} 