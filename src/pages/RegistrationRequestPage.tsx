import React, { useState, useEffect } from 'react';
import {
  School,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
  Sparkles,
  ShieldCheck,
  User,
  Mail,
  ChevronRight,
  Search,
  Check,
  RotateCcw,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  DetailedSchool,
  RequestedJobTitle,
  SchoolGender,
  EducationCycle,
  RegistrationRequest,
  UserRole,
} from '../types';
import {
  lookupSchoolByNumber,
  submitRegistrationRequest,
} from '../firebase/registrationService';
import { logoutUser } from '../firebase/auth';

interface RegistrationRequestPageProps {
  fbUser: FirebaseUser;
  onSubmitted: (request: RegistrationRequest) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

const EMIRATES_LIST = [
  'أبوظبي',
  'دبي',
  'الشارقة',
  'عجمان',
  'أم القيوين',
  'رأس الخيمة',
  'الفجيرة',
];

const JOB_TITLES_CONFIG: {
  id: RequestedJobTitle;
  label: string;
  role: UserRole;
  desc: string;
}[] = [
  {
    id: 'schoolPrincipal',
    label: 'مدير مدرسة',
    role: 'schoolAdmin',
    desc: 'صلاحيات إدارة المدرسة والمستخدمين واعتماد السجلات',
  },
  {
    id: 'studentAffairsDeputy',
    label: 'نائب مدير لشؤون الطلبة',
    role: 'schoolAdmin',
    desc: 'صلاحيات الإشراف الإداري على السلوك والغياب والمخالفات',
  },
  {
    id: 'careerCounselor',
    label: 'مرشد أكاديمي ومهني',
    role: 'counselor',
    desc: 'تسجيل ورصد التأخر الصباحي والمخالفات واستمارات الإنذار',
  },
  {
    id: 'socialWorker',
    label: 'أخصائي اجتماعي',
    role: 'counselor',
    desc: 'متابعة الحالات السلوكية واستدعاء أولياء الأمور والتوجيه',
  },
];

export const RegistrationRequestPage: React.FC<RegistrationRequestPageProps> = ({
  fbUser,
  onSubmitted,
  onShowToast,
}) => {
  // Step 1: School Lookup State
  const [schoolNumberInput, setSchoolNumberInput] = useState('7001');
  const [isSearchingSchool, setIsSearchingSchool] = useState(false);
  const [existingSchool, setExistingSchool] = useState<DetailedSchool | null>(null);
  const [schoolSearchDone, setSchoolSearchDone] = useState(false);
  const [isSchoolConfirmed, setIsSchoolConfirmed] = useState(false);

  // New School Fields (if school doesn't exist)
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolEnglishName, setNewSchoolEnglishName] = useState('');
  const [newSchoolEmirate, setNewSchoolEmirate] = useState('أبوظبي');
  const [newSchoolRegion, setNewSchoolRegion] = useState('');
  const [newSchoolGender, setNewSchoolGender] = useState<SchoolGender>('boys');
  const [newSchoolCycles, setNewSchoolCycles] = useState<EducationCycle[]>(['cycle3']);

  // User details
  const [fullNameArabic, setFullNameArabic] = useState(fbUser.displayName || '');
  const [phone, setPhone] = useState('');
  const [selectedJobTitle, setSelectedJobTitle] = useState<RequestedJobTitle>('careerCounselor');
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initial lookup for default school (7001)
  useEffect(() => {
    handleSearchSchool('7001');
  }, []);

  const handleSearchSchool = async (numToSearch: string) => {
    const trimmed = numToSearch.trim();
    if (!trimmed) {
      setExistingSchool(null);
      setSchoolSearchDone(false);
      setIsSchoolConfirmed(false);
      return;
    }

    setIsSearchingSchool(true);
    setErrorMessage('');
    try {
      const found = await lookupSchoolByNumber(trimmed);
      setExistingSchool(found);
      setSchoolSearchDone(true);
      if (found) {
        setIsSchoolConfirmed(true);
      } else {
        setIsSchoolConfirmed(false);
      }
    } catch (err) {
      console.error('Error during school search:', err);
      setExistingSchool(null);
      setSchoolSearchDone(true);
    } finally {
      setIsSearchingSchool(false);
    }
  };

