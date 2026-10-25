import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  Printer,
  Save,
  RotateCcw,
  User,
  Trash2,
  FileSignature,
  FileText,
  CalendarCheck,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import {
  Student,
  AttendanceCommitmentRecord,
  CounselorUser,
  AppUser,
} from '../types';
import { getUaeTodayDateString } from '../utils/time';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { PrintAttendanceCommitmentModal } from '../components/PrintAttendanceCommitmentModal';

interface AttendanceCommitmentTabProps {
  students: Student[];
  forms: AttendanceCommitmentRecord[];
  currentUser: CounselorUser | AppUser | null;
  onSaveForm: (form: AttendanceCommitmentRecord) => Promise<void>;
  onDeleteForm?: (formId: string, studentName?: string) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  preselectedStudentId?: string | null;
  onOpenGradeSectionSearch?: () => void;
}

export const AttendanceCommitmentTab: React.FC<AttendanceCommitmentTabProps> = ({
  students,
  forms,
  currentUser,
  onSaveForm,
  onDeleteForm,
  onShowToast,
  preselectedStudentId,
  onOpenGradeSectionSearch,
}) => {
  // Selection
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);

  // Form Fields
  const [parentName, setParentName] = useState('');
  const [parentRelation, setParentRelation] = useState('الأب / ولي الأمر');
  const [parentPhone, setParentPhone] = useState('');
  const [issueDate, setIssueDate] = useState(getUaeTodayDateString());

  // Signature
  const [parentSignature, setParentSignature] = useState<string | undefined>(undefined);
  const [formStatus, setFormStatus] = useState<'معتمد ومسلّم' | 'مسودة'>('معتمد ومسلّم');
  const [activeFormId, setActiveFormId] = useState<string | null>(null);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [formToPrint, setFormToPrint] = useState<AttendanceCommitmentRecord | null>(null);

  // Filter Search
  const [filterSearch, setFilterSearch] = useState('');

  useEffect(() => {
    if (preselectedStudentId) {
      const st = students.find((s) => s.id === preselectedStudentId || s.studentNumber === preselectedStudentId);
      if (st) handleSelectStudent(st);
    }
  }, [preselectedStudentId, students]);

  const handleSelectStudent = (st: Student) => {
    setSelectedStudent(st);
    setStudentSearch('');
    setIsSearchingStudent(false);
    setParentName(st.parentName || `ولي أمر الطالب ${st.fullName}`);
    setParentPhone(st.parentPhone || st.guardianPhone || '');
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setActiveFormId(null);
    setParentName('');
    setParentRelation('الأب / ولي الأمر');
    setParentPhone('');
    setParentSignature(undefined);
  };

  const handleSave = async () => {
    if (!selectedStudent) {
      onShowToast('يرجى اختيار الطالب أولاً', 'warning');
      return;
    }

    const newId = activeFormId || `AC-${Date.now().toString().slice(-6)}`;
    const now = getUaeTodayDateString();

    const record: AttendanceCommitmentRecord = {
      id: newId,
      formType: 'attendance_commitment',
      formNumber: 27,
      schoolId: selectedStudent.schoolId || 'school-1',
      studentId: selectedStudent.id,
      studentNumber: selectedStudent.studentNumber,
      studentName: selectedStudent.fullName,
      grade: selectedStudent.grade,
      section: selectedStudent.section,
      parentName: parentName || selectedStudent.guardianName || selectedStudent.fullName,
      parentRelation,
      parentPhone,
      issueDate,
      parentSignature,
      parentSignatureDate: parentSignature ? now : undefined,
      status: formStatus,
      createdAt: now,
      updatedAt: now,
    };

    await onSaveForm(record);
    setActiveFormId(newId);
    onShowToast('تم حفظ تعهد الالتزام بالدوام المدرسي بنجاح', 'success');
  };

  const handleOpenPrintCurrent = () => {
    if (!selectedStudent) {
      onShowToast('يرجى اختيار الطالب أولاً لمعاينة النموذج', 'warning');
      return;
    }
    const currentForm: AttendanceCommitmentRecord = {
      id: activeFormId || 'PREVIEW',
      formType: 'attendance_commitment',
      formNumber: 27,
      schoolId: selectedStudent.schoolId || 'school-1',
      studentId: selectedStudent.id,
      studentNumber: selectedStudent.studentNumber,
      studentName: selectedStudent.fullName,
      grade: selectedStudent.grade,
      section: selectedStudent.section,
      parentName: parentName || selectedStudent.guardianName || selectedStudent.fullName,
      parentRelation,
      parentPhone,
      issueDate,
      parentSignature,
      status: formStatus,
      createdAt: getUaeTodayDateString(),
      updatedAt: getUaeTodayDateString(),
    };
    setFormToPrint(currentForm);
    setIsPrintModalOpen(true);
  };

  const handleLoadSaved = (item: AttendanceCommitmentRecord) => {
    const st = students.find((s) => s.id === item.studentId);
    if (st) setSelectedStudent(st);
    setActiveFormId(item.id);
    setParentName(item.parentName);
    setParentRelation(item.parentRelation);
    setParentPhone(item.parentPhone || '');
    setIssueDate(item.issueDate);
    setParentSignature(item.parentSignature);
    setFormStatus(item.status);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onShowToast(`تم تحميل تعهد الدوام رقم ${item.id}`, 'info');
  };

  const filteredHistory = useMemo(() => {
    return forms.filter((f) => {
      const q = filterSearch.toLowerCase();
      return (
        f.studentName.toLowerCase().includes(q) ||
        f.parentName.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q)
      );
    });
  }, [forms, filterSearch]);

  const searchedStudents = useMemo(() => {
    if (!studentSearch.trim()) return [];
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s) => s.fullName.toLowerCase().includes(q) || s.studentNumber.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [students, studentSearch]);

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-[#0C2340] to-[#1E3A8A] text-white p-6 rounded-2xl shadow-lg border-b-4 border-[#D4AF37] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#D4AF37]/20 text-[#D4AF37] px-3 py-1 rounded-full text-xs font-bold mb-2">
            <span>ملحق (27) للقرار الوزاري رقم (851) لسنة 2018 م</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-[#D4AF37]" />
            <span>نموذج رقم (27): تعهد ولي الأمر بالتزام الطالب بالدوام المدرسي</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-200 mt-1 max-w-2xl">
            تعهد قانوني يلزم ولي الأمر بمواظبة الطالب وعدم الغياب إلا بعذر مقبول، وإحاطته بسلسلة الإجراءات الوزارية المتدرجة حتى قرار الفصل.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenPrintCurrent}
            className="px-4 py-2 bg-[#006D77] hover:bg-[#005a63] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>معاينة الطباعة الرسمية (A4)</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>إفراغ الحقول</span>
          </button>
        </div>
      </div>

      {/* Main Form Editor */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 md:p-8 space-y-6">
        {/* Student Selector */}
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-2">
            اختيار الطالب المتعهد بشأنه:
          </label>
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 border border-slate-300 rounded-xl p-2 bg-slate-50 focus-within:bg-white focus-within:border-[#0C2340] transition-all flex-1">
                <Search className="w-5 h-5 text-slate-400 mr-2" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setIsSearchingStudent(true);
                  }}
                  placeholder="ابحث باسم الطالب أو الرقم الطلابي..."
                  className="w-full bg-transparent border-none text-sm focus:outline-hidden"
                />
              </div>

              {onOpenGradeSectionSearch && (
                <button
                  type="button"
                  onClick={onOpenGradeSectionSearch}
                  className="px-3 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100 text-[#006D77] border border-teal-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
                  title="البحث عن طريق الصفوف والشعب والمسارات"
                >
                  <Layers className="w-3.5 h-3.5 text-[#006D77]" />
                  <span className="hidden sm:inline">البحث بالصفوف والشعب</span>
                </button>
              )}
            </div>

            {isSearchingStudent && searchedStudents.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-xl overflow-hidden divide-y divide-slate-100">
                {searchedStudents.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleSelectStudent(st)}
                    className="w-full text-right p-3 hover:bg-blue-50/70 transition-colors flex justify-between items-center text-sm"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{st.fullName}</span>
                      <span className="text-xs text-slate-500 mr-2">({st.grade} / {st.section})</span>
                    </div>
                    <span className="font-mono text-xs text-[#006D77] font-semibold">{st.studentNumber}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedStudent && (
            <div className="mt-3 p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
              <div className="flex items-center gap-2 font-bold text-[#0C2340]">
                <User className="w-4 h-4 text-[#006D77]" />
                <span>الطالب: {selectedStudent.fullName}</span>
                <span className="font-normal text-slate-600">({selectedStudent.grade} - {selectedStudent.section})</span>
              </div>
              <div className="text-slate-600">
                <span>الرقم الطلابي: </span>
                <span className="font-mono font-bold text-slate-800">{selectedStudent.studentNumber}</span>
              </div>
            </div>
          )}
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم ولي الأمر:
            </label>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="اسم ولي الأمر المتعهد..."
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              صلة القرابة:
            </label>
            <input
              type="text"
              value={parentRelation}
              onChange={(e) => setParentRelation(e.target.value)}
              placeholder="الأب / الأم / الوصي القانوني..."
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              رقم الهاتف:
            </label>
            <input
              type="text"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="050-XXXXXXX"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              تاريخ تحرير التعهد:
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
            />
          </div>
        </div>

        {/* Statutory Progression of Absence Procedures */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>تدرج إجراءات الغياب الرسمي المعتمد في لائحة إدارة سلوك الطلبة (القرار 851):</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs">
            <div className="p-3 bg-white border border-slate-300 rounded-xl shadow-2xs">
              <span className="font-bold text-slate-800 block">الإنذار الشفوي</span>
              <span className="text-[11px] text-slate-500 mt-1 block">بعد غياب 3 أيام</span>
            </div>
            <div className="p-3 bg-white border border-slate-300 rounded-xl shadow-2xs">
              <span className="font-bold text-slate-800 block">إخطار أول</span>
              <span className="text-[11px] text-slate-500 mt-1 block">بعد غياب 5 أيام</span>
            </div>
            <div className="p-3 bg-white border border-slate-300 rounded-xl shadow-2xs">
              <span className="font-bold text-slate-800 block">إخطار ثاني</span>
              <span className="text-[11px] text-slate-500 mt-1 block">بعد غياب 10 أيام</span>
            </div>
            <div className="p-3 bg-white border border-slate-300 rounded-xl shadow-2xs">
              <span className="font-bold text-slate-800 block">إخطار ثالث</span>
              <span className="text-[11px] text-slate-500 mt-1 block">بعد غياب 14 يوماً</span>
            </div>
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl shadow-2xs col-span-2 sm:col-span-1">
              <span className="font-bold text-red-700 block">فصل الطالب</span>
              <span className="text-[11px] text-red-800 font-semibold mt-1 block">بعد 15 يوماً غياب</span>
            </div>
          </div>
        </div>

        {/* Parent Signature */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            توقيع ولي الأمر بالعلم والالتزام:
          </label>
          <div className="max-w-md">
            <SignatureCanvas
              onSave={(d) => setParentSignature(d)}
              onClear={() => setParentSignature(undefined)}
              title="لوحة توقيع ولي الأمر"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">حالة التعهد:</span>
            <span className="px-3 py-1 bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold rounded-lg text-xs">
              {formStatus}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-[#0C2340] hover:bg-[#1E3A8A] text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#D4AF37]" />
              <span>حفظ تعهد الدوام المدرسي</span>
            </button>
            <button
              type="button"
              onClick={handleOpenPrintCurrent}
              className="px-5 py-2.5 bg-[#006D77] hover:bg-[#005a63] text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>معاينة الطباعة (A4)</span>
            </button>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#006D77]" />
              <span>سجل تعهدات الدوام المدرسي (نموذج 27)</span>
            </h3>
            <p className="text-xs text-slate-500">إجمالي التعهدات: {forms.length}</p>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="تصفية السجلات..."
              className="w-full border border-slate-300 rounded-xl p-2 text-xs focus:border-[#0C2340] outline-hidden"
            />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            لا توجد تعهدات دوام مسجلة حالياً
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <th className="p-3">رقم التعهد</th>
                  <th className="p-3">اسم الطالب</th>
                  <th className="p-3">الصف</th>
                  <th className="p-3">ولي الأمر</th>
                  <th className="p-3">صلة القرابة</th>
                  <th className="p-3">تاريخ التحرير</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="p-3 font-mono font-semibold text-slate-800">{rec.id}</td>
                    <td className="p-3 font-bold text-[#0C2340]">{rec.studentName}</td>
                    <td className="p-3 text-slate-600">{rec.grade} / {rec.section}</td>
                    <td className="p-3 font-semibold text-slate-900">{rec.parentName}</td>
                    <td className="p-3 text-slate-600">{rec.parentRelation}</td>
                    <td className="p-3 text-slate-600">{rec.issueDate}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {rec.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setFormToPrint(rec);
                            setIsPrintModalOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-[#006D77] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="طباعة"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadSaved(rec)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="تعديل وتعبئة"
                        >
                          <FileSignature className="w-4 h-4" />
                        </button>
                        {onDeleteForm && (
                          <button
                            type="button"
                            onClick={() => onDeleteForm(rec.id, rec.studentName)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print Modal */}
      <PrintAttendanceCommitmentModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        form={formToPrint}
      />
    </div>
  );
};
