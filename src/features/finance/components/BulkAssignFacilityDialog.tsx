import React, { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Building2,
  Utensils,
  Bus,
  Trophy,
  Tag,
  Loader2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useFeeStructures, useBulkAssignStudentFees } from '../hooks';
import type { FeeCategory, FeeFrequency } from '../types';

interface BulkAssignFacilityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudentIds: string[];
  tenantId: string;
  onSuccess?: () => void;
}

export const BulkAssignFacilityDialog: React.FC<BulkAssignFacilityDialogProps> = ({
  isOpen,
  onClose,
  selectedStudentIds,
  tenantId,
  onSuccess,
}) => {
  // Query school facility presets
  const { data: facilityPresets = [] } = useFeeStructures(tenantId, { fee_level: 'STUDENT' });
  const bulkMutation = useBulkAssignStudentFees(tenantId);

  const [mode, setMode] = useState<'PRESET' | 'CUSTOM'>('PRESET');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FeeCategory>('HOSTEL');
  const [frequency, setFrequency] = useState<FeeFrequency>('MONTHLY');
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState('');

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = facilityPresets.find((p) => p.id === presetId);
    if (found) {
      setName(found.name);
      setCategory(found.fee_category);
      setFrequency(found.frequency);
      setAmount(String(found.amount));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;
    if (!name.trim()) return;

    await bulkMutation.mutateAsync({
      student_ids: selectedStudentIds,
      fee_structure_id: selectedPresetId || null,
      fee_name: name.trim(),
      fee_category: category,
      frequency,
      amount: amountNum,
      notes: notes.trim() || undefined,
    });

    onClose();
    if (onSuccess) onSuccess();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
              <Users className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Bulk Assign Facility or Fee
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Assign a facility subscription or fee head to{' '}
              <span className="font-semibold text-foreground">
                {selectedStudentIds.length} selected {selectedStudentIds.length === 1 ? 'student' : 'students'}
              </span>{' '}
              simultaneously.
            </DialogDescription>
          </DialogHeader>

          {/* Mode Switcher */}
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <span className="text-xs font-semibold text-muted-foreground">Facility Source:</span>
            <div className="inline-flex items-center p-0.5 rounded-lg bg-muted text-xs">
              <button
                type="button"
                onClick={() => setMode('PRESET')}
                className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                  mode === 'PRESET' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                }`}
              >
                School Presets
              </button>
              <button
                type="button"
                onClick={() => setMode('CUSTOM')}
                className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                  mode === 'CUSTOM' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                }`}
              >
                Custom Entry
              </button>
            </div>
          </div>

          {mode === 'PRESET' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Choose Facility Preset</label>
              <Select value={selectedPresetId} onValueChange={handlePresetChange}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Select facility preset..." />
                </SelectTrigger>
                <SelectContent>
                  {facilityPresets.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      No facility presets configured. Switch to Custom.
                    </div>
                  ) : (
                    facilityPresets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id} className="text-xs">
                        <span className="font-semibold">{preset.name}</span>
                        <span className="text-muted-foreground ml-2">
                          (NPR {Number(preset.amount).toLocaleString()} / {preset.frequency.toLowerCase()})
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Facility / Fee Head Name</label>
            <Input
              required
              placeholder="e.g. Boys Hostel (Block A)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Category</label>
              <Select value={category} onValueChange={(val) => setCategory(val as FeeCategory)}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOSTEL" className="text-xs">Hostel / Boarding</SelectItem>
                  <SelectItem value="CANTEEN" className="text-xs">Canteen / Meals</SelectItem>
                  <SelectItem value="TRANSPORT" className="text-xs">Transport</SelectItem>
                  <SelectItem value="COACHING" className="text-xs">Coaching / Tutoring</SelectItem>
                  <SelectItem value="ACTIVITY" className="text-xs">Activity / Clubs</SelectItem>
                  <SelectItem value="SCHOLARSHIP" className="text-xs">Concession / Waiver</SelectItem>
                  <SelectItem value="MISC" className="text-xs">Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Frequency</label>
              <Select value={frequency} onValueChange={(val) => setFrequency(val as FeeFrequency)}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY" className="text-xs">Monthly</SelectItem>
                  <SelectItem value="TERMWISE" className="text-xs">Termwise</SelectItem>
                  <SelectItem value="ONE_TIME" className="text-xs">One Time</SelectItem>
                  <SelectItem value="YEARLY" className="text-xs">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Fee Amount (NPR)</label>
              <Input
                type="number"
                min="1"
                step="50"
                required
                placeholder="4000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Batch Notes (Optional)</label>
              <Input
                placeholder="e.g. Block A Group"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={bulkMutation.isPending || !name.trim() || !amount}
              className="gap-1.5 shadow-xs cursor-pointer font-semibold"
            >
              {bulkMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Assigning to {selectedStudentIds.length} students...</span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5" />
                  <span>Assign to {selectedStudentIds.length} Students</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
