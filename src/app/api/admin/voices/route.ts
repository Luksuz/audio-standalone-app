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

// Helper function to get voices from database
async function getVoicesFromDB() {
  const serviceSupabase = createServiceRoleClient()
  const { data, error } = await serviceSupabase
    .from('ai_voices')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return data || []
}

// Helper function to create voice in database
async function createVoiceInDB(voiceData: any) {
  const serviceSupabase = createServiceRoleClient()
  const { data, error } = await serviceSupabase
    .from('ai_voices')
    .insert([{
      voice_id: voiceData.voice_id,
      name: voiceData.name,
      provider: voiceData.provider
    }])
    .select()
    .single()

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return data
}

export async function GET(request: NextRequest) {
  try {
    await checkAdminAccess() // Verify admin access
    const voices = await getVoicesFromDB()
    
    return NextResponse.json({
      success: true,
      voices: voices
    })
  } catch (error: any) {
    console.error('Error fetching voices:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : error.message === 'Admin access required' ? 403 : 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await checkAdminAccess() // Verify admin access
    const voiceData = await request.json()

    // Validate required fields
    const required = ['voice_id', 'name', 'provider']
    for (const field of required) {
      if (!voiceData[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Clean the data
    const cleanData = {
      voice_id: String(voiceData.voice_id).trim(),
      name: String(voiceData.name).trim(),
      provider: String(voiceData.provider).trim()
    }

    const newVoice = await createVoiceInDB(cleanData)
    
    return NextResponse.json({
      success: true,
      voice: newVoice
    })
  } catch (error: any) {
    console.error('Error creating voice:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : error.message === 'Admin access required' ? 403 : 500 }
    )
  }
} 