import React, { useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  MapPin,
  Phone,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  UserCheck,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { usePermission } from '@/auth/usePermission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  tenantFormSchema,
  type TenantFormData,
} from '../types';
import { useOnboardTenant } from '../hooks';
import { TenantFormFields } from '../components/TenantFormFields';

export const TenantOnboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = usePermission();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [activeTab, setActiveTab] = useState<'general' | 'address'>('general');
  const [adminPhone, setAdminPhone] = useState('');
  const [copied, setCopied] = useState(false);

  const onboardMutation = useOnboardTenant();

  const {
    register,
    setValue,
    watch,
    reset,
    trigger,
    formState: { errors },
  } = useForm<TenantFormData>({
    resolver: async (data, context, options) => {
      const cleanedData = { ...data };
      if (
        cleanedData.address &&
        !cleanedData.address.province &&
        !cleanedData.address.district &&
        !cleanedData.address.municipality
      ) {
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
  const watchDomain = watch('domain_name');
  const watchEmail = watch('email');
  const watchPhone = watch('phone');
  const watchIsActive = watch('is_active');
  const watchAddress = watch('address');

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
    } else {
      // If errors are specific to address and general is clean, switch to address tab
      if (errors.address && !errors.name && !errors.domain_name && !errors.email && !errors.phone) {
        setActiveTab('address');
      } else if (errors.name || errors.domain_name || errors.email || errors.phone) {
        setActiveTab('general');
      }
    }
  };

  const handleFinalSubmit = async () => {
    const isValid = await trigger();
    if (!isValid) return;

    const data = watch();
    onboardMutation.mutate(
      { tenant: data, admin_phone: adminPhone || undefined },
      {
        onSuccess: () => {
          setStep(3);
        },
      }
    );
  };

  const handleCopyInstructions = () => {
    const link =
      onboardMutation.data?.invite_link ||
      (typeof window !== 'undefined' ? `${window.location.origin}/register` : '/register');
    if (link) {
      navigator.clipboard.writeText(`Please register your admin account using this link: ${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetForm = () => {
    reset();
    setStep(1);
    setActiveTab('general');
    setAdminPhone('');
    onboardMutation.reset();
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <Card className="max-w-md w-full p-8 text-center space-y-4 rounded-2xl border-destructive/30 bg-destructive/5">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-destructive">Super Admin Access Required</h2>
            <p className="text-xs text-muted-foreground">
              Tenant provisioning and institution onboarding is restricted strictly to platform Super Administrators.
            </p>
          </div>
          <Button
            onClick={() => navigate({ to: '/dashboard' })}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const stepsConfig = [
    { number: 1, title: 'School Details', desc: 'Identity & Address', icon: Building2 },
    { number: 2, title: 'Administrator', desc: 'Invite Admin Contact', icon: UserCheck },
    { number: 3, title: 'Completion', desc: 'Ready & Invitation', icon: Sparkles },
  ];

  return (
    <div className="space-y-6 w-full min-w-0 pb-12">
      {/* Header & Breadcrumb */}
      <div className="space-y-3 border-b pb-5">
        <Link
          to="/tenants"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tenant Management</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Onboard New School
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Provision a new school tenant instance and configure initial administrative access.
            </p>
          </div>
        </div>
      </div>

      {/* Stepper Indicator */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 p-2 bg-muted/40 rounded-2xl border border-border/60">
        {stepsConfig.map((item) => {
          const Icon = item.icon;
          const isActive = step === item.number;
          const isCompleted = step > item.number;

          return (
            <div
              key={item.number}
              className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-card text-foreground shadow-xs border border-border/80'
                  : isCompleted
                  ? 'text-foreground/80'
                  : 'text-muted-foreground/60'
              }`}
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : isCompleted
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="min-w-0 hidden xs:block sm:block">
                <p className="text-xs font-semibold truncate leading-tight">{item.title}</p>
                <p className="text-[10px] text-muted-foreground truncate hidden sm:block">
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: School Form Fields */}
      {step === 1 && (
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="p-5 sm:p-6 pb-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Institutional Information
                </CardTitle>
                <CardDescription className="text-xs">
                  Fill in the school's basic profile, unique domain slug, and location details.
                </CardDescription>
              </div>

              {/* Tab Navigation for Step 1 */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/60 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('general')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'general'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>General Info</span>
                  {(errors.name || errors.domain_name || errors.email || errors.phone) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('address')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'address'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Address Details</span>
                  {errors.address && (
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  )}
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-4">
            <TenantFormFields
              activeTab={activeTab}
              register={register}
              errors={errors}
              handleAutoSlug={handleAutoSlug}
              isEditing={false}
              watchIsActive={watchIsActive}
              setValue={setValue}
            />
          </CardContent>

          <CardFooter className="p-5 sm:p-6 pt-4 border-t bg-muted/15 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/tenants' })}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleNextStep}
              className="min-w-[140px] font-semibold rounded-xl gap-2 shadow-xs"
            >
              Continue to Admin
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Assign Initial Administrator */}
      {step === 2 && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          {/* Summary Preview */}
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="p-5 pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                School Summary Review
              </CardTitle>
              <CardDescription className="text-xs">
                Review institution details before finalizing provision.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground font-medium">Institution Name</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{watchName || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Domain Routing Slug</p>
                <p className="text-sm font-mono font-semibold text-primary mt-0.5">
                  {watchDomain ? `${watchDomain}.schoolsuppro` : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Portal Status</p>
                <p className="text-sm font-semibold mt-0.5">
                  {watchIsActive ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Active (Online)</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-bold">Inactive (Suspended)</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Official Contact Email</p>
                <p className="font-medium text-foreground mt-0.5">{watchEmail || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Contact Phone</p>
                <p className="font-medium text-foreground mt-0.5">{watchPhone || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Location</p>
                <p className="font-medium text-foreground mt-0.5">
                  {watchAddress?.municipality || watchAddress?.district
                    ? `${watchAddress.municipality || ''}, ${watchAddress.district || ''}`
                    : 'Not specified'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Admin Assignment Card */}
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="p-5 sm:p-6 pb-4 border-b">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Assign Initial Administrator
              </CardTitle>
              <CardDescription className="text-xs">
                Provide a mobile number to automatically invite an administrator to take ownership.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminPhone" className="text-xs font-semibold flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Admin Mobile Number (Optional)
                </Label>
                <Input
                  id="adminPhone"
                  placeholder="e.g. 9800000000 or +977 9800000000"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="h-11 max-w-md rounded-xl text-sm"
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enter a 10-digit Nepali mobile number (e.g. 98XXXXXXXX or +977 98XXXXXXXX). If the administrator already has an account, they will be linked directly; otherwise they can register to claim ownership.
                </p>
              </div>
            </CardContent>

            <CardFooter className="p-5 sm:p-6 pt-4 border-t bg-muted/15 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={onboardMutation.isPending}
                className="rounded-xl"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Details
              </Button>
              <Button
                type="button"
                onClick={handleFinalSubmit}
                disabled={onboardMutation.isPending}
                className="min-w-[160px] font-semibold rounded-xl gap-2 shadow-xs"
              >
                {onboardMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Provisioning School...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Finish Onboarding
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Step 3: Success & Confirmation */}
      {step === 3 && (
        <Card className="rounded-2xl border-border/70 shadow-md text-center animate-in zoom-in-95 duration-300">
          <CardContent className="p-8 sm:p-12 space-y-6 max-w-3xl mx-auto">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                School Onboarded Successfully!
              </h2>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{onboardMutation.data?.tenant?.name || watchName}</span>{' '}
                has been provisioned and is ready on domain{' '}
                <span className="font-mono text-primary font-semibold">
                  {onboardMutation.data?.tenant?.domain_name || watchDomain}.schoolsuppro
                </span>
                .
              </p>
            </div>

            {/* Status / Link Card */}
            {onboardMutation.data?.admin_assignment_status === 'assigned' ? (
              <div className="p-5 border border-emerald-500/30 rounded-2xl bg-emerald-500/5 text-left space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Administrator Account Linked Successfully</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  An existing platform account with mobile number{' '}
                  <span className="font-semibold text-foreground font-mono">{adminPhone}</span> was found and has been immediately assigned the School Administrator role.
                </p>
              </div>
            ) : adminPhone ? (
              <div className="p-5 border rounded-2xl bg-muted/30 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Administrator Registration Link
                  </Label>
                  <span className="text-[11px] text-muted-foreground font-medium">One-time registration link</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={
                      onboardMutation.data?.invite_link ||
                      (typeof window !== 'undefined' ? `${window.location.origin}/register` : '/register')
                    }
                    className="font-mono text-xs bg-card h-10 rounded-xl"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyInstructions}
                    title="Copy Link Instructions"
                    className="h-10 w-10 shrink-0 rounded-xl"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Send this link to the school's administrator (<span className="font-mono font-medium text-foreground">{adminPhone}</span>). When they register with this phone number, they will automatically be granted administrator privileges.
                </p>
              </div>
            ) : (
              <div className="p-4 border rounded-2xl bg-muted/20 text-xs text-muted-foreground">
                No administrator phone number was specified. You can assign administrators anytime from the school management page.
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetForm}
                className="w-full sm:w-auto rounded-xl gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Onboard Another School
              </Button>
              <Button
                type="button"
                onClick={() => navigate({ to: '/tenants' })}
                className="w-full sm:w-auto rounded-xl gap-2 font-semibold shadow-xs"
              >
                <Building2 className="h-4 w-4" />
                Return to Tenant Directory
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
