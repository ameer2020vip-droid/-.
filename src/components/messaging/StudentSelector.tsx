import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckSquare,
  Square,
  Users,
  User,
  AlertCircle,
  Phone,
  Mail,
  UserCheck,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { Student, StudentContact, GradeLevel, SectionName, AcademicTrack } from '../../types';
import { getStudentNormalizedContacts } from '../../utils/phoneUtils';

export type RecipientTargetType = 'primaryGuardian' | 'father' | 'mother' | 'student' | 'allContacts';

interface StudentSelectorProps {
  students: Student[];
  selectionMode: 'single' | 'bulk';
  onSelectionModeChange: (mode: 'single' | 'bulk') => void;
  selectedStudent: Student | null;
  onSelectStudent: (student: Student | null) => void;
  selectedStudents: Student[];
  onSelectStudents: (students: Student[]) => void;
  recipientTarget: RecipientTargetType;
  onRecipientTargetChange: (target: RecipientTargetType) => void;
  selectedContactId: string | null;
  onSelectContactId: (contactId: string | null) => void;
  isAdmin?: boolean;
}

export const StudentSelector: React.FC<StudentSelectorProps> = ({
  students,
  selectionMode,
  onSelectionModeChange,
  selectedStudent,
  onSelectStudent,
  selectedStudents,
  onSelectStudents,
  recipientTarget,
  onRecipientTargetChange,
  selectedContactId,
  onSelectContactId,
  isAdmin = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const [specialFilter, setSpecialFilter] = useState<string>('all');

  // Dynamic available sections based on students data
  const availableSections = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (gradeFilter === 'all' || s.grade === gradeFilter) {
        if (trackFilter === 'all' || (s.track || 'عام') === trackFilter) {
          if (s.section) set.add(String(s.section));
        }
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students, gradeFilter, trackFilter]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = s.fullName.toLowerCase().includes(q);
        const matchNum = s.studentNumber.includes(q);
        const matchParent = s.parentName?.toLowerCase().includes(q);
        if (!matchName && !matchNum && !matchParent) return false;
      }

      // Grade
      if (gradeFilter !== 'all') {
        const match =
          s.grade === gradeFilter ||
          (gradeFilter === '9' && s.grade === 'تاسع') ||
          (gradeFilter === '10' && s.grade === 'عاشر') ||
          (gradeFilter === '11' && s.grade === 'حادي عشر') ||
          (gradeFilter === '12' && s.grade === 'ثاني عشر') ||
          (gradeFilter === 'تاسع' && (s.grade as string) === '9') ||
          (gradeFilter === 'عاشر' && (s.grade as string) === '10') ||
          (gradeFilter === 'حادي عشر' && (s.grade as string) === '11') ||
          (gradeFilter === 'ثاني عشر' && (s.grade as string) === '12');
        if (!match) return false;
      }

      // Section
      if (sectionFilter !== 'all' && String(s.section) !== sectionFilter) return false;

      // Track
      if (trackFilter !== 'all' && (s.track || 'عام') !== trackFilter) return false;

      // Special behavioral / tardiness filters
      if (specialFilter === 'tardy_repeated' && (s.totalTardiness || 0) < 3) return false;
      if (specialFilter === 'tardy_critical' && (s.totalTardiness || 0) < 5) return false;
      if (specialFilter === 'has_violations' && (s.totalViolations || 0) <= 0) return false;
      if (specialFilter === 'status_warning' && s.status !== 'إنذار أول' && s.status !== 'متابع سلوكيًا') return false;

      return true;
    });
  }, [students, searchQuery, gradeFilter, sectionFilter, trackFilter, specialFilter]);

  // Bulk selection helpers
  const isAllFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudents.some((sel) => sel.id === s.id));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      // Unselect filtered
      const filteredIds = new Set(filteredStudents.map((s) => s.id));
      onSelectStudents(selectedStudents.filter((s) => !filteredIds.has(s.id)));
    } else {
      // Select all filtered
      const currentIds = new Set(selectedStudents.map((s) => s.id));
      const next = [...selectedStudents];
      for (const s of filteredStudents) {
        if (!currentIds.has(s.id)) {
          next.push(s);
        }
      }
      onSelectStudents(next);
    }
  };

  const handleToggleStudent = (student: Student) => {
    if (selectionMode === 'single') {
      onSelectStudent(student);
    } else {
      const exists = selectedStudents.some((s) => s.id === student.id);
      if (exists) {
        onSelectStudents(selectedStudents.filter((s) => s.id !== student.id));
      } else {
        onSelectStudents([...selectedStudents, student]);
      }
    }
  };

  // Contacts of the currently active student in single mode
  const singleStudentContacts = useMemo(() => {
    if (!selectedStudent) return [];
    return getStudentNormalizedContacts(selectedStudent);
  }, [selectedStudent]);

  return (
    <div className="space-y-4">
      {/* 1. Selection Mode Tabs */}
      <div className="flex items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSelectionModeChange('single')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectionMode === 'single'
                ? 'bg-white dark:bg-slate-700 text-[#006D77] dark:text-teal-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>طالب محدد (إرسال فردي)</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectionModeChange('bulk')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectionMode === 'bulk'
                ? 'bg-white dark:bg-slate-700 text-[#006D77] dark:text-teal-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>مجموعة طلبة (إرسال جماعي)</span>
          </button>
        </div>

        {selectionMode === 'bulk' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-[#006D77]/10 dark:bg-teal-900/40 text-[#006D77] dark:text-teal-300 px-3 py-1 rounded-lg font-bold">
              تم تحديد: {selectedStudents.length} طالب
            </span>
            {selectedStudents.length > 0 && (
              <button
                type="button"
                onClick={() => onSelectStudents([])}
                className="text-xs text-rose-600 hover:underline cursor-pointer"
              >
                إلغاء تحديد الجميع
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Recipient Target Selector */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 mb-2">
          جهة الاستلام المستهدفة:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          {[
            { id: 'primaryGuardian', label: 'ولي الأمر الأساسي' },
            { id: 'father', label: 'الأب' },
            { id: 'mother', label: 'الأم' },
            { id: 'student', label: 'الطالب نفسه' },
            { id: 'allContacts', label: 'جميع الأرقام المعتمدة' },
          ].map((tgt) => (
            <button
              key={tgt.id}
              type="button"
              onClick={() => onRecipientTargetChange(tgt.id as any)}
              className={`p-2.5 rounded-xl border text-center font-semibold transition-all cursor-pointer ${
                recipientTarget === tgt.id
                  ? 'bg-teal-50 dark:bg-teal-950/40 border-[#006D77] text-[#006D77] dark:text-teal-300 shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              {tgt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Search and Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم أو الرقم الطلابي..."
            className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-[#006D77]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Grade Filter */}
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-hidden"
          >
            <option value="all">جميع الصفوف</option>
            <option value="تاسع">الصف تاسع (9)</option>
            <option value="عاشر">الصف عاشر (10)</option>
            <option value="حادي عشر">الصف حادي عشر (11)</option>
            <option value="ثاني عشر">الصف ثاني عشر (12)</option>
          </select>

          {/* Section Filter */}
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-hidden"
          >
            <option value="all">جميع الشعب</option>
            {availableSections.map((sec) => (
              <option key={sec} value={sec}>
                شعبة {sec}
              </option>
            ))}
          </select>

          {/* Track Filter */}
          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-hidden"
          >
            <option value="all">جميع المسارات</option>
            <option value="عام">مسار عام</option>
            <option value="متقدم">مسار متقدم</option>
          </select>

          {/* Special Status Filter */}
          <select
            value={specialFilter}
            onChange={(e) => setSpecialFilter(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-hidden font-medium text-[#006D77] dark:text-teal-400"
          >
            <option value="all">جميع الحالات</option>
            <option value="tardy_repeated">تكرار التأخير (≥ 3 مرات)</option>
            <option value="tardy_critical">تأخير حرج (≥ 5 مرات)</option>
            <option value="has_violations">سجل مخالفات سلوكية</option>
            <option value="status_warning">تحت الإنذار والمتابعة</option>
          </select>
        </div>

        {/* Bulk select all toggle */}
        {selectionMode === 'bulk' && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 hover:text-[#006D77] cursor-pointer"
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="w-4 h-4 text-[#006D77]" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>تحديد كافة الطلبة الظاهرين في البحث ({filteredStudents.length})</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => onSelectStudents([...students])}
                className="text-[11px] text-[#006D77] hover:underline font-bold"
              >
                تحديد جميع طلبة المدرسة ({students.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Students List View */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>الطلبة المتاحون ({filteredStudents.length})</span>
          {selectionMode === 'single' && selectedStudent && (
            <span className="text-[#006D77] dark:text-teal-400 font-bold">
              المختار: {selectedStudent.fullName}
            </span>
          )}
        </div>

        <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              لا يوجد طلبة مطابقين لمعايير البحث المحددة
            </div>
          ) : (
            filteredStudents.map((s) => {
              const isSelected =
                selectionMode === 'single'
                  ? selectedStudent?.id === s.id
                  : selectedStudents.some((sel) => sel.id === s.id);

              const contacts = getStudentNormalizedContacts(s);
              const hasContacts = contacts.length > 0;

              return (
                <div
                  key={s.id}
                  onClick={() => handleToggleStudent(s)}
                  className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-teal-50/70 dark:bg-teal-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {selectionMode === 'bulk' ? (
                      isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#006D77] dark:text-teal-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                      )
                    ) : isSelected ? (
                      <div className="w-4 h-4 rounded-full border-4 border-[#006D77] shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {s.fullName}
                        </span>
                        <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                          #{s.studentNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>
                          الصف {s.grade} - شعبة {s.section}
                        </span>
                        <span>•</span>
                        <span>مسار {s.track}</span>
                        {s.totalTardiness > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 font-medium">
                              تأخير: {s.totalTardiness}
                            </span>
                          </>
                        )}
                        {s.totalViolations > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-rose-600 font-medium">
                              مخالفات: {s.totalViolations}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-left">
                    {hasContacts ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full font-medium">
                        <Phone className="w-2.5 h-2.5" />
                        <span>{contacts.length} هاتف مسجل</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full font-medium">
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span>بلا جهة اتصال</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. Contact Picker (in Single Student Mode) */}
      {selectionMode === 'single' && selectedStudent && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              أرقام وجهات الاتصال المسجلة للطالب {selectedStudent.fullName.split(' ')[0]}:
            </h4>
            <span className="text-[11px] text-slate-400">حدد جهة الاتصال لإرسال الرسالة إليها</span>
          </div>

          {singleStudentContacts.length === 0 ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>لا توجد وسيلة اتصال مسجلة لهذا الطالب في قاعدة البيانات.</span>
              </div>
              <button
                type="button"
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold"
              >
                تحديث بيانات الاتصال
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {singleStudentContacts.map((c) => {
                const isSelected = selectedContactId === c.id || (!selectedContactId && c.isPrimary);
                return (
                  <div
                    key={c.id}
                    onClick={() => onSelectContactId(c.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-[#006D77] shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                        <span>{c.name}</span>
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
                          {c.relation}
                        </span>
                      </div>
                      {c.isPrimary && (
                        <span className="text-[10px] text-[#006D77] font-bold bg-[#006D77]/10 px-1.5 py-0.5 rounded">
                          أساسي
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-mono text-xs">{c.phone || c.email}</span>
                      <div className="flex items-center gap-1">
                        {c.hasWhatsApp && (
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                            واتساب متاح
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
