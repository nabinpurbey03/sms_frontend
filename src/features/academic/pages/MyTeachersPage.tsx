import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { useMyChildrenTeachers } from '../hooks';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  School,
  Sparkles,
  ArrowDown,
  Users,
  Baby,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';

export const MyTeachersPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { data: childrenTeachers = [], isLoading, isError, refetch } = useMyChildrenTeachers(activeTenantId);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} Copied`, {
      description: `Copied "${text}" to clipboard.`,
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const scrollToChild = (studentId: string) => {
    const el = document.getElementById(`child-${studentId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!activeTenantId) {
    return <TenantRequiredState featureName="Teachers Directory" />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your child's class teacher details...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-6 border-destructive/20 bg-destructive/5 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Failed to load class teacher information</h3>
            <p className="text-sm text-muted-foreground">
              An error occurred while fetching class teacher information for your children.
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  if (childrenTeachers.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-8 text-center space-y-4 border-dashed">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold">No Enrolled Children Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your parent account is not currently linked to any enrolled students in this school.
              Please contact the school office to link your student profile.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Navigation & Status Actions */}
      <div className="flex justify-end items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" asChild className="text-xs font-medium gap-1.5">
          <Link to="/academic/my-children">
            <Baby className="w-3.5 h-3.5 text-primary" />
            <span>My Children</span>
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="text-xs font-medium gap-1.5">
          <Link to="/academic/report-cards">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Report Cards</span>
          </Link>
        </Button>
        <Badge
          variant="outline"
          className="px-3 py-1 text-xs font-semibold gap-1.5 bg-primary/5 text-primary border-primary/20"
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>
            {childrenTeachers.length} {childrenTeachers.length === 1 ? 'Class Teacher' : 'Class Teachers'}
          </span>
        </Badge>
      </div>

      {/* Quick Jump Bar for multiple children - wraps naturally, zero horizontal scroll */}
      {childrenTeachers.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/40 rounded-xl border border-border/50">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 shrink-0 mr-1">
            <ArrowDown className="w-3.5 h-3.5 text-primary" />
            Jump to child:
          </span>
          {childrenTeachers.map((child) => (
            <button
              key={child.student_id}
              type="button"
              onClick={() => scrollToChild(child.student_id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-background hover:bg-muted text-foreground border border-border/60 shadow-2xs transition-all cursor-pointer hover:border-primary/40 active:scale-98"
            >
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>{child.student_name}</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                ({child.class_name}{child.section_name ? ` · Sec ${child.section_name}` : ''})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Stacked Children & Teachers List */}
      <div className="space-y-8">
        {childrenTeachers.map((child, index) => {
          const classTeacher = child.class_teacher;
          return (
            <div
              key={child.student_id}
              id={`child-${child.student_id}`}
              className="space-y-3 scroll-mt-6"
            >
              {/* Child Profile Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border/70 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20 shrink-0 shadow-2xs">
                    {child.student_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-foreground">
                        {child.student_name}
                      </h2>
                      {child.relationship_type && (
                        <Badge variant="outline" className="text-[11px] font-medium bg-muted/40">
                          {child.relationship_type}
                        </Badge>
                      )}
                      {childrenTeachers.length > 1 && (
                        <span className="text-xs text-muted-foreground font-medium">
                          • Child #{index + 1}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enrolled in <strong className="text-foreground">{child.class_name}</strong>
                      {child.section_name ? (
                        <> · Section <strong className="text-foreground">{child.section_name}</strong></>
                      ) : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-full border border-border/40">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Verified Enrollment</span>
                </div>
              </div>

              {/* Class Teacher Information Card */}
              <Card className="overflow-hidden border-border/80 shadow-xs bg-linear-to-br from-card via-card to-primary/5">
                <CardHeader className="pb-4 border-b border-border/40">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-foreground">
                          Designated Class Teacher
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Primary academic proctor, attendance coordinator, and student mentor for {child.student_name}.
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-xs px-2.5 py-0.5 font-semibold shadow-2xs shrink-0">
                      Class Teacher
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 pb-6 space-y-6">
                  {classTeacher ? (
                    <div className="space-y-6">
                      {/* Profile Overview */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-background/80 border border-border/50">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-full bg-emerald-600/10 text-emerald-700 font-bold flex items-center justify-center text-base border border-emerald-600/20 shrink-0">
                            {classTeacher.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold tracking-tight text-foreground">
                              {classTeacher.name}
                            </h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <School className="w-3.5 h-3.5 text-primary" />
                              <span>
                                Class Teacher of {child.class_name}
                                {child.section_name ? ` · Section ${child.section_name}` : ''}
                              </span>
                            </p>
                          </div>
                        </div>

                        <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1 self-start sm:self-auto">
                          <Sparkles className="w-3 h-3 text-amber-500 mr-1" />
                          Official Point of Contact
                        </Badge>
                      </div>

                      {/* Contact Channels Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Phone Card */}
                        <div className="p-4 rounded-xl border border-border/70 bg-card shadow-2xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-primary" />
                              Direct Phone
                            </span>
                            {classTeacher.phone && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(
                                    classTeacher.phone!,
                                    'Phone number',
                                    `phone-${child.student_id}-${classTeacher.teacher_id}`
                                  )
                                }
                                className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                                title="Copy phone"
                              >
                                {copiedKey === `phone-${child.student_id}-${classTeacher.teacher_id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>

                          {classTeacher.phone ? (
                            <div className="space-y-2">
                              <p className="text-base font-bold font-mono text-foreground">
                                {classTeacher.phone}
                              </p>
                              <Button
                                asChild
                                size="sm"
                                className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer"
                              >
                                <a href={`tel:${classTeacher.phone}`}>
                                  <Phone className="w-3.5 h-3.5" />
                                  Call Teacher
                                </a>
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic py-2">
                              Phone contact not listed by the school.
                            </p>
                          )}
                        </div>

                        {/* Email Card */}
                        <div className="p-4 rounded-xl border border-border/70 bg-card shadow-2xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-primary" />
                              Email Address
                            </span>
                            {classTeacher.email && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(
                                    classTeacher.email!,
                                    'Email address',
                                    `email-${child.student_id}-${classTeacher.teacher_id}`
                                  )
                                }
                                className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                                title="Copy email"
                              >
                                {copiedKey === `email-${child.student_id}-${classTeacher.teacher_id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>

                          {classTeacher.email ? (
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-foreground truncate" title={classTeacher.email}>
                                {classTeacher.email}
                              </p>
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="w-full gap-2 font-semibold cursor-pointer"
                              >
                                <a href={`mailto:${classTeacher.email}`}>
                                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                  Send Email
                                </a>
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic py-2">
                              Email address not listed by the school.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center space-y-2 text-muted-foreground">
                      <GraduationCap className="w-10 h-10 mx-auto opacity-40 text-muted-foreground" />
                      <p className="text-base font-bold text-foreground">No Class Teacher Assigned Yet</p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        The school administrative office has not yet assigned a class teacher to{' '}
                        {child.class_name}
                        {child.section_name ? ` (Section ${child.section_name})` : ''}.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Communication Guidance Notice */}
      <Card className="p-4 bg-muted/30 border-border/50 text-xs text-muted-foreground flex items-start gap-3">
        <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground">
            Teacher Consultation & Communication Notice
          </p>
          <p>
            The Class Teacher is your dedicated point of contact for daily attendance, academic progress, behavioral concerns, and general guidance. For school fee receipts or admissions, please contact the main administrative office.
          </p>
        </div>
      </Card>
    </div>
  );
};
