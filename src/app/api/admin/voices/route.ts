import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'

// Database functions using Supabase
async function getVoicesFromDB() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_voices')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return data || []
}

async function createVoiceInDB(voiceData: any) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_voices')
    .insert([voiceData])
    .select()
    .single()

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return data
}

export async function GET(request: NextRequest) {
  try {
    const voices = await getVoicesFromDB()
    
    return NextResponse.json({
      success: true,
      voices: voices
    })
  } catch (error) {
    console.error('Error fetching voices:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch voices' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const voiceData = await request.json()
    
    // Validate required fields for the simplified schema
    const required = ['voice_id', 'name', 'provider']
    for (const field of required) {
      if (!voiceData[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }
    
    // Clean data to match our simple schema
    const cleanData = {
      voice_id: voiceData.voice_id,
      name: voiceData.name,
      provider: voiceData.provider
    }
    
    const newVoice = await createVoiceInDB(cleanData)
    
    return NextResponse.json({
      success: true,
      voice: newVoice
    })
  } catch (error) {
    console.error('Error creating voice:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create voice' },
      { status: 500 }
    )
  }
} 