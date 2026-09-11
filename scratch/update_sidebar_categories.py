import sys
import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add categories to navItems
nav_items_old = '''  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: 'Tenant Management',
      href: '/tenants',
      icon: Building2,
      show: isSuperAdmin,
    },
    {
      label: 'School Members',
      href: '/members',
      icon: Users,
      show: can('CREATE_TEACHER_PARENT'),
    },
    {
      label: 'Classes & Sections',
      href: '/academic/classes',
      icon: BookOpen,
      show: can('VIEW_CLASSES_SUBJECTS'),
    },
    {
      label: 'Students Roster',
      href: '/academic/students',
      icon: Users,
      show: can('VIEW_SECTIONS_STUDENTS'),
    },
    {
      label: 'Subjects',
      href: '/academic/subjects',
      icon: Layers,
      show: can('VIEW_CLASSES_SUBJECTS'),
    },
    {
      label: 'Teacher Assignments',
      href: '/academic/assignments',
      icon: UserCheck,
      show: can('ASSIGN_TEACHERS'),
    },
    {
      label: 'My Teaching Duties',
      href: '/academic/my-assignments',
      icon: BookOpen,
      show: isTeacher,
    },
    {
      label: 'Student & Parent Directory',
      href: '/academic/parent-directory',
      icon: Users,
      show: isTeacher,
    },
    {
      label: 'Parent-Student Links',
      href: '/academic/parent-links',
      icon: HeartHandshake,
      show: can('LINK_PARENTS'),
    },
    {
      label: "My Children's Teacher",
      href: '/academic/my-teachers',
      icon: GraduationCap,
      show: isParent,
    },
    {
      label: 'My Children',
      href: '/academic/my-children',
      icon: Baby,
      show: isParent,
    },
    {
      label: 'Report Cards',
      href: '/academic/report-cards',
      icon: Award,
      show: isParent,
    },
    {
      label: 'Mark Attendance',
      href: '/attendance/mark',
      icon: CalendarCheck,
      show: can('MARK_ATTENDANCE') && !isParent,
    },
    {
      label: 'Attendance Reports',
      href: '/attendance/reports',
      icon: FileSpreadsheet,
      show: can('VIEW_ATTENDANCE_REPORTS') && !isParent,
    },
    {
      label: 'Examinations',
      href: '/examination/exams',
      icon: GraduationCap,
      show: can('MANAGE_EXAMS') || can('ENTER_EXAM_SCORES'),
    },
  ];'''

nav_items_new = '''  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      show: true,
      category: 'Overview',
    },
    {
      label: 'Tenant Management',
      href: '/tenants',
      icon: Building2,
      show: isSuperAdmin,
      category: 'Administration',
    },
    {
      label: 'School Members',
      href: '/members',
      icon: Users,
      show: can('CREATE_TEACHER_PARENT'),
      category: 'Administration',
    },
    {
      label: 'Parent-Student Links',
      href: '/academic/parent-links',
      icon: HeartHandshake,
      show: can('LINK_PARENTS'),
      category: 'Administration',
    },
    {
      label: 'Classes & Sections',
      href: '/academic/classes',
      icon: BookOpen,
      show: can('VIEW_CLASSES_SUBJECTS'),
      category: 'Academics',
    },
    {
      label: 'Subjects',
      href: '/academic/subjects',
      icon: Layers,
      show: can('VIEW_CLASSES_SUBJECTS'),
      category: 'Academics',
    },
    {
      label: 'Students Roster',
      href: '/academic/students',
      icon: Users,
      show: can('VIEW_SECTIONS_STUDENTS'),
      category: 'Academics',
    },
    {
      label: 'Teacher Assignments',
      href: '/academic/assignments',
      icon: UserCheck,
      show: can('ASSIGN_TEACHERS'),
      category: 'Academics',
    },
    {
      label: 'Examinations',
      href: '/examination/exams',
      icon: GraduationCap,
      show: can('MANAGE_EXAMS') || can('ENTER_EXAM_SCORES'),
      category: 'Examinations',
    },
    {
      label: 'Mark Attendance',
      href: '/attendance/mark',
      icon: CalendarCheck,
      show: can('MARK_ATTENDANCE') && !isParent,
      category: 'Attendance',
    },
    {
      label: 'Attendance Reports',
      href: '/attendance/reports',
      icon: FileSpreadsheet,
      show: can('VIEW_ATTENDANCE_REPORTS') && !isParent,
      category: 'Attendance',
    },
    {
      label: 'My Teaching Duties',
      href: '/academic/my-assignments',
      icon: BookOpen,
      show: isTeacher,
      category: 'Teacher Desk',
    },
    {
      label: 'Student & Parent Directory',
      href: '/academic/parent-directory',
      icon: Users,
      show: isTeacher,
      category: 'Teacher Desk',
    },
    {
      label: 'My Children',
      href: '/academic/my-children',
      icon: Baby,
      show: isParent,
      category: 'Parent Portal',
    },
    {
      label: "My Children's Teacher",
      href: '/academic/my-teachers',
      icon: GraduationCap,
      show: isParent,
      category: 'Parent Portal',
    },
    {
      label: 'Report Cards',
      href: '/academic/report-cards',
      icon: Award,
      show: isParent,
      category: 'Parent Portal',
    },
  ];'''

