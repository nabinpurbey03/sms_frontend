import sys
import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract the entire DropdownMenu from the top header
# It starts at {/* User Profile Menu */} and ends at </DropdownMenu> before </header>
dropdown_pattern = r'\{\/\* User Profile Menu \*\/.*?<DropdownMenu>.*?</DropdownMenu>'
dropdown_match = re.search(dropdown_pattern, content, re.DOTALL)

if not dropdown_match:
    print("Could not find DropdownMenu")
    sys.exit(1)

full_dropdown = dropdown_match.group(0)

# Extract just the DropdownMenuContent
content_match = re.search(r'(<DropdownMenuContent.*?</DropdownMenuContent>)', full_dropdown, re.DOTALL)
if not content_match:
    print("Could not find DropdownMenuContent")
    sys.exit(1)

dropdown_content_code = content_match.group(1)

# Replace the top right dropdown with a static avatar
static_avatar = '''{/* User Profile Menu (Static) */}
          <div className="flex items-center justify-center rounded-full">
            <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </div>'''

content = content.replace(full_dropdown, static_avatar)


# 2. Add the sidebar profile card to the end of the <aside>
# We need to find `      </aside>` and insert our new card right before it.

new_sidebar_bottom = f'''        {{/* Sidebar Bottom Profile Card */}}
        <div className="p-3 shrink-0 border-t border-border/40 bg-card">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-2 bg-accent/40 hover:bg-accent/60 transition-colors rounded-xl border border-border/50 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer">
                <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {{userInitials}}
                  </AvatarFallback>
                </Avatar>
                {{!isDesktopSidebarCollapsed && (
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-sm font-semibold text-foreground truncate leading-tight">
                      {{user?.first_name}} {{user?.last_name}}
                    </p>
                    <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                      {{activeRole || 'USER'}}
                    </p>
                  </div>
                )}}
              </button>
            </DropdownMenuTrigger>
            {dropdown_content_code}
          </DropdownMenu>
        </div>
      </aside>'''

content = content.replace('      </aside>', new_sidebar_bottom)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Applied successfully!")
