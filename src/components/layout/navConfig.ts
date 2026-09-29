import {
  LayoutDashboard,
  Building2,
  UsersRound,
  Shield,
  Users,
  Settings,
  HeartHandshake,
  BookOpen,
  Layers,
  UserCheck,
  TrendingUp,
  CalendarCheck,
  FileSpreadsheet,
  GraduationCap,
  Baby,
  Award,
  type LucideIcon,
} from 'lucide-react';
import type { PermissionKey } from '@/config/permissions';

export type NavCategory =
  | 'Overview'
  | 'Administration'
  | 'Academics'
  | 'Attendance'
  | 'Examinations'
  | 'Teacher Desk'
  | 'Parent Portal';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  show: boolean;
  category: NavCategory;
}

export interface NavPermissionsContext {
  isSuperAdmin: boolean;
  isTeacher: boolean;
  isParent: boolean;
  can: (permission: PermissionKey) => boolean;
  activeTenantId: string | null;
}

export const getNavItems = (ctx: NavPermissionsContext): NavItem[] => [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview of your school activities and metrics.',
    show: true,
    category: 'Overview',
  },
  {
    label: 'Tenant Management',
    href: '/tenants',
    icon: Building2,
    description: 'Manage school campuses and platform settings.',
    show: ctx.isSuperAdmin,
    category: 'Administration',
  },
  {
    label: 'Platform Users',
    href: '/platform-users',
    icon: UsersRound,
    description: 'Manage all global platform user accounts.',
    show: ctx.isSuperAdmin,
    category: 'Administration',
  },
  {
    label: 'Audit Logs',
    href: '/audit-logs',
    icon: Shield,
    description: 'View system audit trails.',
    show: ctx.isSuperAdmin,
    category: 'Administration',
  },
  {
    label: 'School Members',
    href: '/members',
    icon: Users,
    description: 'Manage students, teachers, and administrators.',
    show: ctx.can('CREATE_TEACHER_PARENT'),
    category: 'Administration',
  },
  {
    label: 'School Settings',
    href: '/school-settings',
    icon: Settings,
    description: 'Configure academic sessions, weekly days, calendar, and school settings.',
    show: ctx.can('MANAGE_TENANT_SETTINGS') || ctx.isSuperAdmin,
    category: 'Administration',
  },
  {
    label: 'Parent-Student Links',
    href: '/academic/parent-links',
    icon: HeartHandshake,
    description: 'Connect parents to their children.',
    show: ctx.can('LINK_PARENTS'),
    category: 'Administration',
  },
  {
    label: 'Classes & Sections',
    href: '/academic/classes',
    icon: BookOpen,
    description: 'Organize grade levels and physical sections.',
    show: ctx.can('VIEW_CLASSES_SUBJECTS'),
    category: 'Academics',
  },
  {
    label: 'Subjects',
    href: '/academic/subjects',
    icon: Layers,
    description: 'Manage curriculum subjects and codes.',
    show: ctx.can('VIEW_CLASSES_SUBJECTS'),
    category: 'Academics',
  },
  {
    label: 'Students Roster',
    href: '/academic/students',
    icon: Users,
    description: 'Directory of all enrolled students.',
    show: ctx.can('VIEW_SECTIONS_STUDENTS'),
    category: 'Academics',
  },
  {
    label: 'Teacher Assignments',
    href: '/academic/assignments',
    icon: UserCheck,
    description: 'Assign teachers to specific classes and subjects.',
    show: ctx.can('ASSIGN_TEACHERS'),
    category: 'Academics',
  },
  {
    label: 'Analytics',
    href: '/academic/analytics',
    icon: TrendingUp,
    description: 'Student retention, progression, and cohort analytics.',
    show: ctx.isSuperAdmin || ctx.can('MANAGE_TENANT_SETTINGS') || ctx.can('VIEW_TENANT_SETTINGS'),
    category: 'Academics',
  },
  {
    label: 'Mark Attendance',
    href: '/attendance/mark',
    icon: CalendarCheck,
    description: 'Record daily student attendance.',
    show: ctx.can('MARK_ATTENDANCE') && !ctx.isParent,
    category: 'Attendance',
  },
  {
    label: 'Attendance Reports',
    href: '/attendance/reports',
    icon: FileSpreadsheet,
    description: 'View and export attendance records.',
    show: ctx.can('VIEW_ATTENDANCE_REPORTS') && !ctx.isParent && !ctx.isTeacher,
    category: 'Attendance',
  },
  {
    label: 'Examinations',
    href: '/examination/exams',
    icon: GraduationCap,
    description: 'Create and manage academic assessments.',
    show: ctx.can('MANAGE_EXAMS') || ctx.can('ENTER_EXAM_SCORES'),
    category: 'Examinations',
  },
  {
    label: 'My Teaching Duties',
    href: '/academic/my-assignments',
    icon: BookOpen,
    description: 'View your assigned classes and subjects.',
    show: ctx.isTeacher,
    category: 'Teacher Desk',
  },
  {
    label: 'Student & Parent Directory',
    href: '/academic/parent-directory',
    icon: Users,
    description: 'Contact information for your students.',
    show: ctx.isTeacher,
    category: 'Teacher Desk',
  },
  {
    label: 'My Children',
    href: '/academic/my-children',
    icon: Baby,
    description: 'View your linked children profiles.',
    show: ctx.isParent,
    category: 'Parent Portal',
  },
  {
    label: "My Children's Teacher",
    href: '/academic/my-teachers',
    icon: GraduationCap,
    description: "Connect with your children's teachers.",
    show: ctx.isParent,
    category: 'Parent Portal',
  },
  {
    label: 'Report Cards',
    href: '/academic/report-cards',
    icon: Award,
    description: 'View student academic reports and grades.',
    show: ctx.isParent,
    category: 'Parent Portal',
  },
];

export const isNavItemActive = (currentPath: string, navHref: string): boolean => {
  return currentPath === navHref || currentPath.startsWith(`${navHref}/`);
};

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: LucideIcon;
}

export const getBreadcrumbs = (pathname: string, navItems: NavItem[]): BreadcrumbItem[] => {
  const active = navItems.find((n) => isNavItemActive(pathname, n.href));
  if (!active) return [{ label: 'Dashboard', href: '/dashboard' }];

  const crumbs: BreadcrumbItem[] = [
    { label: active.category },
    { label: active.label, href: active.href, icon: active.icon },
  ];

  if (pathname.includes('/classes/') && pathname.includes('/sections')) {
    crumbs.push({ label: 'Sections' });
  } else if (pathname.includes('/create')) {
    crumbs.push({ label: 'Create New' });
  } else if (pathname.includes('/edit')) {
    crumbs.push({ label: 'Edit' });
  }

  return crumbs;
};
