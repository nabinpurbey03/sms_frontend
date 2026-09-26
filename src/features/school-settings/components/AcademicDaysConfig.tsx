import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Check,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Loader2,
  Info,
  Clock,
} from 'lucide-react';
import { useSchoolSettings, useUpdateSchoolSettings } from '../hooks';
import type { WeekDay } from '../types';
import { WEEKDAYS } from '../schema';

interface AcademicDaysConfigProps {
  tenantId: string;
  canManage: boolean;
}

const ALL_DAYS: { key: WeekDay; label: string; short: string; order: number }[] = [
  { key: 'sunday', label: 'Sunday', short: 'Sun', order: 0 },
  { key: 'monday', label: 'Monday', short: 'Mon', order: 1 },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue', order: 2 },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed', order: 3 },
  { key: 'thursday', label: 'Thursday', short: 'Thu', order: 4 },
  { key: 'friday', label: 'Friday', short: 'Fri', order: 5 },
  { key: 'saturday', label: 'Saturday', short: 'Sat', order: 6 },
];

const PRESETS: {
  name: string;
  desc: string;
  days: WeekDay[];
}[] = [
  {
    name: 'Sunday – Friday (6 Days)',
    desc: 'Saturday Off (Nepal & South Asia Standard)',
    days: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  },
  {
    name: 'Monday – Friday (5 Days)',
    desc: 'Saturday & Sunday Off (International Standard)',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  },
  {
    name: 'Monday – Saturday (6 Days)',
    desc: 'Sunday Off',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  },
];

export const AcademicDaysConfig: React.FC<AcademicDaysConfigProps> = ({
  tenantId,
  canManage,
}) => {
  const { data: settings, isLoading, isError } = useSchoolSettings(tenantId);
  const updateSettingsMutation = useUpdateSchoolSettings();

  const [selectedDays, setSelectedDays] = useState<WeekDay[]>([
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
  ]);

  // Sync state once settings load
  useEffect(() => {
    if (settings?.academic_days && Array.isArray(settings.academic_days)) {
      setSelectedDays(settings.academic_days);
    }
  }, [settings]);

  const toggleDay = (day: WeekDay) => {
    if (!canManage) return;
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length <= 1) {
          return prev; // At least one day required
        }
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const applyPreset = (days: WeekDay[]) => {
    if (!canManage) return;
    setSelectedDays(days);
  };

  const isDaySelected = (day: WeekDay) => selectedDays.includes(day);

  // Check dirty state
  const originalDays = settings?.academic_days || [];
  const isDirty =
    selectedDays.length !== originalDays.length ||
    selectedDays.some((d) => !originalDays.includes(d));

  const handleSave = async () => {
    if (!canManage || !isDirty || selectedDays.length === 0) return;
    await updateSettingsMutation.mutateAsync({
      tenantId,
      data: { academic_days: selectedDays },
    });
  };

  const handleReset = () => {
    if (settings?.academic_days) {
      setSelectedDays(settings.academic_days);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading weekly schedule settings...</span>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-10 h-10 text-destructive mb-2" />
        <h3 className="font-semibold text-foreground">Failed to load schedule settings</h3>
        <p className="text-sm text-muted-foreground mt-1">Please refresh the page or try again later.</p>
      </Card>
    );
  }

  const offDays = ALL_DAYS.filter((d) => !selectedDays.includes(d.key));

  return (
    <div className="space-y-6">
      {/* Header card with guidance */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Weekly Academic Working Days
              </CardTitle>
              <CardDescription className="mt-1">
                Configure which days of the week school is operational. Non-academic days will automatically prevent attendance marking and will be excluded from working-day analytics.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1 font-semibold text-sm">
                <Clock className="w-3.5 h-3.5 mr-1.5 text-primary" />
                {selectedDays.length} Working {selectedDays.length === 1 ? 'Day' : 'Days'} / Week
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Presets */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Quick Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PRESETS.map((preset) => {
                const isMatching =
                  preset.days.length === selectedDays.length &&
                  preset.days.every((d) => selectedDays.includes(d));

                return (
                  <button
                    key={preset.name}
                    type="button"
                    disabled={!canManage}
                    onClick={() => applyPreset(preset.days)}
                    className={`min-h-[44px] p-3 text-left rounded-lg border transition-all text-sm flex flex-col justify-between ${
                      isMatching
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-border/80 hover:bg-muted/50'
                    } ${!canManage ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-foreground">{preset.name}</span>
                      {isMatching && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">{preset.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Day Cards (Sunday through Saturday) */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Interactive Schedule (Click to Toggle)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {ALL_DAYS.map((day) => {
                const active = isDaySelected(day.key);
                return (
                  <button
                    key={day.key}
                    type="button"
                    disabled={!canManage}
                    onClick={() => toggleDay(day.key)}
                    aria-pressed={active}
                    className={`min-h-[64px] p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary ${
                      active
                        ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary text-foreground'
                        : 'border-border/60 bg-muted/20 hover:bg-muted/40 text-muted-foreground'
                    } ${!canManage ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-sm">{day.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <Badge
                      variant={active ? 'default' : 'secondary'}
                      className={`text-[10px] px-1.5 py-0 h-4 uppercase tracking-wider ${
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {active ? 'School On' : 'Day Off'}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule Breakdown Summary */}
          <div className="rounded-lg bg-muted/40 border border-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Info className="w-4 h-4 text-primary shrink-0" />
                Schedule Summary
              </div>
              <p className="text-xs text-muted-foreground">
                Active working days:{' '}
                <span className="font-medium text-foreground">
                  {selectedDays
                    .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
                    .join(', ')}
                </span>
                {offDays.length > 0 && (
                  <>
                    {' '}
                    • Weekend/Off days:{' '}
                    <span className="font-medium text-destructive">
                      {offDays.map((d) => d.label).join(', ')}
                    </span>
                  </>
                )}
              </p>
            </div>

            {canManage && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={!isDirty || updateSettingsMutation.isPending}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Reset
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={!isDirty || selectedDays.length === 0 || updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </div>

          {!canManage && (
            <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Only School Administrators or Super Administrators have permission to modify weekly academic days.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
