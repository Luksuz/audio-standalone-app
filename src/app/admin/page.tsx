'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AdminGuard } from '../../components/admin-guard'
import { 
  Users, 
  Database, 
  Settings, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  Save,
  X,
  Eye,
  EyeOff,
  Volume2,
  Globe,
  Mic,
  Star,
  TrendingUp,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import React from 'react'

// Types
interface Provider {
  id: string
  name: string
  display_name: string
  api_endpoint: string
  chunk_size: number
  is_active: boolean
  config: any
  created_at: string
  updated_at: string
}

interface Voice {
  id: string
  voice_id: string
  name: string
  provider: string
  created_at: string
}

interface User {
  id: string
  user_id: string
  email: string
  is_admin: boolean
  created_at: string
}

interface JobStats {
  total_jobs: number
  total_characters: number
  providers_used: string[]
  last_job_at: string | null
  recent_jobs: Array<{
    provider: string
    characters: number
    created_at: string
  }>
}

interface TimeSeriesData {
  date: string
  jobs: number
  characters: number
  users: string[]
}

interface Model {
  id: string
  provider_id: string
  model_id: string
  name: string
  description: string
  pricing: string
  is_active: boolean
  config: any
  created_at: string
  updated_at: string
  provider_name?: string
}

export default function AdminPage() {
  // State management
  const [activeTab, setActiveTab] = useState<'providers' | 'voices' | 'models' | 'users' | 'analytics'>('voices')
  const [providers, setProviders] = useState<Provider[]>([])
  const [voices, setVoices] = useState<Voice[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [jobStats, setJobStats] = useState<Record<string, JobStats>>({})
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week')
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterProvider, setFilterProvider] = useState<string>('')
  const [filterLanguage, setFilterLanguage] = useState<string>('')
  const [showInactive, setShowInactive] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [showCreateUserModal, setShowCreateUserModal] = useState<boolean>(false)
  const [newVoice, setNewVoice] = useState({ voice_id: '', name: '', provider: '' })
  const [newUser, setNewUser] = useState({ email: '', password: '', is_admin: false })
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' }>({ text: '', type: 'info' })

  // Show message helper
  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: 'info' }), 5000)
  }

  // Toggle user jobs expansion
  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  // Handle voice creation
  const handleCreateVoice = async () => {
    try {
      if (!newVoice.voice_id || !newVoice.name || !newVoice.provider) {
        showMessage('Please fill in all fields', 'error')
        return
      }

      const response = await fetch('/api/admin/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVoice)
      })

      if (response.ok) {
        await fetchVoices()
        setShowCreateModal(false)
        setNewVoice({ voice_id: '', name: '', provider: '' })
        showMessage('Voice created successfully', 'success')
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create voice')
      }
    } catch (error) {
      console.error('Error creating voice:', error)
      showMessage(error instanceof Error ? error.message : 'Failed to create voice', 'error')
    }
  }

  // Handle user creation
  const handleCreateUser = async () => {
    try {
      if (!newUser.email || !newUser.password) {
        showMessage('Email and password are required', 'error')
        return
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })

      if (response.ok) {
        await fetchUsers()
        setShowCreateUserModal(false)
        setNewUser({ email: '', password: '', is_admin: false })
        showMessage('User created successfully', 'success')
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create user')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      showMessage(error instanceof Error ? error.message : 'Failed to create user', 'error')
    }
  }

  // Handle user deletion
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchUsers()
        showMessage('User deleted successfully', 'success')
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      showMessage(error instanceof Error ? error.message : 'Failed to delete user', 'error')
    }
  }

  // Handle admin toggle
  const handleToggleAdmin = async (userId: string, currentAdminStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_admin: !currentAdminStatus })
      })

      if (response.ok) {
        await fetchUsers()
        showMessage(`User ${!currentAdminStatus ? 'promoted to' : 'removed from'} admin successfully`, 'success')
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update admin status')
      }
    } catch (error) {
      console.error('Error updating admin status:', error)
      showMessage(error instanceof Error ? error.message : 'Failed to update admin status', 'error')
    }
  }

  // Fetch data functions
  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/admin/providers')
      if (response.ok) {
        const data = await response.json()
        setProviders(data.providers || [])
      }
    } catch (error) {
      console.error('Error fetching providers:', error)
      showMessage('Failed to fetch providers', 'error')
    }
  }

  const fetchVoices = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/voices')
      if (response.ok) {
        const data = await response.json()
        setVoices(data.voices || [])
      }
    } catch (error) {
      console.error('Error fetching voices:', error)
      showMessage('Failed to fetch voices', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        // Also refresh job stats when fetching users
        await fetchJobStats()
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      showMessage('Failed to fetch users', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchModels = async () => {
    try {
      // Models API not implemented yet, returning empty array
      setModels([])
    } catch (error) {
      console.error('Error fetching models:', error)
      showMessage('Failed to fetch models', 'error')
    }
  }

  const fetchJobStats = async (period: 'day' | 'week' | 'month' = selectedPeriod) => {
    try {
      const response = await fetch(`/api/admin/jobs?period=${period}`)
      if (response.ok) {
        const data = await response.json()
        setJobStats(data.job_stats || {})
        setTimeSeriesData(data.time_series || [])
      }
    } catch (error) {
      console.error('Error fetching job stats:', error)
      showMessage('Failed to fetch job statistics', 'error')
    }
  }

  // Handle period change
  const handlePeriodChange = async (period: 'day' | 'week' | 'month') => {
    setSelectedPeriod(period)
    await fetchJobStats(period)
  }

  // Load data on component mount
  useEffect(() => {
    fetchProviders()
    fetchVoices()
    fetchUsers()
    fetchModels()
    fetchJobStats()
  }, [])

  // Filter voices based on search and filters
  const filteredVoices = voices.filter(voice => {
    const matchesSearch = voice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         voice.voice_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProvider = !filterProvider || voice.provider === filterProvider
    const matchesActive = showInactive || true // Assuming all voices are active for now
    
    return matchesSearch && matchesProvider && matchesActive
  })

  // Get unique languages
  const languages = [...new Set(voices.map(v => v.voice_id.split('_')[0]).filter(Boolean))]

  const handleSyncVoices = async (providerId: string) => {
    try {
      setLoading(true)
      showMessage('Sync functionality not implemented yet', 'info')
      // TODO: Implement voice syncing when needed
    } catch (error) {
      console.error('Error syncing voices:', error)
      showMessage('Failed to sync voices', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteVoice = async (voiceId: string) => {
    if (!confirm('Are you sure you want to delete this voice?')) return
    
    try {
      const response = await fetch(`/api/admin/voices/${voiceId}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchVoices()
        showMessage('Voice deleted successfully', 'success')
      } else {
        throw new Error('Failed to delete voice')
      }
    } catch (error) {
      console.error('Error deleting voice:', error)
      showMessage('Failed to delete voice', 'error')
    }
  }

  const handleToggleVoice = async (voiceId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/voices/${voiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      })
      if (response.ok) {
        await fetchVoices()
        showMessage(`Voice ${!isActive ? 'activated' : 'deactivated'} successfully`, 'success')
      } else {
        throw new Error('Failed to update voice')
      }
    } catch (error) {
      console.error('Error updating voice:', error)
      showMessage('Failed to update voice', 'error')
    }
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          {/* Navigation Bar */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-600" />
                <span className="font-medium text-gray-700">Admin Management Panel</span>
              </div>
              <div className="flex items-center gap-3">
                <motion.a
                  href="/"
                  className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                >
                  <FileText className="h-4 w-4" />
                  Main App
                </motion.a>
                <motion.a
                  href="/app"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                >
                  <Sparkles className="h-4 w-4" />
                  Dashboard
                </motion.a>
              </div>
            </div>
          </motion.div>

          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Database className="h-8 w-8 text-indigo-600" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Admin Management Panel
              </h1>
            </div>
            <p className="text-gray-600 text-lg">
              Manage TTS providers, voices, users, and system analytics
            </p>
          </motion.div>

          {/* Message Display */}
          <AnimatePresence>
            {message.text && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`mb-6 p-4 rounded-xl border-2 ${
                  message.type === 'success' ? 'bg-green-50 border-green-200' :
                  message.type === 'error' ? 'bg-red-50 border-red-200' :
                  'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {message.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {message.type === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                  {message.type === 'info' && <Info className="h-4 w-4 text-blue-600" />}
                  <span className={`text-sm font-medium ${
                    message.type === 'success' ? 'text-green-800' :
                    message.type === 'error' ? 'text-red-800' :
                    'text-blue-800'
                  }`}>
                    {message.text}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6 p-2 bg-white rounded-xl shadow-sm border border-gray-200">
            {[
              { key: 'voices', label: 'Voices', icon: Mic, count: voices.length },
              { key: 'providers', label: 'Providers', icon: Database, count: providers.length },
              { key: 'models', label: 'Models', icon: Settings, count: models.length },
              { key: 'users', label: 'Users', icon: Users, count: users.length },
              { 
                key: 'analytics', 
                label: 'Analytics', 
                icon: TrendingUp, 
                count: Object.values(jobStats).reduce((total, stats) => total + stats.total_jobs, 0)
              }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    activeTab === tab.key ? 'bg-indigo-700' : 'bg-gray-200'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {/* Voices Tab */}
            {activeTab === 'voices' && (
              <div className="p-6">
                {/* Filters and Search */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex-1 min-w-64">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search voices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <select
                    value={filterProvider}
                    onChange={(e) => setFilterProvider(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">All Providers</option>
                    {providers.map(provider => (
                      <option key={provider.id} value={provider.id}>{provider.display_name}</option>
                    ))}
                  </select>

                  <select
                    value={filterLanguage}
                    onChange={(e) => setFilterLanguage(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">All Languages</option>
                    {languages.map(lang => (
                      <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => setShowInactive(!showInactive)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      showInactive ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    Show Inactive
                  </button>

                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Voice
                  </button>

                  <button
                    onClick={fetchVoices}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {/* Voices Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVoices.map((voice) => (
                    <motion.div
                      key={voice.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                        true 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-gray-200 bg-gray-50 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 truncate">{voice.name}</h3>
                          <p className="text-xs text-gray-500 truncate">{voice.voice_id}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleVoice(voice.id, true)}
                            className={`p-1 transition-colors ${
                              true ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-green-600'
                            }`}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingItem(voice)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteVoice(voice.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <Globe className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">{voice.voice_id.split('_')[0]?.toUpperCase() || 'Unknown'}</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">
                            {providers.find(p => p.id === voice.provider)?.display_name}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {filteredVoices.length === 0 && (
                  <div className="text-center py-12">
                    <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No voices found</h3>
                    <p className="text-gray-500">Try adjusting your filters or sync voices from providers.</p>
                  </div>
                )}
              </div>
            )}

            {/* Providers Tab */}
            {activeTab === 'providers' && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {providers.map((provider) => (
                    <div key={provider.id} className="p-6 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">{provider.display_name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          provider.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {provider.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div><strong>API Endpoint:</strong> {provider.api_endpoint}</div>
                        <div><strong>Chunk Size:</strong> {provider.chunk_size} chars</div>
                        <div><strong>Voices:</strong> {voices.filter(v => v.provider === provider.id).length}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Models Tab */}
            {activeTab === 'models' && (
              <div className="p-6">
                <div className="text-center py-12">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Models Coming Soon</h3>
                  <p className="text-gray-500">TTS model management will be available here.</p>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Users</h2>
                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add User
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-500">Loading users...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                    <p className="text-gray-500">Add new users to manage the application.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Admin
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Jobs
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Characters
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Activity
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created At
                          </th>
                          <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => {
                          const userJobStats = jobStats[user.user_id] || {
                            total_jobs: 0,
                            total_characters: 0,
                            providers_used: [],
                            last_job_at: null,
                            recent_jobs: []
                          }
                          const isExpanded = expandedUsers.has(user.user_id)
                          
                          return (
                            <React.Fragment key={user.id}>
                              <tr>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  <div className="flex items-center gap-2">
                                    {userJobStats.total_jobs > 0 && (
                                      <button
                                        onClick={() => toggleUserExpansion(user.user_id)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                      >
                                        {isExpanded ? (
                                          <ChevronUp className="h-4 w-4" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4" />
                                        )}
                                      </button>
                                    )}
                                    {user.email}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <button
                                    onClick={() => handleToggleAdmin(user.user_id, user.is_admin)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                      user.is_admin
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {user.is_admin ? 'Admin' : 'User'}
                                  </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{userJobStats.total_jobs}</span>
                                    {userJobStats.providers_used.length > 0 && (
                                      <span className="text-xs text-gray-500">
                                        {userJobStats.providers_used.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {userJobStats.total_characters.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {userJobStats.last_job_at 
                                    ? new Date(userJobStats.last_job_at).toLocaleDateString()
                                    : 'Never'
                                  }
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => handleDeleteUser(user.user_id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                              
                              {/* Expanded Job Details */}
                              {isExpanded && userJobStats.recent_jobs.length > 0 && (
                                <tr>
                                  <td colSpan={7} className="px-6 py-4 bg-gray-50">
                                    <div className="space-y-2">
                                      <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Jobs</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {userJobStats.recent_jobs.map((job, jobIndex) => (
                                          <div key={jobIndex} className="bg-white p-3 rounded-lg border border-gray-200">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-sm font-medium text-gray-900 capitalize">
                                                {job.provider}
                                              </span>
                                              <span className="text-xs text-gray-500">
                                                {new Date(job.created_at).toLocaleDateString()}
                                              </span>
                                            </div>
                                            <div className="text-xs text-gray-600">
                                              <div className="flex items-center gap-2">
                                                <span>{job.characters.toLocaleString()} characters</span>
                                              </div>
                                              <div className="text-xs text-gray-400 mt-1">
                                                {new Date(job.created_at).toLocaleTimeString()}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="p-6">
                {/* Period Filter */}
                <div className="mb-6 flex justify-center">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    {(['day', 'week', 'month'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => handlePeriodChange(period)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          selectedPeriod === period
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {period === 'day' ? 'Last 24 Hours' : 
                         period === 'week' ? 'Last 7 Days' : 
                         'Last 30 Days'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Series Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Jobs Chart */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Jobs Over Time</h3>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span className="text-sm text-gray-600">Number of Jobs</span>
                      </div>
                    </div>
                    
                    {timeSeriesData.length > 0 ? (
                      <div className="relative">
                        {/* Chart Container */}
                        <div className="flex items-end justify-between h-48 gap-2 border-l-2 border-b-2 border-gray-200 pl-4 pb-4">
                          {timeSeriesData.map((dataPoint, index) => {
                            const maxJobs = Math.max(...timeSeriesData.map(d => d.jobs), 1)
                            const jobHeight = (dataPoint.jobs / maxJobs) * 180
                            
                            return (
                              <div key={index} className="flex flex-col items-center flex-1 min-w-0 group">
                                {/* Bar */}
                                <div className="flex items-end w-full justify-center mb-2 relative">
                                  <div
                                    className="bg-blue-500 w-4 rounded-t transition-all duration-300 hover:bg-blue-600 relative"
                                    style={{ height: `${jobHeight}px` }}
                                  />
                                  
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    {dataPoint.jobs} jobs • {dataPoint.users.length} users
                                  </div>
                                </div>
                                
                                {/* Date Label */}
                                <div className="text-xs text-gray-500 text-center truncate w-full">
                                  {dataPoint.date}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 h-48 flex flex-col justify-between text-xs text-gray-500">
                          <span>{Math.max(...timeSeriesData.map(d => d.jobs))}</span>
                          <span>{Math.round(Math.max(...timeSeriesData.map(d => d.jobs)) / 2)}</span>
                          <span>0</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-48 text-gray-500">
                        <div className="text-center">
                          <FileText className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">No job data available</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Characters Chart */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Characters Over Time</h3>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span className="text-sm text-gray-600">Character Count</span>
                      </div>
                    </div>
                    
                    {timeSeriesData.length > 0 ? (
                      <div className="relative">
                        {/* Chart Container */}
                        <div className="flex items-end justify-between h-48 gap-2 border-l-2 border-b-2 border-gray-200 pl-4 pb-4">
                          {timeSeriesData.map((dataPoint, index) => {
                            const maxChars = Math.max(...timeSeriesData.map(d => d.characters), 1)
                            const charHeight = (dataPoint.characters / maxChars) * 180
                            
                            return (
                              <div key={index} className="flex flex-col items-center flex-1 min-w-0 group">
                                {/* Bar */}
                                <div className="flex items-end w-full justify-center mb-2 relative">
                                  <div
                                    className="bg-green-500 w-4 rounded-t transition-all duration-300 hover:bg-green-600 relative"
                                    style={{ height: `${charHeight}px` }}
                                  />
                                  
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    {dataPoint.characters.toLocaleString()} characters
                                  </div>
                                </div>
                                
                                {/* Date Label */}
                                <div className="text-xs text-gray-500 text-center truncate w-full">
                                  {dataPoint.date}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 h-48 flex flex-col justify-between text-xs text-gray-500">
                          <span>{Math.max(...timeSeriesData.map(d => d.characters)).toLocaleString()}</span>
                          <span>{Math.round(Math.max(...timeSeriesData.map(d => d.characters)) / 2).toLocaleString()}</span>
                          <span>0</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-48 text-gray-500">
                        <div className="text-center">
                          <Volume2 className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">No character data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {/* Total Jobs */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">Total Jobs</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {Object.values(jobStats).reduce((total, stats) => total + stats.total_jobs, 0)}
                        </p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>

                  {/* Total Characters */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Total Characters</p>
                        <p className="text-2xl font-bold text-green-900">
                          {Object.values(jobStats).reduce((total, stats) => total + stats.total_characters, 0).toLocaleString()}
                        </p>
                      </div>
                      <Volume2 className="h-8 w-8 text-green-600" />
                    </div>
                  </div>

                  {/* Active Users */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">Active Users</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {Object.keys(jobStats).length}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>

                  {/* Providers Used */}
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-600">Providers Used</p>
                        <p className="text-2xl font-bold text-orange-900">
                          {new Set(Object.values(jobStats).flatMap(stats => stats.providers_used)).size}
                        </p>
                      </div>
                      <Database className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>
                </div>

                {/* Provider Usage Breakdown */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Provider Usage</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Array.from(new Set(Object.values(jobStats).flatMap(stats => stats.providers_used))).map(provider => {
                      const providerJobs = Object.values(jobStats).reduce((total, stats) => {
                        return total + stats.recent_jobs.filter(job => job.provider === provider).length
                      }, 0)
                      const providerChars = Object.values(jobStats).reduce((total, stats) => {
                        return total + stats.recent_jobs
                          .filter(job => job.provider === provider)
                          .reduce((sum, job) => sum + job.characters, 0)
                      }, 0)
                      
                      return (
                        <div key={provider} className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 capitalize">{provider}</h4>
                          <p className="text-sm text-gray-600">Jobs: {providerJobs}</p>
                          <p className="text-sm text-gray-600">Characters: {providerChars.toLocaleString()}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {Object.entries(jobStats)
                      .filter(([_, stats]) => stats.recent_jobs.length > 0)
                      .slice(0, 10)
                      .map(([userId, stats]) => {
                        const user = users.find(u => u.user_id === userId)
                        const recentJob = stats.recent_jobs[0]
                        return (
                          <div key={userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                <Users className="h-4 w-4 text-indigo-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                                <p className="text-xs text-gray-500">
                                  Used {recentJob.provider} • {recentJob.characters} chars
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(recentJob.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
          
          {/* Voice Creation Modal */}
          <AnimatePresence>
            {showCreateModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                onClick={() => setShowCreateModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Add New Voice</h3>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Voice ID</label>
                      <input
                        type="text"
                        value={newVoice.voice_id}
                        onChange={(e) => setNewVoice({ ...newVoice, voice_id: e.target.value })}
                        placeholder="e.g., en_male_001"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Voice Name</label>
                      <input
                        type="text"
                        value={newVoice.name}
                        onChange={(e) => setNewVoice({ ...newVoice, name: e.target.value })}
                        placeholder="e.g., Professional Male Voice"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                      <select
                        value={newVoice.provider}
                        onChange={(e) => setNewVoice({ ...newVoice, provider: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">Select a provider</option>
                        {providers.map(provider => (
                          <option key={provider.id} value={provider.name}>{provider.display_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateVoice}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Create Voice
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* User Creation Modal */}
          <AnimatePresence>
            {showCreateUserModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                onClick={() => setShowCreateUserModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Add New User</h3>
                    <button
                      onClick={() => setShowCreateUserModal(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="user@example.com"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="Password"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isAdmin"
                        checked={newUser.is_admin}
                        onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isAdmin" className="ml-2 text-sm text-gray-700">
                        Make Admin
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowCreateUserModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateUser}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Create User
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AdminGuard>
  )
} 