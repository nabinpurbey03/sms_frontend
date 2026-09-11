import sys

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add the header to the top of the sidebar
aside_old = '''      <aside
        className={`hidden lg:flex shrink-0 flex-col justify-between bg-card h-screen sticky top-0 z-30 shadow-xs transition-all duration-300 ${
          isDesktopSidebarCollapsed ? 'w-20' : 'w-64 xl:w-70'
        }`}
      >
        {/* Navigation Menu */}'''

aside_new = '''      <aside
        className={`hidden lg:flex shrink-0 flex-col justify-between bg-card h-screen sticky top-0 z-30 shadow-xs transition-all duration-300 ${
          isDesktopSidebarCollapsed ? 'w-20' : 'w-64 xl:w-70'
        }`}
      >
        {/* Sidebar Header: Logo & Toggle */}
        <div className={`flex items-center h-14 shrink-0 px-3 border-b border-border/40 ${isDesktopSidebarCollapsed ? 'justify-center gap-1.5' : 'justify-between'}`}>
          <Link to="/dashboard" className="flex items-center gap-2 focus:outline-none min-w-0" title="Go to Dashboard">
            <div className="flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs overflow-hidden p-0.5 shrink-0">
              <img src="/logo.svg" alt="Schools Up Pro" className="h-full w-full object-contain" />
            </div>
            {!isDesktopSidebarCollapsed && (
              <span className="font-bold tracking-tight text-foreground text-sm truncate">
                Schools Up Pro
              </span>
            )}
          </Link>
          
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors ${isDesktopSidebarCollapsed ? 'shrink-0' : ''}`}
            onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
            aria-label="Toggle Sidebar"
          >
            {isDesktopSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation Menu */}'''

content = content.replace(aside_old, aside_new)

# 2. Remove the toggle button from the bottom profile section
bottom_old = '''        {/* Bottom Left Corner: Profile & Account Menu */}
        <div className="p-3 bg-card/60 shrink-0 flex flex-col gap-2">
          <div className={`flex ${isDesktopSidebarCollapsed ? 'justify-center' : 'justify-end'}`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
              onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
              aria-label="Toggle Sidebar"
            >
              {isDesktopSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <DropdownMenu>'''

bottom_new = '''        {/* Bottom Left Corner: Profile & Account Menu */}
        <div className="p-3 bg-card/60 shrink-0 flex flex-col gap-2 border-t border-border/40">
          <DropdownMenu>'''

content = content.replace(bottom_old, bottom_new)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
