import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit2, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InlineScoreCellProps {
  score: number | null | undefined;
  isAbsent: boolean;
  fullMark: number;
  passMark: number;
  canEdit: boolean;
  onSave: (newScore: number | null, newIsAbsent: boolean) => Promise<void>;
}

export const InlineScoreCell: React.FC<InlineScoreCellProps> = ({
  score,
  isAbsent,
  fullMark,
  passMark,
  canEdit,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [inputScore, setInputScore] = useState<string>('');
  const [inputAbsent, setInputAbsent] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input on edit mode
  useEffect(() => {
    if (isEditing && !inputAbsent) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing, inputAbsent]);

  // Click outside to cancel or close edit mode
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (!isSaving) {
          setIsEditing(false);
          setErrorMessage(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, isSaving]);

  const handleStartEdit = () => {
    if (!canEdit || isSaving) return;
    setInputAbsent(isAbsent);
    setInputScore(
      score !== null && score !== undefined && !isAbsent ? String(score) : ''
    );
    setErrorMessage(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (isSaving) return;
    setIsEditing(false);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (inputAbsent) {
      setIsSaving(true);
      try {
        await onSave(null, true);
        setIsEditing(false);
        setErrorMessage(null);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to save');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (inputScore.trim() === '') {
      setIsSaving(true);
      try {
        await onSave(null, false);
        setIsEditing(false);
        setErrorMessage(null);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to save');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const numVal = parseFloat(inputScore);
    if (isNaN(numVal)) {
      setErrorMessage('Invalid number');
      return;
    }

    if (numVal < 0 || numVal > fullMark) {
      setErrorMessage(`Must be 0 - ${fullMark}`);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(numVal, false);
      setIsEditing(false);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Normal / Display View
  if (!isEditing) {
    let content: React.ReactNode;

    if (isAbsent) {
      content = (
        <Badge variant="destructive" className="px-1.5 py-0 text-[11px] font-bold">
          AB
        </Badge>
      );
    } else if (score !== null && score !== undefined) {
      const isPassed = score >= passMark;
      content = (
        <span
          className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full inline-block transition-colors',
            isPassed
              ? 'text-emerald-700 bg-emerald-500/15 dark:text-emerald-400'
              : 'text-destructive bg-destructive/15'
          )}
        >
          {score}
        </span>
      );
    } else {
      content = <span className="text-muted-foreground text-xs font-medium">-</span>;
    }

    if (!canEdit) {
      return (
        <div className="flex items-center justify-center p-1 min-h-[36px]">
          {content}
        </div>
      );
    }

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleStartEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleStartEdit();
          }
        }}
        title="Click to edit score"
        className={cn(
          'group relative flex items-center justify-center gap-1.5 p-1 min-h-[36px] rounded cursor-pointer select-none',
          'hover:bg-accent/50 hover:ring-1 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all'
        )}
      >
        {content}
        <Edit2 className="w-3 h-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1" />
      </div>
    );
  }

  // Edit View: Floating popover overlay anchored to the cell
  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center min-h-[36px]"
    >
      <div
        className={cn(
          'absolute z-40 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'bg-popover text-popover-foreground border border-border shadow-xl rounded-xl p-2.5',
          'flex flex-col gap-2 min-w-[210px] animate-in fade-in-0 zoom-in-95'
        )}
      >
        <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground font-medium border-b pb-1">
          <span>
            Max: {fullMark} | Pass: {passMark}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Input
            ref={inputRef}
            type="number"
            min={0}
            max={fullMark}
            step="0.5"
            placeholder={`0-${fullMark}`}
            value={inputScore}
            disabled={inputAbsent || isSaving}
            onChange={(e) => {
              setInputScore(e.target.value);
              setErrorMessage(null);
            }}
            onKeyDown={handleKeyDown}
            className="h-8 text-xs font-semibold text-center w-20 px-1"
          />

          <Button
            type="button"
            size="sm"
            variant={inputAbsent ? 'destructive' : 'outline'}
            disabled={isSaving}
            onClick={() => {
              const next = !inputAbsent;
              setInputAbsent(next);
              if (next) {
                setInputScore('');
                setErrorMessage(null);
              }
            }}
            className={cn(
              'h-8 px-2 text-[11px] font-bold shrink-0',
              inputAbsent && 'shadow-xs'
            )}
          >
            AB
          </Button>

          <Button
            type="button"
            size="icon"
            disabled={isSaving}
            onClick={handleSave}
            className="h-8 w-8 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>

        {errorMessage && (
          <span className="text-[10px] text-destructive font-medium leading-tight text-center">
            {errorMessage}
          </span>
        )}
      </div>
    </div>
  );
};
