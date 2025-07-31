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

// GET /api/admin/jobs - Get job statistics for all users
export async function GET(request: NextRequest) {
  try {
    const { serviceSupabase } = await checkAdminAccess()
    const url = new URL(request.url)
    const period = url.searchParams.get('period') || 'week' // day, week, month

    // Get job statistics grouped by user
    const { data: jobStats, error } = await serviceSupabase
      .from('jobs')
      .select(`
        user_id,
        provider_used,
        characters_used,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Process the data to group by user and calculate totals
    const userJobStats: Record<string, {
      total_jobs: number
      total_characters: number
      providers_used: string[]
      last_job_at: string | null
      recent_jobs: Array<{
        provider: string
        characters: number
        created_at: string
      }>
    }> = {}

    jobStats?.forEach(job => {
      if (!userJobStats[job.user_id]) {
        userJobStats[job.user_id] = {
          total_jobs: 0,
          total_characters: 0,
          providers_used: [],
          last_job_at: null,
          recent_jobs: []
        }
      }

      const userStats = userJobStats[job.user_id]
      userStats.total_jobs += 1
      userStats.total_characters += job.characters_used || 0
      
      if (!userStats.providers_used.includes(job.provider_used)) {
        userStats.providers_used.push(job.provider_used)
      }

      if (!userStats.last_job_at || job.created_at > userStats.last_job_at) {
        userStats.last_job_at = job.created_at
      }

      // Keep only the 5 most recent jobs
      userStats.recent_jobs.push({
        provider: job.provider_used,
        characters: job.characters_used || 0,
        created_at: job.created_at
      })
      userStats.recent_jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      userStats.recent_jobs = userStats.recent_jobs.slice(0, 5)
    })

    // Generate time series data
    const now = new Date()
    const timeSeriesData: Array<{
      date: string
      jobs: number
      characters: number
      users: string[]
    }> = []

    // Determine the date range and format based on period
    let startDate: Date
    let dateFormat: (date: Date) => string
    let periods: number

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Last 24 hours
        periods = 24
        dateFormat = (date: Date) => date.toISOString().slice(11, 16) // HH:MM
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        periods = 7
        dateFormat = (date: Date) => date.toISOString().slice(5, 10) // MM-DD
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        periods = 30
        dateFormat = (date: Date) => date.toISOString().slice(5, 10) // MM-DD
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        periods = 7
        dateFormat = (date: Date) => date.toISOString().slice(5, 10)
    }

    // Create time buckets
    for (let i = 0; i < periods; i++) {
      let bucketDate: Date
      
      if (period === 'day') {
        bucketDate = new Date(startDate.getTime() + i * 60 * 60 * 1000) // Hourly buckets
      } else {
        bucketDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000) // Daily buckets
      }

      const bucketStart = bucketDate
      const bucketEnd = period === 'day' 
        ? new Date(bucketDate.getTime() + 60 * 60 * 1000)
        : new Date(bucketDate.getTime() + 24 * 60 * 60 * 1000)

      const bucketJobs = jobStats?.filter(job => {
        const jobDate = new Date(job.created_at)
        return jobDate >= bucketStart && jobDate < bucketEnd
      }) || []

      timeSeriesData.push({
        date: dateFormat(bucketDate),
        jobs: bucketJobs.length,
        characters: bucketJobs.reduce((sum, job) => sum + (job.characters_used || 0), 0),
        users: [...new Set(bucketJobs.map(job => job.user_id))]
      })
    }

    return NextResponse.json({
      job_stats: userJobStats,
      total_users_with_jobs: Object.keys(userJobStats).length,
      time_series: timeSeriesData,
      period: period
    })
  } catch (error) {
    console.error('Error fetching job stats:', error)
    
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