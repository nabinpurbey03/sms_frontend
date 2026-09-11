import sys

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

s1 = 'className="flex-1 overflow-y-auto px-3 py-4 space-y-6"'
r1 = 'className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4 space-y-6"'
content = content.replace(s1, r1)

s2 = 'className="fixed inset-y-0 left-0 z-50 w-full max-w-[280px] sm:max-w-xs bg-card p-4 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200"'
r2 = 'className="fixed inset-y-0 left-0 z-50 w-full max-w-[280px] sm:max-w-xs bg-card p-4 shadow-2xl flex flex-col justify-between overflow-y-auto scrollbar-hide animate-in slide-in-from-left duration-200"'
content = content.replace(s2, r2)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
