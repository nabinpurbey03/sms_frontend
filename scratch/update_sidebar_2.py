import sys

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace <aside> to wrap with TooltipProvider
import re
content = re.sub(
    r'(<aside\s+className={`hidden lg:flex shrink-0)', 
    r'<TooltipProvider delayDuration={150}>\n      \1', 
    content
)
content = re.sub(
    r'(</aside>)', 
    r'\1\n      </TooltipProvider>', 
    content
)

# Replace the nav mapping
old_nav = '''          <nav className="space-y-1">
            {visibleNavItems.map((item) => {
              const isActive = isNavItemActive(location.pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
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
            })}
          </nav>'''

new_nav = '''          <nav className="space-y-1">
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
          </nav>'''

content = content.replace(old_nav, new_nav)

# Replace the toggle button to be on the right
old_btn = '''<Button
            variant="ghost"
            size="icon"
            className={`w-full h-8 flex items-center justify-center text-muted-foreground hover:bg-accent cursor-pointer`}
            onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
            aria-label="Toggle Sidebar"
          >
            {isDesktopSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>'''

new_btn = '''<div className={`flex ${isDesktopSidebarCollapsed ? 'justify-center' : 'justify-end'}`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
              onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
              aria-label="Toggle Sidebar"
            >
              {isDesktopSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>'''

content = content.replace(old_btn, new_btn)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
