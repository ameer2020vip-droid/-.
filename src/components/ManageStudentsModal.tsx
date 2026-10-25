import React, { useState, useMemo } from 'react';
import {
  Trash2,
  AlertTriangle,
  X,
  FileSpreadsheet,
  CheckCircle2,
  ShieldAlert,
  Users,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { GradeLevel, SectionName, Student } from '../types';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface ManageStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onOpenImportModal: () => void;
  onOpenTrackCorrection?: () => void;
  onDeleteAllStudents: () => Promise<void>;
  onDeleteFilteredStudents: (studentIds: string[], summary: string) => Promise<void>;
  isViewer?: boolean;
}

export const ManageStudentsModal: React.FC<ManageStudentsModalProps> = ({
  isOpen,
  onClose,
  students,
  onOpenImportModal,
  onOpenTrackCorrection,
  onDeleteAllStudents,
  onDeleteFilteredStudents,
  isViewer = false,
}) => {
  const { schoolSettings } = useSchoolSettings();
  const [activeTab, setActiveTab] = useState<'options' | 'byGroup' | 'all'>('options');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Dynamically compute available sections for selectedGrade from actual students
  const availableSections = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (selectedGrade === 'all' || s.grade === selectedGrade) {
        if (s.section) set.add(String(s.section));
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students, selectedGrade]);

  if (!isOpen) return null;

  // Compute how many students match the group deletion criteria
  const groupStudents = students.filter((s) => {
    const matchGrade = selectedGrade === 'all' || s.grade === selectedGrade;
    const matchSec = selectedSection === 'all' || s.section === selectedSection;
    return matchGrade && matchSec;
  });

  const handleDeleteAll = async () => {
    if (confirmText.trim() !== 'حذف الكل' && confirmText.trim() !== 'DELETE') {
      setErrorMsg('يرجى كتابة كلمة "حذف الكل" للتأكيد النهائي.');
      return;
    }
    try {
      setIsDeleting(true);
      setErrorMsg('');
      await onDeleteAllStudents();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل حذف بيانات الطلبة.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (groupStudents.length === 0) {
      setErrorMsg('لا يوجد طلبة في هذه المجموعة المحددة لحذفهم.');
      return;
    }
    const label = `${selectedGrade !== 'all' ? `الصف ${selectedGrade}` : 'جميع الصفوف'} ${
      selectedSection !== 'all' ? `شعبة ${selectedSection}` : ''
    }`.trim();

    try {
      setIsDeleting(true);
      setErrorMsg('');
      await onDeleteFilteredStudents(
        groupStudents.map((s) => s.id),
        `حذف طلبة ${label}`
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل حذف مجموعة الطلبة.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#0C2340] text-white p-5 flex items-center justify-between border-b-2 border-[#D4AF37]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Users className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="text-base font-black">إدارة وتحديث سجلات الطلبة</h3>
              <p className="text-xs text-slate-300">
                تفريغ أو حذف السجلات القديمة لاستيراد دفعة جديدة أو تحديث قوائم الفصول
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Status Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#006D77] font-black text-sm">
                {students.length}
              </div>
              <div>
                <p className="text-xs font-black text-slate-800">إجمالي الطلبة المسجلين حالياً</p>
                <p className="text-[11px] text-slate-500">
                  موزعين على الصفوف (9 - 12) في النظام وقاعدة البيانات
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenImportModal();
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>استيراد ملف جديد</span>
            </button>
          </div>

          {activeTab === 'options' && (
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-700">اختر العملية المطلوبة:</p>

              {/* Option 1: Direct Import & Update */}
              <div
                onClick={() => {
                  onClose();
                  onOpenImportModal();
                }}
                className="p-4 border-2 border-emerald-100 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-900">
                      استيراد ملف Excel جديد (تحديث ودمج فوري)
                    </h4>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      يقوم بقراءة أرقام الطلبة وتحديث بياناتهم تلقائياً، وإضافة أي طالب جديد دون مساس بالسجلات السلوكية القائمة.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600 rotate-180 group-hover:-translate-x-1 transition-transform" />
              </div>

              {/* Option 2: Track Review & Correction Tool */}
              {onOpenTrackCorrection && (
                <div
                  onClick={() => {
                    onClose();
                    onOpenTrackCorrection();
                  }}
                  className="p-4 border-2 border-teal-100 hover:border-[#006D77] bg-teal-50/40 hover:bg-teal-50/80 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-teal-100 text-[#006D77] rounded-xl group-hover:scale-105 transition-transform">
                      <ShieldAlert className="w-5 h-5 text-[#006D77]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[#006D77]">
                        أداة مراجعة وتصحيح المسار الأكاديمي (عام / متقدم)
                      </h4>
                      <p className="text-[11px] text-teal-800 mt-0.5">
                        معاينة وتعديل مسارات الطلبة في السجلات الحالية مع توثيق التعديل في سجل التدقيق والحفاظ الكامل على أرقام الطلبة وسجلاتهم.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#006D77] rotate-180 group-hover:-translate-x-1 transition-transform" />
                </div>
              )}

              {/* Option 2: Delete by Grade / Section */}
              <div
                onClick={() => setActiveTab('byGroup')}
                className="p-4 border border-slate-200 hover:border-amber-400 bg-amber-50/30 hover:bg-amber-50/70 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl group-hover:scale-105 transition-transform">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-900">
                      حذف صف دراسي أو شعبة محددة
                    </h4>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      لتفريغ فصول معينة (مثلاً الصف 12 المتخرج أو شعبة محددة) واستبدالهم بملف جديد.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-600 rotate-180 group-hover:-translate-x-1 transition-transform" />
              </div>

              {/* Option 3: Delete All Current Students */}
              <div
                onClick={() => setActiveTab('all')}
                className="p-4 border border-rose-200 hover:border-rose-500 bg-rose-50/30 hover:bg-rose-50/70 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl group-hover:scale-105 transition-transform">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-rose-900">
                      حذف وتفريغ جميع الطلبة الحاليين ({students.length} طالباً)
                    </h4>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      تفريغ قاعدة بيانات الطلبة بالكامل لبدء عام دراسي جديد أو استيراد ملف مدرسة جديد من الصفر.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-rose-600 rotate-180 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          )}

          {/* Sub-view: Delete by Grade / Section */}
          {activeTab === 'byGroup' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black text-slate-800">
                  تحديد الصف والشعبة المراد حذفهم:
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('options')}
                  className="text-xs text-[#006D77] font-bold hover:underline"
                >
                  رجوع للخيارات
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">الصف الدراسي</label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                  >
                    <option value="all">كل الصفوف</option>
                    <option value="تاسع">الصف تاسع</option>
                    <option value="عاشر">الصف عاشر</option>
                    <option value="حادي عشر">الصف حادي عشر</option>
                    <option value="ثاني عشر">الصف ثاني عشر</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">الشعبة</label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                  >
                    <option value="all">كل الشعب</option>
                    {availableSections.map((sec) => (
                      <option key={sec} value={sec}>
                        شعبة {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-amber-900">الطلبة المطابقين لهذا التحديد: </span>
                  <span className="font-black text-amber-700 mr-1">{groupStudents.length} طالباً</span>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteGroup}
                  disabled={isDeleting || groupStudents.length === 0 || isViewer}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'جاري الحذف...' : `حذف (${groupStudents.length}) طالب`}</span>
                </button>
              </div>
            </div>
          )}

          {/* Sub-view: Delete All Students */}
          {activeTab === 'all' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black text-rose-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  تأكيد حذف وتفريغ جميع الطلبة
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('options')}
                  className="text-xs text-[#006D77] font-bold hover:underline"
                >
                  رجوع للخيارات
                </button>
              </div>

              <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-xl space-y-3">
                <p className="text-xs text-rose-900 leading-relaxed font-bold">
                  تنبيه هام: سيتم حذف جميع سجلات الطلبة البالغ عددهم ({students.length}) طالباً نهائياً من قاعدة البيانات والتطبيق لإفساح المجال لاستيراد قائمة جديدة بالكامل.
                </p>

                <div className="space-y-1.5 pt-2 border-t border-rose-200">
                  <label className="text-[11px] font-black text-rose-900 block">
                    للتأكيد، اكتب في الخانة أدناه كلمة: <span className="underline text-rose-700">حذف الكل</span>
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder='اكتب: حذف الكل'
                    className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-white text-xs font-bold text-center focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('options')}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAll}
                    disabled={
                      isDeleting ||
                      (confirmText.trim() !== 'حذف الكل' && confirmText.trim() !== 'DELETE') ||
                      isViewer
                    }
                    className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isDeleting ? 'جاري تفريغ السجلات...' : 'تأكيد التفريغ النهائي'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {schoolSettings.schoolName} — الإرشاد الأكاديمي والمهني
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
