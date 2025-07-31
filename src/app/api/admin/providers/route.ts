import { NextRequest, NextResponse } from 'next/server'

// Mock database function - replace with your actual database implementation
async function getProvidersFromDB() {
  // This should connect to your PostgreSQL database
  // For now, returning mock data based on the migration
  return [
    {
      id: "elevenlabs-provider-id",
      name: "elevenlabs",
      display_name: "ElevenLabs",
      api_endpoint: "https://api.elevenlabs.io/v1",
      chunk_size: 3000,
      is_active: true,
      config: { fetchVoicesUrl: "/api/list-elevenlabs-voices" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: "fishaudio-provider-id",
      name: "fishaudio",
      display_name: "Fish Audio",
      api_endpoint: "https://api.fish.audio/v1",
      chunk_size: 3000,
      is_active: true,
      config: { fetchVoicesUrl: "/api/list-fishaudio-voices" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: "minimax-provider-id",
      name: "minimax",
      display_name: "MiniMax",
      api_endpoint: "https://api.minimaxi.chat/v1",
      chunk_size: 2500,
      is_active: true,
      config: { fetchVoicesUrl: "/api/list-minimax-voices" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
}

export async function GET(request: NextRequest) {
  try {
    const providers = await getProvidersFromDB()
    
    return NextResponse.json({
      success: true,
      providers: providers
    })
  } catch (error) {
    console.error('Error fetching providers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch providers' },
      { status: 500 }
    )
  }
} 