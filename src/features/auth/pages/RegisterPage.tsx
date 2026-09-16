import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  Smartphone,
  UserPlus,
  Sparkles,
  ArrowLeft,
  GraduationCap,
  ShieldCheck,
  Users,
  Fingerprint,
  BarChart3,
  Globe,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerSchema, type RegisterFormData } from '../schema';
import { authApi } from '../api';
import { useAuth } from '@/auth/useAuth';
import { ApiError } from '@/api/errors';
import { setAccessToken, setStoredRefreshToken } from '@/api/client';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, refreshProfile, isAuthenticated, isLoading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: '',
      middle_name: '',
      last_name: '',
      phone: '',
      email: '',
      password: '',
      confirm_password: '',
    },
  });

  // Redirect to dashboard if session already active
  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/dashboard' });
    }
  }, [isAuthenticated, navigate]);

  if (isLoading && !isSubmitting) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top_left,_rgba(186,230,253,0.4)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(199,210,254,0.35)_0%,_transparent_50%),radial-gradient(ellipse_at_center,_rgba(240,249,255,0.5)_0%,_transparent_70%)] bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-slate-500">Checking session...</p>
      </div>
    );
  }

  const onRegister = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      const res = await authApi.register({
        first_name: data.first_name,
        middle_name: data.middle_name || null,
        last_name: data.last_name,
        phone: data.phone,
        email: data.email,
        password: data.password,
      });

      // Scenario A: Backend directly returned JWT tokens
      if ('access_token' in res && res.access_token) {
        setAccessToken(res.access_token);
        if (res.refresh_token) {
          setStoredRefreshToken(res.refresh_token, true);
        }
        await refreshProfile();
        toast.success('Account Created Successfully!', {
          description: `Welcome to Schools Up Pro, ${data.first_name}!`,
        });
        navigate({ to: '/dashboard' });
        return;
      }

      // Scenario B: Backend registered user; authenticate seamlessly
      try {
        await login({
          email: data.email,
          password: data.password,
          rememberMe: true,
        });
        toast.success('Account Created & Signed In', {
          description: `Welcome to Schools Up Pro, ${data.first_name}!`,
        });
        navigate({ to: '/dashboard' });
      } catch {
        // Scenario C: Redirect to login with success message
        toast.success('Account Created Successfully!', {
          description: 'Your account is ready. Please sign in with your password.',
        });
        navigate({ to: '/login' });
      }
    } catch (err: unknown) {
      let errorMessage = 'Failed to register account. Please check your details.';
      if (err instanceof ApiError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      toast.error('Registration Failed', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top_left,_rgba(186,230,253,0.4)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(199,210,254,0.35)_0%,_transparent_50%),radial-gradient(ellipse_at_center,_rgba(240,249,255,0.5)_0%,_transparent_70%)] bg-slate-50 px-4 py-8 relative overflow-hidden">
      {/* Layered Gradient Orbs */}
      <div className="absolute top-[-8%] left-[-5%] w-[500px] h-[500px] bg-gradient-to-br from-sky-300/20 to-cyan-200/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-12%] right-[-8%] w-[550px] h-[550px] bg-gradient-to-tl from-indigo-300/20 to-violet-200/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] right-[10%] w-[300px] h-[300px] bg-gradient-to-br from-primary/[0.06] to-secondary/[0.04] rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-[30%] left-[5%] w-[250px] h-[250px] bg-gradient-to-tr from-cyan-300/10 to-sky-200/5 rounded-full blur-2xl pointer-events-none" />

      {/* ================================================================= */}
      {/* CENTERED SPLIT CARD                                               */}
      {/* ================================================================= */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-3xl shadow-2xl shadow-slate-300/40 border border-slate-200/60 overflow-hidden flex flex-col lg:flex-row">

        {/* ─── LEFT PANEL: REGISTRATION FORM ───────────────────────────── */}
        <div className="w-full lg:w-[58%] p-8 sm:p-10 lg:p-12 overflow-y-auto max-h-screen">
          <div className="max-w-md mx-auto w-full space-y-5">
            {/* Back Link */}
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>

            {/* Header */}
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Create your account
              </h2>
              <p className="text-sm text-slate-500">
                Register with your mobile phone so schools can link your role
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onRegister)} className="space-y-3.5">
              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="reg-first-name" className="text-xs font-semibold text-slate-700">
                    First Name <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="reg-first-name"
                    placeholder="e.g. Ramesh"
                    className={`bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 h-10 text-sm ${
                      errors.first_name ? 'border-destructive focus-visible:ring-destructive' : ''
                    }`}
                    disabled={isSubmitting}
                    {...register('first_name')}
                  />
                  {errors.first_name && (
                    <p className="text-[11px] text-destructive font-medium">{errors.first_name.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="reg-last-name" className="text-xs font-semibold text-slate-700">
                    Last Name <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="reg-last-name"
                    placeholder="e.g. Sharma"
                    className={`bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 h-10 text-sm ${
                      errors.last_name ? 'border-destructive focus-visible:ring-destructive' : ''
                    }`}
                    disabled={isSubmitting}
                    {...register('last_name')}
                  />
                  {errors.last_name && (
                    <p className="text-[11px] text-destructive font-medium">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              {/* Middle Name */}
              <div className="space-y-1">
                <Label htmlFor="reg-middle-name" className="text-xs font-semibold text-slate-600">
                  Middle Name <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="reg-middle-name"
                  placeholder="e.g. Bahadur"
                  className="bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 h-10 text-sm"
                  disabled={isSubmitting}
                  {...register('middle_name')}
                />
              </div>

              {/* Mobile Phone */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reg-phone" className="text-xs font-semibold text-slate-700">
                    Mobile Phone <span className="text-primary">*</span>
                  </Label>
                  <span className="text-[10px] text-slate-400">10-digit Nepali Mobile</span>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 pointer-events-none">
                    <Smartphone className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium text-slate-400 border-r border-slate-200 pr-1.5">+977</span>
                  </div>
                  <Input
                    id="reg-phone"
                    type="tel"
                    placeholder="98XXXXXXXX"
                    className={`pl-20 bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 h-10 text-sm ${
                      errors.phone ? 'border-destructive focus-visible:ring-destructive' : ''
                    }`}
                    disabled={isSubmitting}
                    {...register('phone')}
                  />
                </div>
                {errors.phone ? (
                  <p className="text-[11px] text-destructive font-medium">{errors.phone.message}</p>
                ) : (
                  <p className="text-[10px] text-slate-400">
                    Admins search this phone number to link your Teacher or Parent role.
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <Label htmlFor="reg-email" className="text-xs font-semibold text-slate-700">
                  Email Address <span className="text-primary">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="name@example.com"
                    className={`pl-9 bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 h-10 text-sm ${
                      errors.email ? 'border-destructive focus-visible:ring-destructive' : ''
                    }`}
                    disabled={isSubmitting}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-destructive font-medium">{errors.email.message}</p>
                )}
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="reg-password" className="text-xs font-semibold text-slate-700">
                    Password <span className="text-primary">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <Input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`pl-9 pr-10 bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 h-10 text-sm ${
                        errors.password ? 'border-destructive focus-visible:ring-destructive' : ''
                      }`}
                      disabled={isSubmitting}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-0 bottom-0 px-2.5 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[10px] text-destructive font-medium">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="reg-confirm" className="text-xs font-semibold text-slate-700">
                    Confirm Password <span className="text-primary">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <Input
                      id="reg-confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`pl-9 pr-10 bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 h-10 text-sm ${
                        errors.confirm_password ? 'border-destructive focus-visible:ring-destructive' : ''
                      }`}
                      disabled={isSubmitting}
                      {...register('confirm_password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-0 top-0 bottom-0 px-2.5 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {errors.confirm_password && (
                    <p className="text-[10px] text-destructive font-medium">{errors.confirm_password.message}</p>
                  )}
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full font-semibold shadow-lg shadow-primary/20 h-11 text-sm mt-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Account
                  </>
                )}
              </Button>
            </form>

            {/* Footer */}
            <p className="text-center text-xs text-slate-400 pt-1">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* ─── RIGHT PANEL: BRANDING & INFO ────────────────────────────── */}
        <div className="hidden lg:flex w-full lg:w-[42%] bg-gradient-to-br from-primary via-primary/95 to-secondary p-10 flex-col justify-between relative overflow-hidden">
          {/* Decorative Orbs */}
          <div className="absolute -top-20 -left-20 w-56 h-56 bg-white/[0.06] rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-secondary/30 rounded-full blur-2xl pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/10">
                <img src="/logo.svg" alt="Schools Up Pro" className="h-9 w-9 object-contain" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Schools Up Pro</h1>
                <p className="text-[11px] text-white/60 font-medium">PBAC Portal</p>
              </div>
            </div>

            <div className="pt-2">
              <h2 className="text-2xl font-extrabold text-white leading-snug tracking-tight">
                Join the platform.
              </h2>
              <p className="mt-2 text-sm text-white/65 leading-relaxed">
                Register once and let your school connect you as a Teacher or Parent instantly.
              </p>
            </div>
          </div>

          {/* Feature List */}
          <div className="relative z-10 space-y-3.5 py-6">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-white/15 shrink-0 mt-0.5">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Multi-Role Personas</p>
                <p className="text-xs text-white/55 leading-relaxed">Be a Teacher and Parent with the same account.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-white/15 shrink-0 mt-0.5">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Academic Hub</p>
                <p className="text-xs text-white/55 leading-relaxed">Classes, attendance, and exams — all in one place.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-white/15 shrink-0 mt-0.5">
                <Fingerprint className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Enterprise Security</p>
                <p className="text-xs text-white/55 leading-relaxed">Argon2id encryption with full audit trail.</p>
              </div>
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="relative z-10 flex items-center gap-5 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-white/50" />
              <span className="text-[11px] text-white/50 font-medium">5 Roles</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-white/50" />
              <span className="text-[11px] text-white/50 font-medium">3-Tier Auth</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-white/50" />
              <span className="text-[11px] text-white/50 font-medium">Multi-Tenant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
