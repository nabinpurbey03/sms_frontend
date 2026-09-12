import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  School,
  Smartphone,
  GraduationCap,
  Users,
  UserPlus,
  Sparkles,
  CheckCircle2,
  Building2,
  ArrowRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  loginSchema,
  registerSchema,
  type LoginFormData,
  type RegisterFormData,
} from '../schema';
import { authApi } from '../api';
import { useAuth } from '@/auth/useAuth';
import { ApiError } from '@/api/errors';
import { setAccessToken, setStoredRefreshToken } from '@/api/client';

interface LoginPageProps {
  defaultTab?: 'signin' | 'signup';
}

export const LoginPage: React.FC<LoginPageProps> = ({ defaultTab = 'signin' }) => {
  const navigate = useNavigate();
  const { login, refreshProfile, isAuthenticated, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(defaultTab);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Retrieve remembered email from localStorage
  const rememberedEmail = localStorage.getItem('schools_up_remembered_email') || '';

  // Sign In Form
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    setValue: setLoginValue,
    watch: watchLogin,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: rememberedEmail,
      password: '',
      rememberMe: !!rememberedEmail,
    },
  });

  const rememberMeValue = watchLogin('rememberMe');

  // Sign Up Form
  const {
    register: registerSignUp,
    handleSubmit: handleSignUpSubmit,
    reset: resetSignUp,
    formState: { errors: signUpErrors },
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
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-slate-400">
          Checking session...
        </p>
      </div>
    );
  }

  // Handle Sign In submission
  const onLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const profile = await login(data);
      const fullName = `${profile.first_name} ${profile.last_name}`;
      toast.success('Login Successful', {
        description: `Welcome back to Schools Up Pro, ${fullName}!`,
      });
      navigate({ to: '/dashboard' });
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

  // Handle Sign Up submission
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
        // Scenario C: Switch to sign in tab with email pre-populated
        toast.success('Account Created Successfully!', {
          description: 'Your account is ready. Please sign in with your password.',
        });
        setLoginValue('email', data.email);
        resetSignUp();
        setActiveTab('signin');
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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950">
      {/* ========================================================================= */}
      {/* LEFT COLUMN: BRANDING & FEATURE SHOWCASE (DESKTOP & TABLET)              */}
      {/* ========================================================================= */}
      <div className="relative w-full lg:w-1/2 xl:w-7/12 bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-slate-800/80 overflow-hidden">
        {/* Decorative Glow Orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Branding Header */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl shadow-primary/10">
              <img
                src="/logo.svg"
                alt="Schools Up Pro"
                className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Schools Up Pro
                </span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary-foreground border border-primary/30">
                  PBAC Portal
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Unified Multi-Tenant School Management Platform
              </p>
            </div>
          </div>

          <div className="pt-4 lg:pt-8 max-w-xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              One account for teachers, guardians, and academic leaders.
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
              Register once with your mobile phone. School administrators can instantly
              assign you as a Faculty Teacher or Guardian, eliminating duplicated logins.
            </p>
          </div>
        </div>

        {/* Middle: Feature Highlights (Grid) */}
        <div className="relative z-10 py-8 lg:py-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          {/* Feature 1: Parental Control */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm space-y-2.5 hover:border-slate-700 transition-colors">
            <div className="inline-flex items-center justify-center p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-semibold text-white">Parental Control & Attendance</h2>
            <p className="text-xs text-slate-300/90 leading-relaxed">
              Guardians monitor real-time daily roll calls, subject logs, exam notices,
              and academic milestones for their enrolled children.
            </p>
          </div>

          {/* Feature 2: Teacher's Evaluation */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm space-y-2.5 hover:border-slate-700 transition-colors">
            <div className="inline-flex items-center justify-center p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-semibold text-white">Teacher's Duties & Evaluation</h2>
            <p className="text-xs text-slate-300/90 leading-relaxed">
              Instant 1-tap section roll calls, ReBAC duty verification, syllabus
              coverage, and student performance assessments.
            </p>
          </div>

          {/* Feature 3: Phone-Based Onboarding */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm space-y-2.5 hover:border-slate-700 transition-colors">
            <div className="inline-flex items-center justify-center p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Smartphone className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-semibold text-white">Phone-First Smart Linkage</h2>
            <p className="text-xs text-slate-300/90 leading-relaxed">
              Administrators locate registered members by mobile phone number to quickly
              link classes, sections, or children with zero hassle.
            </p>
          </div>

          {/* Feature 4: Enterprise Multi-Tenancy */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm space-y-2.5 hover:border-slate-700 transition-colors">
            <div className="inline-flex items-center justify-center p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-semibold text-white">Multi-Tenant RBAC & Security</h2>
            <p className="text-xs text-slate-300/90 leading-relaxed">
              State-of-the-art Argon2id hashing, strict tenant data isolation, and
              tamper-proof audit logs for complete accountability.
            </p>
          </div>
        </div>

        {/* Bottom: Trust & Security Badges */}
        <div className="relative z-10 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Argon2id Encrypted • Hybrid RBAC/ReBAC/ABAC</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
            <span>&copy; 2026 Schools Up Pro</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: AUTHENTICATION FORMS (SIGN IN / SIGN UP TABS)               */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-1/2 xl:w-5/12 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative z-10 bg-slate-950">
        <div className="w-full max-w-md space-y-5">
          {/* Mobile Header (Only visible on small screens) */}
          <div className="lg:hidden flex items-center justify-center gap-3 text-center pb-2">
            <img src="/logo.svg" alt="Schools Up Pro" className="h-9 w-9 object-contain" />
            <div className="text-left">
              <h2 className="text-lg font-bold text-white leading-tight">Schools Up Pro</h2>
              <p className="text-[11px] text-slate-400">School Portal Authentication</p>
            </div>
          </div>

          {/* Tab Navigation Controls */}
          <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('signin')}
              className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${
                activeTab === 'signin'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${
                activeTab === 'signup'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form Card */}
          <Card className="border-slate-800 bg-slate-900/90 text-slate-100 shadow-2xl rounded-2xl backdrop-blur-md">
            {/* =================================================================== */}
            {/* TAB 1: SIGN IN FORM                                                 */}
            {/* =================================================================== */}
            {activeTab === 'signin' && (
              <>
                <CardHeader className="space-y-1 p-5 sm:p-6 pb-2 sm:pb-3">
                  <CardTitle className="text-lg sm:text-xl font-bold text-white">
                    Sign In to Your Portal
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-400">
                    Enter your email and password to access your school dashboard
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handleLoginSubmit(onLogin)}>
                  <CardContent className="space-y-4 p-5 sm:p-6 pt-2 sm:pt-3">
                    {/* Email Address */}
                    <div className="space-y-1.5">
                      <Label htmlFor="login-email" className="text-xs font-semibold text-slate-200">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="name@school.edu"
                          className={`pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-primary ${
                            loginErrors.email ? 'border-destructive focus-visible:ring-destructive' : ''
                          }`}
                          disabled={isSubmitting}
                          {...registerLogin('email')}
                        />
                      </div>
                      {loginErrors.email && (
                        <p className="text-xs text-rose-400 font-medium">
                          {loginErrors.email.message}
                        </p>
                      )}
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password" className="text-xs font-semibold text-slate-200">
                          Password
                        </Label>
                        <span className="text-xs text-slate-400 hover:text-primary cursor-pointer transition-colors">
                          Forgot password?
                        </span>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <Input
                          id="login-password"
                          type={showLoginPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className={`pl-9 pr-11 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-primary ${
                            loginErrors.password ? 'border-destructive focus-visible:ring-destructive' : ''
                          }`}
                          disabled={isSubmitting}
                          {...registerLogin('password')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-0 top-0 bottom-0 px-3.5 flex items-center justify-center text-slate-400 hover:text-white transition-colors focus:outline-none"
                          tabIndex={-1}
                          aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                        >
                          {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {loginErrors.password && (
                        <p className="text-xs text-rose-400 font-medium">
                          {loginErrors.password.message}
                        </p>
                      )}
                    </div>

                    {/* Remember Me */}
                    <div className="flex items-center space-x-2.5 py-1">
                      <Checkbox
                        id="rememberMe"
                        checked={rememberMeValue}
                        onCheckedChange={(checked) =>
                          setLoginValue('rememberMe', Boolean(checked))
                        }
                        disabled={isSubmitting}
                        className="border-slate-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label
                        htmlFor="rememberMe"
                        className="text-xs text-slate-400 cursor-pointer font-normal select-none"
                      >
                        Remember my email on this device
                      </Label>
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-col space-y-3.5 p-5 sm:p-6 pt-0 sm:pt-0">
                    <Button
                      type="submit"
                      className="w-full font-semibold shadow-lg shadow-primary/25 h-10 text-sm"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Signing In...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Sign In
                        </>
                      )}
                    </Button>

                    <p className="text-center text-xs text-slate-400">
                      Don&apos;t have an account yet?{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('signup')}
                        className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        Create one now <ArrowRight className="h-3 w-3" />
                      </button>
                    </p>
                  </CardFooter>
                </form>
              </>
            )}

            {/* =================================================================== */}
            {/* TAB 2: SIGN UP FORM                                                 */}
            {/* =================================================================== */}
            {activeTab === 'signup' && (
              <>
                <CardHeader className="space-y-1 p-5 sm:p-6 pb-2 sm:pb-3">
                  <CardTitle className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Create Your Account
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-400">
                    Register with your mobile phone so schools can link your role
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handleSignUpSubmit(onRegister)}>
                  <CardContent className="space-y-3 p-5 sm:p-6 pt-2 sm:pt-3">
                    {/* Name Fields (First Name & Last Name) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <Label htmlFor="reg-first-name" className="text-xs font-semibold text-slate-200">
                          First Name <span className="text-primary">*</span>
                        </Label>
                        <Input
                          id="reg-first-name"
                          placeholder="e.g. Ramesh"
                          className={`bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 h-9 text-xs sm:text-sm ${
                            signUpErrors.first_name ? 'border-destructive focus-visible:ring-destructive' : ''
                          }`}
                          disabled={isSubmitting}
                          {...registerSignUp('first_name')}
                        />
                        {signUpErrors.first_name && (
                          <p className="text-[11px] text-rose-400 font-medium">
                            {signUpErrors.first_name.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="reg-last-name" className="text-xs font-semibold text-slate-200">
                          Last Name <span className="text-primary">*</span>
                        </Label>
                        <Input
                          id="reg-last-name"
                          placeholder="e.g. Sharma"
                          className={`bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 h-9 text-xs sm:text-sm ${
                            signUpErrors.last_name ? 'border-destructive focus-visible:ring-destructive' : ''
                          }`}
                          disabled={isSubmitting}
                          {...registerSignUp('last_name')}
                        />
                        {signUpErrors.last_name && (
                          <p className="text-[11px] text-rose-400 font-medium">
                            {signUpErrors.last_name.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Middle Name (Optional) */}
                    <div className="space-y-1">
                      <Label htmlFor="reg-middle-name" className="text-xs font-semibold text-slate-300">
                        Middle Name <span className="text-slate-500 font-normal">(Optional)</span>
                      </Label>
                      <Input
                        id="reg-middle-name"
                        placeholder="e.g. Bahadur"
                        className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 h-9 text-xs sm:text-sm"
                        disabled={isSubmitting}
                        {...registerSignUp('middle_name')}
                      />
                    </div>

                    {/* Mobile Phone Number */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="reg-phone" className="text-xs font-semibold text-slate-200">
                          Mobile Phone <span className="text-primary">*</span>
                        </Label>
                        <span className="text-[10px] text-slate-400">10-digit Nepali Mobile</span>
                      </div>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 pointer-events-none">
                          <Smartphone className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium text-slate-400 border-r border-slate-700 pr-1.5">+977</span>
                        </div>
                        <Input
                          id="reg-phone"
                          type="tel"
                          placeholder="98XXXXXXXX"
                          className={`pl-20 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 h-9 text-xs sm:text-sm ${
                            signUpErrors.phone ? 'border-destructive focus-visible:ring-destructive' : ''
                          }`}
                          disabled={isSubmitting}
                          {...registerSignUp('phone')}
                        />
                      </div>
                      {signUpErrors.phone ? (
                        <p className="text-[11px] text-rose-400 font-medium">
                          {signUpErrors.phone.message}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400">
                          Admins search this phone number to link your Teacher or Parent role.
                        </p>
                      )}
                    </div>

                    {/* Email Address */}
                    <div className="space-y-1">
                      <Label htmlFor="reg-email" className="text-xs font-semibold text-slate-200">
                        Email Address <span className="text-primary">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="name@example.com"
                          className={`pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 h-9 text-xs sm:text-sm ${
                            signUpErrors.email ? 'border-destructive focus-visible:ring-destructive' : ''
                          }`}
                          disabled={isSubmitting}
                          {...registerSignUp('email')}
                        />
                      </div>
                      {signUpErrors.email && (
                        <p className="text-[11px] text-rose-400 font-medium">
                          {signUpErrors.email.message}
                        </p>
                      )}
                    </div>

                    {/* Password & Confirm Password (Grid) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Password */}
                      <div className="space-y-1">
                        <Label htmlFor="reg-password" className="text-xs font-semibold text-slate-200">
                          Password <span className="text-primary">*</span>
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                          <Input
                            id="reg-password"
                            type={showRegisterPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className={`pl-8 pr-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 h-9 text-xs sm:text-sm ${
                              signUpErrors.password ? 'border-destructive focus-visible:ring-destructive' : ''
                            }`}
                            disabled={isSubmitting}
                            {...registerSignUp('password')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                            className="absolute right-0 top-0 bottom-0 px-2.5 flex items-center justify-center text-slate-400 hover:text-white transition-colors focus:outline-none"
                            tabIndex={-1}
                          >
                            {showRegisterPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        {signUpErrors.password && (
                          <p className="text-[10px] text-rose-400 font-medium">
                            {signUpErrors.password.message}
                          </p>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div className="space-y-1">
                        <Label htmlFor="reg-confirm-password" className="text-xs font-semibold text-slate-200">
                          Confirm Password <span className="text-primary">*</span>
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                          <Input
                            id="reg-confirm-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className={`pl-8 pr-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 h-9 text-xs sm:text-sm ${
                              signUpErrors.confirm_password ? 'border-destructive focus-visible:ring-destructive' : ''
                            }`}
                            disabled={isSubmitting}
                            {...registerSignUp('confirm_password')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-0 top-0 bottom-0 px-2.5 flex items-center justify-center text-slate-400 hover:text-white transition-colors focus:outline-none"
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        {signUpErrors.confirm_password && (
                          <p className="text-[10px] text-rose-400 font-medium">
                            {signUpErrors.confirm_password.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-col space-y-3.5 p-5 sm:p-6 pt-0 sm:pt-0">
                    <Button
                      type="submit"
                      className="w-full font-semibold shadow-lg shadow-primary/25 h-10 text-sm"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Create Account
                        </>
                      )}
                    </Button>

                    <p className="text-center text-xs text-slate-400">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('signin')}
                        className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        Sign in here <ArrowRight className="h-3 w-3" />
                      </button>
                    </p>
                  </CardFooter>
                </form>
              </>
            )}
          </Card>

          {/* Security Note Footer */}
          <div className="text-center text-[11px] text-slate-400 space-y-1">
            <p className="flex items-center justify-center gap-1.5">
              <School className="h-3.5 w-3.5 text-slate-400" />
              <span>Schools Up Pro • Multi-Tenant Educational Platform</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
