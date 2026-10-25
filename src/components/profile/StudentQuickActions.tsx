import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Calendar,
  PhoneCall,
  FileSignature,
  UserPlus,
  Users,
  ChevronDown,
} from 'lucide-react';

interface StudentQuickActionsProps {
  onRegisterViolation?: () => void;
  onRegisterTardiness?: () => void;
  onRegisterAbsence?: () => void;
  onContactGuardian?: () => void;
  onOpenWarning?: () => void;
  onOpenNotice?: () => void;
  onOpenSummon?: () => void;
  onOpenCommitment?: () => void;
  onOpenViolationReport?: () => void;
  onAddCaseOrPlan?: () => void;
  onReferToCommittee?: () => void;
}

export const StudentQuickActions: React.FC<StudentQuickActionsProps> = ({
  onRegisterViolation,
  onRegisterTardiness,
  onRegisterAbsence,
  onContactGuardian,
  onOpenWarning,
  onOpenNotice,
  onOpenSummon,
  onOpenCommitment,
  onOpenViolationReport,
  onAddCaseOrPlan,
  onReferToCommittee,
}) => {
  const [showFormsMenu, setShowFormsMenu] = useState(false);

  return (
    <div className="relative">
      <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-2 sm:p-2.5 shadow-xs flex items-center gap-2 overflow-x-auto scrollbar-none">
        {/* 1. تسجيل مخالفة (Red) */}
        {onRegisterViolation && (
          <button
            type="button"
            onClick={onRegisterViolation}
            className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>تسجيل مخالفة</span>
          </button>
        )}

        {/* 2. تسجيل تأخر (Amber) */}
        {onRegisterTardiness && (
          <button
            type="button"
            onClick={onRegisterTardiness}
            className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/60 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
          >
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>تسجيل تأخر</span>
          </button>
        )}

        {/* 3. تسجيل غياب (Blue/Cyan) */}
        {onRegisterAbsence && (
          <button
            type="button"
            onClick={onRegisterAbsence}
            className="px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800/60 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>تسجيل غياب</span>
          </button>
        )}

        {/* 4. تواصل مع ولي الأمر (Green) */}
        {onContactGuardian && (
          <button
            type="button"
            onClick={onContactGuardian}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
          >
            <PhoneCall className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>تواصل مع ولي الأمر</span>
          </button>
        )}

        {/* 5. إنشاء تعهد / نموذج (Purple Dropdown) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFormsMenu(!showFormsMenu)}
            className="px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/60 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
          >
            <FileSignature className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>إنشاء تعهد / نموذج</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {showFormsMenu && (
            <div className="absolute top-full mt-1.5 right-0 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 min-w-[200px] text-right">
              {onOpenSummon && (
                <button
                  type="button"
                  onClick={() => {
                    setShowFormsMenu(false);
                    onOpenSummon();
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-[#006D77]" />
                  <span>استدعاء ولي أمر (نموذج 8)</span>
                </button>
              )}
              {onOpenWarning && (
                <button
                  type="button"
                  onClick={() => {
                    setShowFormsMenu(false);
                    onOpenWarning();
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>إنذار تأخر أو غياب (نموذج 9)</span>
                </button>
              )}
              {onOpenCommitment && (
                <button
                  type="button"
                  onClick={() => {
                    setShowFormsMenu(false);
                    onOpenCommitment();
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  <span>تعهد ولي أمر (نموذج 10)</span>
                </button>
              )}
              {onOpenNotice && (
                <button
                  type="button"
                  onClick={() => {
                    setShowFormsMenu(false);
                    onOpenNotice();
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  <span>إخطار حسم درجات (نموذج 7)</span>
                </button>
              )}
              {onOpenViolationReport && (
                <button
                  type="button"
                  onClick={() => {
                    setShowFormsMenu(false);
                    onOpenViolationReport();
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                  <span>تقرير مخالفة سلوكية (نموذج 6)</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 6. إضافة للحالة / الخطة (Teal) */}
        {onAddCaseOrPlan && (
          <button
            type="button"
            onClick={onAddCaseOrPlan}
            className="px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800/60 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>إضافة للحالة / الخطة</span>
          </button>
        )}

        {/* 7. إحالة للجنة السلوك (Orange/Gold) */}
        {onReferToCommittee && (
          <button
            type="button"
            onClick={onReferToCommittee}
            className="px-3.5 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/60 border border-orange-200 dark:border-orange-800/60 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span>إحالة للجنة السلوك</span>
          </button>
        )}
      </div>
    </div>
  );
};
