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
  ShieldCheck,
  GraduationCap,
  Users,
  Smartphone,
  ArrowRight,
  Fingerprint,
  BarChart3,
  Globe,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { loginSchema, type LoginFormData } from '../schema';
import { useAuth } from '@/auth/useAuth';
import { ApiError } from '@/api/errors';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Retrieve remembered email from localStorage
  const rememberedEmail = localStorage.getItem('schools_up_remembered_email') || '';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: rememberedEmail,
      password: '',
      rememberMe: !!rememberedEmail,
    },
  });

  const rememberMeValue = watch('rememberMe');

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

  const onLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const profile = await login(data);
      const fullName = `${profile.first_name} ${profile.last_name}`;
      toast.success('Login Successful', {
        description: `Welcome back to Schools Up Pro, ${fullName}!`,
      });
    } catch (err: unknown) {
      let errorMessage = 'Invalid email or password. Please try again.';
      if (err instanceof ApiError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      toast.error('Authentication Failed', {
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

        {/* ─── LEFT PANEL: BRANDING & INFO ─────────────────────────────── */}
        <div className="w-full lg:w-[45%] bg-gradient-to-br from-primary via-primary/95 to-secondary p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Decorative Orbs */}
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-white/[0.06] rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-secondary/30 rounded-full blur-2xl pointer-events-none" />

          {/* Logo & Title */}
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/10">
                <img src="/logo.svg" alt="Schools Up Pro" className="h-9 w-9 object-contain" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Schools Up Pro</h1>
                <p className="text-[11px] text-white/60 font-medium">SSUP Portal</p>
              </div>
            </div>

            <div className="pt-2">
              <h2 className="text-2xl sm:text-[1.7rem] font-extrabold text-white leading-snug tracking-tight">
                One login for everyone.
              </h2>
              <p className="mt-2 text-sm text-white/65 leading-relaxed">
                Teachers, parents, and administrators — all in one secure platform.
              </p>
            </div>
          </div>

          {/* Feature List */}
          <div className="relative z-10 space-y-3.5 py-8 lg:py-6">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-white/15 shrink-0 mt-0.5">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Multi-Role Personas</p>
                <p className="text-xs text-white/55 leading-relaxed">Switch between Teacher, Parent, or Admin roles instantly.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-white/15 shrink-0 mt-0.5">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Academic Hub</p>
                <p className="text-xs text-white/55 leading-relaxed">Classes, attendance, exams, and reports — all in one place.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-white/15 shrink-0 mt-0.5">
                <Smartphone className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Phone-First Linkage</p>
                <p className="text-xs text-white/55 leading-relaxed">Register once, get linked by your school via phone number.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-white/15 shrink-0 mt-0.5">
                <Fingerprint className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Enterprise Security</p>
                <p className="text-xs text-white/55 leading-relaxed">Argon2id encryption with full audit trail and RBAC.</p>
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

        {/* ─── RIGHT PANEL: LOGIN FORM ─────────────────────────────────── */}
        <div className="w-full lg:w-[55%] p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full space-y-6">
            {/* Header */}
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
              <p className="text-sm text-slate-500">Sign in to your school dashboard</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onLogin)} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-xs font-semibold text-slate-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="name@school.edu"
                    className={`pl-9 h-11 bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary focus-visible:border-primary/30 ${
                      errors.email ? 'border-destructive focus-visible:ring-destructive' : ''
                    }`}
                    disabled={isSubmitting}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive font-medium">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password" className="text-xs font-semibold text-slate-700">
                    Password
                  </Label>
                  <span className="text-xs text-primary/80 hover:text-primary cursor-pointer transition-colors font-medium">
                    Forgot password?
                  </span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={`pl-9 pr-11 h-11 bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary focus-visible:border-primary/30 ${
                      errors.password ? 'border-destructive focus-visible:ring-destructive' : ''
                    }`}
                    disabled={isSubmitting}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 bottom-0 px-3.5 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive font-medium">{errors.password.message}</p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center space-x-2.5">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMeValue}
                  onCheckedChange={(checked) => setValue('rememberMe', Boolean(checked))}
                  disabled={isSubmitting}
                  className="border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label
                  htmlFor="rememberMe"
                  className="text-xs text-slate-500 cursor-pointer font-normal select-none"
                >
                  Remember my email
                </Label>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full font-semibold shadow-lg shadow-primary/20 h-11 text-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400">New to Schools Up Pro?</span>
              </div>
            </div>

            {/* Create Account Link */}
            <Link
              to="/register"
              className="w-full flex items-center justify-center gap-2 h-11 rounded-lg border border-slate-200 bg-slate-50/80 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all duration-200"
            >
              Create an account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
