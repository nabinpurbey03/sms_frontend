import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TenantState {
  activeTenantId: string | null;
  activeTenantName: string | null;
  setActiveTenant: (tenantId: string | null, tenantName?: string | null) => void;
  clearTenant: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      activeTenantId: null,
      activeTenantName: null,
      setActiveTenant: (tenantId, tenantName = null) =>
        set({
          activeTenantId: tenantId,
          activeTenantName: tenantName,
        }),
      clearTenant: () => set({ activeTenantId: null, activeTenantName: null }),
    }),
    {
      name: 'schools_up_tenant',
    }
  )
);
