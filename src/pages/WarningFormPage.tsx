import React, { useState, useEffect } from 'react';
import {
  FileSignature,
  Printer,
  Eye,
  Save,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  User,
  School,
  Search,
  Check,
  ShieldCheck,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Student, WarningFormRecord, CounselorUser } from '../types';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { PrintWarningModal } from '../components/PrintWarningModal';
import { getUaeTodayDateString, getUaeFullDateTimeString } from '../utils/time';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

const OFFICIAL_MODEL_9_PLEDGE =
  'بأن ألتزم بقواعد السلوك والنظام داخل المدرسة، والمحافظة على مرافقها، واتباع التعليمات والنظم المدرسية، وفي حالة مخالفتي أكون متحملاً لكافة الإجراءات التي تطبقها إدارة المدرسة بحقي وفق ما جاء في لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام، علمًا بأنه قد تم تنبيهي بشكل شفهي أكثر من مرة على السلوكيات غير الإيجابية فيها والصادرة عني والتي تتلخص في الآتي:';

interface WarningFormPageProps {
  students: Student[];
  counselor: CounselorUser | null;
  warningForms: WarningFormRecord[];
  onSaveForm: (form: WarningFormRecord) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  selectedStudentIdForWarning?: string | null;
  onOpenGradeSectionSearch?: () => void;
}

