import sys

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove border-r from sidebar container and add dynamic width
old_aside = '<aside className="hidden lg:flex shrink-0 flex-col justify-between border-r bg-card h-screen sticky top-0 w-64 xl:w-70 z-30 shadow-xs">'
new_aside = '''<aside
        className={`hidden lg:flex shrink-0 flex-col justify-between bg-card h-screen sticky top-0 z-30 shadow-xs transition-all duration-300 ${
          isDesktopSidebarCollapsed ? 'w-20' : 'w-64 xl:w-70'
        }`}
      >'''
content = content.replace(old_aside, new_aside)

# In the Main Menu section
old_main_menu = '''<p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Main Menu
          </p>'''
new_main_menu = '''{!isDesktopSidebarCollapsed && (
            <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Main Menu
            </p>
          )}'''
content = content.replace(old_main_menu, new_main_menu)

# Inside the map for visibleNavItems
old_link = '''<span className="truncate">{item.label}</span>'''
new_link = '''{!isDesktopSidebarCollapsed && <span className="truncate">{item.label}</span>}'''
content = content.replace(old_link, new_link)

# To center the icon when collapsed
old_link_tag = '''className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${'''
new_link_tag = '''className={`flex items-center rounded-xl py-2.5 text-sm transition-all duration-150 ${
                    isDesktopSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
                  } ${'''
content = content.replace(old_link_tag, new_link_tag)

# Update the toggle button at the bottom and user profile
# I will replace the Profile & Account Menu block entirely for the desktop sidebar

old_bottom_block = '''{/* Bottom Left Corner: Profile & Account Menu */}
        <div className="p-3 border-t bg-card/60 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-accent/80 transition-all text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer border border-border/50 hover:border-border shadow-2xs"
                aria-label="User Account Menu"
              >
                <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border group-hover:ring-primary/50 transition-all">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-foreground truncate leading-tight">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <Badge
                      variant={getRoleBadgeVariant(activeRole)}
                      className="text-[9px] px-1.5 py-0 font-semibold leading-tight shrink-0"
                    >
                      {activeRole || 'USER'}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground truncate leading-tight">
                      {user?.email}
                    </span>
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>'''

new_bottom_block = '''{/* Bottom Left Corner: Profile & Account Menu */}
        <div className="p-3 bg-card/60 shrink-0 flex flex-col gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`w-full h-8 flex items-center justify-center text-muted-foreground hover:bg-accent cursor-pointer`}
            onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
            aria-label="Toggle Sidebar"
          >
            {isDesktopSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`w-full flex items-center p-2 rounded-xl hover:bg-accent/80 transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer border border-border/50 hover:border-border shadow-2xs ${isDesktopSidebarCollapsed ? 'justify-center' : 'gap-2.5 text-left'}`}
                aria-label="User Account Menu"
              >
                <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border group-hover:ring-primary/50 transition-all">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                {!isDesktopSidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-foreground truncate leading-tight">
                        {user?.first_name} {user?.last_name}
                      </p>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <Badge
                        variant={getRoleBadgeVariant(activeRole)}
                        className="text-[9px] px-1.5 py-0 font-semibold leading-tight shrink-0"
                      >
                        {activeRole || 'USER'}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground truncate leading-tight">
                        {user?.email}
                      </span>
                    </div>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>'''

content = content.replace(old_bottom_block, new_bottom_block)

# Also remove border-t from mobile sidebar footer if present
# Mobile sidebar has <div className="pt-4 border-t space-y-3 shrink-0">
content = content.replace('className="pt-4 border-t space-y-3 shrink-0"', 'className="pt-4 space-y-3 shrink-0"')

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
