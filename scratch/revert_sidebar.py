import re

with open('scratch/AppShell_afd9828.tsx', 'r', encoding='utf-8') as f:
    old_content = f.read()

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    new_content = f.read()

# Extract sidebar block from old_content
old_sidebar_match = re.search(r'<aside.*?</aside>', old_content, re.DOTALL)
if old_sidebar_match:
    old_sidebar = old_sidebar_match.group(0)
else:
    print('Failed to find sidebar in old content')
    exit(1)

# Replace sidebar block in new_content
new_content = re.sub(r'<aside.*?</aside>', old_sidebar, new_content, flags=re.DOTALL)

# Make search bar slightly bigger
new_content = new_content.replace('max-w-[240px]', 'max-w-[280px]')

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
