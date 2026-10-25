import React from 'react';
import { Search, Users, CheckCircle2, Award, ArrowLeft } from 'lucide-react';

export type CommitteeStage = 'investigation' | 'committee_review' | 'decision_approved' | 'execution';

interface CommitteeCaseProgressBarProps {
  currentStage: CommitteeStage;
  className?: string;
  onStageClick?: (stage: CommitteeStage) => void;
  readOnly?: boolean;
}

const STAGES: Array<{
  id: CommitteeStage;
  label: string;
  shortLabel: string;
  description: string;
  stepNumber: number;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'investigation',
    label: 'التحقيق والجمع الإداري',
    shortLabel: 'التحقيق',
    description: 'أخذ الإفادات والشهادات وتوثيق الواقعة السلوكية',
    stepNumber: 1,
    icon: Search,
  },
  {
    id: 'committee_review',
    label: 'العرض على اللجنة',
    shortLabel: 'عرض على اللجنة',
    description: 'إدراج الحالة بجدول الأعمال ومناقشة الأعضاء والتصويت',
    stepNumber: 2,
    icon: Users,
  },
  {
    id: 'decision_approved',
    label: 'قرار معتمد',
    shortLabel: 'قرار معتمد',
    description: 'توقيع رئيس اللجنة واعتماد المحضر الرسمي وحسم الدرجات',
    stepNumber: 3,
    icon: CheckCircle2,
  },
  {
    id: 'execution',
    label: 'التنفيذ والمتابعة',
    shortLabel: 'تنفيذ',
    description: 'تنفيذ خطة السلوك والتكليف البديل وتعهد ولي الأمر',
    stepNumber: 4,
    icon: Award,
  },
];

export const CommitteeCaseProgressBar: React.FC<CommitteeCaseProgressBarProps> = ({
  currentStage,
  className = '',
  onStageClick,
  readOnly = true,
}) => {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;
  // Progress percentage calculation: 1 => 12%, 2 => 40%, 3 => 70%, 4 => 100%
  const progressPercent =
    activeIndex === 0 ? 15 : activeIndex === 1 ? 48 : activeIndex === 2 ? 80 : 100;

  return (
    <div
      className={`p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 ${className}`}
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">
            مسار حالة الطالب الإجرائي:
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#006D77]/10 text-[#006D77] dark:bg-[#006D77]/25 dark:text-teal-300">
            المرحلة: {STAGES[activeIndex].label} ({activeIndex + 1} من 4)
          </span>
        </div>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-medium">
          {progressPercent}% مكتمل
        </span>
      </div>

      {/* Progress Track */}
      <div className="relative mb-2">
        {/* Background Track Line */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1.5 bg-slate-200 dark:bg-slate-700/80 rounded-full" />
        
        {/* Active Progress Fill Line */}
        <div
          className="absolute top-1/2 right-4 -translate-y-1/2 h-1.5 bg-linear-to-l from-[#006D77] via-teal-600 to-emerald-500 rounded-full transition-all duration-300"
          style={{
            width: `calc(${activeIndex / (STAGES.length - 1)} * (100% - 2rem))`,
          }}
        />

        {/* Steps Grid */}
        <div className="relative z-10 flex items-center justify-between">
          {STAGES.map((st, idx) => {
            const isCompleted = idx < activeIndex;
            const isCurrent = idx === activeIndex;
            const isFuture = idx > activeIndex;
            const Icon = st.icon;

            return (
              <div
                key={st.id}
                onClick={() => {
                  if (!readOnly && onStageClick) {
                    onStageClick(st.id);
                  }
                }}
                className={`flex flex-col items-center group ${
                  !readOnly ? 'cursor-pointer' : ''
                }`}
                style={{ width: '22%' }}
                title={`${st.label}: ${st.description}`}
              >
                {/* Step Circle Pin */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                    isCurrent
                      ? 'bg-[#006D77] text-white ring-4 ring-teal-500/20 dark:ring-teal-400/25 scale-105'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-2 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : (
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </div>

                {/* Step Label */}
                <div className="text-center mt-1.5 w-full">
                  <span
                    className={`block text-[10px] sm:text-[11px] font-bold leading-tight transition-colors ${
                      isCurrent
                        ? 'text-[#006D77] dark:text-teal-300 font-black'
                        : isCompleted
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {st.shortLabel}
                  </span>
                  <span className="hidden md:block text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5 max-w-[120px] mx-auto">
                    {st.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
