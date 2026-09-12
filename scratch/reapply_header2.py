with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_middle = '''          {/* Middle: School Name & Address */}
          <div className="hidden md:flex flex-1 items-center justify-center px-6">
            <div className="flex flex-col items-center justify-center shrink-0">
              <span className="font-bold text-base whitespace-nowrap bg-gradient-to-r from-[#03045E] via-[#0077B6] to-[#00B4D8] bg-clip-text text-transparent">
                {activeTenantName || 'Global Platform'}
              </span>
              {tenant?.address && (
                <span className="text-[11px] font-medium tracking-wide whitespace-nowrap bg-gradient-to-r from-[#0077B6] to-[#00B4D8] bg-clip-text text-transparent opacity-90">
                  {tenant.address.tole ? \\, \ : ''}{tenant.address.municipality}-{tenant.address.ward}, {tenant.address.district}
                </span>
              )}
            </div>
          </div>'''

new_middle = '''          {/* Middle: School Name & Address */}
          <div className="hidden md:flex flex-1 items-center justify-center px-6">
            <div className="flex items-center justify-center shrink-0">
              <span className="font-bold text-lg tracking-tight whitespace-nowrap bg-gradient-to-r from-[#03045E] via-[#0077B6] to-[#00B4D8] bg-clip-text text-transparent">
                {activeTenantName || 'Global Platform'}
              </span>
            </div>
          </div>'''

content = content.replace(old_middle, new_middle)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
