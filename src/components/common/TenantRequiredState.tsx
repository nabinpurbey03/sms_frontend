import React from 'react';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';

interface TenantRequiredStateProps {
  featureName?: string;
  className?: string;
}

export const TenantRequiredState: React.FC<TenantRequiredStateProps> = ({
  featureName = 'academic records and settings',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[55vh] text-center p-6 space-y-4 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
        <Building2 className="w-8 h-8" />
      </div>
      <div className="space-y-1 max-w-md">
        <h2 className="text-xl font-bold text-foreground">Select a School Portal</h2>
        <p className="text-sm text-muted-foreground">
          You must switch to an active school tenant in order to view and manage {featureName}.
        </p>
      </div>
      <Button asChild>
        <Link to="/tenants">View All Schools</Link>
      </Button>
    </div>
  );
};
