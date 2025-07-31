import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../../lib/supabase/server'

// Database functions using Supabase
async function updateVoiceInDB(id: string, updateData: any) {
  const supabase = await createClient()
  
  // Clean data to match our simple schema
  const cleanData: any = {}
  if (updateData.voice_id !== undefined) cleanData.voice_id = updateData.voice_id
  if (updateData.name !== undefined) cleanData.name = updateData.name
  if (updateData.provider !== undefined) cleanData.provider = updateData.provider
  
  const { data, error } = await supabase
    .from('ai_voices')
    .update(cleanData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return data
}

async function deleteVoiceFromDB(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
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
    const updateData = await request.json()
    
    const updatedVoice = await updateVoiceInDB(id, updateData)
    
    return NextResponse.json({
      success: true,
      voice: updatedVoice
    })
  } catch (error) {
    console.error('Error updating voice:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update voice' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    await deleteVoiceFromDB(id)
    
    return NextResponse.json({
      success: true,
      message: 'Voice deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting voice:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete voice' },
      { status: 500 }
    )
  }
} 