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
  Smartphone,
  ShieldAlert,
  ArrowRightCircle,
} from 'lucide-react';
import {
  Student,
  DeviceConfiscationRecord,
  CounselorUser,
  AppUser,
} from '../types';
import { getUaeTodayDateString } from '../utils/time';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { PrintDeviceConfiscationModal } from '../components/PrintDeviceConfiscationModal';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface DeviceConfiscationTabProps {
  students: Student[];
  forms: DeviceConfiscationRecord[];
  currentUser: CounselorUser | AppUser | null;
  onSaveForm: (form: DeviceConfiscationRecord) => Promise<void>;
  onDeleteForm?: (formId: string, studentName?: string) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onSwitchToReturnTab?: (confiscationItem: DeviceConfiscationRecord) => void;
  preselectedStudentId?: string | null;
  onOpenGradeSectionSearch?: () => void;
}

export const DeviceConfiscationTab: React.FC<DeviceConfiscationTabProps> = ({
  students,
  forms,
  currentUser,
  onSaveForm,
  onDeleteForm,
  onShowToast,
  onSwitchToReturnTab,
  preselectedStudentId,
  onOpenGradeSectionSearch,
}) => {
  const { schoolSettings } = useSchoolSettings();

  // Selection
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);

  // Form Fields
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [deviceDescription, setDeviceDescription] = useState('هاتف ذكي (iPhone) باللون الأسود');
  const [retentionDuration, setRetentionDuration] = useState('أسبوع دراسي كامل وحتى مراجعة ولي الأمر');
  const [confiscationDate, setConfiscationDate] = useState(getUaeTodayDateString());

  // Signatures
  const [officerName, setOfficerName] = useState('مشرف السلوك الطلابي');
  const [officerSignature, setOfficerSignature] = useState<string | undefined>(undefined);
  const [principalName, setPrincipalName] = useState(
    schoolSettings.principalName || `إدارة ${schoolSettings.schoolName}`
  );
  const [principalSignature, setPrincipalSignature] = useState<string | undefined>(undefined);
  const [parentSignature, setParentSignature] = useState<string | undefined>(undefined);

  const [formStatus, setFormStatus] = useState<'محجوز' | 'تمت الإعادة لولي الأمر' | 'مسودة'>('محجوز');
  const [activeFormId, setActiveFormId] = useState<string | null>(null);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [formToPrint, setFormToPrint] = useState<DeviceConfiscationRecord | null>(null);

  // Table Search Filter
  const [filterSearch, setFilterSearch] = useState('');

  // Auto-fill student if preselected
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
    setParentPhone('');
    setDeviceDescription('هاتف ذكي (iPhone) باللون الأسود');
    setRetentionDuration('أسبوع دراسي كامل وحتى مراجعة ولي الأمر');
    setConfiscationDate(getUaeTodayDateString());
    setOfficerSignature(undefined);
    setPrincipalSignature(undefined);
    setParentSignature(undefined);
    setFormStatus('محجوز');
  };

  const handleSave = async () => {
    if (!selectedStudent) {
      onShowToast('يرجى اختيار الطالب أولاً', 'warning');
      return;
    }
    if (!deviceDescription.trim()) {
      onShowToast('يرجى تحديد نوع ومواصفات الجهاز المصادر', 'warning');
      return;
    }

    const newId = activeFormId || `DC-${Date.now().toString().slice(-6)}`;
    const now = getUaeTodayDateString();

    const record: DeviceConfiscationRecord = {
      id: newId,
      formType: 'device_confiscation',
      formNumber: 24,
      schoolId: selectedStudent.schoolId || 'school-1',
      studentId: selectedStudent.id,
      studentNumber: selectedStudent.studentNumber,
      studentName: selectedStudent.fullName,
      grade: selectedStudent.grade,
      section: selectedStudent.section,
      parentName: parentName || selectedStudent.guardianName || selectedStudent.fullName,
      parentPhone,
      deviceDescription,
      retentionDuration,
      confiscationDate,
      officerName,
      officerSignature,
      principalName,
      principalSignature,
      parentSignature,
      status: formStatus,
      createdAt: now,
      updatedAt: now,
    };

    await onSaveForm(record);
    setActiveFormId(newId);
    onShowToast('تم حفظ نموذج مصادرة الجهاز الإلكتروني بنجاح', 'success');
  };

  const handleOpenPrintCurrent = () => {
    if (!selectedStudent) {
      onShowToast('يرجى اختيار الطالب أولاً لمعاينة النموذج', 'warning');
      return;
    }
    const currentForm: DeviceConfiscationRecord = {
      id: activeFormId || 'PREVIEW',
      formType: 'device_confiscation',
      formNumber: 24,
      schoolId: selectedStudent.schoolId || 'school-1',
      studentId: selectedStudent.id,
      studentNumber: selectedStudent.studentNumber,
      studentName: selectedStudent.fullName,
      grade: selectedStudent.grade,
      section: selectedStudent.section,
      parentName: parentName || selectedStudent.guardianName || selectedStudent.fullName,
      parentPhone,
      deviceDescription,
      retentionDuration,
      confiscationDate,
      officerName,
      officerSignature,
      principalName,
      principalSignature,
      parentSignature,
      status: formStatus,
      createdAt: getUaeTodayDateString(),
      updatedAt: getUaeTodayDateString(),
    };
    setFormToPrint(currentForm);
    setIsPrintModalOpen(true);
  };

  const handleLoadSaved = (item: DeviceConfiscationRecord) => {
    const st = students.find((s) => s.id === item.studentId);
    if (st) setSelectedStudent(st);
    setActiveFormId(item.id);
    setParentName(item.parentName);
    setParentPhone(item.parentPhone || '');
    setDeviceDescription(item.deviceDescription);
    setRetentionDuration(item.retentionDuration);
    setConfiscationDate(item.confiscationDate);
    setOfficerName(item.officerName || 'مشرف السلوك الطلابي');
    setOfficerSignature(item.officerSignature);
    setPrincipalName(item.principalName || 'إدارة المدرسة');
    setPrincipalSignature(item.principalSignature);
    setParentSignature(item.parentSignature);
    setFormStatus(item.status);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onShowToast(`تم تحميل نموذج المصادرة رقم ${item.id}`, 'info');
  };

  const filteredHistory = useMemo(() => {
    return forms.filter((f) => {
      const q = filterSearch.toLowerCase();
      return (
        f.studentName.toLowerCase().includes(q) ||
        f.deviceDescription.toLowerCase().includes(q) ||
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
            <span>ملحق (24) للقرار الوزاري رقم (851) لسنة 2018 م</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-[#D4AF37]" />
            <span>نموذج رقم (24): مصادرة أجهزة إلكترونية</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-200 mt-1 max-w-2xl">
            إجراء وزاري رسمي لحفظ وتوثيق مصادرة الأجهزة الإلكترونية المخالفة للائحة إدارة سلوك الطلبة في مؤسسات التعليم العام وتحديد مدة الحفظ القانونية.
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

      {/* Main Editor */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 md:p-8 space-y-6">
        {/* Student Selection */}
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-2">
            اختيار الطالب المضبوط بحوزته الجهاز:
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
                <span>رقم القيد: </span>
                <span className="font-mono font-bold text-slate-800">{selectedStudent.studentNumber}</span>
              </div>
            </div>
          )}
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ولي أمر الطالب / الطالبة:
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

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              نوع ومواصفات الجهاز المصادر (اسم الجهاز، اللون، أو الرقم التسلسلي):
            </label>
            <input
              type="text"
              value={deviceDescription}
              onChange={(e) => setDeviceDescription(e.target.value)}
              placeholder="مثال: هاتف ذكي سامسونج أزرق اللون / سماعة لاسلكية / ساعة إلكترونية..."
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              مدة الاحتفاظ بالجهاز المصادر:
            </label>
            <input
              type="text"
              value={retentionDuration}
              onChange={(e) => setRetentionDuration(e.target.value)}
              placeholder="مثال: أسبوع دراسي كامل / حتى نهاية الفصل الدراسي..."
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              تاريخ تحرير المصادرة:
            </label>
            <input
              type="date"
              value={confiscationDate}
              onChange={(e) => setConfiscationDate(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
            />
          </div>
        </div>

        {/* Statutory Legal Warning Box */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            <span>التنبيه القانوني المعتمد في القرار الوزاري (851):</span>
          </div>
          <p className="leading-relaxed">
            «أما إذا ثبت أن الجهاز يحتوي على صور لأحد أعضاء الهيئة الإدارية والتدريسية أو أحد الطلبة أو به بعض ما ينافي الدين والعادات والتقاليد والأعراف في دولة الإمارات فإنه سيتم تسليمه للجهات المعنية لاتخاذ إجراءاتها».
          </p>
        </div>

        {/* Signatures Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-slate-200">
          {/* Officer */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              توقيع الموظف المسؤول:
            </label>
            <input
              type="text"
              value={officerName}
              onChange={(e) => setOfficerName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white"
              placeholder="اسم الموظف"
            />
            <SignatureCanvas
              onSave={(d) => setOfficerSignature(d)}
              onClear={() => setOfficerSignature(undefined)}
              title="توقيع الموظف"
            />
          </div>

          {/* Principal */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              توقيع مدير المدرسة:
            </label>
            <input
              type="text"
              value={principalName}
              onChange={(e) => setPrincipalName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white"
              placeholder="اسم المدير"
            />
            <SignatureCanvas
              onSave={(d) => setPrincipalSignature(d)}
              onClear={() => setPrincipalSignature(undefined)}
              title="توقيع المدير"
            />
          </div>

          {/* Parent Signature */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              توقيع ولي أمر الطالب:
            </label>
            <div className="text-[11px] text-slate-500">
              توقيع استلام الإخطار بالعلم
            </div>
            <SignatureCanvas
              onSave={(d) => setParentSignature(d)}
              onClear={() => setParentSignature(undefined)}
              title="توقيع ولي الأمر"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">حالة الجهاز:</span>
            <select
              value={formStatus}
              onChange={(e: any) => setFormStatus(e.target.value)}
              className="text-xs font-bold border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-[#0C2340]"
            >
              <option value="محجوز">محجوز في أمانات الإدارة</option>
              <option value="تمت الإعادة لولي الأمر">تمت الإعادة لولي الأمر (نموذج 25)</option>
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
              <span>حفظ نموذج المصادرة</span>
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
              <span>سجل الأجهزة الإلكترونية المصادرة (نموذج 24)</span>
            </h3>
            <p className="text-xs text-slate-500">إجمالي الأجهزة المسجلة: {forms.length}</p>
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
            لا توجد أجهزة مصادرة مسجلة حالياً
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <th className="p-3">رقم النموذج</th>
                  <th className="p-3">اسم الطالب</th>
                  <th className="p-3">الصف</th>
                  <th className="p-3">الجهاز المصادر</th>
                  <th className="p-3">مدة الاحتفاظ</th>
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
                    <td className="p-3 font-medium text-slate-800">{rec.deviceDescription}</td>
                    <td className="p-3 text-slate-600">{rec.retentionDuration}</td>
                    <td className="p-3 text-slate-600">{rec.confiscationDate}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          rec.status === 'محجوز'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {rec.status === 'محجوز' && onSwitchToReturnTab && (
                          <button
                            type="button"
                            onClick={() => onSwitchToReturnTab(rec)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                            title="إعادة الجهاز لولي الأمر (نموذج 25)"
                          >
                            <ArrowRightCircle className="w-4 h-4" />
                            <span className="hidden sm:inline">إعادة</span>
                          </button>
                        )}
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
      <PrintDeviceConfiscationModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        form={formToPrint}
      />
    </div>
  );
};
