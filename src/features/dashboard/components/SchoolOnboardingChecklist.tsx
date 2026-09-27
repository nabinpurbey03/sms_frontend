import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Circle,
  Calendar,
  BookOpen,
  Users,
  UserCheck,
  CalendarDays,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SchoolOnboardingChecklistProps {
  hasAcademicYear: boolean;
  hasClasses: boolean;
  hasStudents: boolean;
  hasTeacherAssignments: boolean;
  hasCalendarEvents: boolean;
}

export const SchoolOnboardingChecklist: React.FC<SchoolOnboardingChecklistProps> = ({
  hasAcademicYear,
  hasClasses,
  hasStudents,
  hasTeacherAssignments,
  hasCalendarEvents,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const steps = [
    {
      id: 'sessions',
      title: 'Configure Academic Session',
      description: 'Define your current school year, terms, and session start/end dates.',
      isCompleted: hasAcademicYear,
      href: '/school-settings',
      search: { tab: 'sessions' },
      icon: Calendar,
      actionLabel: 'Set Session',
    },
    {
      id: 'classes',
      title: 'Create Classes & Sections',
      description: 'Set up grade levels and classroom sections (e.g., Grade 10 - Section A).',
      isCompleted: hasClasses,
      href: '/academic/classes',
      icon: BookOpen,
      actionLabel: 'Add Classes',
    },
    {
      id: 'students',
      title: 'Enroll Students & Staff',
      description: 'Add teachers, office staff, and register student rosters.',
      isCompleted: hasStudents,
      href: '/members',
      icon: Users,
      actionLabel: 'Add Members',
    },
    {
      id: 'assignments',
      title: 'Assign Class Teachers & Subjects',
      description: 'Designate class teachers for attendance and link subject faculties.',
      isCompleted: hasTeacherAssignments,
      href: '/academic/assignments',
      icon: UserCheck,
      actionLabel: 'Assign Teachers',
    },
    {
      id: 'calendar',
      title: 'Schedule Academic Calendar & Holidays',
      description: 'Publish official holidays, exam dates, vacation periods, and events.',
      isCompleted: hasCalendarEvents,
      href: '/academic-calendar',
      icon: CalendarDays,
      actionLabel: 'Plan Calendar',
    },
  ];

  const completedCount = steps.filter((s) => s.isCompleted).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // If all steps are completed, don't show the onboarding checklist
  if (completedCount === steps.length) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm overflow-hidden rounded-2xl">
      <CardHeader className="p-4 sm:p-5 border-b border-border/40 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1 rounded-md bg-primary/10 text-primary">
                <Sparkles className="w-4 h-4" />
              </span>
              <CardTitle className="text-base sm:text-lg font-bold">
                School Setup Checklist
              </CardTitle>
              <Badge variant="outline" className="text-xs font-semibold bg-background">
                {completedCount} of {steps.length} Complete ({progressPercent}%)
              </Badge>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Follow these recommended steps to prepare your school portal for daily operations.
            </CardDescription>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
            aria-label={isCollapsed ? 'Expand setup checklist' : 'Collapse setup checklist'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted/60 h-2 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="p-3 sm:p-4 divide-y divide-border/40">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {step.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p
                      className={`text-sm font-semibold flex items-center gap-2 ${
                        step.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
                      }`}
                    >
                      <span className="text-xs text-muted-foreground font-mono">
                        {idx + 1}.
                      </span>
                      <span>{step.title}</span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate sm:whitespace-normal">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 self-end sm:self-center pl-8 sm:pl-0">
                  {step.isCompleted ? (
                    <Badge variant="outline" className="text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                      Completed
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="h-8 text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/60"
                    >
                      <Link to={step.href as any} search={step.search as any}>
                        <span>{step.actionLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
};
