import React from 'react';
import { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { MapPin, Mail, Phone, Sparkles, Image } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { TenantLogoAvatar } from './TenantLogoAvatar';
import type { TenantFormData } from '../types';

interface TenantFormFieldsProps {
  activeTab: 'general' | 'address';
  register: UseFormRegister<TenantFormData>;
  errors: FieldErrors<TenantFormData>;
  handleAutoSlug: () => void;
  isEditing: boolean;
  watchIsActive: boolean;
  setValue: UseFormSetValue<TenantFormData>;
  logoUrl?: string | null;
  onOpenLogo?: () => void;
}

export const TenantFormFields: React.FC<TenantFormFieldsProps> = ({
  activeTab,
  register,
  errors,
  handleAutoSlug,
  isEditing,
  watchIsActive,
  setValue,
  logoUrl,
  onOpenLogo,
}) => {
  return (
    <>
      {activeTab === 'general' ? (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          {/* School Brand Logo Section (when editing) */}
          {isEditing && (
            <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <TenantLogoAvatar
                  logoUrl={logoUrl}
                  className="h-12 w-12 min-h-[48px] min-w-[48px]"
                  iconClassName="h-6 w-6"
                  onClick={onOpenLogo}
                  editable={Boolean(onOpenLogo)}
                />
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-bold text-foreground">School Brand Logo</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {logoUrl ? 'Custom brand logo configured' : 'No custom logo uploaded yet'}
                  </p>
                </div>
              </div>

              {onOpenLogo && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenLogo}
                  className="h-8 text-xs font-semibold shrink-0"
                >
                  <Image className="h-3.5 w-3.5 mr-1.5 text-primary" />
                  {logoUrl ? 'Change Logo' : 'Upload Logo'}
                </Button>
              )}
            </div>
          )}

          {/* School Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold">
              School Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Springfield Academy of Excellence"
              {...register('name')}
              onBlur={handleAutoSlug}
              className="h-10"
            />
            {errors.name && (
              <p className="text-[11px] text-destructive font-medium">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Domain Slug */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="domain_name" className="text-xs font-semibold">
                Domain Slug Identifier <span className="text-destructive">*</span>
              </Label>
              {!isEditing && (
                <button
                  type="button"
                  onClick={handleAutoSlug}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium min-h-[44px] px-2 -mr-2"
                >
                  <Sparkles className="h-3 w-3" />
                  Auto-generate
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="domain_name"
                placeholder="e.g. springfield-academy"
                {...register('domain_name')}
                className="h-10 font-mono text-xs pr-24"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                .schoolsuppro
              </span>
            </div>
            {errors.domain_name ? (
              <p className="text-[11px] text-destructive font-medium">
                {errors.domain_name.message}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Unique portal routing key. Lowercase alphanumeric and hyphens only.
              </p>
            )}
          </div>

          {/* Email & Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1">
                <Mail className="h-3 w-3 text-muted-foreground" />
                Official Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@school.edu"
                {...register('email')}
                className="h-10"
              />
              {errors.email && (
                <p className="text-[11px] text-destructive font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold flex items-center gap-1">
                <Phone className="h-3 w-3 text-muted-foreground" />
                Contact Phone
              </Label>
              <Input
                id="phone"
                placeholder="+977 1-4412345"
                {...register('phone')}
                className="h-10"
              />
              {errors.phone && (
                <p className="text-[11px] text-destructive font-medium">
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>

          {/* Active Portal Toggle */}
          <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30 min-h-[44px]">
            <Checkbox
              id="is_active"
              checked={watchIsActive}
              onCheckedChange={(checked) => setValue('is_active', !!checked)}
              className="h-5 w-5"
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="is_active"
                className="text-xs font-semibold cursor-pointer flex items-center gap-1.5 min-h-[24px]"
              >
                <span>Enable Portal Active Status</span>
                {watchIsActive ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    (Online)
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                    (Suspended)
                  </span>
                )}
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Active portals allow student, faculty, and parent logins.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span>Geographic coordinates and administrative division for student zoning.</span>
          </div>

          {/* Province & District Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="province" className="text-xs font-semibold">
                Province / State <span className="text-destructive">*</span>
              </Label>
              <Input
                id="province"
                placeholder="e.g. Bagmati"
                {...register('address.province')}
                className="h-10"
              />
              {errors.address?.province && (
                <p className="text-[11px] text-destructive font-medium">
                  {errors.address.province.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="district" className="text-xs font-semibold">
                District <span className="text-destructive">*</span>
              </Label>
              <Input
                id="district"
                placeholder="e.g. Kathmandu"
                {...register('address.district')}
                className="h-10"
              />
              {errors.address?.district && (
                <p className="text-[11px] text-destructive font-medium">
                  {errors.address.district.message}
                </p>
              )}
            </div>
          </div>

          {/* Municipality & Ward Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="municipality" className="text-xs font-semibold">
                Municipality / City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="municipality"
                placeholder="e.g. Kathmandu Metropolitan"
                {...register('address.municipality')}
                className="h-10"
              />
              {errors.address?.municipality && (
                <p className="text-[11px] text-destructive font-medium">
                  {errors.address.municipality.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ward" className="text-xs font-semibold">
                Ward No <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ward"
                type="number"
                min={1}
                placeholder="4"
                {...register('address.ward', { valueAsNumber: true })}
                className="h-10"
              />
              {errors.address?.ward && (
                <p className="text-[11px] text-destructive font-medium">
                  {errors.address.ward.message}
                </p>
              )}
            </div>
          </div>

          {/* Tole / Street */}
          <div className="space-y-1.5">
            <Label htmlFor="tole" className="text-xs font-semibold">
              Tole / Street Address (Optional)
            </Label>
            <Input
              id="tole"
              placeholder="e.g. Baluwatar Marg"
              {...register('address.tole')}
              className="h-10"
            />
          </div>
        </div>
      )}
    </>
  );
};
