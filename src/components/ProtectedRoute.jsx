import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { hasPermission } from '@/lib/roles';

export default function ProtectedRoute({ children, requiredPermission }) {
  const { user, loading } = useCurrentUser();

  if (loading || !user) {
    return (
      <Card className="mt-8 max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-red-600">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <p className="text-sm">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
    return (
      <Card className="mt-8 max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-red-600">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <p className="text-sm">Permission required</p>
        </CardContent>
      </Card>
    );
  }

  return children;
}