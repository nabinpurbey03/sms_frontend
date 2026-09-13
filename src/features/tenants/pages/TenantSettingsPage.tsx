import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useTenants, useUpdateTenant } from '@/features/tenants/hooks';
import { tenantFormSchema, type TenantFormData } from '@/features/tenants/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export const TenantSettingsPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { isSuperAdmin, activeRole } = usePermission();
  const isAdmin = activeRole === 'ADMIN' || isSuperAdmin;

  const { data: tenantsResponse, isLoading } = useTenants({ search: '' });
  const activeTenant = tenantsResponse?.items.find((t) => t.id === activeTenantId);
  const updateMutation = useUpdateTenant();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TenantFormData>({
    resolver: async (data, context, options) => {
      const cleanedData = { ...data };
      if (cleanedData.address && !cleanedData.address.province && !cleanedData.address.district && !cleanedData.address.municipality) {
        cleanedData.address = null;
      }
      return zodResolver(tenantFormSchema)(cleanedData, context, options);
    },
  });

  useEffect(() => {
    if (activeTenant) {
      reset({
        name: activeTenant.name,
        domain_name: activeTenant.domain_name,
        email: activeTenant.email || '',
        phone: activeTenant.phone || '',
        is_active: activeTenant.is_active,
        address: activeTenant.address || { province: '', district: '', municipality: '', ward: 1, tole: '' },
      });
    }
  }, [activeTenant, reset]);

  const onSubmit = async (data: TenantFormData) => {
    if (!activeTenantId) return;
    try {
      await updateMutation.mutateAsync({ tenantId: activeTenantId, data });
      toast.success('Settings updated successfully');
    } catch (e) {
      toast.error('Failed to update settings');
    }
  };

  if (!isAdmin) {
    return <div className="p-8 text-center text-destructive">Access Denied. Only School Admins can manage settings.</div>;
  }

  if (isLoading) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">School Settings</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-card p-6 rounded-xl border shadow-sm">
        <div className="space-y-2">
          <Label>School Name</Label>
          <Input {...register('name')} />
          {errors.name && <span className="text-destructive text-sm">{errors.name.message}</span>}
        </div>
        <div className="space-y-2">
          <Label>Official Email</Label>
          <Input type="email" {...register('email')} />
        </div>
        <div className="space-y-2">
          <Label>Contact Phone</Label>
          <Input {...register('phone')} />
        </div>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
};
