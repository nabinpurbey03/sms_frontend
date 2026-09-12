import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('space-y-8', 'space-y-6')
content = content.replace('<nav className=\"space-y-0.5\">', '<nav className=\"space-y-1 mt-2\">')

old_link = '''className={lex items-center rounded-xl py-2 text-sm transition-all duration-150  }'''
new_link = '''className={lex items-center rounded-lg py-2.5 text-sm transition-all duration-150  }'''
content = content.replace(old_link, new_link)

old_header = 'className=\"px-3 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2\"'
new_header = 'className=\"px-3 mt-6 text-[10px] font-bold text-muted-foreground/90 uppercase tracking-[0.15em] mb-2\"'
content = content.replace(old_header, new_header)

old_toggle = '''<Button
            variant=\"ghost\"
            size=\"icon\"
            className={h-7 w-7 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors }
            onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
            aria-label=\"Toggle Sidebar\"
          >
            {isDesktopSidebarCollapsed ? <ChevronRight className=\"h-4 w-4\" /> : <ChevronLeft className=\"h-4 w-4\" />}
          </Button>'''
new_toggle = '''<Button
            variant=\"outline\"
            size=\"icon\"
            className={h-8 w-8 text-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors shadow-sm }
            onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
            aria-label=\"Toggle Sidebar\"
          >
            <Menu className=\"h-4 w-4\" />
          </Button>'''
content = content.replace(old_toggle, new_toggle)

old_profile = '''<div className=\"p-3 shrink-0 border-t border-border/40 bg-card\">
          <div className=\"w-full flex items-center gap-3 p-2 bg-accent/40 rounded-xl border border-border/50 text-left\">'''
new_profile = '''<div className=\"p-4 shrink-0 border-t border-border/40 bg-card\">
          <div className=\"w-full flex items-center gap-3 p-3 bg-accent/40 rounded-xl border border-border/50 text-left hover:bg-accent/60 transition-colors\">'''
content = content.replace(old_profile, new_profile)

old_badge = '<Badge variant={getRoleBadgeVariant(activeRole)} className=\"text-[10px] px-1.5 py-0\">'
new_badge = '<Badge variant={getRoleBadgeVariant(activeRole)} className=\"text-[10px] px-2 py-0.5 bg-primary/20 text-primary hover:bg-primary/30 font-bold border-primary/20\">'
content = content.replace(old_badge, new_badge)

old_left = '''<div className=\"flex flex-col min-w-0\">
                    <h1 className=\"text-sm font-bold text-foreground leading-tight truncate\">{activeItem.label}</h1>
                    {activeItem.description && (
                      <p className=\"text-[10px] text-muted-foreground leading-tight truncate hidden sm:block\">{activeItem.description}</p>
                    )}
                  </div>'''
new_left = '''<div className=\"flex items-center min-w-0\">
                    <h1 className=\"text-sm font-bold text-foreground truncate\">{activeItem.label}</h1>
                  </div>'''
content = content.replace(old_left, new_left)

old_middle = '''<div className=\"flex flex-col items-center justify-center shrink-0\">
              <span className=\"font-bold text-base whitespace-nowrap bg-gradient-to-r from-[#03045E] via-[#0077B6] to-[#00B4D8] bg-clip-text text-transparent\">
                {activeTenantName || 'Global Platform'}
              </span>
              {tenant?.address && (
                <span className=\"text-[11px] font-medium tracking-wide whitespace-nowrap bg-gradient-to-r from-[#0077B6] to-[#00B4D8] bg-clip-text text-transparent opacity-90\">
                  {tenant.address.tole ? ${tenant.address.tole},  : ''}{tenant.address.municipality}-{tenant.address.ward}, {tenant.address.district}
                </span>
              )}
            </div>'''
new_middle = '''<div className=\"flex items-center justify-center shrink-0\">
              <span className=\"font-bold text-lg tracking-tight whitespace-nowrap bg-gradient-to-r from-[#03045E] via-[#0077B6] to-[#00B4D8] bg-clip-text text-transparent\">
                {activeTenantName || 'Global Platform'}
              </span>
            </div>'''
content = content.replace(old_middle, new_middle)

old_search = '''className=\"w-full bg-muted/50 border-none pl-9 h-8 focus-visible:bg-background transition-colors text-xs rounded-full\"'''
new_search = '''className=\"w-full bg-background border border-input pl-9 h-8 focus-visible:ring-1 focus-visible:ring-primary transition-colors text-xs rounded-full shadow-sm\"'''
content = content.replace(old_search, new_search)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
