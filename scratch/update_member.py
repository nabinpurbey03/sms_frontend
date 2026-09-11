with open('src/features/members/components/MemberTable.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("    label: 'School Admin',", "    label: 'Principal',")

with open('src/features/members/components/MemberTable.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
