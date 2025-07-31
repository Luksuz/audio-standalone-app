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
  Sparkles
} from 'lucide-react'

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
  full_name: string
  is_admin: boolean
  created_at: string
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
  const [loading, setLoading] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterProvider, setFilterProvider] = useState<string>('')
  const [filterLanguage, setFilterLanguage] = useState<string>('')
  const [showInactive, setShowInactive] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [showCreateUserModal, setShowCreateUserModal] = useState<boolean>(false)
  const [newVoice, setNewVoice] = useState({ voice_id: '', name: '', provider: '' })
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', is_admin: false })
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' }>({ text: '', type: 'info' })

  // Show message helper
  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: 'info' }), 5000)
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
        setNewUser({ email: '', password: '', full_name: '', is_admin: false })
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

  // Load data on component mount
  useEffect(() => {
    fetchProviders()
    fetchVoices()
    fetchUsers()
    fetchModels()
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
              { key: 'analytics', label: 'Analytics', icon: TrendingUp, count: null }
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
                {tab.count !== null && (
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

                {/* Sync Actions */}
                <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 mr-2">Quick Actions:</span>
                  {providers.filter(p => p.is_active).map(provider => (
                    <button
                      key={provider.id}
                      onClick={() => handleSyncVoices(provider.id)}
                      disabled={loading}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 text-sm"
                    >
                      <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                      Sync {provider.display_name}
                    </button>
                  ))}
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
                            User ID
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Full Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Admin
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created At
                          </th>
                          <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Edit</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {user.user_id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.full_name}
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="p-6">
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Coming Soon</h3>
                  <p className="text-gray-500">Voice usage analytics and statistics will be available here.</p>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={newUser.full_name}
                        onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                        placeholder="e.g., John Doe"
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