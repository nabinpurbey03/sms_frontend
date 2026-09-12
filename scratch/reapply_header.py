with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import { useTenant } from \'@/features/tenants/hooks\';\n', '')
content = content.replace('const { data: tenant } = useTenant(activeTenantId);\n  ', '')

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
