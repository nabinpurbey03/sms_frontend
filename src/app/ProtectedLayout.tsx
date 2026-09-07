import React from 'react';
import { Navigate } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/auth/useAuth';
import { Loader2 } from 'lucide-react';

export const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          Authenticating school session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell />;
};
