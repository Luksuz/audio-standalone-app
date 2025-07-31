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

// Helper function to update voice in database
async function updateVoiceInDB(id: string, voiceData: any) {
  const serviceSupabase = createServiceRoleClient()
  const { data, error } = await serviceSupabase
    .from('ai_voices')
    .update(voiceData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return data
}

// Helper function to delete voice from database
async function deleteVoiceFromDB(id: string) {
  const serviceSupabase = createServiceRoleClient()
  const { error } = await serviceSupabase
    .from('ai_voices')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return true
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await checkAdminAccess() // Verify admin access
    const voiceData = await request.json()

    // Clean the data - only allow specific fields
    const allowedFields = ['voice_id', 'name', 'provider']
    const cleanData: any = {}
    
    for (const field of allowedFields) {
      if (voiceData[field] !== undefined) {
        cleanData[field] = String(voiceData[field]).trim()
      }
    }

    if (Object.keys(cleanData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const updatedVoice = await updateVoiceInDB(id, cleanData)
    
    return NextResponse.json({
      success: true,
      voice: updatedVoice
    })
  } catch (error: any) {
    console.error('Error updating voice:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : error.message === 'Admin access required' ? 403 : 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await checkAdminAccess() // Verify admin access
    
    await deleteVoiceFromDB(id)
    
    return NextResponse.json({
      success: true,
      message: 'Voice deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting voice:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : error.message === 'Admin access required' ? 403 : 500 }
    )
  }
} 