content = content.replace(nav_items_old, nav_items_new)

# 2. Add category grouping logic
old_visible_nav = "  const visibleNavItems = navItems.filter((item) => item.show);"
new_visible_nav = '''  const visibleNavItems = navItems.filter((item) => item.show);

  const groupedNavItems = visibleNavItems.reduce((acc, item) => {
    const cat = item.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, typeof visibleNavItems>);'''

content = content.replace(old_visible_nav, new_visible_nav)

# 3. Replace mapping logic in Desktop Sidebar
desktop_nav_old = '''        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {!isDesktopSidebarCollapsed && (
            <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Main Menu
            </p>
          )}
          <nav className="space-y-1">
            {visibleNavItems.map((item) => {
              const isActive = isNavItemActive(location.pathname, item.href);
              const Icon = item.icon;
              const linkContent = (
                <Link
                  to={item.href}
                  className={`flex items-center rounded-xl py-2.5 text-sm transition-all duration-150 ${
                    isDesktopSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
                  } ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs shadow-primary/20'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground font-medium'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!isDesktopSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );

              return isDesktopSidebarCollapsed ? (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={14} className="font-semibold text-xs py-1.5 px-3">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <React.Fragment key={item.href}>
                  {linkContent}
                </React.Fragment>
              );
            })}
          </nav>
        </div>'''

desktop_nav_new = '''        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {Object.entries(groupedNavItems).map(([category, items]) => (
            <div key={category}>
              {!isDesktopSidebarCollapsed ? (
                <p className="px-3 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                  {category}
                </p>
              ) : (
                <div className="w-full flex justify-center mb-2">
                  <div className="w-6 border-t border-border/50"></div>
                </div>
              )}
              <nav className="space-y-1">
                {items.map((item) => {
                  const isActive = isNavItemActive(location.pathname, item.href);
                  const Icon = item.icon;
                  const linkContent = (
                    <Link
                      to={item.href}
                      className={`flex items-center rounded-xl py-2.5 text-sm transition-all duration-150 ${
                        isDesktopSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
                      } ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-semibold shadow-xs shadow-primary/20'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground font-medium'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!isDesktopSidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );

                  return isDesktopSidebarCollapsed ? (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={14} className="font-semibold text-xs py-1.5 px-3">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <React.Fragment key={item.href}>
                      {linkContent}
                    </React.Fragment>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>'''

content = content.replace(desktop_nav_old, desktop_nav_new)

# 4. Replace mapping logic in Mobile Sidebar
mobile_nav_old = '''            <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 mt-4">
              Main Menu
            </p>
            <nav className="space-y-1">
              {visibleNavItems.map((item) => {
                const isActive = isNavItemActive(location.pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs shadow-primary/20'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground font-medium'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>'''

mobile_nav_new = '''            <div className="mt-2 space-y-6">
              {Object.entries(groupedNavItems).map(([category, items]) => (
                <div key={category}>
                  <p className="px-3 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                    {category}
                  </p>
                  <nav className="space-y-1">
                    {items.map((item) => {
                      const isActive = isNavItemActive(location.pathname, item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
                            isActive
                              ? 'bg-primary text-primary-foreground font-semibold shadow-xs shadow-primary/20'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground font-medium'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              ))}
            </div>'''

content = content.replace(mobile_nav_old, mobile_nav_new)


with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
