import React, { useState, useMemo } from 'react';
import { useAuth } from '@/auth/useAuth';
import { useTeacherStudentsAndParents } from '../hooks';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  Phone,
  Mail,
  UserCheck,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Filter,
  Link2,
  HeartHandshake,
  Star,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { ParentStudentLinkDialog } from '@/features/members/components/ParentStudentLinkDialog';
import { useQueryClient } from '@tanstack/react-query';
import { TEACHER_STUDENTS_PARENTS_KEY } from '../hooks';
import type { TeacherStudentParentItem } from '../types';

export const TeacherParentDirectoryPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const queryClient = useQueryClient();

  // Filters
  const [selectedClassKey, setSelectedClassKey] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [linkFilter, setLinkFilter] = useState<'ALL' | 'LINKED' | 'UNLINKED'>('ALL');

  // Copied state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Link Dialog state
  const [linkingStudent, setLinkingStudent] = useState<{
    id: string;
    name: string;
    className?: string;
    sectionName?: string;
  } | null>(null);

  // Parse class/section from selectedClassKey
  const { classId, sectionId } = useMemo(() => {
    if (selectedClassKey === 'ALL') return { classId: undefined, sectionId: undefined };
    const [cId, sId] = selectedClassKey.split('|');
    return { classId: cId || undefined, sectionId: sId && sId !== 'null' ? sId : undefined };
  }, [selectedClassKey]);

  const { data, isLoading, isError, refetch } = useTeacherStudentsAndParents(activeTenantId, {
    class_id: classId,
    section_id: sectionId,
    search: searchQuery || undefined,
  });

  const handleCopy = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} Copied`, {
      description: `Copied "${text}" to clipboard.`,
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    let list = data.students;

    if (linkFilter === 'LINKED') {
      list = list.filter((s) => !!s.parent);
    } else if (linkFilter === 'UNLINKED') {
      list = list.filter((s) => !s.parent);
    }

    return list;
  }, [data?.students, linkFilter]);

  if (!activeTenantId) {
    return <TenantRequiredState featureName="Student & Parent Directory" />;
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Student & Parent Directory
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Official directory of students in your assigned classes and their verified parents / guardians.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2 cursor-pointer text-xs"
          >
            Refresh Directory
          </Button>
        </div>
      </div>

      {/* KPI Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-card border-border/70 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Enrolled</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {isLoading ? '...' : data?.total_students ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Students in taught classes</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Linked Parents</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-1 flex items-baseline gap-2">
            <span>{isLoading ? '...' : data?.total_linked_parents ?? 0}</span>
            {data && data.total_students > 0 && (
              <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                {Math.round((data.total_linked_parents / data.total_students) * 100)}%
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Guardians with active profiles</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Pending Links</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-1 flex items-baseline gap-2">
            <span>
              {isLoading
                ? '...'
                : (data?.total_students ?? 0) - (data?.total_linked_parents ?? 0)}
            </span>
            {(data?.total_students ?? 0) > (data?.total_linked_parents ?? 0) && (
              <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200">
                Action Required
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Students needing guardian linkage</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Classes Taught</span>
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {isLoading ? '...' : data?.assigned_classes.length ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Active assigned class sections</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-card border-border/70 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, parent name, or phone..."
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Class/Section Dropdown */}
            <select
              value={selectedClassKey}
              onChange={(e) => setSelectedClassKey(e.target.value)}
              className="h-9 px-3 rounded-lg text-xs font-medium bg-background border border-input text-foreground focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="ALL">All Assigned Classes</option>
              {data?.assigned_classes.map((cls) => {
                const key = `${cls.class_id}|${cls.section_id || 'null'}`;
                const label = `${cls.class_name}${cls.section_name ? ` · Section ${cls.section_name}` : ''}${
                  cls.is_class_teacher ? ' (Class Teacher)' : ''
                }`;
                return (
                  <option key={key} value={key}>
                    {label}
                  </option>
                );
              })}
            </select>

            {/* Linkage Status Filter Pills */}
            <div className="flex items-center p-0.5 bg-muted/60 rounded-lg border border-border/40 text-xs">
              <button
                type="button"
                onClick={() => setLinkFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  linkFilter === 'ALL'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setLinkFilter('LINKED')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  linkFilter === 'LINKED'
                    ? 'bg-background text-emerald-700 shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Linked
              </button>
              <button
                type="button"
                onClick={() => setLinkFilter('UNLINKED')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  linkFilter === 'UNLINKED'
                    ? 'bg-background text-amber-700 shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Unlinked
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Directory Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading student and parent directory...</p>
        </div>
      ) : isError ? (
        <Card className="p-8 text-center space-y-3 border-destructive/20 bg-destructive/5">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm font-bold">Failed to load directory</p>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Try Again
          </Button>
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card className="p-12 text-center space-y-3 border-dashed">
          <Users className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
          <h3 className="text-base font-bold text-foreground">No students match current filter</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try clearing your search query or adjusting the class and linkage filters above.
          </p>
          {(searchQuery || selectedClassKey !== 'ALL' || linkFilter !== 'ALL') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedClassKey('ALL');
                setLinkFilter('ALL');
              }}
              className="text-xs cursor-pointer"
            >
              Reset All Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="bg-card rounded-xl border border-border/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class & Section</th>
                  <th className="py-3 px-4">Linked Parent / Guardian</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Contact Email</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredStudents.map((item: TeacherStudentParentItem) => {
                  const hasParent = !!item.parent;
                  return (
                    <tr key={item.student_id} className="hover:bg-muted/20 transition-colors">
                      {/* Student */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center border border-primary/20 shrink-0">
                            {item.student_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-xs leading-tight">
                              {item.student_name}
                            </p>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ID: {item.student_id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Class & Section */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-foreground">{item.class_name}</span>
                        {item.section_name && (
                          <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 font-medium">
                            Sec {item.section_name}
                          </Badge>
                        )}
                      </td>

                      {/* Linked Parent */}
                      <td className="py-3 px-4">
                        {hasParent ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground text-xs">
                                {item.parent!.name}
                              </span>
                              {item.parent!.is_primary_contact && (
                                <span title="Primary Contact">
                                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                </span>
                              )}
                            </div>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/30">
                              {item.parent!.relationship_type}
                            </Badge>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-amber-700 bg-amber-50/60 border-amber-200"
                          >
                            No Parent Linked
                          </Badge>
                        )}
                      </td>

                      {/* Contact Phone */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {hasParent && item.parent!.phone ? (
                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${item.parent!.phone}`}
                              className="font-medium text-primary hover:underline flex items-center gap-1 text-xs"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{item.parent!.phone}</span>
                            </a>
                            <button
                              type="button"
                              title="Copy Phone"
                              onClick={() =>
                                handleCopy(
                                  item.parent!.phone!,
                                  'Phone number',
                                  `phone-${item.student_id}`
                                )
                              }
                              className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                            >
                              {copiedKey === `phone-${item.student_id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </td>

                      {/* Contact Email */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {hasParent && item.parent!.email ? (
                          <div className="flex items-center gap-1">
                            <a
                              href={`mailto:${item.parent!.email}`}
                              className="font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs truncate max-w-[160px]"
                              title={item.parent!.email}
                            >
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.parent!.email}</span>
                            </a>
                            <button
                              type="button"
                              title="Copy Email"
                              onClick={() =>
                                handleCopy(
                                  item.parent!.email!,
                                  'Email address',
                                  `email-${item.student_id}`
                                )
                              }
                              className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                            >
                              {copiedKey === `email-${item.student_id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {hasParent ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {item.parent!.phone && (
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px] font-medium gap-1 text-primary hover:bg-primary/10 cursor-pointer"
                              >
                                <a href={`tel:${item.parent!.phone}`}>
                                  <Phone className="w-3 h-3" />
                                  Call
                                </a>
                              </Button>
                            )}
                            {item.parent!.email && (
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px] font-medium gap-1 cursor-pointer"
                              >
                                <a href={`mailto:${item.parent!.email}`}>
                                  <Mail className="w-3 h-3" />
                                  Email
                                </a>
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setLinkingStudent({
                                id: item.student_id,
                                name: item.student_name,
                                className: item.class_name,
                                sectionName: item.section_name || undefined,
                              })
                            }
                            className="h-7 px-2.5 text-[11px] font-semibold gap-1 text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
                          >
                            <UserPlus className="w-3 h-3" />
                            Link Parent
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="py-2.5 px-4 bg-muted/20 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Showing {filteredStudents.length} of {data?.total_students ?? 0} students</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Role-Based Access Protected
            </span>
          </div>
        </div>
      )}

      {/* Linking Dialog Integration */}
      {linkingStudent && (
        <ParentStudentLinkDialog
          isOpen={!!linkingStudent}
          onClose={() => setLinkingStudent(null)}
          tenantId={activeTenantId}
          student={linkingStudent}
          onSuccess={() => {
            setLinkingStudent(null);
            queryClient.invalidateQueries({
              queryKey: [TEACHER_STUDENTS_PARENTS_KEY, activeTenantId],
            });
            toast.success('Parent Linked', {
              description: `Parent successfully linked to ${linkingStudent.name}.`,
            });
          }}
        />
      )}
    </div>
  );
};
