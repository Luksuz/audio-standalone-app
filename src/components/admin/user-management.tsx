'use client'

import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '../ui/alert-dialog'
import { Trash2, Plus, Shield, User, RefreshCw } from 'lucide-react'
import { Checkbox } from '../ui/checkbox'

interface User {
  id: string
  email: string
  created_at: string
  email_confirmed_at: string | null
  last_sign_in_at: string | null
}

interface Profile {
  id: number
  user_id: string
  is_admin: boolean
  created_at: string
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Create user form state
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false)
  const [createUserLoading, setCreateUserLoading] = useState(false)
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (response.ok) {
        setUsers(data.users)
        setProfiles(data.profiles)
      } else {
        setError(data.error || 'Failed to fetch users')
      }
    } catch (err) {
      setError('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    try {
      setActionLoading(userId)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSuccess(`User ${userEmail} deleted successfully`)
        fetchUsers()
      } else {
        setError(data.error || 'Failed to delete user')
      }
    } catch (err) {
      setError('Failed to delete user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      setError('Email and password are required')
      return
    }
    
    try {
      setCreateUserLoading(true)
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUserEmail.trim(),
          password: newUserPassword.trim(),
          isAdmin: newUserIsAdmin,
        }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSuccess(`User ${newUserEmail} created successfully`)
        setNewUserEmail('')
        setNewUserPassword('')
        setNewUserIsAdmin(false)
        setCreateUserOpen(false)
        fetchUsers()
      } else {
        setError(data.error || 'Failed to create user')
      }
    } catch (err) {
      setError('Failed to create user')
    } finally {
      setCreateUserLoading(false)
    }
  }

  const getUserProfile = (userId: string) => {
    return profiles.find(p => p.user_id === userId)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              User Management
            </h2>
            <p className="text-gray-600">Manage users and their permissions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={fetchUsers}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={() => setCreateUserOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create User
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-600">{error}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setError(null)}
            className="mt-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-green-600">{success}</p>
        </div>
      )}

      {/* Users list */}
      <Card className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <CardHeader className="bg-gray-50">
          <CardTitle className="text-xl font-semibold text-gray-800">
            Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">No users found</p>
          ) : (
            <div className="space-y-4">
              {users.map((user) => {
                const profile = getUserProfile(user.id)
                return (
                  <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {profile?.is_admin ? (
                          <Shield className="h-5 w-5 text-red-500" />
                        ) : (
                          <User className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <p className="font-medium">{user.email}</p>
                          <p className="text-sm text-gray-500">
                            Created: {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {profile?.is_admin && (
                          <Badge variant="destructive">Admin</Badge>
                        )}
                        <Badge variant={user.email_confirmed_at ? "default" : "outline"}>
                          {user.email_confirmed_at ? "Confirmed" : "Unconfirmed"}
                        </Badge>
                        {user.last_sign_in_at && (
                          <Badge variant="outline">
                            Last login: {new Date(user.last_sign_in_at).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          disabled={actionLoading === user.id}
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete <strong>{user.email}</strong>? 
                            This action cannot be undone and will permanently remove all user data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete User
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      {createUserOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
              <CardTitle className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Create New User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    className="border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isAdmin"
                    checked={newUserIsAdmin}
                    onCheckedChange={(checked) => setNewUserIsAdmin(checked as boolean)}
                  />
                  <Label htmlFor="isAdmin" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Make this user an admin
                  </Label>
                </div>
                
                <div className="flex items-center gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateUserOpen(false)}
                    disabled={createUserLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createUserLoading}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {createUserLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Create User
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 