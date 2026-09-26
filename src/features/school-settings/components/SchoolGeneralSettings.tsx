import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  School,
  Upload,
  Save,
  Loader2,
  AlertCircle,
  Building,
  Mail,
  Phone,
  MapPin,
  Globe,
} from 'lucide-react';
import { useTenant, useUpdateTenant, useUploadTenantLogo } from '@/features/tenants/hooks';
import { toast } from 'sonner';

interface SchoolGeneralSettingsProps {
  tenantId: string;
  canManage: boolean;
}

export const SchoolGeneralSettings: React.FC<SchoolGeneralSettingsProps> = ({
  tenantId,
  canManage,
}) => {
  const { data: tenant, isLoading, isError } = useTenant(tenantId || null);
  const updateTenantMutation = useUpdateTenant();
  const uploadLogoMutation = useUploadTenantLogo();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    domain_name: '',
    province: '',
    district: '',
    municipality: '',
    ward: 1,
    tole: '',
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        domain_name: tenant.domain_name || '',
        province: tenant.address?.province || '',
        district: tenant.address?.district || '',
        municipality: tenant.address?.municipality || '',
        ward: tenant.address?.ward || 1,
        tole: tenant.address?.tole || '',
      });
    }
  }, [tenant]);

  const isDirty = useMemo(() => {
    if (!tenant) return false;
    return (
      formData.name !== (tenant.name || '') ||
      formData.email !== (tenant.email || '') ||
      formData.phone !== (tenant.phone || '') ||
      formData.province !== (tenant.address?.province || '') ||
      formData.district !== (tenant.address?.district || '') ||
      formData.municipality !== (tenant.address?.municipality || '') ||
      Number(formData.ward) !== Number(tenant.address?.ward || 1) ||
      formData.tole !== (tenant.address?.tole || '')
    );
  }, [formData, tenant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'ward' ? parseInt(value) || 1 : value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !tenantId) return;

    await updateTenantMutation.mutateAsync({
      tenantId,
      data: {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: {
          province: formData.province,
          district: formData.district,
          municipality: formData.municipality,
          ward: Number(formData.ward),
          tole: formData.tole || undefined,
        },
      },
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Invalid File', {
        description: 'Please select a valid image file (PNG, JPG, SVG, WEBP).',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File Too Large', {
        description: 'Logo file size must be less than 5MB.',
      });
      return;
    }

    await uploadLogoMutation.mutateAsync({
      tenantId,
      file,
    });
  };

  if (isLoading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading school profile...</span>
      </Card>
    );
  }

  if (isError || !tenant) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-10 h-10 text-destructive mb-2" />
        <h3 className="font-semibold text-foreground">Failed to load school profile</h3>
        <p className="text-sm text-muted-foreground mt-1">Please try again or select a valid school.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        {/* School Identity Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <School className="w-5 h-5 text-primary" />
              School Profile & Branding
            </CardTitle>
            <CardDescription>
              Basic institutional information, contact points, and official branding logos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Section */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-xl border border-border bg-muted/20">
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-2xl border-2 border-border bg-background flex items-center justify-center overflow-hidden shadow-xs">
                  {tenant.logo_url ? (
                    <img
                      src={tenant.logo_url}
                      alt={tenant.name}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <Building className="w-10 h-10 text-muted-foreground/50" />
                  )}
                </div>
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1">
                <h4 className="font-semibold text-sm text-foreground">Official School Logo</h4>
                <p className="text-xs text-muted-foreground max-w-md">
                  This logo appears across student ID cards, official report cards, attendance printouts, and portal navigation. Max file size: 5MB.
                </p>

                {canManage && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadLogoMutation.isPending}
                    >
                      {uploadLogoMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Upload New Logo
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* School Name & Domain */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">School Legal Name *</Label>
                <div className="relative">
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!canManage}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="domain_name">School Subdomain / Slug</Label>
                <div className="relative">
                  <Input
                    id="domain_name"
                    name="domain_name"
                    value={formData.domain_name}
                    disabled
                    className="bg-muted cursor-not-allowed pr-10"
                  />
                  <Globe className="w-4 h-4 text-muted-foreground absolute right-3 top-3" aria-hidden="true" />
                </div>
                <span className="text-[11px] text-muted-foreground">Tenant domain identifier is managed by platform admin.</span>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Administrative Contact Email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!canManage}
                    placeholder="info@school.edu.np"
                    className="pr-10"
                  />
                  <Mail className="w-4 h-4 text-muted-foreground absolute right-3 top-3" aria-hidden="true" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Contact Phone Number</Label>
                <div className="relative">
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!canManage}
                    placeholder="01-4412345 or 98XXXXXXXX"
                    className="pr-10"
                  />
                  <Phone className="w-4 h-4 text-muted-foreground absolute right-3 top-3" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm text-foreground">Location & Address</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="province">Province *</Label>
                  <Input
                    id="province"
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    disabled={!canManage}
                    placeholder="e.g. Bagmati"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="district">District *</Label>
                  <Input
                    id="district"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    disabled={!canManage}
                    placeholder="e.g. Kathmandu"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="municipality">Municipality / Palika *</Label>
                  <Input
                    id="municipality"
                    name="municipality"
                    value={formData.municipality}
                    onChange={handleChange}
                    disabled={!canManage}
                    placeholder="e.g. Kathmandu Metropolitan"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ward">Ward Number *</Label>
                  <Input
                    id="ward"
                    name="ward"
                    type="number"
                    min={1}
                    max={35}
                    value={formData.ward}
                    onChange={handleChange}
                    disabled={!canManage}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tole">Street / Tole</Label>
                  <Input
                    id="tole"
                    name="tole"
                    value={formData.tole}
                    onChange={handleChange}
                    disabled={!canManage}
                    placeholder="e.g. New Baneshwor"
                  />
                </div>
              </div>
            </div>

            {canManage && (
              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={updateTenantMutation.isPending || !isDirty}
                >
                  {updateTenantMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Profile Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
