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
import { TenantFormFields } from './TenantFormFields';
import { cn } from '@/lib/utils';

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantToEdit?: Tenant | null;
  onSubmit: (data: TenantFormData) => Promise<void>;
  isSubmitting?: boolean;
  onOpenLogo?: (tenant: any) => void;
}

export const TenantFormDialog: React.FC<TenantFormDialogProps> = ({
  open,
  onOpenChange,
  tenantToEdit,
  onSubmit,
  isSubmitting = false,
  onOpenLogo,
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
          <div role="tablist" aria-label="Tenant Details Navigation" className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/80 shadow-2xs mt-4">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer select-none border',
                activeTab === 'general'
                  ? 'bg-background text-foreground font-bold shadow-xs border-border/90 dark:bg-card dark:border-primary/40'
                  : 'border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground hover:border-border/40'
              )}
            >
              <Building2 className={cn('h-3.5 w-3.5 transition-colors', activeTab === 'general' ? 'text-primary' : 'text-muted-foreground')} />
              <span>General Info</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'address'}
              onClick={() => setActiveTab('address')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer select-none border',
                activeTab === 'address'
                  ? 'bg-background text-foreground font-bold shadow-xs border-border/90 dark:bg-card dark:border-primary/40'
                  : 'border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground hover:border-border/40'
              )}
            >
              <MapPin className={cn('h-3.5 w-3.5 transition-colors', activeTab === 'address' ? 'text-primary' : 'text-muted-foreground')} />
              <span>Address Details</span>
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="p-5 sm:p-6 space-y-4">
            <TenantFormFields
              activeTab={activeTab}
              register={register}
              errors={errors}
              handleAutoSlug={handleAutoSlug}
              isEditing={isEditing}
              watchIsActive={watchIsActive}
              setValue={setValue}
              logoUrl={tenantToEdit?.logo_url}
              onOpenLogo={onOpenLogo && tenantToEdit ? () => onOpenLogo(tenantToEdit) : undefined}
            />
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
