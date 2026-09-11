import sys

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Desktop Mapping
desktop_old = '''        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4 space-y-6">
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
                      className={`flex items-center rounded-xl py-2.5 text-sm transition-all duration-150 ${'''

desktop_new = '''        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4 space-y-8">
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
              <nav className="space-y-0.5">
                {items.map((item) => {
                  const isActive = isNavItemActive(location.pathname, item.href);
                  const Icon = item.icon;
                  const linkContent = (
                    <Link
                      to={item.href}
                      className={`flex items-center rounded-xl py-2 text-sm transition-all duration-150 ${'''

content = content.replace(desktop_old, desktop_new)


# 2. Update Mobile Mapping
mobile_old = '''              {/* Mobile Navigation Items */}
              <nav className="space-y-1">
                {visibleNavItems.map((item) => {
                  const isActive = isNavItemActive(location.pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent/80'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!isDesktopSidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </nav>'''

mobile_new = '''              {/* Mobile Navigation Items */}
              <div className="space-y-8">
                {Object.entries(groupedNavItems).map(([category, items]) => (
                  <div key={category}>
                    <p className="px-3 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                      {category}
                    </p>
                    <nav className="space-y-0.5">
                      {items.map((item) => {
                        const isActive = isNavItemActive(location.pathname, item.href);
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent/80'
                            }`}
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </nav>
                  </div>
                ))}
              </div>'''

content = content.replace(mobile_old, mobile_new)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
