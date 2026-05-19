import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Key, Mail, RefreshCw, Check, Clock, UserCheck, AlertCircle, UserX, Send, Copy, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { getRoleBadgeColor, getRoleLabel } from '@/lib/roles';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function TeamMemberDetailDialog({ open, onOpenChange, personnelRecord: p, userRecord: u, userSetup, currentUser, isAdmin }) {
  const queryClient = useQueryClient();
  const displayName = p?.full_name || u?.full_name || u?.email || '—';
  const email = p?.email || u?.email || '';
  const isSelf = u?.id === currentUser?.id;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);
  const [newEmail, setNewEmail] = useState(u?.email || '');
  const [emailSaved, setEmailSaved] = useState(false);
  const [resending, setResending] = useState(false);
  const [setupUrl, setSetupUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState('');

  // --- Derived status ---
  // hasUser: is the person a registered system user?
  const hasUser = !!u;
  // hasPendingInvite: is there an active pending invitation?
  const hasPendingInvite = userSetup?.status === 'pending';
  // setupDone: is setup completed?
  const setupDone = userSetup?.setup_completed;
  // inviteEverSent: has an invitation ever been sent?
  const inviteEverSent = !!userSetup;

  // Account status
  const accountStatus = (() => {
    if (hasUser && !hasPendingInvite) return {
      label: 'Active User',
      desc: 'Can sign in to the system.',
      color: 'bg-green-100 text-green-700 border-green-200',
      icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
      level: 'green',
    };
    if (hasPendingInvite) return {
      label: 'Invitation Sent — Pending',
      desc: userSetup?.invited_at
        ? `Sent on ${new Date(userSetup.invited_at).toLocaleDateString('en-GB')}.`
        : 'Invitation date unknown.',
      color: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: <Clock className="w-4 h-4 text-amber-600" />,
      level: 'amber',
    };
    if (!inviteEverSent && p) return {
      label: 'No Invitation Sent',
      desc: 'No system invitation has been sent to this person yet.',
      color: 'bg-red-100 text-red-700 border-red-200',
      icon: <XCircle className="w-4 h-4 text-red-500" />,
      level: 'red',
    };
    return {
      label: 'Staff Record Only',
      desc: 'User account has not been created.',
      color: 'bg-gray-100 text-gray-600 border-gray-200',
      icon: <UserX className="w-4 h-4 text-gray-500" />,
      level: 'gray',
    };
  })();

  const handlePasswordSave = async () => {
    if (!newPassword || newPassword !== confirmPassword) { setPwError('Passwords do not match or are empty'); return; }
    if (newPassword.length < 6) { setPwError('Must be at least 6 characters'); return; }
    setSaving(true);
    await base44.entities.User.update(u.id, { temp_password: newPassword });
    queryClient.invalidateQueries({ queryKey: ['users'] });
    setPwSaved(true);
    setNewPassword(''); setConfirmPassword(''); setPwError('');
    setSaving(false);
    setTimeout(() => setPwSaved(false), 2500);
  };

  const handleEmailSave = async () => {
    if (!newEmail || newEmail === u?.email) return;
    setSaving(true);
    await base44.entities.User.update(u.id, { email: newEmail });
    if (p) await base44.entities.Staff.update(p.id, { email: newEmail });
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['staff'] });
    setEmailSaved(true);
    setSaving(false);
    setTimeout(() => setEmailSaved(false), 2500);
  };

  const handleSendInvite = async () => {
    if (!email) return;
    setSending(true);
    setSendError('');

    try {
      // Create or update UserSetup record
      let setupId = userSetup?.id;
      if (!setupId) {
        const created = await base44.entities.UserSetup.create({
          email,
          full_name: displayName,
          invited_role: p?.role || 'user',
          invite_type: 'staff',
          status: 'pending',
          setup_completed: false,
          invited_at: new Date().toISOString(),
        });
        setupId = created.id;
      } else {
        await base44.entities.UserSetup.update(setupId, {
          status: 'pending',
          invited_at: new Date().toISOString(),
        });
      }

      const res = await base44.functions.invoke('sendInviteEmail', {
        email,
        full_name: displayName,
        invited_role: p?.role || 'user',
        setup_id: setupId,
      });
      setSetupUrl(res.data?.setupUrl || '');
      queryClient.invalidateQueries({ queryKey: ['user-setups'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSendSuccess(true);
    } catch (error) {
      setSendError(error.message || 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const handleResendInvite = async () => {
    setResending(true);
    setSendError('');

    try {
      let setupId = userSetup?.id;

      if (!setupId) {
        const created = await base44.entities.UserSetup.create({
          email,
          full_name: displayName,
          invited_role: p?.role || 'user',
          invite_type: 'staff',
          status: 'pending',
          setup_completed: false,
          invited_at: new Date().toISOString(),
        });
        setupId = created.id;
      } else {
        await base44.entities.UserSetup.update(setupId, {
          status: 'pending',
          invited_at: new Date().toISOString(),
        });
      }

      const res = await base44.functions.invoke('sendInviteEmail', {
        email,
        full_name: displayName,
        invited_role: p?.role || userSetup?.invited_role || 'user',
        setup_id: setupId,
      });
      setSetupUrl(res.data?.setupUrl || '');
      queryClient.invalidateQueries({ queryKey: ['user-setups'] });
    } catch (error) {
      setSendError(error.message || 'Failed to resend invitation');
    } finally {
      setResending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-base leading-tight">{displayName}</p>
              <p className="text-xs text-muted-foreground font-normal">{email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">

          {/* ── Account Status ── */}
          <div className={`flex items-start gap-3 rounded-xl border p-3 ${accountStatus.color}`}>
            <div className="mt-0.5">{accountStatus.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{accountStatus.label}</p>
              <p className="text-xs opacity-75 mt-0.5">{accountStatus.desc}</p>
            </div>
          </div>

          {/* ── Roles ── */}
          <div className="flex flex-wrap gap-2">
            {p?.role && <Badge className={`text-xs border ${getRoleBadgeColor(p.role)}`}>{getRoleLabel(p.role)} (Job Title)</Badge>}
            {u?.role && <Badge className={`text-xs border ${getRoleBadgeColor(u.role)}`}>{getRoleLabel(u.role)} (System)</Badge>}
          </div>

          {/* ── Details ── */}
          <div className="rounded-xl border bg-muted/30 divide-y text-sm">
            <Row label="Email" value={email} />
            {hasUser && <Row label="User Account" value={<span className="flex items-center gap-1 text-green-600"><Check className="w-3.5 h-3.5" />Active</span>} />}
            {!hasUser && <Row label="User Account" value={<span className="flex items-center gap-1 text-red-500"><XCircle className="w-3.5 h-3.5" />None</span>} />}
            {userSetup?.invited_at && <Row label="Invitation Sent" value={new Date(userSetup.invited_at).toLocaleString('en-GB')} />}
            {userSetup?.status && <Row label="Invitation Status" value={
              <span className={hasPendingInvite ? 'text-amber-600 font-medium' : 'text-green-600 font-medium'}>
                {hasPendingInvite ? 'Pending' : setupDone ? 'Completed' : userSetup.status}
              </span>
            } />}
            {u?.created_date && <Row label="Account Created" value={new Date(u.created_date).toLocaleDateString('en-GB')} />}
          </div>

          {/* ── Invitation Actions ── */}
          {isAdmin && !isSelf && (
            <div className="space-y-2">

              {/* No invitation sent yet: Send first invitation */}
              {!inviteEverSent && !sendSuccess && (
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />No invitation has been sent to this person yet
                  </p>
                  <p className="text-xs text-red-600/80">Send an invitation email so they can sign in to the system.</p>
                  {sendError && <p className="text-xs text-red-600">{sendError}</p>}
                  <Button size="sm" className="gap-2 h-8 text-xs w-full" onClick={handleSendInvite} disabled={sending}>
                    {sending ? <><RefreshCw className="w-3 h-3 animate-spin" />Sending...</> : <><Send className="w-3 h-3" />Send Invitation</>}
                  </Button>
                </div>
              )}

              {/* Invitation sent but pending/rejected: Resend */}
              {inviteEverSent && !hasUser && (
                <div className={`rounded-xl border p-3 space-y-2 ${
                  userSetup?.status === 'rejected'
                    ? 'border-red-200 bg-red-50/50'
                    : 'border-amber-200 bg-amber-50/50'
                }`}>
                  <p className={`text-xs font-semibold flex items-center gap-1.5 ${userSetup?.status === 'rejected' ? 'text-red-700' : 'text-amber-700'}`}>
                    {userSetup?.status === 'rejected'
                      ? <><XCircle className="w-3.5 h-3.5" />Invitation Rejected / Expired</>
                      : <><Clock className="w-3.5 h-3.5" />Invitation Not Accepted</>
                    }
                  </p>
                  <p className={`text-xs ${userSetup?.status === 'rejected' ? 'text-red-600/80' : 'text-amber-600/80'}`}>
                    {userSetup?.invited_at
                      ? `Sent on ${new Date(userSetup.invited_at).toLocaleString('en-GB')}.`
                      : 'Sending date unknown.'}
                    {userSetup?.status === 'rejected' && ' The person may have rejected it or the link may have expired.'}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className={`gap-2 h-8 text-xs flex-1 ${userSetup?.status === 'rejected' ? '' : 'bg-amber-600 hover:bg-amber-700'}`}
                      onClick={handleResendInvite}
                      disabled={resending}
                    >
                      {resending
                        ? <><RefreshCw className="w-3 h-3 animate-spin" />Sending...</>
                        : <><Send className="w-3 h-3" />Resend Invitation</>
                      }
                    </Button>
                  </div>
                </div>
              )}

              {/* Resend option for active users too */}
              {inviteEverSent && hasUser && isAdmin && (
                <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />Resend Invitation
                  </p>
                  <p className="text-xs text-muted-foreground/70">If they lost their login credentials or had issues, create a new setup link.</p>
                  <Button size="sm" variant="outline" className="gap-2 h-8 text-xs w-full" onClick={handleResendInvite} disabled={resending}>
                    {resending
                      ? <><RefreshCw className="w-3 h-3 animate-spin" />Sending...</>
                      : <><Send className="w-3 h-3" />Send New Setup Link</>
                    }
                  </Button>
                </div>
              )}

              {/* Show setup URL */}
              {(setupUrl || sendSuccess) && setupUrl && (
                <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Setup Link (Valid for 7 days)</p>
                  <div className="flex gap-2">
                    <Input readOnly value={setupUrl} className="text-xs font-mono h-8" />
                    <Button size="icon" variant="outline" className="h-8 w-8 flex-shrink-0" onClick={() => navigator.clipboard.writeText(setupUrl)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {sendSuccess && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />Invitation sent! You can also share this link.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Admin Actions: Password & Email ── */}
          {isAdmin && u && !isSelf && (
            <div className="space-y-4 border-t pt-4">

              {/* Change password */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                  <Key className="w-3.5 h-3.5" />Change Password
                </p>
                <div className="space-y-2">
                  <Input type="password" placeholder="New password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setPwError(''); }} className="h-8 text-sm" />
                  <Input type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setPwError(''); }} className="h-8 text-sm" />
                  {pwError && <p className="text-xs text-destructive">{pwError}</p>}
                  <Button size="sm" onClick={handlePasswordSave} disabled={saving || !newPassword} className="h-8 text-xs gap-1 w-full">
                    {pwSaved ? <><Check className="w-3 h-3" />Saved!</> : 'Update Password'}
                  </Button>
                </div>
              </div>

              {/* Change email */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                  <Mail className="w-3.5 h-3.5" />Change Email
                </p>
                <div className="flex gap-2">
                  <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="h-8 text-sm" />
                  <Button size="sm" onClick={handleEmailSave} disabled={saving || !newEmail || newEmail === u?.email} className="h-8 text-xs whitespace-nowrap gap-1">
                    {emailSaved ? <><Check className="w-3 h-3" />Saved!</> : 'Update'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Permission Management ── */}
          {p && isAdmin && (
            <div className="border-t pt-3">
              <Button size="sm" variant="outline" className="gap-2 text-xs h-8 w-full" onClick={() => { onOpenChange(false); window.location.href = `/PersonnelManagement?id=${p.id}`; }}>
                <Shield className="w-3.5 h-3.5" />Manage Permissions
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 gap-4">
      <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  );
}