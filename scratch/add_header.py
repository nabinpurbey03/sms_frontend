import sys
import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract DropdownMenu
dropdown_match = re.search(r'(<DropdownMenu>.*?</DropdownMenu>)', content, re.DOTALL)
if dropdown_match:
    dropdown_code = dropdown_match.group(1)
    
    # We need to remove it from the sidebar.
    wrapper_pattern = r'\{\/\* Bottom Left Corner: Profile & Account Menu \*\/.*?<div className="p-3 bg-card/60 shrink-0 flex flex-col gap-2 border-t border-border/40">\s*<DropdownMenu>.*?</DropdownMenu>\s*</div>'
    
    content = re.sub(wrapper_pattern, '', content, flags=re.DOTALL)

    # We also need to fix the dropdown trigger so it doesn't use `isDesktopSidebarCollapsed` and looks like a simple avatar button.
    new_trigger = '''<DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-center rounded-full hover:ring-2 hover:ring-primary/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                aria-label="User Account Menu"
              >
                <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border group-hover:ring-primary/50 transition-all">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>'''
    
    # Replace the trigger in the dropdown code
    dropdown_code = re.sub(r'<DropdownMenuTrigger asChild>.*?</DropdownMenuTrigger>', new_trigger, dropdown_code, flags=re.DOTALL)

    header_code = f'''{{/* Dashboard Main Area */}}
      <div className="flex-1 min-w-0 flex flex-col h-screen bg-background">
        
        {{/* Sticky Top Header */}}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-end px-4 sm:px-6 border-b border-border/40 bg-card/95 backdrop-blur-md shrink-0 gap-3">
          
          {{/* Theme Toggle */}}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={{() => setTheme(theme === 'dark' ? 'light' : 'dark')}} 
            className="h-9 w-9 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {{theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}}
          </Button>
          
          {{/* Notifications */}}
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border border-card" />
          </Button>
          
          <div className="w-px h-6 bg-border/50 mx-1" /> {{/* Divider */}}

          {{/* User Profile Menu */}}
          {dropdown_code}
        </header>

        <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 bg-muted/20">
          <div className="w-full max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>'''

    new_content = re.sub(r'\{\/\* Main Content Viewport \*\/.*?</main>', header_code, content, flags=re.DOTALL)

    with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Successfully applied header!')
else:
    print('Failed to find DropdownMenu.')
