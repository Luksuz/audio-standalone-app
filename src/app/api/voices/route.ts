import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function GET() {
  try {
    // Create Supabase client
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch custom voices from the database
    const { data: voices, error } = await supabase
      .from('ai_voices')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching custom voices:', error)
      return NextResponse.json({ error: 'Failed to fetch custom voices' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      voices: voices || []
    })

  } catch (error) {
    console.error('Error in GET /api/voices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 