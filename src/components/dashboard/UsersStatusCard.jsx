import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UsersStatusCard() {
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 5000, // Sync every 5 seconds
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
    refetchInterval: 5000,
  });

  const { data: userSetups = [] } = useQuery({
    queryKey: ['user-setups'],
    queryFn: () => base44.entities.UserSetup.list(),
    refetchInterval: 5000,
  });

  const [syncStatus, setSyncStatus] = useState('synced');
  const [lastSync, setLastSync] = useState(new Date());

  useEffect(() => {
    setSyncStatus('synced');
    setLastSync(new Date());
  }, [users, staffList, userSetups]);

  const activeUsers = users.length;
  const pendingInvites = userSetups.filter(s => s.status === 'pending').length;
  const totalStaff = staffList.length;

  const roleDistribution = {};
  staffList.forEach(staff => {
    const roles = staff.roles || ['staff'];
    roles.forEach(role => {
      roleDistribution[role] = (roleDistribution[role] || 0) + 1;
    });
  });

  const admins = users.filter(u => u.role === 'admin').length;
  const regularUsers = users.filter(u => u.role === 'user').length;

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">User Management</CardTitle>
              <p className="text-xs text-muted-foreground">System users & permissions</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <div className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-green-500' : 'bg-yellow-500'}`} />
              {syncStatus === 'synced' ? 'Live' : 'Syncing'}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
            <p className="text-2xl font-bold text-blue-600">{activeUsers}</p>
            <p className="text-xs text-blue-600/70">Active Users</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-2xl font-bold text-amber-600">{pendingInvites}</p>
            <p className="text-xs text-amber-600/70">Pending</p>
          </div>
          <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
            <p className="text-2xl font-bold text-purple-600">{totalStaff}</p>
            <p className="text-xs text-purple-600/70">Staff</p>
          </div>
        </div>

        {/* User Roles Breakdown */}
        <div className="pt-3 border-t">
          <p className="text-xs font-semibold text-muted-foreground mb-3">SYSTEM ROLES</p>
          <div className="flex flex-wrap gap-2">
            {admins > 0 && (
              <Badge className="bg-red-100 text-red-700 border border-red-200">
                {admins} Admin{admins !== 1 ? 's' : ''}
              </Badge>
            )}
            {regularUsers > 0 && (
              <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                {regularUsers} User{regularUsers !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Staff Roles */}
        {Object.keys(roleDistribution).length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-xs font-semibold text-muted-foreground mb-3">STAFF ROLES</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(roleDistribution).map(([role, count]) => (
                <Badge
                  key={role}
                  variant="outline"
                  className="text-xs capitalize"
                >
                  {count}x {role}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Pending Invites Alert */}
        {pendingInvites > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex gap-2">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700">
              <p className="font-semibold">{pendingInvites} pending invitation{pendingInvites !== 1 ? 's' : ''}</p>
              <p className="text-amber-600/80">Waiting for user activation</p>
            </div>
          </div>
        )}

        {/* Manage Link */}
        <Link
          to="/Settings?tab=team"
          className="block w-full mt-4 px-4 py-2 text-center text-sm font-medium text-primary hover:bg-primary/5 rounded-lg border border-primary/20 transition-colors"
        >
          Manage Team → 
        </Link>
      </CardContent>
    </Card>
  );
}