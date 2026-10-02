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
  WalletCards,
  Coins,
  FileText,
  CreditCard,
  Receipt,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { PermissionKey } from '@/config/permissions';

export type NavCategory =
  | 'Overview'
  | 'Administration'
  | 'Finance'
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
  activeRole?: string | null;
}

export const getNavItems = (ctx: NavPermissionsContext): NavItem[] => [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview of your school activities and metrics.',
    show: ctx.activeRole !== 'ACCOUNTANT',
    category: 'Overview',
  },
  {
    label: 'Dashboard',
    href: '/finance',
    icon: LayoutDashboard,
    description: 'Financial performance, fee collections, and cash flow intelligence.',
    show: ctx.activeRole === 'ACCOUNTANT',
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
    show:
      (ctx.isSuperAdmin || ctx.can('MANAGE_TENANT_SETTINGS') || ctx.can('VIEW_TENANT_SETTINGS')) &&
      ctx.activeRole !== 'ACCOUNTANT',
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
  {
    label: "My Children's Fees",
    href: '/finance/my-children-fees',
    icon: Coins,
    description: "View children's fee balances and invoices.",
    show: ctx.isParent,
    category: 'Parent Portal',
  },
  {
    label: 'Finance Dashboard',
    href: '/finance',
    icon: WalletCards,
    description: 'Fee collection summary, cash flow, and dues.',
    show: ctx.can('VIEW_FINANCE') && ctx.activeRole !== 'ACCOUNTANT' && !ctx.isParent,
    category: 'Finance',
  },
  {
    label: 'Fee Structures',
    href: '/finance/structures',
    icon: Coins,
    description: 'Configure class-wise monthly tuition and annual fees.',
    show: ctx.can('VIEW_FINANCE') && !ctx.isParent,
    category: 'Finance',
  },
  {
    label: 'Bills & Invoices',
    href: '/finance/bills',
    icon: FileText,
    description: 'Generate, track, and manage student fee bills.',
    show: ctx.can('VIEW_FINANCE') && !ctx.isParent,
    category: 'Finance',
  },
  {
    label: 'Batch Invoicing',
    href: '/finance/batch-billing',
    icon: Sparkles,
    description: 'Quarterly batch invoicing engine with window guard.',
    show: ctx.can('VIEW_FINANCE') && !ctx.isParent,
    category: 'Finance',
  },
  {
    label: 'Collect Payment',
    href: '/finance/collect',
    icon: CreditCard,
    description: 'Collect fee payments and issue official receipts.',
    show: ctx.can('VIEW_FINANCE') && !ctx.isParent,
    category: 'Finance',
  },
  {
    label: 'Payment Transactions',
    href: '/finance/transactions',
    icon: Receipt,
    description: 'View payment history and print duplicate receipts.',
    show: ctx.can('VIEW_FINANCE') && !ctx.isParent,
    category: 'Finance',
  },
];

export const NAV_CATEGORY_ORDER: Record<NavCategory, number> = {
  Overview: 10,
  Administration: 20,
  Academics: 30,
  Attendance: 40,
  Examinations: 50,
  'Teacher Desk': 60,
  'Parent Portal': 70,
  Finance: 80,
};

export const groupNavItemsByCategory = (navItems: NavItem[]): Record<string, NavItem[]> => {
  const visible = navItems.filter((item) => item.show);
  const groups = visible.reduce<Record<string, NavItem[]>>((acc, item) => {
    const cat = item.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const sortedEntries = Object.entries(groups).sort(([catA], [catB]) => {
    const orderA = NAV_CATEGORY_ORDER[catA as NavCategory] ?? 99;
    const orderB = NAV_CATEGORY_ORDER[catB as NavCategory] ?? 99;
    return orderA - orderB;
  });

  return Object.fromEntries(sortedEntries);
};

export const isNavItemActive = (currentPath: string, navHref: string): boolean => {
  if (navHref === '/dashboard' || navHref === '/finance') {
    return currentPath === navHref;
  }
  return currentPath === navHref || currentPath.startsWith(`${navHref}/`);
};

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: LucideIcon;
}

export const getBreadcrumbs = (pathname: string, navItems: NavItem[]): BreadcrumbItem[] => {
  const visibleItems = navItems.filter((n) => n.show);
  const active =
    visibleItems.find((n) => n.href === pathname) ||
    visibleItems.find((n) => isNavItemActive(pathname, n.href));

  if (!active) {
    const defaultDash = visibleItems.find((n) => n.label === 'Dashboard');
    return [{ label: 'Dashboard', href: defaultDash ? defaultDash.href : '/dashboard' }];
  }

  const crumbs: BreadcrumbItem[] = [
    { label: active.category },
    { label: active.label, href: active.href, icon: active.icon },
  ];

  if (pathname.includes('/classes/') && pathname.includes('/sections')) {
    crumbs.push({ label: 'Sections' });
  } else if (
    pathname.includes('/finance/structures/') &&
    pathname.trim().replace(/\/+$/, '') !== '/finance/structures'
  ) {
    crumbs.push({ label: 'Class Fee Structure' });
  } else if (pathname.includes('/create')) {
    crumbs.push({ label: 'Create New' });
  } else if (pathname.includes('/edit')) {
    crumbs.push({ label: 'Edit' });
  }

  return crumbs;
};
