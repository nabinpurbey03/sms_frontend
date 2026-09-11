import sys
import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

format_role_func = '''
  const formatRole = (role: string | null | undefined) => {
    if (!role) return 'User';
    if (role === 'ADMIN') return 'Principal';
    if (role === 'SUPER_ADMIN') return 'Super Admin';
    if (role === 'OFFICE_ADMIN') return 'Office Admin';
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };
'''

if 'const formatRole =' not in content:
    content = content.replace('  const getRoleBadgeVariant = (role: string | null) => {', format_role_func + '\n  const getRoleBadgeVariant = (role: string | null) => {')

# Sidebar badge update
sidebar_p = '''<p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                      {activeRole || 'USER'}
                    </p>'''
sidebar_badge = '''<div className="mt-1">
                      <Badge variant={getRoleBadgeVariant(activeRole)} className="text-[10px] px-1.5 py-0">
                        {formatRole(activeRole)}
                      </Badge>
                    </div>'''
content = content.replace(sidebar_p, sidebar_badge)

# Replace other occurrences
content = content.replace("{activeRole || 'USER'}", "{formatRole(activeRole)}")
content = content.replace('{activeRole || "USER"}', '{formatRole(activeRole)}')

content = content.replace('{activeRole}\n                      </span>', '{formatRole(activeRole)}\n                      </span>')
content = content.replace('>{activeRole}</span>', '>{formatRole(activeRole)}</span>')
content = content.replace('<span className="truncate">{r}</span>', '<span className="truncate">{formatRole(r)}</span>')


with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
