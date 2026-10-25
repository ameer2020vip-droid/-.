import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  Printer,
  Save,
  RotateCcw,
  User,
  Plus,
  Trash2,
  FileSignature,
  FileText,
  Award,
} from 'lucide-react';
import {
  Student,
  ViolationCompensationRecord,
  CompensationTableRow,
  CounselorUser,
  AppUser,
} from '../types';
import { getUaeTodayDateString } from '../utils/time';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { PrintCompensationModal } from '../components/PrintCompensationModal';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface ViolationCompensationTabProps {
  students: Student[];
  forms: ViolationCompensationRecord[];
  currentUser: CounselorUser | AppUser | null;
  onSaveForm: (form: ViolationCompensationRecord) => Promise<void>;
  onDeleteForm?: (formId: string, studentName?: string) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  preselectedStudentId?: string | null;
  onOpenGradeSectionSearch?: () => void;
}

export const ViolationCompensationTab: React.FC<ViolationCompensationTabProps> = ({
  students,
  forms,
  currentUser,
  onSaveForm,
  onDeleteForm,
  onShowToast,
  preselectedStudentId,
  onOpenGradeSectionSearch,
}) => {
  // Student selection
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);

  // Form Fields
  const [term, setTerm] = useState('الفصل الدراسي الثاني');
  const [academicYear, setAcademicYear] = useState('2025/2026م');

  // Compensation Table Rows
  const [rows, setRows] = useState<CompensationTableRow[]>([
    {
      id: 'row-1',
      violationDegree: 'الدرجة الثانية',
      violationNumber: 'VR-0021',
      violationDescription: 'التأخر الصباحي واستخدام الهاتف المتحرك',
      deductedMarks: 4,
      positiveBehaviorCorrection: 'الانضباط اليومي والمشاركة في النشاط الرياضي المدرسي ومساعدة المشرف',
      compensationMarks: 4,
    },
  ]);

  const { schoolSettings } = useSchoolSettings();

  // Signatures
  const [officerName, setOfficerName] = useState('المرشد الأكاديمي والمهني');
  const [officerSignature, setOfficerSignature] = useState<string | undefined>(undefined);
  const [officerDate, setOfficerDate] = useState(getUaeTodayDateString());

  const [principalName, setPrincipalName] = useState(
    schoolSettings.principalName || `إدارة ${schoolSettings.schoolName}`
  );
  const [principalSignature, setPrincipalSignature] = useState<string | undefined>(undefined);
  const [principalDate, setPrincipalDate] = useState(getUaeTodayDateString());

  const [formStatus, setFormStatus] = useState<'مسودة' | 'بانتظار الاعتماد' | 'معتمد'>('معتمد');
  const [activeFormId, setActiveFormId] = useState<string | null>(null);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [formToPrint, setFormToPrint] = useState<ViolationCompensationRecord | null>(null);

  // Table Filter
  const [filterSearch, setFilterSearch] = useState('');

  // Calculations
  const totalPositiveMarksAfterCompensation = useMemo(() => {
    return rows.reduce((acc, r) => acc + (Number(r.compensationMarks) || 0), 0);
  }, [rows]);

  const totalDeductions = useMemo(() => {
    return rows.reduce((acc, r) => acc + (Number(r.deductedMarks) || 0), 0);
  }, [rows]);

  const finalTermMarks = useMemo(() => {
    // Starting baseline is 100, subtract deductions, add back compensation capped at 100
    const net = 100 - totalDeductions + totalPositiveMarksAfterCompensation;
    return Math.min(100, Math.max(0, net));
  }, [totalDeductions, totalPositiveMarksAfterCompensation]);

  // Preselected student hook
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
  };

  const handleAddRow = () => {
    const newRow: CompensationTableRow = {
      id: `row-${Date.now()}`,
      violationDegree: 'الدرجة الأولى',
      violationNumber: `VR-${Math.floor(1000 + Math.random() * 9000)}`,
      violationDescription: '',
      deductedMarks: 2,
      positiveBehaviorCorrection: '',
      compensationMarks: 2,
    };
    setRows([...rows, newRow]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) {
      onShowToast('يجب الاحتفاظ بصف واحد على الأقل في جدول التعويض', 'info');
      return;
    }
    setRows(rows.filter((r) => r.id !== id));
  };

  const handleUpdateRow = (id: string, field: keyof CompensationTableRow, val: any) => {
    setRows(
      rows.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setActiveFormId(null);
    setRows([
      {
        id: 'row-1',
        violationDegree: 'الدرجة الأولى',
        violationNumber: '',
        violationDescription: '',
        deductedMarks: 0,
        positiveBehaviorCorrection: '',
        compensationMarks: 0,
      },
    ]);
    setOfficerSignature(undefined);
    setPrincipalSignature(undefined);
  };

  const handleSave = async () => {
    if (!selectedStudent) {
      onShowToast('يرجى اختيار الطالب أولاً', 'warning');
      return;
    }

    const newId = activeFormId || `VC-${Date.now().toString().slice(-6)}`;
    const now = getUaeTodayDateString();

    const record: ViolationCompensationRecord = {
      id: newId,
      formType: 'violation_compensation',
      formNumber: 21,
      schoolId: selectedStudent.schoolId || 'school-1',
      studentId: selectedStudent.id,
      studentNumber: selectedStudent.studentNumber,
      studentName: selectedStudent.fullName,
      grade: selectedStudent.grade,
      section: selectedStudent.section,
      term,
      academicYear,
      rows,
      totalPositiveMarksAfterCompensation,
      totalMarks: 100,
      finalTermMarks,
      officerName,
      officerSignature,
      officerDate,
      principalName,
      principalSignature,
      principalDate,
      status: formStatus,
      createdAt: now,
      updatedAt: now,
    };

    await onSaveForm(record);
    setActiveFormId(newId);
    onShowToast('تم حفظ نموذج التعويض عن مخالفة بنجاح', 'success');
  };

  const handleOpenPrintCurrent = () => {
    if (!selectedStudent) {
      onShowToast('يرجى اختيار الطالب أولاً لمعاينة النموذج', 'warning');
      return;
    }
    const currentForm: ViolationCompensationRecord = {
      id: activeFormId || 'PREVIEW',
      formType: 'violation_compensation',
      formNumber: 21,
      schoolId: selectedStudent.schoolId || 'school-1',
      studentId: selectedStudent.id,
      studentNumber: selectedStudent.studentNumber,
      studentName: selectedStudent.fullName,
      grade: selectedStudent.grade,
      section: selectedStudent.section,
      term,
      academicYear,
      rows,
      totalPositiveMarksAfterCompensation,
      totalMarks: 100,
      finalTermMarks,
      officerName,
      officerSignature,
      officerDate,
      principalName,
      principalSignature,
      principalDate,
      status: formStatus,
      createdAt: getUaeTodayDateString(),
      updatedAt: getUaeTodayDateString(),
    };
    setFormToPrint(currentForm);
    setIsPrintModalOpen(true);
  };

  const handleLoadSaved = (item: ViolationCompensationRecord) => {
    const st = students.find((s) => s.id === item.studentId);
    if (st) setSelectedStudent(st);
    setActiveFormId(item.id);
    setTerm(item.term);
    setAcademicYear(item.academicYear);
    setRows(item.rows || []);
    setOfficerName(item.officerName);
    setOfficerSignature(item.officerSignature);
    setOfficerDate(item.officerDate);
    setPrincipalName(item.principalName);
    setPrincipalSignature(item.principalSignature);
    setPrincipalDate(item.principalDate);
    setFormStatus(item.status);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onShowToast(`تم تحميل نموذج التعويض رقم ${item.id}`, 'info');
  };

  const filteredHistory = useMemo(() => {
    return forms.filter((f) => {
      const q = filterSearch.toLowerCase();
      return (
        f.studentName.toLowerCase().includes(q) ||
        f.studentNumber.toLowerCase().includes(q) ||
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
            <span>ملحق (21) للقرار الوزاري رقم (851) لسنة 2018 م</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
            <Award className="w-6 h-6 text-[#D4AF37]" />
            <span>نموذج رقم (21): نموذج تعويض عن مخالفة</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-200 mt-1 max-w-2xl">
            سجل التعويض عن المخالفات السلوكية من خلال السلوك الإيجابي المصحح، وحساب الدرجات المسترجعة بدقة لاعتماد الدرجة النهائية لنهاية الفصل.
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
            اختيار الطالب للتعويض:
          </label>
          <div className="relative">
            <div className="flex items-center gap-2 border border-slate-300 rounded-xl p-2 bg-slate-50 focus-within:bg-white focus-within:border-[#0C2340] transition-all">
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
                <span>الطالب المحدد: {selectedStudent.fullName}</span>
                <span className="font-normal text-slate-600">({selectedStudent.grade} - {selectedStudent.section})</span>
              </div>
              <div className="text-slate-600">
                <span>الرقم الطلابي: </span>
                <span className="font-mono font-bold text-slate-800">{selectedStudent.studentNumber}</span>
              </div>
            </div>
          )}
        </div>

        {/* Academic term & year */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الفصل الدراسي:</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white"
            >
              <option value="الفصل الدراسي الأول">الفصل الدراسي الأول</option>
              <option value="الفصل الدراسي الثاني">الفصل الدراسي الثاني</option>
              <option value="الفصل الدراسي الثالث">الفصل الدراسي الثالث</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">العام الدراسي:</label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
            />
          </div>
        </div>

        {/* Dynamic Compensation Table */}
        <div className="pt-2">
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>بنود جدول التعويض عن المخالفات (النموذج الوزاري):</span>
              <span className="text-xs font-normal text-slate-500">({rows.length} بنود)</span>
            </label>
            <button
              type="button"
              onClick={handleAddRow}
              className="px-3 py-1.5 bg-[#006D77] hover:bg-[#005a63] text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة مخالفة للتعويض</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-xs">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 text-center">
                  <th className="p-2.5 w-[15%]">درجة المخالفة</th>
                  <th className="p-2.5 w-[12%]">رقم المخالفة</th>
                  <th className="p-2.5 w-[25%] text-right">وصف المخالفة</th>
                  <th className="p-2.5 w-[10%]">درجة الحسم</th>
                  <th className="p-2.5 w-[25%] text-right">التصحيح (السلوك الإيجابي)</th>
                  <th className="p-2.5 w-[10%]">درجة التعويض</th>
                  <th className="p-2.5 w-[3%]">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="p-2">
                      <select
                        value={row.violationDegree}
                        onChange={(e) => handleUpdateRow(row.id, 'violationDegree', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white"
                      >
                        <option value="الدرجة الأولى">الدرجة الأولى</option>
                        <option value="الدرجة الثانية">الدرجة الثانية</option>
                        <option value="الدرجة الثالثة">الدرجة الثالثة</option>
                        <option value="الدرجة الرابعة">الدرجة الرابعة</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.violationNumber}
                        onChange={(e) => handleUpdateRow(row.id, 'violationNumber', e.target.value)}
                        placeholder="رقم المخالفة"
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs text-center font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.violationDescription}
                        onChange={(e) => handleUpdateRow(row.id, 'violationDescription', e.target.value)}
                        placeholder="وصف المخالفة المرتكبة..."
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={row.deductedMarks}
                        onChange={(e) => handleUpdateRow(row.id, 'deductedMarks', Number(e.target.value))}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs text-center font-bold text-red-600"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.positiveBehaviorCorrection}
                        onChange={(e) => handleUpdateRow(row.id, 'positiveBehaviorCorrection', e.target.value)}
                        placeholder="السلوك الإيجابي / المبادرة المعوضة..."
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs text-emerald-800 font-medium"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={row.compensationMarks}
                        onChange={(e) => handleUpdateRow(row.id, 'compensationMarks', Number(e.target.value))}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs text-center font-bold text-emerald-600"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                        title="حذف هذا البند"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary Banner */}
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs md:text-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">مجموع درجات السلوك الإيجابي بعد التعويض:</span>
              <span className="font-mono font-black text-emerald-700 text-base">+{totalPositiveMarksAfterCompensation}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">مجموع درجات الحسم:</span>
              <span className="font-mono font-black text-red-700 text-base">-{totalDeductions}</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-xs">
              <span className="font-bold text-slate-900">الدرجة الكلية نهاية الفصل:</span>
              <span className="font-mono font-black text-[#0C2340] text-lg">{finalTermMarks} / 100</span>
            </div>
          </div>
        </div>

        {/* Signatures Dual Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              الموظف المسؤول:
            </label>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">اسم الموظف المسؤول:</label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white"
              />
            </div>
            <div>
              <SignatureCanvas
                onSave={(dataUrl) => setOfficerSignature(dataUrl)}
                onClear={() => setOfficerSignature(undefined)}
                title="توقيع الموظف المسؤول"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              مدير/ة المدرسة:
            </label>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">اسم مدير/ة المدرسة:</label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white"
              />
            </div>
            <div>
              <SignatureCanvas
                onSave={(dataUrl) => setPrincipalSignature(dataUrl)}
                onClear={() => setPrincipalSignature(undefined)}
                title="توقيع مدير المدرسة"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">حالة الاعتماد:</span>
            <select
              value={formStatus}
              onChange={(e: any) => setFormStatus(e.target.value)}
              className="text-xs font-bold border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-[#0C2340]"
            >
              <option value="معتمد">معتمد رسمياً</option>
              <option value="بانتظار الاعتماد">بانتظار الاعتماد</option>
              <option value="مسودة">مسودة</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-[#0C2340] hover:bg-[#1E3A8A] text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#D4AF37]" />
              <span>حفظ نموذج التعويض</span>
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
              <span>سجل نماذج التعويض السابقة (نموذج 21)</span>
            </h3>
            <p className="text-xs text-slate-500">إجمالي النماذج: {forms.length}</p>
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
            لا توجد نماذج تعويض مسجلة حالياً
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <th className="p-3">رقم النموذج</th>
                  <th className="p-3">اسم الطالب</th>
                  <th className="p-3">الصف</th>
                  <th className="p-3">الدرجات المعوضة</th>
                  <th className="p-3">الدرجة النهائية</th>
                  <th className="p-3">التاريخ</th>
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
                    <td className="p-3 font-bold text-emerald-700">+{rec.totalPositiveMarksAfterCompensation}</td>
                    <td className="p-3 font-black text-slate-900">{rec.finalTermMarks} / 100</td>
                    <td className="p-3 text-slate-600">{rec.createdAt}</td>
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
      <PrintCompensationModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        form={formToPrint}
      />
    </div>
  );
};
