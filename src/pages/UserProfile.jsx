import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Check, Upload, Lock, Mail, ArrowLeft, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function UserProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_photo_url || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        if (user?.role) {
          const roles = await base44.entities.Role.filter({ name: user.role });
          if (roles.length > 0) {
            setUserRole(roles[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch role:', err);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, [user?.role]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoLoading(true);
    setError('');
    setSuccess('');

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfilePhoto(file_url);
      
      await base44.auth.updateMe({ profile_photo_url: file_url });
      setSuccess('Profile photo updated successfully');
    } catch (err) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await base44.auth.updateMe({ email });
      setSuccess('Email updated successfully');
    } catch (err) {
      setError(err.message || 'Failed to update email');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || !confirmPassword) {
      setError('Both password fields are required');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await base44.functions.invoke('setUserPassword', { password: newPassword });
      setSuccess('Password changed successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">My Profile</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your account settings</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Profile Photo */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl sm:text-2xl font-bold overflow-hidden flex-shrink-0">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.full_name?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="w-full sm:w-auto">
                <label htmlFor="photo-upload">
                  <Button variant="outline" asChild className="w-full sm:w-auto text-sm">
                    <span>
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      {photoLoading ? 'Uploading...' : 'Upload Photo'}
                    </span>
                  </Button>
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={photoLoading}
                />
                <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG up to 5MB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm">Full Name</Label>
              <Input type="text" value={user?.full_name || ''} disabled className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-sm">User ID</Label>
              <Input type="text" value={user?.id || ''} disabled className="mt-1 text-sm" />
            </div>
          </CardContent>
        </Card>

        {/* Role & Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              My Role & Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {roleLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : userRole ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm mb-2 block">Role</Label>
                  <Badge className="text-base py-2 px-3">{userRole.name}</Badge>
                </div>
                {userRole.description && (
                  <div>
                    <Label className="text-sm mb-2 block">Description</Label>
                    <p className="text-sm text-muted-foreground">{userRole.description}</p>
                  </div>
                )}
                {userRole.permissions && userRole.permissions.length > 0 && (
                  <div>
                    <Label className="text-sm mb-3 block">Permissions ({userRole.permissions.length})</Label>
                    <div className="flex flex-wrap gap-2">
                      {userRole.permissions.map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No role assigned yet</p>
            )}
          </CardContent>
        </Card>

        {/* Email Update */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailUpdate} className="space-y-3">
              <div>
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">Used for login</p>
              </div>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto text-sm">
                {loading ? 'Updating...' : 'Update Email'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <Label htmlFor="newPassword" className="text-sm">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto text-sm">
                {loading ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}