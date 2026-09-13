import React, { useEffect, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  Loader2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  tenantFormSchema,
  type TenantFormData,
  type Tenant,
} from '../types';

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantToEdit?: Tenant | null;
  onSubmit: (data: TenantFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export const TenantFormDialog: React.FC<TenantFormDialogProps> = ({
  open,
  onOpenChange,
  tenantToEdit,
  onSubmit,
  isSubmitting = false,
}) => {
  const isEditing = !!tenantToEdit;
  const [activeTab, setActiveTab] = useState<'general' | 'address'>('general');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TenantFormData>({
    resolver: async (data, context, options) => {
      const cleanedData = { ...data };
      if (cleanedData.address && !cleanedData.address.province && !cleanedData.address.district && !cleanedData.address.municipality) {
        cleanedData.address = null;
      }
      return zodResolver(tenantFormSchema)(cleanedData, context, options);
    },
    defaultValues: {
      name: '',
      domain_name: '',
      email: '',
      phone: '',
      is_active: true,
      address: {
        province: '',
        district: '',
        municipality: '',
        ward: 1,
        tole: '',
      },
    },
  });

  const watchName = watch('name');
  const watchIsActive = watch('is_active');

  // Populate or reset form when modal opens / tenant changes
  useEffect(() => {
    if (tenantToEdit) {
      reset({
        name: tenantToEdit.name,
        domain_name: tenantToEdit.domain_name,
        email: tenantToEdit.email || '',
        phone: tenantToEdit.phone || '',
        is_active: tenantToEdit.is_active,
        address: tenantToEdit.address
          ? {
              province: tenantToEdit.address.province,
              district: tenantToEdit.address.district,
              municipality: tenantToEdit.address.municipality,
              ward: Number(tenantToEdit.address.ward) || 1,
              tole: tenantToEdit.address.tole || '',
            }
          : {
              province: '',
              district: '',
              municipality: '',
              ward: 1,
              tole: '',
            },
      });
    } else {
      reset({
        name: '',
        domain_name: '',
        email: '',
        phone: '',
        is_active: true,
        address: {
          province: '',
          district: '',
          municipality: '',
          ward: 1,
          tole: '',
        },
      });
    }
    setActiveTab('general');
  }, [tenantToEdit, open, reset]);

  // Auto-generate domain slug when typing school name (only on create mode)
  const handleAutoSlug = () => {
    if (!isEditing && watchName) {
      const slug = watchName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      setValue('domain_name', slug, { shouldValidate: true });
    }
  };

  const handleFormSubmit: SubmitHandler<TenantFormData> = async (data) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-border/70 shadow-2xl">
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {isEditing ? `Edit School: ${tenantToEdit.name}` : 'Register New School Tenant'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isEditing
                  ? 'Update institutional configuration and geographic address'
                  : 'Provision a new school tenant on the multi-tenant platform'}
              </DialogDescription>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 pt-4">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                activeTab === 'general'
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>General Info</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('address')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                activeTab === 'address'
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>Address Details</span>
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="p-5 sm:p-6 space-y-4">
            {activeTab === 'general' ? (
              <div className="space-y-4 animate-in fade-in-50 duration-150">
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
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
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
                <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                  <Checkbox
                    id="is_active"
                    checked={watchIsActive}
                    onCheckedChange={(checked) => setValue('is_active', !!checked)}
                  />
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="is_active"
                      className="text-xs font-semibold cursor-pointer flex items-center gap-1.5"
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
          </div>

          <DialogFooter className="p-4 sm:p-6 pt-3 border-t bg-muted/20 flex items-center justify-between sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[130px] font-semibold">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {isEditing ? 'Save Changes' : 'Provision School'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