  const handleToggleCycle = (cycle: EducationCycle) => {
    if (newSchoolCycles.includes(cycle)) {
      if (newSchoolCycles.length > 1) {
        setNewSchoolCycles(newSchoolCycles.filter((c) => c !== cycle));
      }
    } else {
      setNewSchoolCycles([...newSchoolCycles, cycle]);
    }
  };

  const handleSelectAllCycles = () => {
    setNewSchoolCycles(['cycle1', 'cycle2', 'cycle3']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullNameArabic.trim()) {
      setErrorMessage('يرجى إدخال الاسم الكامل باللغة العربية.');
      return;
    }

    if (!schoolNumberInput.trim()) {
      setErrorMessage('يرجى إدخال رقم المدرسة.');
      return;
    }

    const isCreatingNew = !existingSchool;
    if (isCreatingNew && !newSchoolName.trim()) {
      setErrorMessage('يرجى إدخال اسم المدرسة الجديدة باللغة العربية.');
      return;
    }

    if (!declarationAccepted) {
      setErrorMessage('يرجى الموافقة على الإقرار بصحة البيانات للمتابعة.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedJob = JOB_TITLES_CONFIG.find((j) => j.id === selectedJobTitle)!;
      const schoolNum = schoolNumberInput.trim();

      const requestPayload: RegistrationRequest = {
        id: fbUser.uid,
        uid: fbUser.uid,
        email: fbUser.email || '',
        phone: phone.trim() || undefined,
        displayName: fbUser.displayName || undefined,
        fullNameArabic: fullNameArabic.trim(),
        schoolId: schoolNum,
        schoolNumber: schoolNum,
        schoolNameArabic: existingSchool
          ? existingSchool.schoolNameArabic
          : newSchoolName.trim(),
        schoolNameEnglish: existingSchool
          ? existingSchool.schoolNameEnglish
          : newSchoolEnglishName.trim() || undefined,
        emirate: existingSchool ? existingSchool.emirate : newSchoolEmirate,
        region: existingSchool ? existingSchool.region : newSchoolRegion.trim() || undefined,
        requestedJobTitle: selectedJobTitle,
        jobTitleArabic: selectedJob.label,
        schoolGender: existingSchool ? existingSchool.schoolGender : newSchoolGender,
        educationCycles: existingSchool ? existingSchool.educationCycles : newSchoolCycles,
        requestedRole: selectedJob.role,
        requestType: isCreatingNew ? 'createNewSchool' : 'joinExistingSchool',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        photoURL: fbUser.photoURL || undefined,
      };

      await submitRegistrationRequest(requestPayload);
      onShowToast(
        'تم إرسال طلب إنشاء الحساب بنجاح، وسيتم إشعارك بعد مراجعته واعتماده من مسؤول النظام',
        'success'
      );
      onSubmitted(requestPayload);
    } catch (err: any) {
      console.error('Error submitting request:', err);
      setErrorMessage(
        err.message || 'حدث خطأ أثناء حفظ طلب التسجيل. يرجى إعادة المحاولة.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0b1320] text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white dark:bg-[#111c2e] rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-[#006D77] dark:text-teal-400 shrink-0">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[11px] font-bold mb-1">
                <Sparkles className="w-3 h-3" />
                <span>بوابة التسجيل الموحدة • نظام المرشد المدرسي الذكي</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-[#0C2340] dark:text-white">
                طلب إنشاء وتفعيل حساب كادر مدرسي
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => logoutUser()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>

        {/* Google User Profile Summary */}
        <div className="bg-[#0C2340] text-white rounded-2xl p-4 sm:p-5 shadow-sm border-2 border-[#D4AF37] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {fbUser.photoURL ? (
              <img
                src={fbUser.photoURL}
                alt="Google User"
                className="w-11 h-11 rounded-full border-2 border-[#D4AF37] object-cover shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold border-2 border-[#D4AF37]">
                <User className="w-5 h-5" />
              </div>
            )}
            <div>
              <p className="text-xs text-slate-300 font-medium">حساب Google المستخدم لتسجيل الدخول:</p>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span>{fbUser.displayName || 'مستخدم Google'}</span>
                <span className="text-[11px] text-teal-300 font-mono" dir="ltr">
                  ({fbUser.email})
                </span>
              </p>
            </div>
          </div>

          <div className="px-3 py-1 bg-white/10 rounded-lg text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
            <span>تم التحقق من الحساب</span>
          </div>
        </div>

        {/* Main Registration Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#111c2e] rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: School Identification (FIRST FIELD) */}
          <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#006D77] text-white text-xs flex items-center justify-center font-black">
                    1
                  </span>
                  <span>رقم المدرسة (معرف المدرسة)</span>
                  <span className="text-rose-500">*</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  أدخل رقم المدرسة للتحقق من تسجيلها في النظام أو طلب إنشاء مدرسة جديدة
                </p>
              </div>

              <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-1 rounded-lg">
                متاح لعدة مستخدمين لنفس المدرسة
              </span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  id="input-school-number"
                  value={schoolNumberInput}
                  onChange={(e) => {
                    setSchoolNumberInput(e.target.value);
                    setSchoolSearchDone(false);
                    setIsSchoolConfirmed(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchSchool(schoolNumberInput);
                    }
                  }}
                  placeholder="مثال: 7001 أو رمز المدرسة"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#006D77]"
                  required
                />
              </div>

              <button
                type="button"
                onClick={() => handleSearchSchool(schoolNumberInput)}
                disabled={isSearchingSchool || !schoolNumberInput.trim()}
                className="px-4 py-2.5 bg-[#006D77] hover:bg-[#005a63] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSearchingSchool ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>تحقق من الرقم</span>
              </button>
            </div>

            {/* School Lookup Result */}
            {schoolSearchDone && (
              <div className="animate-in fade-in duration-200">
                {existingSchool ? (
                  /* CASE 1: School Exists */
                  <div className="p-4 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border-2 border-teal-500/40 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded-sm">
                            مدرسة مسجلة ومعتمدة في النظام
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                            {existingSchool.schoolNameArabic}
                          </h4>
                        </div>
                      </div>

                      <div className="text-left text-xs font-mono font-bold text-teal-800 dark:text-teal-300">
                        #{existingSchool.schoolNumber}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/70 p-3 rounded-lg">
                      <div>
                        <span className="text-slate-400 block text-[10px]">الإمارة:</span>
                        <span className="font-bold">{existingSchool.emirate}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">نوع المدرسة:</span>
                        <span className="font-bold">
                          {existingSchool.schoolGender === 'boys'
                            ? 'بنين'
                            : existingSchool.schoolGender === 'girls'
                            ? 'بنات'
                            : 'مشتركة'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">المراحل الدراسية:</span>
                        <span className="font-bold">
                          {existingSchool.educationCycles
                            .map((c) =>
                              c === 'cycle1'
                                ? 'الحلقة 1'
                                : c === 'cycle2'
                                ? 'الحلقة 2'
                                : 'الحلقة 3'
                            )
                            .join(' • ')}
                        </span>
                      </div>
                    </div>

                    {/* School Confirmation Question */}
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-teal-200 dark:border-teal-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        هل هذه هي مدرستك التي تعمل بها؟
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsSchoolConfirmed(true)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isSchoolConfirmed
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>نعم، متابعة التسجيل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSchoolNumberInput('');
                            setExistingSchool(null);
                            setSchoolSearchDone(false);
                            setIsSchoolConfirmed(false);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>تغيير الرقم</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* CASE 2: School Does NOT Exist */
                  <div className="p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border-2 border-amber-400/50 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                          رقم المدرسة غير مسجل، يرجى إدخال بيانات المدرسة لإنشاء طلب مدرسة جديدة
                        </h4>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                          سيتم تسجيل المدرسة برقم <span className="font-mono font-bold">#{schoolNumberInput}</span> وإرسال طلب اعتمادها لمدير النظام.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          اسم المدرسة بالعربية <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newSchoolName}
                          onChange={(e) => setNewSchoolName(e.target.value)}
                          placeholder="مثال: مدرسة التميز للتعليم الثانوي"
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-[#006D77]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          اسم المدرسة بالإنجليزية (اختياري)
                        </label>
                        <input
                          type="text"
                          value={newSchoolEnglishName}
                          onChange={(e) => setNewSchoolEnglishName(e.target.value)}
                          placeholder="e.g. Al Tamayuz Secondary School"
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-[#006D77]"
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          الإمارة <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={newSchoolEmirate}
                          onChange={(e) => setNewSchoolEmirate(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-[#006D77]"
                        >
                          {EMIRATES_LIST.map((em) => (
                            <option key={em} value={em}>
                              {em}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          المنطقة / المدينة (اختياري)
                        </label>
                        <input
                          type="text"
                          value={newSchoolRegion}
                          onChange={(e) => setNewSchoolRegion(e.target.value)}
                          placeholder="مثال: العين، الظفرة، ديرة..."
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-[#006D77]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          نوع المدرسة <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(['boys', 'girls', 'mixed'] as SchoolGender[]).map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setNewSchoolGender(g)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                newSchoolGender === g
                                  ? 'bg-[#006D77] text-white'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {g === 'boys' ? 'بنين' : g === 'girls' ? 'بنات' : 'مشتركة'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            الحلقات الدراسية <span className="text-rose-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleSelectAllCycles}
                            className="text-[11px] font-bold text-[#006D77] dark:text-teal-400 hover:underline cursor-pointer"
                          >
                            تحديد جميع الحلقات
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'cycle1' as EducationCycle, label: 'الحلقة الأولى (1 - 4)' },
                            { id: 'cycle2' as EducationCycle, label: 'الحلقة الثانية (5 - 8)' },
                            { id: 'cycle3' as EducationCycle, label: 'الحلقة الثالثة (9 - 12)' },
                          ].map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleToggleCycle(c.id)}
                              className={`p-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                                newSchoolCycles.includes(c.id)
                                  ? 'bg-[#0C2340] text-white border-2 border-[#D4AF37]'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {newSchoolCycles.includes(c.id) && <Check className="w-3.5 h-3.5 text-[#D4AF37]" />}
                              <span>{c.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: User Information */}
          <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#006D77] text-white text-xs flex items-center justify-center font-black">
                  2
                </span>
                <span>بيانات الموظف والوظيفة المطلوبة</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                يرجى كتابة الاسم الثلاثي/الرباعي الرسمي بالعربية واختيار صفتك الوظيفية بالمدرسة
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم الكامل بالعربية <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullNameArabic}
                  onChange={(e) => setFullNameArabic(e.target.value)}
                  placeholder="مثال: راشد محمد أحمد المنصوري"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-[#006D77]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  البريد الإلكتروني المعتمد (Google)
                </label>
                <input
                  type="email"
                  value={fbUser.email || ''}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الهاتف / التواصل
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="مثال: 0501234567"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-[#006D77]"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Requested Job Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                المسمى الوظيفي المطلوب اعتماده <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {JOB_TITLES_CONFIG.map((job) => {
                  const isSelected = selectedJobTitle === job.id;
                  return (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJobTitle(job.id)}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-2.5 ${
                        isSelected
                          ? 'border-[#006D77] bg-teal-50/60 dark:bg-teal-950/40 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <input
                        type="radio"
                        name="jobTitleRadio"
                        checked={isSelected}
                        onChange={() => setSelectedJobTitle(job.id)}
                        className="mt-0.5 text-[#006D77] focus:ring-[#006D77]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-white">
                            {job.label}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {job.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {job.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Legal & Official Declaration */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={declarationAccepted}
                onChange={(e) => setDeclarationAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 text-[#006D77] rounded-sm focus:ring-[#006D77]"
                required
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                أقر بصحة كافة البيانات المدخلة وأنني أنتسب رسمياً إلى هذه المدرسة وسأتحمل المسؤولية الإدارية والمهنية عن دقة البيانات المقدمة في نظام المرشد المدرسي الذكي.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              * ستتم مراجعة الطلب واعتماده من قبل مدير النظام أو إدارة المدرسة.
            </p>

            <button
              type="submit"
              id="btn-submit-registration"
              disabled={isSubmitting || !declarationAccepted}
              className="w-full sm:w-auto px-8 py-3 bg-[#0C2340] hover:bg-[#133054] text-white font-bold rounded-xl text-xs sm:text-sm border-2 border-[#D4AF37] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 animate-spin text-[#D4AF37]" />
                  <span>جاري إرسال الطلب...</span>
                </>
              ) : (
                <>
                  <span>إرسال طلب التسجيل</span>
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
