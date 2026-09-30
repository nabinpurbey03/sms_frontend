import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Calendar, FileText, Loader2, CheckSquare, Square } from 'lucide-react';
import { batchBillGenerateSchema, type BatchBillGenerateFormValues } from '../schema';
import { useClasses, useClassSections } from '@/features/academic/hooks';
import { useFeeStructures } from '../hooks';

interface BatchBillGenerateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BatchBillGenerateFormValues) => Promise<any>;
  isLoading: boolean;
  tenantId: string | null;
}

export const BatchBillGenerateDialog: React.FC<BatchBillGenerateDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  tenantId,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const { data: classesData } = useClasses(tenantId);
  const classes = classesData || [];

  const { data: sectionsData } = useClassSections(tenantId, selectedClassId || null);
  const sections = sectionsData || [];

  const { data: feeStructuresData, isLoading: isLoadingStructures } = useFeeStructures(
    tenantId,
    selectedClassId ? { class_id: selectedClassId, is_active: true } : undefined
  );
  const feeStructures = feeStructuresData || [];

  // Default due date to 15 days from today
  const defaultDueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BatchBillGenerateFormValues>({
    resolver: zodResolver(batchBillGenerateSchema),
    defaultValues: {
      class_id: '',
      section_id: '',
      billing_month: '',
      fee_structure_ids: [],
      due_date: defaultDueDate,
      notes: '',
    },
  });

  const watchedFeeStructureIds = watch('fee_structure_ids') || [];

  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
      setValue('class_id', classes[0].id);
    }
  }, [classes, selectedClassId, setValue]);

  // When class changes, auto-select all its active fee structures
  useEffect(() => {
    if (feeStructures.length > 0) {
      setValue(
        'fee_structure_ids',
        feeStructures.map((f) => f.id)
      );
    } else {
      setValue('fee_structure_ids', []);
    }
  }, [feeStructures, setValue]);

  const toggleStructure = (id: string) => {
    const current = new Set(watchedFeeStructureIds);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    setValue('fee_structure_ids', Array.from(current), { shouldValidate: true });
  };

  const selectAll = () => {
    setValue(
      'fee_structure_ids',
      feeStructures.map((f) => f.id),
      { shouldValidate: true }
    );
  };

  const deselectAll = () => {
    setValue('fee_structure_ids', [], { shouldValidate: true });
  };

  const selectedTotal = feeStructures
    .filter((f) => watchedFeeStructureIds.includes(f.id))
    .reduce((acc, f) => acc + Number(f.amount), 0);

  const onFormSubmit = async (values: BatchBillGenerateFormValues) => {
    try {
      await onSubmit(values);
      onClose();
    } catch {
      // Handled by hook
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
              <Sparkles className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold">1-Click Batch Bill Invoicing</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Automatically calculate fee heads, student concessions, and previous session dues for an entire class.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              {/* Class Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="class_id" className="text-xs font-semibold">
                  Target Class <span className="text-destructive">*</span>
                </Label>
                <select
                  id="class_id"
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setValue('class_id', e.target.value);
                    setValue('section_id', '');
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select a class...</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                {errors.class_id && (
                  <p className="text-destructive text-[11px] font-medium">{errors.class_id.message}</p>
                )}
              </div>

              {/* Optional Section Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="section_id" className="text-xs font-semibold">
                  Section <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <select
                  id="section_id"
                  {...register('section_id')}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">All Sections</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Billing Month */}
              <div className="space-y-1.5">
                <Label htmlFor="billing_month" className="text-xs font-semibold">
                  Billing Month / Cycle <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="billing_month"
                  placeholder="e.g. Baisakh 2081, April 2026, Term 1"
                  className="text-xs h-9"
                  {...register('billing_month')}
                />
                {errors.billing_month && (
                  <p className="text-destructive text-[11px] font-medium">{errors.billing_month.message}</p>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <Label htmlFor="due_date" className="text-xs font-semibold">
                  Due Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  className="text-xs h-9"
                  {...register('due_date')}
                />
                {errors.due_date && (
                  <p className="text-destructive text-[11px] font-medium">{errors.due_date.message}</p>
                )}
              </div>
            </div>

            {/* Fee Heads Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Fee Heads to Include ({watchedFeeStructureIds.length}/{feeStructures.length})
                </Label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-primary hover:underline font-medium cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground">•</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-muted-foreground hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {isLoadingStructures ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Loading fee structures...</div>
              ) : feeStructures.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                  No active fee structures configured for this class yet. Please add a fee structure first.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 border rounded-lg p-2 bg-muted/20">
                  {feeStructures.map((f) => {
                    const isSelected = watchedFeeStructureIds.includes(f.id);
                    return (
                      <div
                        key={f.id}
                        onClick={() => toggleStructure(f.id)}
                        className={`flex items-center justify-between p-2 rounded-md text-xs border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/5 border-primary/40 font-medium'
                            : 'bg-background hover:bg-accent/40 border-border/60 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-foreground">{f.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 uppercase">
                            {f.frequency}
                          </Badge>
                        </div>
                        <span className="font-mono font-bold text-foreground">
                          NPR {Number(f.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {errors.fee_structure_ids && (
                <p className="text-destructive text-[11px] font-medium">{errors.fee_structure_ids.message}</p>
              )}
            </div>

            {/* Estimated Subtotal Banner */}
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-primary">Standard Base Subtotal:</span>
                <p className="text-[11px] text-muted-foreground">Individual concessions & previous dues will apply dynamically.</p>
              </div>
              <span className="text-sm font-mono font-bold text-primary">
                NPR {selectedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold">
                Bill Memo / Notes <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="notes"
                placeholder="e.g. Please clear dues on or before due date to avoid late fees."
                className="text-xs h-9"
                {...register('notes')}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || watchedFeeStructureIds.length === 0}
              className="gap-1.5"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Generate Batch Bills
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
