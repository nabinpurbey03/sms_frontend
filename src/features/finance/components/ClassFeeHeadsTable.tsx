import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Plus,
  Pencil,
  Trash2,
  Coins,
  Bus,
  Calendar,
  Layers,
  AlertTriangle,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import type { FeeStructure, FeeCategory, FeeFrequency } from '../types';

export interface ClassFeeHeadsTableProps {
  feeStructures: FeeStructure[];
  onAddFeeHead: () => void;
  onEditFeeHead: (fee: FeeStructure) => void;
  onDeleteFeeHead: (feeId: string) => Promise<void>;
  isDeleting?: boolean;
}

export const ClassFeeHeadsTable: React.FC<ClassFeeHeadsTableProps> = ({
  feeStructures,
  onAddFeeHead,
  onEditFeeHead,
  onDeleteFeeHead,
  isDeleting = false,
}) => {
  const [feeToDelete, setFeeToDelete] = useState<FeeStructure | null>(null);

  // Summary calculations
  const activeFeeHeads = useMemo(
    () => feeStructures.filter((f) => f.is_active),
    [feeStructures]
  );

  const monthlyTuition = useMemo(() => {
    return activeFeeHeads
      .filter((f) => f.fee_category === 'TUITION' && f.frequency === 'MONTHLY')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [activeFeeHeads]);

  const transportRate = useMemo(() => {
    return activeFeeHeads
      .filter((f) => f.fee_category === 'TRANSPORT' && f.frequency === 'MONTHLY')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [activeFeeHeads]);

  const totalAnnualCharges = useMemo(() => {
    return activeFeeHeads.reduce((sum, f) => {
      const amt = Number(f.amount) || 0;
      if (f.frequency === 'MONTHLY') return sum + amt * 12;
      if (f.frequency === 'TERMWISE') return sum + amt * 4;
      return sum + amt; // YEARLY, ONE_TIME
    }, 0);
  }, [activeFeeHeads]);

  const getCategoryBadge = (category: FeeCategory) => {
    switch (category) {
      case 'TUITION':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
            Tuition
          </span>
        );
      case 'TRANSPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <Bus className="w-3 h-3" />
            Transport
          </span>
        );
      case 'EXAM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            Exam
          </span>
        );
      case 'ADMISSION':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
            Admission
          </span>
        );
      case 'LAB':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
            Lab Fee
          </span>
        );
      case 'LIBRARY':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
            Library
          </span>
        );
      case 'HOSTEL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20">
            Hostel
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/50">
            {category}
          </span>
        );
    }
  };

  const getFrequencyBadge = (freq: FeeFrequency) => {
    switch (freq) {
      case 'MONTHLY':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
            Monthly
          </span>
        );
      case 'YEARLY':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
            Annual / Yearly
          </span>
        );
      case 'ONE_TIME':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-pink-500/10 text-pink-700 dark:text-pink-300 border border-pink-500/20">
            One-Time
          </span>
        );
      case 'TERMWISE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
            Term-wise
          </span>
        );
      default:
        return <Badge variant="secondary">{freq}</Badge>;
    }
  };

  const handleConfirmDelete = async () => {
    if (!feeToDelete) return;
    try {
      await onDeleteFeeHead(feeToDelete.id);
      setFeeToDelete(null);
    } catch {
      // Handled by parent
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border/70 bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Monthly Base Tuition</span>
            <Coins className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground">
            NPR {monthlyTuition.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-muted-foreground">Standard monthly charge per student</p>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Transport Monthly Rate</span>
            <Bus className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground">
            NPR {transportRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-muted-foreground">Applied if transport checkbox is checked</p>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Est. Annual / Student</span>
            <Calendar className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground">
            NPR {totalAnnualCharges.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-muted-foreground">Sum of monthly (x12) + one-time + annual heads</p>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Configured Fee Heads</span>
            <Layers className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {activeFeeHeads.length}{' '}
            <span className="text-xs font-normal text-muted-foreground">Active</span>
          </div>
          <p className="text-[10px] text-muted-foreground">{feeStructures.length} total heads for this class</p>
        </div>
      </div>

      {/* Header with prominent + Add Fee Head button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/50">
        <div>
          <h3 className="font-bold text-base text-foreground">Class Fee Schedule</h3>
          <p className="text-xs text-muted-foreground">
            Define all periodic tuition, lab, exam, and transport charges applied to students in this class.
          </p>
        </div>

        <Button
          onClick={onAddFeeHead}
          size="sm"
          className="gap-1.5 shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Fee Head</span>
        </Button>
      </div>

      {/* Table of Fee Heads */}
      {feeStructures.length === 0 ? (
        <EmptyState
          icon={Coins}
          title="No Fee Heads Configured"
          description="This class doesn't have any fee heads configured yet. Click '+ Add Fee Head' to set up monthly tuition, transport, or admission charges."
          action={
            <Button onClick={onAddFeeHead} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Add Fee Head</span>
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-2xs">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold text-xs">Fee Head Name</TableHead>
                <TableHead className="font-semibold text-xs">Category</TableHead>
                <TableHead className="font-semibold text-xs">Frequency</TableHead>
                <TableHead className="font-semibold text-xs text-right">Standard Amount</TableHead>
                <TableHead className="font-semibold text-xs text-center">Status</TableHead>
                <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeStructures.map((fee) => {
                const amountNum = Number(fee.amount) || 0;
                return (
                  <TableRow key={fee.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="py-3">
                      <div>
                        <span className="font-bold text-sm text-foreground">{fee.name}</span>
                        {fee.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {fee.description}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      {getCategoryBadge(fee.fee_category)}
                    </TableCell>

                    <TableCell className="py-3">
                      {getFrequencyBadge(fee.frequency)}
                    </TableCell>

                    <TableCell className="py-3 text-right">
                      <span className="font-mono font-bold text-sm text-foreground">
                        NPR {amountNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </TableCell>

                    <TableCell className="py-3 text-center">
                      {fee.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] font-medium text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditFeeHead(fee)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          title="Edit Fee Head"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFeeToDelete(fee)}
                          className="h-8 w-8 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                          title="Deactivate Fee Head"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete / Deactivate Confirmation Dialog */}
      <Dialog
        open={Boolean(feeToDelete)}
        onOpenChange={(open) => !open && setFeeToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-1">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold">Deactivate Fee Head</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to deactivate <strong className="text-foreground">{feeToDelete?.name}</strong>?
              It will no longer be included in batch fee generation for this class.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFeeToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deactivating...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Deactivate</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
