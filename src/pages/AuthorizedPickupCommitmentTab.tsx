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
  Car,
  IdCard,
} from 'lucide-react';
import {
  Student,
  AuthorizedPickupCommitmentRecord,
  CounselorUser,
  AppUser,
} from '../types';
import { getUaeTodayDateString } from '../utils/time';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { PrintAuthorizedPickupModal } from '../components/PrintAuthorizedPickupModal';

interface AuthorizedPickupCommitmentTabProps {
  students: Student[];
  forms: AuthorizedPickupCommitmentRecord[];
  currentUser: CounselorUser | AppUser | null;
  onSaveForm: (form: AuthorizedPickupCommitmentRecord) => Promise<void>;
  onDeleteForm?: (formId: string, studentName?: string) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  preselectedStudentId?: string | null;
  onOpenGradeSectionSearch?: () => void;
}

export const AuthorizedPickupCommitmentTab: React.FC<AuthorizedPickupCommitmentTabProps> = ({
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
  const [parentName, setParentName] = useState('');
  const [isParentNonFather, setIsParentNonFather] = useState(false);
  const [parentNonFatherName, setParentNonFatherName] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  // Authorized Person Fields
  const [authorizedPersonName, setAuthorizedPersonName] = useState('');
  const [authorizedPersonRelation, setAuthorizedPersonRelation] = useState('سائق خاص / قريب');
  const [authorizedPersonEmiratesId, setAuthorizedPersonEmiratesId] = useState('784-');
  const [authorizedPersonPhone, setAuthorizedPersonPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [issueDate, setIssueDate] = useState(getUaeTodayDateString());

  // Signatures
  const [parentSignature, setParentSignature] = useState<string | undefined>(undefined);
  const [formStatus, setFormStatus] = useState<'معتمد وساري' | 'مسودة' | 'ملغي ومستبدل'>('معتمد وساري');
  const [activeFormId, setActiveFormId] = useState<string | null>(null);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [formToPrint, setFormToPrint] = useState<AuthorizedPickupCommitmentRecord | null>(null);

  // Filter Search
  const [filterSearch, setFilterSearch] = useState('');

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
    setParentName(st.parentName || `ولي أمر الطالب ${st.fullName}`);
    setParentPhone(st.parentPhone || st.guardianPhone || '');
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setActiveFormId(null);
    setParentName('');
    setIsParentNonFather(false);
    setParentNonFatherName('');
    setParentPhone('');
    setAuthorizedPersonName('');
    setAuthorizedPersonRelation('سائق خاص / قريب');
    setAuthorizedPersonEmiratesId('784-');
    setAuthorizedPersonPhone('');
    setNotes('');
    setParentSignature(undefined);
  };

  const handleSave = async () => {
    if (!selectedStudent) {
      onShowToast('يرجى اختيار الطالب أولاً', 'warning');
      return;
    }
    if (!authorizedPersonName.trim()) {
      onShowToast('يرجى إدخال اسم الشخص المخول بالاستلام', 'warning');
      return;
    }

    const newId = activeFormId || `AP-${Date.now().toString().slice(-6)}`;
    const now = getUaeTodayDateString();

    const record: AuthorizedPickupCommitmentRecord = {
      id: newId,
      formType: 'authorized_pickup_commitment',
      formNumber: 26,
      schoolId: selectedStudent.schoolId || 'school-1',
      studentId: selectedStudent.id,
      studentNumber: selectedStudent.studentNumber,
      studentName: selectedStudent.fullName,
      grade: selectedStudent.grade,
      section: selectedStudent.section,
      parentName: parentName || selectedStudent.guardianName || selectedStudent.fullName,
      isParentNonFather,
      parentNonFatherName: isParentNonFather ? parentNonFatherName : undefined,
      parentPhone,
      authorizedPersonName,
      authorizedPersonRelation,
      authorizedPersonEmiratesId,
      authorizedPersonPhone,
      notes,
      parentSignature,
      issueDate,
      status: formStatus,
      createdAt: now,
      updatedAt: now,
    };

    await onSaveForm(record);
    setActiveFormId(newId);
    onShowToast('تم حفظ تعهد الأشخاص المخولين بالاستلام بنجاح', 'success');
  };

  const handleOpenPrintCurrent = () => {
    if (!selectedStudent) {
      onShowToast('يرجى اختيار الطالب أولاً لمعاينة النموذج', 'warning');
      return;
    }
    const currentForm: AuthorizedPickupCommitmentRecord = {
      id: activeFormId || 'PREVIEW',
      formType: 'authorized_pickup_commitment',
      formNumber: 26,
      schoolId: selectedStudent.schoolId || 'school-1',
      studentId: selectedStudent.id,
      studentNumber: selectedStudent.studentNumber,
      studentName: selectedStudent.fullName,
      grade: selectedStudent.grade,
      section: selectedStudent.section,
      parentName: parentName || selectedStudent.guardianName || selectedStudent.fullName,
      isParentNonFather,
      parentNonFatherName,
      parentPhone,
      authorizedPersonName,
      authorizedPersonRelation,
      authorizedPersonEmiratesId,
      authorizedPersonPhone,
      notes,
      parentSignature,
      issueDate,
      status: formStatus,
      createdAt: getUaeTodayDateString(),
      updatedAt: getUaeTodayDateString(),
    };
    setFormToPrint(currentForm);
    setIsPrintModalOpen(true);
  };

  const handleLoadSaved = (item: AuthorizedPickupCommitmentRecord) => {
    const st = students.find((s) => s.id === item.studentId);
    if (st) setSelectedStudent(st);
    setActiveFormId(item.id);
    setParentName(item.parentName);
    setIsParentNonFather(!!item.isParentNonFather);
    setParentNonFatherName(item.parentNonFatherName || '');
    setParentPhone(item.parentPhone || '');
    setAuthorizedPersonName(item.authorizedPersonName);
    setAuthorizedPersonRelation(item.authorizedPersonRelation);
    setAuthorizedPersonEmiratesId(item.authorizedPersonEmiratesId);
    setAuthorizedPersonPhone(item.authorizedPersonPhone);
    setNotes(item.notes || '');
    setIssueDate(item.issueDate);
    setParentSignature(item.parentSignature);
    setFormStatus(item.status);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onShowToast(`تم تحميل نموذج التعهد رقم ${item.id}`, 'info');
  };

  const filteredHistory = useMemo(() => {
    return forms.filter((f) => {
      const q = filterSearch.toLowerCase();
      return (
        f.studentName.toLowerCase().includes(q) ||
        f.authorizedPersonName.toLowerCase().includes(q) ||
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
            <span>ملحق (26) للقرار الوزاري رقم (851) لسنة 2018 م</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
            <Car className="w-6 h-6 text-[#D4AF37]" />
            <span>نموذج رقم (26): تعهد ولي الأمر بالأشخاص المخولين بالاستلام</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-200 mt-1 max-w-2xl">
            إقرار رسمي من ولي الأمر بتوصيل الطالب والالتزام بمواعيد الدوام، وتفويض الأشخاص المخولين رسمياً باصطحاب الطالب عند الانصراف.
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
            اختيار الطالب المعني بالتعهد:
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

        {/* Guardian Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم ولي أمر الطالب:
            </label>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="اسم ولي الأمر..."
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              رقم هاتف ولي الأمر:
            </label>
            <input
              type="text"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="050-XXXXXXX"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="chk-non-father"
              checked={isParentNonFather}
              onChange={(e) => setIsParentNonFather(e.target.checked)}
              className="w-4 h-4 text-[#006D77] rounded-sm focus:ring-[#006D77]"
            />
            <label htmlFor="chk-non-father" className="text-xs font-bold text-slate-700 cursor-pointer">
              ولي الأمر ليس الأب (الأم / العم / وصي قانوني)
            </label>
          </div>

          {isParentNonFather && (
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                اسم ولي الأمر إذا كان غير الأب وصفته:
              </label>
              <input
                type="text"
                value={parentNonFatherName}
                onChange={(e) => setParentNonFatherName(e.target.value)}
                placeholder="اسم ولي الأمر وصفته القانونية..."
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
              />
            </div>
          )}
        </div>

        {/* Authorized Person Section */}
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-200 pb-2">
            <IdCard className="w-5 h-5 text-[#006D77]" />
            <span>بيانات الشخص المخول له توصيل واستلام الطالب (وفقاً للنموذج):</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الاسم الكامل للشخص المخول:
              </label>
              <input
                type="text"
                value={authorizedPersonName}
                onChange={(e) => setAuthorizedPersonName(e.target.value)}
                placeholder="الاسم الثلاثي أو الرباعي..."
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                صلته بالطالب:
              </label>
              <input
                type="text"
                value={authorizedPersonRelation}
                onChange={(e) => setAuthorizedPersonRelation(e.target.value)}
                placeholder="سائق العائلة / العم / الخال / الأخ الأكبر..."
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رقم الهوية الإماراتية للشخص المخول:
              </label>
              <input
                type="text"
                value={authorizedPersonEmiratesId}
                onChange={(e) => setAuthorizedPersonEmiratesId(e.target.value)}
                placeholder="784-XXXX-XXXXXXX-X"
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رقم هاتف الشخص المخول:
              </label>
              <input
                type="text"
                value={authorizedPersonPhone}
                onChange={(e) => setAuthorizedPersonPhone(e.target.value)}
                placeholder="050-XXXXXXX"
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ملاحظات إضافية / رقم لوحة المركبة (إن وجد):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="بيانات المركبة أو اشتراطات خاصة..."
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white"
              />
            </div>
          </div>
        </div>

        {/* Statutory Pledge Notice */}
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 leading-relaxed">
          <p className="font-bold">نص التعهد الرسمي المقر من ولي الأمر:</p>
          <p className="mt-1">
            «أتعهد أنا ولي أمر الطالب بتوصيل ابني / ابنتي من وإلى المدرسة يومياً في الوقت المحدد للحضور والانصراف من المدرسة ، وفي حال كان هناك عذر شخصي سأقوم بالتواصل مع إدارة المدرسة فوراً موضحاً الأسباب وأرسل الشخص المخول له باصطحاب ابني/ ابنتي. وهذا إقرار مني بذلك».
          </p>
        </div>

        {/* Parent Signature */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            توقيع ولي الأمر على التعهد:
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
            <select
              value={formStatus}
              onChange={(e: any) => setFormStatus(e.target.value)}
              className="text-xs font-bold border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-[#0C2340]"
            >
              <option value="معتمد وساري">معتمد وساري المفعول</option>
              <option value="مسودة">مسودة</option>
              <option value="ملغي ومستبدل">ملغي ومستبدل</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-[#0C2340] hover:bg-[#1E3A8A] text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#D4AF37]" />
              <span>حفظ تعهد الاستلام</span>
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
              <span>سجل تعهدات الأشخاص المخولين بالاستلام (نموذج 26)</span>
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
            لا توجد تعهدات استلام مسجلة حالياً
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <th className="p-3">رقم التعهد</th>
                  <th className="p-3">اسم الطالب</th>
                  <th className="p-3">الصف</th>
                  <th className="p-3">الشخص المخول</th>
                  <th className="p-3">صلته بالطالب</th>
                  <th className="p-3">رقم الهاتف</th>
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
                    <td className="p-3 font-bold text-slate-900">{rec.authorizedPersonName}</td>
                    <td className="p-3 text-slate-600">{rec.authorizedPersonRelation}</td>
                    <td className="p-3 text-slate-600">{rec.authorizedPersonPhone}</td>
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
      <PrintAuthorizedPickupModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        form={formToPrint}
      />
    </div>
  );
};
