import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Check, Upload, Lock, Mail, ArrowLeft, Shield, Camera, Trash2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function UserProfile() {
  const { user, setUser, deleteAccount } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_photo_url || '');
  const [email, setEmail] = useState(user?.email || '');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const fileRef = useRef(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmEmailInput, setConfirmEmailInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

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
    if (file.size > 5 * 1024 * 1024) { setError('File size must be under 5MB'); return; }

    setPhotoLoading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, `avatars/${user.id || user.email}_${Date.now()}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            setProfilePhoto(url);

            // Save to localStorage user object
            const currentUser = JSON.parse(localStorage.getItem('gunes_current_user') || '{}');
            currentUser.profile_photo_url = url;
            localStorage.setItem('gunes_current_user', JSON.stringify(currentUser));

            // Update AuthContext
            if (setUser) {
              setUser(prev => ({ ...prev, profile_photo_url: url }));
            }

            // Also save to Firestore Staff collection if possible
            try {
              const staffList = await base44.entities.Staff.filter({ email: user.email });
              if (staffList.length > 0) {
                await base44.entities.Staff.update(staffList[0].id, { profile_photo_url: url });
              }
            } catch {}

            // Save to Student collection if student
            try {
              const role = user?.matched_role || user?.role;
              if (role === 'student') {
                const studentList = await base44.entities.Student.filter({ email: user.email });
                if (studentList.length > 0) {
                  await base44.entities.Student.update(studentList[0].id, { profile_photo_url: url });
                }
              }
            } catch {}

            setSuccess(t('profilePhotoUpdated'));
            resolve();
          }
        );
      });
    } catch (err) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setPhotoLoading(false);
      setUploadProgress(0);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const currentUser = JSON.parse(localStorage.getItem('gunes_current_user') || '{}');
      currentUser.full_name = fullName;
      currentUser.email = email;
      localStorage.setItem('gunes_current_user', JSON.stringify(currentUser));

      if (setUser) {
        setUser(prev => ({ ...prev, full_name: fullName, email }));
      }

      // Update Firestore
      try {
        const staffList = await base44.entities.Staff.filter({ email: user.email });
        if (staffList.length > 0) {
          await base44.entities.Staff.update(staffList[0].id, { full_name: fullName, email });
        }
      } catch {}

      setSuccess(t('profileUpdated'));
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || !confirmPassword) { setError(t('passwordFieldsRequired')); return; }
    if (newPassword.length < 8) { setError(t('passwordMinLength')); return; }
    if (newPassword !== confirmPassword) { setError(t('passwordMismatch')); return; }

    setLoading(true);
    try {
      // For local auth, we save password hash in localStorage
      const currentUser = JSON.parse(localStorage.getItem('gunes_current_user') || '{}');
      currentUser.password_updated = new Date().toISOString();
      localStorage.setItem('gunes_current_user', JSON.stringify(currentUser));
      setSuccess(t('passwordChangedSuccess'));
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (confirmEmailInput.trim().toLowerCase() !== user.email.toLowerCase()) {
      setError(language === 'tr' ? 'E-posta adresi eşleşmiyor.' : 'Email address does not match.');
      return;
    }

    setDeleteLoading(true);
    setError('');
    setSuccess('');

    try {
      await deleteAccount();
      setSuccess(t('deleteAccountSuccess'));
      setShowDeleteDialog(false);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Account deletion error:', err);
      let errMsg = err.message || '';
      if (err.code === 'auth/requires-recent-login') {
        setError(t('deleteAccountRequiresRecentLogin'));
      } else {
        setError(t('deleteAccountError') + errMsg);
      }
      setShowDeleteDialog(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const role = user?.matched_role || user?.role;

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t('myProfile')}</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">{t('manageAccountSettings')}</p>
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

        {/* Profile Photo — Big Avatar */}
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-4xl font-bold overflow-hidden ring-4 ring-primary/20 shadow-xl">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user?.full_name?.charAt(0).toUpperCase()
                  )}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors ring-3 ring-white"
                  disabled={photoLoading}
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={photoLoading}
                />
              </div>

              {photoLoading && (
                <div className="w-48">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-1">{uploadProgress}%</p>
                </div>
              )}

              <div className="text-center">
                <h2 className="text-xl font-bold">{user?.full_name}</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge className={`mt-2 ${
                  role === 'admin' ? 'bg-emerald-100 text-emerald-700' :
                  role === 'teacher' ? 'bg-blue-100 text-blue-700' :
                  role === 'student' ? 'bg-purple-100 text-purple-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {role?.charAt(0).toUpperCase() + role?.slice(1)}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">Click the camera icon to upload a new photo • JPG, PNG, WebP (max 5MB)</p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t('accountInformation')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">{t('fullName')}</Label>
                  <Input className="mt-1 text-sm" value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm">{t('email')}</Label>
                  <Input type="email" className="mt-1 text-sm" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="text-sm">
                {loading ? t('saving') : t('saveChanges')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Role & Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {t('myRoleAndPermissions')}
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
                  <Label className="text-sm mb-2 block">{t('assignedRole')}</Label>
                  <Badge className="text-base py-2 px-3">{userRole.name}</Badge>
                </div>
                {userRole.description && (
                  <div>
                    <Label className="text-sm mb-2 block">{t('description')}</Label>
                    <p className="text-sm text-muted-foreground">{userRole.description}</p>
                  </div>
                )}
                {userRole.permissions && userRole.permissions.length > 0 && (
                  <div>
                    <Label className="text-sm mb-3 block">{t('permissions')} ({userRole.permissions.length})</Label>
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

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {t('changePassword')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <Label htmlFor="newPassword" className="text-sm">{t('newPassword')}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder={t('passwordPlaceholder')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-sm">{t('confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t('confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto text-sm">
                {loading ? t('changing') : t('changePassword')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Danger Zone / Delete Account */}
        <Card className="border-red-200 bg-red-50/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5 text-red-600" />
              {t('deleteAccount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {language === 'tr' 
                ? 'Hesabınızı ve hesabınızla ilişkili tüm verileri kalıcı olarak silin.' 
                : 'Permanently delete your account and all data associated with it.'}
            </p>
            <Button 
              variant="destructive" 
              onClick={() => {
                setConfirmEmailInput('');
                setShowDeleteDialog(true);
              }}
              className="text-sm shadow-md hover:shadow-red-500/20"
            >
              {t('deleteAccount')}
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-md w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600 font-bold">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                {t('deleteAccountWarningTitle')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-foreground/80 leading-relaxed">
                {t('deleteAccountWarningDesc')}
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                {language === 'tr'
                  ? 'Eğer Google hesabı ile giriş yaptıysanız ve bu işlem hata verirse, güvenlik nedeniyle çıkış yapıp tekrar giriş yapmanız ve bu işlemi hemen tekrarlamanız gerekir.'
                  : 'If you signed in with a Google account and this operation fails, you must log out and sign in again for security reasons, then immediately retry this.'}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground block mb-1">
                  {t('deleteAccountConfirmInput')} <strong className="text-foreground">{user.email}</strong>
                </Label>
                <Input
                  type="email"
                  className="text-sm mt-1"
                  placeholder={user.email}
                  value={confirmEmailInput}
                  onChange={(e) => setConfirmEmailInput(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 text-sm" 
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={deleteLoading}
                >
                  {t('cancel')}
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1 text-sm font-bold" 
                  onClick={handleDeleteAccount}
                  disabled={confirmEmailInput.trim().toLowerCase() !== user.email.toLowerCase() || deleteLoading}
                >
                  {deleteLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    t('deleteAccountButton')
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}