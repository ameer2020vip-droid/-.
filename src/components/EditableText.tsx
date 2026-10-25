import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X, RotateCcw, Sliders } from 'lucide-react';
import { useCustomLabels } from '../context/CustomLabelsContext';

interface EditableTextProps {
  labelKey: string;
  defaultText: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div' | 'strong' | 'b';
  className?: string;
  editContainerClassName?: string;
  forceShowIndicator?: boolean;
}

export const EditableText: React.FC<EditableTextProps> = ({
  labelKey,
  defaultText,
  as: Component = 'span',
  className = '',
  editContainerClassName = '',
  forceShowIndicator = false,
}) => {
  const { t, isLiveEditMode, updateLabel, resetLabel, customLabels, openCustomizer } = useCustomLabels();
  const currentText = t(labelKey, defaultText);
  const isCustomized = customLabels[labelKey] !== undefined;

  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(currentText);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftValue(currentText);
  }, [currentText]);

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isEditing]);

  // Handle outside click to close popover
  useEffect(() => {
    if (!isEditing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsEditing(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await updateLabel(labelKey, draftValue);
    setIsEditing(false);
  };

  const handleReset = async () => {
    await resetLabel(labelKey);
    setDraftValue(defaultText);
    setIsEditing(false);
  };

  if (!isLiveEditMode && !forceShowIndicator) {
    return <Component className={className}>{currentText}</Component>;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 relative group/editable ${editContainerClassName}`}>
      <Component
        onClick={() => setIsEditing(true)}
        className={`${className} cursor-pointer transition-all ${
          isLiveEditMode
            ? 'group-hover/editable:text-amber-500 group-hover/editable:underline decoration-amber-400 decoration-dashed underline-offset-4'
            : ''
        } ${isCustomized ? 'border-b border-dashed border-amber-400/60' : ''}`}
        title={isLiveEditMode ? `انقر لتعديل هذا المسمى (${labelKey})` : undefined}
      >
        {currentText}
      </Component>

      {/* Small live edit badge / pencil */}
      {isLiveEditMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          title={`تعديل المسمى: ${currentText}`}
          className="opacity-60 group-hover/editable:opacity-100 p-1 rounded-md bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white dark:text-amber-400 dark:hover:text-slate-900 transition-all border border-amber-500/30 text-xs shrink-0 cursor-pointer shadow-2xs"
          aria-label="تعديل هذا المسمى"
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}

      {/* Popover Edit Form */}
      {isEditing && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 top-full mt-2 right-0 w-80 max-w-[90vw] p-3.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-amber-500 text-slate-900 dark:text-white text-right animate-in fade-in zoom-in-95 duration-150 ring-4 ring-amber-500/10"
        >
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Pencil className="w-3.5 h-3.5" />
              <span>تعديل المسمى</span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                <span>المسمى الأصلي:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 max-w-[170px] truncate" title={defaultText}>
                  {defaultText}
                </span>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                placeholder="اكتب المسمى الجديد..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-1">
              <div className="flex items-center gap-1">
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>حفظ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer"
                >
                  إلغاء
                </button>
              </div>

              {isCustomized && (
                <button
                  type="button"
                  onClick={handleReset}
                  title="استعادة المسمى الافتراضي"
                  className="px-2 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>استعادة</span>
                </button>
              )}
            </div>
          </form>

          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span className="font-mono text-[9px] text-slate-400 truncate max-w-[150px]">{labelKey}</span>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                openCustomizer();
              }}
              className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold"
            >
              <Sliders className="w-2.5 h-2.5" />
              <span>المحرر الشامل</span>
            </button>
          </div>
        </div>
      )}
    </span>
  );
};
