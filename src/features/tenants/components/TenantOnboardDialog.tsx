import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  Loader2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
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
} from '../types';
import { useOnboardTenant } from '../hooks';
import { TenantFormFields } from './TenantFormFields';

interface TenantOnboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TenantOnboardDialog: React.FC<TenantOnboardDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [activeTab, setActiveTab] = useState<'general' | 'address'>('general');
  const [adminPhone, setAdminPhone] = useState('');
  const [copied, setCopied] = useState(false);

  const onboardMutation = useOnboardTenant();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger,
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

  useEffect(() => {
    if (!open) {
      reset();
      setStep(1);
      setActiveTab('general');
      setAdminPhone('');
      onboardMutation.reset();
    }
  }, [open, reset, onboardMutation]);

  const handleAutoSlug = () => {
    if (watchName) {
      const slug = watchName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      setValue('domain_name', slug, { shouldValidate: true });
    }
  };

  const handleNextStep = async () => {
    const isValid = await trigger();
    if (isValid) {
      setStep(2);
    }
  };

  const handleFinalSubmit = async () => {
    const isValid = await trigger();
    if (!isValid) return;

    const data = watch();
    onboardMutation.mutate(
      { tenant: data, admin_phone: adminPhone || undefined },
      {
        onSuccess: (res) => {
          if (res.status === 'pending_registration') {
            setStep(3);
          } else {
            onOpenChange(false);
          }
        },
      }
    );
  };

  const handleCopyInstructions = () => {
    const link = onboardMutation.data?.invite_link;
    if (link) {
      navigator.clipboard.writeText(`Please register your admin account using this link: ${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(openVal) => {
      // Prevent closing if we are loading or on step 3 (must explicitly close)
      if (onboardMutation.isPending) return;
      onOpenChange(openVal);
    }}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-border/70 shadow-2xl">
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {step === 3 ? <Sparkles className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {step === 3 ? 'School Onboarded Successfully' : 'Onboard New School Tenant'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {step === 1 && 'Step 1 of 2: Configure institutional and address details'}
                {step === 2 && 'Step 2 of 2: Assign Initial Administrator'}
                {step === 3 && 'School provisioned and ready for admin registration.'}
              </DialogDescription>
            </div>
          </div>

          {step === 1 && (
            <div className="flex items-center gap-2 pt-4">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`flex items-center gap-1.5 px-3 min-h-[44px] text-xs font-semibold rounded-lg border transition-colors ${
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
                className={`flex items-center gap-1.5 px-3 min-h-[44px] text-xs font-semibold rounded-lg border transition-colors ${
                  activeTab === 'address'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Address Details</span>
              </button>
            </div>
          )}
        </DialogHeader>

        {step === 1 && (
          <>
            <div className="p-5 sm:p-6 space-y-4">
              <TenantFormFields
                activeTab={activeTab}
                register={register}
                errors={errors}
                handleAutoSlug={handleAutoSlug}
                isEditing={false}
                watchIsActive={watchIsActive}
                setValue={setValue}
              />
            </div>

            <DialogFooter className="p-4 sm:p-6 pt-3 border-t bg-muted/20 flex items-center justify-between sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleNextStep} className="min-w-[130px] font-semibold">
                Next Step
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <div className="p-5 sm:p-6 space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5">
                <Label htmlFor="adminPhone" className="text-xs font-semibold flex items-center gap-1">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  Assign Admin by Phone (Optional)
                </Label>
                <Input
                  id="adminPhone"
                  placeholder="e.g. +977 9800000000"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="h-10"
                />
                <p className="text-[11px] text-muted-foreground">
                  If provided, an invite link will be generated for this user to claim the admin account.
                </p>
              </div>
            </div>

            <DialogFooter className="p-4 sm:p-6 pt-3 border-t bg-muted/20 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={onboardMutation.isPending}
              >
                Back
              </Button>
              <Button 
                type="button" 
                onClick={handleFinalSubmit} 
                disabled={onboardMutation.isPending} 
                className="min-w-[130px] font-semibold"
              >
                {onboardMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Onboarding...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Finish Onboarding
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <div className="p-5 sm:p-6 space-y-4 text-center animate-in zoom-in-95 duration-300">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Pending Registration</h3>
              <p className="text-sm text-muted-foreground">
                The school has been successfully provisioned. The assigned admin needs to complete registration using the invite link.
              </p>

              {onboardMutation.data?.invite_link && (
                <div className="mt-6 p-4 border rounded-xl bg-muted/30">
                  <p className="text-xs font-semibold mb-2 text-left">Invite Link:</p>
                  <div className="flex items-center gap-2">
                    <Input 
                      readOnly 
                      value={onboardMutation.data.invite_link} 
                      className="font-mono text-xs bg-card"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyInstructions}
                      title="Copy Invite Instructions"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="p-4 sm:p-6 pt-3 border-t bg-muted/20 flex items-center justify-center">
              <Button 
                type="button" 
                onClick={() => onOpenChange(false)} 
                className="min-w-[150px] font-semibold"
              >
                Close & Return
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
