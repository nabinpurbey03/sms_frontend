import React from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CalendarCheck,
  Users,
  Award,
  FileSpreadsheet,
  PhoneCall,
  ArrowRight,
  Zap,
  GraduationCap,
} from 'lucide-react';
import type { TeacherAssignmentResponse } from '@/features/academic/types';

export interface TeacherQuickShortcutsBarProps {
  primaryDuty: TeacherAssignmentResponse | null;
}

export const TeacherQuickShortcutsBar: React.FC<TeacherQuickShortcutsBarProps> = ({
  primaryDuty,
}) => {
  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Quick Actions & Shortcuts
          </h2>
          <p className="text-xs text-muted-foreground">
            Direct shortcuts to your daily classroom operations and academic tools
          </p>
        </div>
      </div>

      {/* Shortcuts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Mark Daily Attendance */}
        <Card className="group border-border/60 hover:border-purple-500/50 transition-all rounded-xl flex flex-col justify-between shadow-xs">
          <CardHeader className="p-4 pb-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg group-hover:scale-105 transition-transform">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">
                Mark Daily Attendance
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1 min-h-[32px] leading-relaxed">
                Take roll call for your assigned classroom section
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-semibold h-8 group-hover:border-purple-500/40 cursor-pointer"
              asChild
            >
              <Link
                to="/attendance/mark"
                search={
                  primaryDuty
                    ? ({
                        classId: primaryDuty.class_id,
                        sectionId: primaryDuty.section_id || undefined,
                      } as any)
                    : undefined
                }
              >
                Take Attendance
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* 2. My Classroom Roster */}
        <Card className="group border-border/60 hover:border-emerald-500/50 transition-all rounded-xl flex flex-col justify-between shadow-xs">
          <CardHeader className="p-4 pb-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-105 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">
                My Classroom Roster
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1 min-h-[32px] leading-relaxed">
                Inspect enrolled pupils, attendance records, and parent links
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-semibold h-8 group-hover:border-emerald-500/40 cursor-pointer"
              asChild
            >
              {primaryDuty?.class_id ? (
                <Link
                  to="/academic/classes/$classId"
                  params={{ classId: primaryDuty.class_id }}
                >
                  View Roster
                </Link>
              ) : (
                <Link to="/academic/classes">View Classes</Link>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 3. Examination Scores */}
        <Card className="group border-border/60 hover:border-amber-500/50 transition-all rounded-xl flex flex-col justify-between shadow-xs">
          <CardHeader className="p-4 pb-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg group-hover:scale-105 transition-transform">
                <Award className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">
                Examination Scores
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1 min-h-[32px] leading-relaxed">
                Enter and review exam marks for your teaching subjects
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-semibold h-8 group-hover:border-amber-500/40 cursor-pointer"
              asChild
            >
              <Link to="/examination/exams">Enter Exam Marks</Link>
            </Button>
          </CardContent>
        </Card>

        {/* 4. Examinations & Grading */}
        <Card className="group border-border/60 hover:border-indigo-500/50 transition-all rounded-xl flex flex-col justify-between shadow-xs">
          <CardHeader className="p-4 pb-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:scale-105 transition-transform">
                <GraduationCap className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">
                Examinations & Grading
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1 min-h-[32px] leading-relaxed">
                Enter student subject scores and manage exam duties
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-semibold h-8 group-hover:border-indigo-500/40 cursor-pointer"
              asChild
            >
              <Link to="/examination/exams">Grade Exams</Link>
            </Button>
          </CardContent>
        </Card>

        {/* 5. Parent Directory */}
        <Card className="group border-border/60 hover:border-rose-500/50 transition-all rounded-xl flex flex-col justify-between shadow-xs">
          <CardHeader className="p-4 pb-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg group-hover:scale-105 transition-transform">
                <PhoneCall className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-rose-600 dark:group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">
                Parent Directory
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1 min-h-[32px] leading-relaxed">
                Search parent accounts by phone and link guardians
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-semibold h-8 group-hover:border-rose-500/40 cursor-pointer"
              asChild
            >
              <Link to="/academic/parent-directory">Open Directory</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
