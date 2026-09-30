import React, { useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import { useClasses } from '@/features/academic/hooks';
import {
  useFeeStructures,
  useCreateFeeStructure,
  useUpdateFeeStructure,
  useDeleteFeeStructure,
  useStudentDiscounts,
  useSetStudentDiscount,
} from '../hooks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Coins,
  Plus,
  Percent,
  Lock,
  Loader2,
  Edit2,
  Trash2,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import type { FeeStructure, StudentDiscount } from '../types';
import { FeeStructureDialog } from '../components/FeeStructureDialog';
import { StudentDiscountDialog } from '../components/StudentDiscountDialog';

export const FeeStructuresPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { currentYear } = useCurrentAcademicYear(activeTenantId);
  const { data: classesData } = useClasses(activeTenantId);
  const classes = classesData || [];

  // Filter State
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'structures' | 'discounts'>('structures');

  // Queries
  const { data: feeStructuresData, isLoading: isLoadingStructures } = useFeeStructures(
    activeTenantId,
    {
      class_id: selectedClassId || undefined,
      frequency: selectedFrequency || undefined,
    }
  );
  const feeStructures = feeStructuresData || [];

  const { data: discountsData, isLoading: isLoadingDiscounts } = useStudentDiscounts(activeTenantId);
  const discounts = discountsData || [];

  // Dialog States
  const [isFeeStructureOpen, setIsFeeStructureOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);

  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<StudentDiscount | null>(null);

  // Mutations
  const createStructureMutation = useCreateFeeStructure(activeTenantId);
  const updateStructureMutation = useUpdateFeeStructure(activeTenantId);
  const deleteStructureMutation = useDeleteFeeStructure(activeTenantId);
  const setDiscountMutation = useSetStudentDiscount(activeTenantId);

  const handleEditStructure = (structure: FeeStructure) => {
    setEditingStructure(structure);
    setIsFeeStructureOpen(true);
  };

  const handleDeleteStructure = async (structure: FeeStructure) => {
    if (confirm(`Deactivate fee head "${structure.name}"?`)) {
      await deleteStructureMutation.mutateAsync(structure.id);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Coins className="w-6 h-6 text-primary" />
            Class Fee Structures & Concessions
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Configure monthly tuition, annual school management fees, and student discount rates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span>Session: {currentYear?.name || 'Active Session'} (Locked)</span>
          </div>

          <Button
            size="sm"
            onClick={() => {
              setEditingStructure(null);
              setIsFeeStructureOpen(true);
            }}
            className="gap-1.5 text-xs shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Fee Head
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingDiscount(null);
              setIsDiscountOpen(true);
            }}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <Percent className="w-3.5 h-3.5" />
            Assign Concession
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('structures')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'structures'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Class Fee Heads ({feeStructures.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('discounts')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'discounts'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Student Concessions & Discounts ({discounts.length})</span>
        </button>
      </div>

      {activeTab === 'structures' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border bg-card text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground">Class:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground">Frequency:</span>
              <select
                value={selectedFrequency}
                onChange={(e) => setSelectedFrequency(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Frequencies</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly (Annual)</option>
                <option value="TERMWISE">Term-wise</option>
                <option value="ONE_TIME">One Time</option>
              </select>
            </div>
          </div>

          {/* Structures Table */}
          {isLoadingStructures ? (
            <div className="p-12 text-center text-xs text-muted-foreground border rounded-xl bg-card">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
              Loading fee structures...
            </div>
          ) : feeStructures.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-card space-y-2">
              <Coins className="w-8 h-8 mx-auto text-muted-foreground/50" />
              <p className="font-semibold text-foreground">No fee structures defined yet</p>
              <p className="text-[11px] text-muted-foreground">
                Click "Add Fee Head" to define monthly tuition, annual management fees, or lab charges for classes.
              </p>
            </div>
          ) : (
            <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Class</th>
                      <th className="py-2.5 px-4">Fee Head Name</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Billing Frequency</th>
                      <th className="py-2.5 px-4 text-right">Standard Amount</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {feeStructures.map((f) => (
                      <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-foreground">{f.class_name}</td>
                        <td className="py-2.5 px-4">
                          <span className="font-medium text-foreground block">{f.name}</span>
                          {f.description && (
                            <span className="text-[11px] text-muted-foreground">{f.description}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {f.fee_category}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge
                            variant={f.frequency === 'MONTHLY' ? 'default' : 'secondary'}
                            className="text-[10px] uppercase font-mono"
                          >
                            {f.frequency}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                          NPR {Number(f.amount).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {f.is_active ? (
                            <Badge variant="success">ACTIVE</Badge>
                          ) : (
                            <Badge variant="secondary">INACTIVE</Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditStructure(f)}
                              className="h-7 w-7 p-0 cursor-pointer"
                              title="Edit Fee Head"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            {f.is_active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteStructure(f)}
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive cursor-pointer"
                                title="Deactivate Fee Head"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'discounts' && (
        <div className="space-y-4">
          {isLoadingDiscounts ? (
            <div className="p-12 text-center text-xs text-muted-foreground border rounded-xl bg-card">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
              Loading student discounts...
            </div>
          ) : discounts.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-card space-y-2">
              <Percent className="w-8 h-8 mx-auto text-muted-foreground/50" />
              <p className="font-semibold text-foreground">No student concessions configured</p>
              <p className="text-[11px] text-muted-foreground">
                Click "Assign Concession" to set scholarship or discount percentages for students.
              </p>
            </div>
          ) : (
            <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Student</th>
                      <th className="py-2.5 px-4">Concession %</th>
                      <th className="py-2.5 px-4">Reason / Category</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {discounts.map((d) => (
                      <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-foreground">
                          {d.student_name || 'Student'}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-emerald-600 text-sm">
                          {Number(d.discount_percent)}%
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">{d.reason || 'General Scholarship'}</td>
                        <td className="py-2.5 px-4 text-center">
                          {d.is_active ? (
                            <Badge variant="success">ACTIVE</Badge>
                          ) : (
                            <Badge variant="secondary">INACTIVE</Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingDiscount(d);
                              setIsDiscountOpen(true);
                            }}
                            className="h-7 text-xs gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fee Structure Dialog */}
      <FeeStructureDialog
        isOpen={isFeeStructureOpen}
        onClose={() => {
          setIsFeeStructureOpen(false);
          setEditingStructure(null);
        }}
        initialData={editingStructure}
        onSubmit={async (data) => {
          if (editingStructure) {
            await updateStructureMutation.mutateAsync({
              structureId: editingStructure.id,
              data,
            });
          } else {
            await createStructureMutation.mutateAsync(data);
          }
        }}
        isLoading={createStructureMutation.isPending || updateStructureMutation.isPending}
        tenantId={activeTenantId}
      />

      {/* Student Discount Dialog */}
      <StudentDiscountDialog
        isOpen={isDiscountOpen}
        onClose={() => {
          setIsDiscountOpen(false);
          setEditingDiscount(null);
        }}
        initialData={editingDiscount}
        onSubmit={async (data) => setDiscountMutation.mutateAsync(data)}
        isLoading={setDiscountMutation.isPending}
        tenantId={activeTenantId}
      />
    </div>
  );
};