export const WarningFormPage: React.FC<WarningFormPageProps> = ({
  students,
  counselor,
  warningForms,
  onSaveForm,
  onShowToast,
  selectedStudentIdForWarning,
  onOpenGradeSectionSearch,
}) => {
  const isViewer = counselor?.role === 'viewer';
  const { schoolSettings } = useSchoolSettings();

  // Existing Forms list or Create New
  const [selectedFormId, setSelectedFormId] = useState<string>('new');

  // Form Fields State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    selectedStudentIdForWarning || students[0]?.id || ''
  );
  const [emirate, setEmirate] = useState(schoolSettings.emirate || 'دبي');
  const [council, setCouncil] = useState('مجلس 2');
  const [sector, setSector] = useState('النطاق ج');
  const [school, setSchool] = useState(schoolSettings.schoolName);

  // Three slots for prior behaviors / oral warnings (Exact to Model 9)
  const [priorBehavior1, setPriorBehavior1] = useState(
    'تنبيه شفهي أول بخصوص عدم الانتباه والحديث أثناء الحصة الصفية.'
  );
  const [priorBehavior2, setPriorBehavior2] = useState(
    'تنبيه شفهي ثانٍ مع جلسة إرشاد وتوجيه فردي في مكتب المرشد المدرسي.'
  );
  const [priorBehavior3, setPriorBehavior3] = useState(
    'تكرار التأخر الصباحي عن الطابور لأكثر من 3 مرات دون عذر مقبول.'
  );

  const [studentPledge, setStudentPledge] = useState(OFFICIAL_MODEL_9_PLEDGE);

  const [formDate, setFormDate] = useState(getUaeTodayDateString());
  const [counselorName, setCounselorName] = useState(
    counselor?.name || 'المرشد الطلابي والأكاديمي'
  );
  const [actionTaken, setActionTaken] = useState(
    'تحرير تنبيه خطي للطالب بعد استنفاد التنبيهات الشفهية، وتوثيق تعهد سلوكي، والتواصل مع ولي الأمر للمتابعة.'
  );

  // Sync counselorName & schoolSettings if props or settings update
  useEffect(() => {
    if (counselor?.name) {
      setCounselorName(counselor.name);
    }
  }, [counselor?.name]);

  useEffect(() => {
    if (schoolSettings.schoolName) {
      setSchool(schoolSettings.schoolName);
    }
    if (schoolSettings.emirate) {
      setEmirate(schoolSettings.emirate);
    }
  }, [schoolSettings.schoolName, schoolSettings.emirate]);

  // Parent communication documentation (No signature required for parent)
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentRelation, setParentRelation] = useState('الأب');
  const [contactDate, setContactDate] = useState(getUaeTodayDateString());
  const [contactTime, setContactTime] = useState('08:30 صباحاً');
  const [communicationResult, setCommunicationResult] = useState(
    'تم التواصل مع ولي الأمر هاتفياً وإحاطته علماً بحيثيات التنبيه وأبدى تعاونه وتعهده بمتابعة الطالب.'
  );

  // ONLY Student Signature is required in this model
  const [studentSignature, setStudentSignature] = useState<string | undefined>(undefined);
  const [studentSignatureDate, setStudentSignatureDate] = useState<string | undefined>(undefined);
  const [studentAttestation, setStudentAttestation] = useState(true);

  // Print Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFormRecord, setPreviewFormRecord] = useState<WarningFormRecord | null>(null);

  // Current active student object
  const activeStudent = students.find((s) => s.id === selectedStudentId);

  // When selectedStudentIdForWarning changes externally
  useEffect(() => {
    if (selectedStudentIdForWarning) {
      setSelectedStudentId(selectedStudentIdForWarning);
      setSelectedFormId('new');
    }
  }, [selectedStudentIdForWarning]);

  // When active student changes, populate guardian details
  useEffect(() => {
    if (activeStudent) {
      setParentName(activeStudent.parentName || '');
      setParentPhone(activeStudent.parentPhone || '');
      setParentRelation(activeStudent.parentRelation || 'الأب');
      if (selectedFormId === 'new') {
        setStudentSignature(undefined);
        setStudentSignatureDate(undefined);
      }
    }
  }, [activeStudent, selectedFormId]);

  // Load existing form data if user picks from saved list
  const handleSelectExistingForm = (formId: string) => {
    setSelectedFormId(formId);
    if (formId === 'new') {
      setStudentSignature(undefined);
      setStudentSignatureDate(undefined);
      setStudentPledge(OFFICIAL_MODEL_9_PLEDGE);
      return;
    }

    const found = warningForms.find((f) => f.id === formId);
    if (found) {
      setSelectedStudentId(found.studentId);
      setEmirate(found.emirate);
      setCouncil(found.council);
      setSector(found.sector);
      setPriorBehavior1(found.priorBehaviors[0] || '');
      setPriorBehavior2(found.priorBehaviors[1] || '');
      setPriorBehavior3(found.priorBehaviors[2] || '');
      setStudentPledge(found.studentPledge || OFFICIAL_MODEL_9_PLEDGE);
      setFormDate(found.formDate);
      setCounselorName(found.counselorName);
      setActionTaken(found.actionTaken);
      setParentName(found.parentName);
      setParentPhone(found.parentPhone);
      setParentRelation(found.parentRelation);

      const parts = (found.communicationDateTime || '').split(/[ T]/);
      setContactDate(parts[0] || found.formDate || getUaeTodayDateString());
      setContactTime(parts.slice(1).join(' ') || '08:30 صباحاً');

      setCommunicationResult(found.communicationResult);
      setStudentSignature(found.studentSignature);
      setStudentSignatureDate(found.studentSignatureDate);
      setStudentAttestation(found.studentAttestation);
    }
  };

  // Build current record
  const constructCurrentFormRecord = (status: 'مسودة' | 'تم الاعتماد والتوقيع'): WarningFormRecord => {
    const student = activeStudent || {
      id: selectedStudentId,
      studentNumber: '20260000',
      fullName: 'طالب غير محدد',
      grade: 'تاسع',
      section: '1',
    };

    return {
      id: selectedFormId === 'new' ? `warn-${Date.now()}` : selectedFormId,
      studentId: student.id,
      studentNumber: student.studentNumber,
      studentName: student.fullName,
      grade: student.grade,
      section: student.section,
      emirate,
      council,
      sector,
      school,
      priorBehaviors: [priorBehavior1, priorBehavior2, priorBehavior3],
      studentPledge,
      formDate,
      counselorName,
      actionTaken,
      parentName,
      parentPhone,
      parentRelation,
      communicationDateTime: `${contactDate} ${contactTime}`,
      communicationResult,
      studentSignature,
      studentSignatureDate,
      studentAttestation,
      parentSignature: undefined, // Only student signature is requested per form 9
      parentSignatureDate: undefined,
      isParentSignatureRecorded: false,
      status,
      recordedBy: counselor?.name || 'المرشد المدرسي',
      createdAt: formDate,
      updatedAt: formDate,
    };
  };

  // Save as Draft
  const handleSaveAsDraft = () => {
    const record = constructCurrentFormRecord('مسودة');
    onSaveForm(record);
    onShowToast('تم حفظ النموذج كمسودة بنجاح', 'success');
  };

  // Save and Approve
  const handleSaveAndApprove = () => {
    const record = constructCurrentFormRecord('تم الاعتماد والتوقيع');
    onSaveForm(record);
    if (!studentSignature) {
      onShowToast('تم حفظ النموذج في ملف الطالب (يمكن طباعته ليوقع الطالب خطياً)', 'info');
    } else {
      onShowToast('تم اعتماد النموذج وحفظه بملف الطالب متضمناً توقيع الطالب المعتمد', 'success');
    }
  };

  // Preview Action
  const handleOpenPreview = () => {
    const record = constructCurrentFormRecord(
      studentSignature ? 'تم الاعتماد والتوقيع' : 'مسودة'
    );
    setPreviewFormRecord(record);
    setIsPreviewOpen(true);
  };

  // Print / PDF directly
  const handlePrintOrPdf = () => {
    const record = constructCurrentFormRecord(
      studentSignature ? 'تم الاعتماد والتوقيع' : 'مسودة'
    );
    setPreviewFormRecord(record);
    setIsPreviewOpen(true);
    setTimeout(() => {
      window.print();
    }, 350);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0C2340] bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 w-fit mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-black">نموذج رقم (9) – لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900">
            تنبيه خطي للطالب / للطالبة من بعد التنبيه الشفهي
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            تصميم مطابق تماماً للنموذج المعتمد في الطباعة • يطلب توقيع الطالب فقط
          </p>
        </div>

        {/* Action Buttons Top Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="btn-preview-warning"
            onClick={handleOpenPreview}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 border border-slate-200 shadow-2xs cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#006D77]" />
            <span>معاينة نموذج (9)</span>
          </button>

          <button
            type="button"
            id="btn-print-warning"
            onClick={handlePrintOrPdf}
            className="px-4 py-2 bg-[#006D77] hover:bg-[#005a63] text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#D4AF37]" />
            <span>طباعة النموذج الرسمي (A4)</span>
          </button>
        </div>
      </div>

      {/* Select Student or Saved Forms */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
            اختر الطالب لتحرير التنبيه الخطي:
          </label>
          <select
            id="warning-student-select"
            value={selectedStudentId}
            onChange={(e) => {
              setSelectedStudentId(e.target.value);
              setStudentSignature(undefined);
              setStudentSignatureDate(undefined);
              setSelectedFormId('new');
            }}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#006D77]"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.studentNumber} - الصف {s.grade}/{s.section})
              </option>
            ))}
          </select>

          {onOpenGradeSectionSearch && (
            <button
              type="button"
              onClick={onOpenGradeSectionSearch}
              className="px-3 py-1.5 bg-gradient-to-r from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100 text-[#006D77] border border-teal-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
              title="البحث عن طريق الصفوف والشعب والمسارات"
            >
              <Layers className="w-3.5 h-3.5 text-[#006D77]" />
              <span className="hidden sm:inline">البحث بالصفوف والشعب</span>
            </button>
          )}
        </div>

        {/* Existing forms switcher */}
        {warningForms.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">النماذج المحفوظة:</span>
            <select
              value={selectedFormId}
              onChange={(e) => handleSelectExistingForm(e.target.value)}
              className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
            >
              <option value="new">+ إنشاء نموذج جديد</option>
              {warningForms.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.studentName} ({wf.formDate}) - {wf.status}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Official Form Sheet Layout */}
      <div className="bg-white rounded-2xl border-2 border-slate-200/90 shadow-md p-6 sm:p-8 space-y-6">
        {/* Administrative Header (الإمارة، إدارة العمليات المدرسية، المجلس، النطاق، المدرسة) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-[#0C2340] flex items-center gap-2">
              <School className="w-4 h-4 text-[#006D77]" />
              <span>البيانات الإدارية والمؤسسية (أعلى النموذج)</span>
            </h3>
            <span className="font-black text-xs text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200">
              نموذج رقم (9)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 font-medium mb-1">الإمارة</label>
              <input
                type="text"
                value={emirate}
                onChange={(e) => setEmirate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">المجلس</label>
              <input
                type="text"
                value={council}
                onChange={(e) => setCouncil(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">النطاق</label>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">المدرسة</label>
              <input
                type="text"
                value={school}
                disabled
                className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 cursor-not-allowed text-xs"
              />
            </div>
          </div>
        </div>

        {/* Student Profile Info Row */}
        {activeStudent && (
          <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">أتعهد أنا الطالب/الطالبة:</span>
              <strong className="text-sm font-black text-slate-900">{activeStudent.fullName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">الرقم الطلابي:</span>
              <strong className="text-sm font-mono font-bold text-slate-900">{activeStudent.studentNumber}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">الصف:</span>
              <strong className="text-sm font-bold text-slate-900">الصف {activeStudent.grade} (شعبة {activeStudent.section})</strong>
            </div>
            <div>
              <span className="text-slate-500 block">تحريرًا في تاريخ:</span>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-0.5 font-bold text-slate-900"
              />
            </div>
          </div>
        )}

        {/* Student Pledge Text from Model 9 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800 border-r-4 border-[#006D77] pr-2">
              نص التعهد المعتمد في لائحة إدارة سلوك الطلبة (نموذج 9)
            </label>
            <button
              type="button"
              onClick={() => setStudentPledge(OFFICIAL_MODEL_9_PLEDGE)}
              className="text-[11px] text-[#006D77] hover:underline font-bold"
            >
              استعادة النص الرسمي الأصلي
            </button>
          </div>
          <textarea
            rows={4}
            value={studentPledge}
            onChange={(e) => setStudentPledge(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 leading-relaxed focus:ring-2 focus:ring-[#006D77]"
          />
        </div>

        {/* 3 Slots for Prior Behaviors / Oral Warnings (Numbered 1, 2, 3) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 border-r-4 border-[#006D77] pr-2">
              السلوكيات والتنبيهات الشفهية السابقة الصادرة عن الطالب (1، 2، 3)
            </h4>
            <span className="text-xs text-slate-400">تظهر مرقمة ومطبوعة بنفس ترتيب النموذج</span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <input
                type="text"
                value={priorBehavior1}
                onChange={(e) => setPriorBehavior1(e.target.value)}
                placeholder="تفاصيل التنبيه الشفهي الأول..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <input
                type="text"
                value={priorBehavior2}
                onChange={(e) => setPriorBehavior2(e.target.value)}
                placeholder="تفاصيل التنبيه الشفهي الثاني..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <input
                type="text"
                value={priorBehavior3}
                onChange={(e) => setPriorBehavior3(e.target.value)}
                placeholder="تفاصيل التنبيه الشفهي الثالث أو الملاحظة التراكمية..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
              />
            </div>
          </div>
        </div>

        {/* Student Signature Canvas ONLY (Strictly respecting requirement: ويطلب فقط توقيع الطالب فيه) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-[#0C2340] flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-[#006D77]" />
                <span>توقيع الطالب الإلكتروني (المطلوب الوحيد في النموذج 9)</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                وفق النموذج الرسمي المعتمد، يوقع الطالب إقراراً بالتعهد؛ بينما يتم إخطار ولي الأمر بالاتصال ونسخة النموذج
              </p>
            </div>
            <div className="text-xs text-teal-800 bg-teal-100/70 font-semibold px-2.5 py-1 rounded-md">
              {studentSignature ? '✓ تم تسجيل توقيع الطالب' : 'بانتظار توقيع الطالب'}
            </div>
          </div>

          <div className="max-w-xl mx-auto pt-1">
            <SignatureCanvas
              id={`student-sig-${selectedStudentId}`}
              title="توقيع الطالب الإلكتروني"
              subtitle="إلزام الطالب بالتوقيع إقراراً بالتعهد بلائحة السلوك"
              initialSignature={studentSignature}
              signerType="طالب"
              counselorName={counselorName}
              onSave={(dataUrl, uaeStamp) => {
                setStudentSignature(dataUrl);
                setStudentSignatureDate(uaeStamp);
                onShowToast('تم حفظ توقيع الطالب بنجاح بتوقيت الإمارات', 'success');
              }}
              onClear={() => {
                setStudentSignature(undefined);
                setStudentSignatureDate(undefined);
              }}
            />
          </div>
        </div>

        {/* Parent Notification Documentation (Bottom Section of Model 9) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#006D77] flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span>توثيق إخطار ولي الأمر (حسب أسفل نموذج 9)</span>
            </h4>
            <span className="text-[11px] text-slate-500">
              (يتم إخطار ولي الأمر بصورة من التعهد وتحفظ صورة بملف الطالب)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-600 mb-1 font-semibold">اسم ولي الأمر</label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="اسم ولي الأمر..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-1 font-semibold">الصلة</label>
              <input
                type="text"
                value={parentRelation}
                onChange={(e) => setParentRelation(e.target.value)}
                placeholder="الأب / الأم / ولي الأمر..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-1 font-semibold">رقم الهاتف</label>
              <input
                type="text"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-right"
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1 font-semibold">تاريخ الاتصال</label>
                <input
                  type="text"
                  value={contactDate}
                  onChange={(e) => setContactDate(e.target.value)}
                  className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1 font-semibold">الوقت</label>
                <input
                  type="text"
                  value={contactTime}
                  onChange={(e) => setContactTime(e.target.value)}
                  className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Sheet Visual Representation */}
        <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#006D77] text-white flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-xs sm:text-sm text-slate-900">
                النموذج جاهز للطباعة المباشرة بصيغة A4 الرسمية
              </h5>
              <p className="text-xs text-slate-600">
                تصميم مطابق بنسبة 100% للنموذج المعتمد، متضمناً رقم النموذج، التعهد، وتوقيع الطالب
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrintOrPdf}
            className="px-4 py-2 bg-[#0C2340] hover:bg-[#16355d] text-white font-bold text-xs rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-[#D4AF37]" />
            <span>طباعة الآن</span>
          </button>
        </div>

        {/* Form Action Buttons: حفظ كمسودة، حفظ واعتماد، معاينة، طباعة */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-preview-form-bottom"
              onClick={handleOpenPreview}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-[#006D77]" />
              <span>معاينة النموذج</span>
            </button>

            <button
              type="button"
              id="btn-print-form-bottom"
              onClick={handlePrintOrPdf}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ كـ PDF</span>
            </button>
          </div>

          {!isViewer && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                id="btn-save-draft"
                onClick={handleSaveAsDraft}
                className="px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ كمسودة</span>
              </button>

              <button
                type="button"
                id="btn-save-approve"
                onClick={handleSaveAndApprove}
                className="px-6 py-2.5 bg-[#006D77] hover:bg-[#005a63] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                <span>حفظ واعتماد النموذج</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Official Print Preview Modal */}
      <PrintWarningModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        form={previewFormRecord}
      />
    </div>
  );
};
