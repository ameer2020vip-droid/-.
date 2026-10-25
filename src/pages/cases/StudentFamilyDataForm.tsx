import React, { useState, useEffect } from 'react';
import {
  User,
  HeartPulse,
  Award,
  Users,
  Home,
  FileCheck,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Printer,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  Student,
  StudentCaseRecord,
  StudentCaseFormRecord,
  StudentFamilyData,
  StudentFamilyContactItem,
  AppUser,
} from '../../types';
import { getUaeTodayDateString } from '../../utils/time';
import { useSchoolSettings } from '../../context/SchoolSettingsContext';

interface StudentFamilyDataFormProps {
  caseRecord: StudentCaseRecord;
  student?: Student;
  initialForm?: StudentCaseFormRecord | null;
  currentUser: AppUser;
  onSave: (
    formRecord: StudentCaseFormRecord,
    updateMaster: boolean,
    masterUpdates?: Partial<Student>
  ) => Promise<void>;
  onPrintPreview: () => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  canEdit?: boolean;
}

export const StudentFamilyDataForm: React.FC<StudentFamilyDataFormProps> = ({
  caseRecord,
  student,
  initialForm,
  currentUser,
  onSave,
  onPrintPreview,
  onShowToast,
  canEdit = true,
}) => {
  const { schoolSettings } = useSchoolSettings();
  // Accordions open/close state (Default open sections 1 & 4)
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: false,
    4: true,
    5: false,
    6: false,
    7: true,
  });

  const toggleSection = (sectionNumber: number) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionNumber]: !prev[sectionNumber],
    }));
  };

  // State: update student master record checkbox
  const [updateMasterRecord, setUpdateMasterRecord] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Initialize form state
  const buildInitialData = (): StudentFamilyData => {
    // Pre-populate from existing student record
    const defaultContacts: StudentFamilyContactItem[] = [];
    if (student) {
      if (student.contacts && student.contacts.length > 0) {
        student.contacts.forEach((c, idx) => {
          defaultContacts.push({
            id: c.id || `c-${idx}`,
            name: c.name || '',
            relation: c.relation || 'ولي الأمر',
            isPrimary: c.isPrimary ?? (idx === 0),
            nationalId: c.nationalId || '',
            job: c.job || '',
            employer: c.employer || '',
            educationLevel: c.educationLevel || '',
            phone: c.phone || '',
            whatsapp: c.whatsapp || c.phone || '',
            email: c.email || '',
            livesWithStudent: c.livesWithStudent ?? true,
          });
        });
      } else if (student.parentName || student.parentPhone) {
        defaultContacts.push({
          id: 'c-primary',
          name: student.parentName || '',
          relation: student.parentRelation || 'الأب',
          isPrimary: true,
          nationalId: '',
          job: student.parentJob || '',
          employer: '',
          educationLevel: '',
          phone: student.parentPhone || '',
          whatsapp: student.parentPhone || '',
          email: '',
          livesWithStudent: true,
        });
      }
    }

    const defaultData: StudentFamilyData = {
      // 1. بيانات الطالب
      schoolName: currentUser.schoolName || schoolSettings.schoolName,
      studentName: student?.fullName || caseRecord.studentName || '',
      studentNumber: student?.studentNumber || caseRecord.studentNumber || '',
      grade: student?.grade || (caseRecord.grade as string) || 'الصف العاشر',
      section: student?.section || (caseRecord.section as string) || '1',
      nationality: student?.nationality || 'إماراتي',
      birthDate: student?.birthDate || '',
      gender: student?.gender || 'بنين',
      nationalId: student?.nationalId || '',
      studentPhone: student?.studentPhone || '',
      studentEmail: student?.email || '',
      hasSiblingsInSchool: false,
      siblingsInfo: '',
      isDeterminedPerson: student?.isDeterminedPerson || false,
      determinedCategory: student?.determinedCategory || '',

      // 2. البيانات الصحية
      hasHealthIssue: false,
      healthIssueTypes: [],
      healthIssueOther: '',
      healthDescription: '',
      usesMedicalDevices: false,
      medicalDeviceType: '',
      familyHasChronicIllness: false,
      familyIllnessDetails: '',

      // 3. الأنشطة والمواهب
      externalActivities: [],
      externalActivitiesOther: '',
      hobbies: '',
      talents: '',
      transportationMethod: 'الحافلة المدرسية',
      transportationOther: '',

      // 4. ولي الأمر
      contacts: defaultContacts.length > 0 ? defaultContacts : [
        {
          id: 'c-1',
          name: '',
          relation: 'الأب',
          isPrimary: true,
          nationalId: '',
          job: '',
          employer: '',
          educationLevel: 'جامعي',
          phone: '',
          whatsapp: '',
          email: '',
          livesWithStudent: true,
        },
      ],

      // 5. الوضع الأسري
      brothersCount: 0,
      sistersCount: 0,
      birthOrder: 1,
      livesWithBothParents: true,
      separationReason: '',
      separationReasonOther: '',
      livesWithWhom: 'الوالدين معاً',
      otherResidentsInHome: false,
      otherResidentsDetails: '',
      familyNotes: '',

      // 6. السكن والوضع الاقتصادي
      emirate: 'الشارقة',
      area: '',
      streetName: '',
      houseNumber: '',
      homePhone: '',
      housingType: 'فيلا',
      housingTypeOther: '',
      housingOwnership: 'ملك',
      housingOwnershipOther: '',
      hasPrivateRoom: true,
      sharedRoomWith: '',
      incomeSources: 'راتب شهري',
      incomeLevel: 'مناسب',
      economicNotes: '',

      // 7. اعتماد البيانات
      filledByName: currentUser.displayName || currentUser.name || 'المرشد المدرسي',
      filledByRole: 'المرشد الطلابي',
      formDate: getUaeTodayDateString(),
      counselorNotes: '',
      formStatus: 'مسودة',
      reviewedBy: caseRecord.assignedCounselorName || currentUser.displayName || '',
      reviewedAt: getUaeTodayDateString(),
    };

    if (initialForm?.data) {
      return { ...defaultData, ...initialForm.data };
    }

    return defaultData;
  };

  const [formData, setFormData] = useState<StudentFamilyData>(buildInitialData());

  useEffect(() => {
    if (initialForm?.data) {
      setFormData((prev) => ({ ...prev, ...initialForm.data }));
      setIsDirty(false);
    }
  }, [initialForm]);

  // Prompt on tab close/nav if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const updateField = <K extends keyof StudentFamilyData>(key: K, value: StudentFamilyData[K]) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
    setIsDirty(true);
  };

  // Contacts manager
  const addContact = () => {
    const newContact: StudentFamilyContactItem = {
      id: `c-${Date.now()}`,
      name: '',
      relation: 'الأم',
      isPrimary: false,
      nationalId: '',
      job: '',
      employer: '',
      educationLevel: 'جامعي',
      phone: '',
      whatsapp: '',
      email: '',
      livesWithStudent: true,
    };
    updateField('contacts', [...formData.contacts, newContact]);
  };

  const updateContact = (id: string, updates: Partial<StudentFamilyContactItem>) => {
    const updated = formData.contacts.map((c) => {
      if (c.id === id) {
        return { ...c, ...updates };
      }
      // If setting this one as primary, unset others
      if (updates.isPrimary) {
        return { ...c, isPrimary: false };
      }
      return c;
    });
    updateField('contacts', updated);
  };

  const removeContact = (id: string) => {
    if (formData.contacts.length <= 1) {
      onShowToast('يجب أن يحتوي النموذج على شخص تواصل واحد على الأقل', 'warning');
      return;
    }
    updateField('contacts', formData.contacts.filter((c) => c.id !== id));
  };

  // Checkbox toggle helpers
  const toggleArrayItem = (key: 'healthIssueTypes' | 'externalActivities', item: string) => {
    const current = (formData[key] as string[]) || [];
    const exists = current.includes(item);
    const updated = exists ? current.filter((x) => x !== item) : [...current, item];
    updateField(key, updated);
  };

  // Save handler
  const handleSaveForm = async (targetStatus: 'مسودة' | 'مكتمل' | 'معتمد') => {
    if (!canEdit) {
      onShowToast('صلاحياتك لا تسمح بتعديل النموذج', 'warning');
      return;
    }

    // Validation
    if (!formData.studentName.trim()) {
      onShowToast('يرجى التأكد من اسم الطالب', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const finalData: StudentFamilyData = {
        ...formData,
        formStatus: targetStatus,
        reviewedBy: currentUser.displayName || currentUser.email,
        reviewedAt: getUaeTodayDateString(),
      };

      const formRecord: StudentCaseFormRecord = {
        id: initialForm?.id || 'student_data_update',
        schoolId: caseRecord.schoolId,
        studentId: caseRecord.studentId,
        caseId: caseRecord.id,
        formType: 'student_data_update',
        formVersion: 1,
        formStatus: targetStatus,
        data: finalData,
        createdBy: initialForm?.createdBy || (currentUser.displayName || currentUser.email),
        createdAt: initialForm?.createdAt || nowIso,
        updatedBy: currentUser.displayName || currentUser.email,
        updatedAt: nowIso,
        reviewedBy: currentUser.displayName || currentUser.email,
        reviewedAt: nowIso,
      };

      // Construct master student updates if checked
      const primaryContact = formData.contacts.find((c) => c.isPrimary) || formData.contacts[0];
      const masterUpdates: Partial<Student> = updateMasterRecord
        ? {
            fullName: formData.studentName || undefined,
            nationalId: formData.nationalId || undefined,
            birthDate: formData.birthDate || undefined,
            nationality: formData.nationality || undefined,
            studentPhone: formData.studentPhone || undefined,
            email: formData.studentEmail || undefined,
            isDeterminedPerson: formData.isDeterminedPerson || false,
            determinedCategory: formData.determinedCategory || undefined,
            parentName: primaryContact?.name || undefined,
            parentPhone: primaryContact?.phone || undefined,
            parentRelation: primaryContact?.relation || undefined,
          }
        : {};

      await onSave(formRecord, updateMasterRecord, masterUpdates);
      setFormData(finalData);
      setIsDirty(false);
      onShowToast(
        targetStatus === 'معتمد'
          ? 'تم اعتماد وحفظ استمارة بيانات الطالب والأسرة بنجاح'
          : targetStatus === 'مكتمل'
          ? 'تم حفظ الاستمارة كمكتملة بنجاح'
          : 'تم حفظ مسودة الاستمارة بنجاح',
        'success'
      );
    } catch (err: any) {
      onShowToast('حدث خطأ أثناء حفظ النموذج', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const healthOptions = ['السكري', 'ضغط الدم', 'أمراض القلب', 'الربو', 'أمراض الدم', 'حساسية مفرطة', 'أخرى'];
  const activitiesOptions = [
    'نادٍ رياضي',
    'نادٍ ثقافي',
    'مركز علمي',
    'مركز هوايات',
    'نشاط تطوعي',
    'مركز تحفيظ قرآن',
    'معهد لغات',
    'أخرى',
  ];

  return (
    <div className="space-y-6">
      {/* Top sticky bar for actions & status */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                استمارة تحديث بيانات الطالب والأسرة الموحدة
              </h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  formData.formStatus === 'معتمد'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : formData.formStatus === 'مكتمل'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {formData.formStatus}
              </span>
              {isDirty && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  توجد تعديلات غير محفوظة
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ترتبط تلقائياً بملف الحالة رقم ({caseRecord.caseNumber}) وتمنع تكرار إدخال البيانات في النماذج اللاحقة
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={onPrintPreview}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            طباعة استمارة تحديث البيانات
          </button>

          {canEdit && (
            <>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveForm('مسودة')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                حفظ كمسودة
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveForm('معتمد')}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSaving ? 'جاري الحفظ...' : 'اعتماد وحفظ نهائي'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sync Master Data Checkbox Notice */}
      <div className="p-3.5 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-xl flex items-center justify-between gap-4">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={updateMasterRecord}
            onChange={(e) => setUpdateMasterRecord(e.target.checked)}
            className="w-4 h-4 text-teal-600 rounded border-slate-300 dark:border-slate-700 focus:ring-teal-500"
          />
          <div className="text-xs">
            <span className="font-bold text-teal-950 dark:text-teal-200">
              تحديث بيانات الطالب الأساسية أيضاً في سجل الطلبة
            </span>
            <span className="text-teal-700 dark:text-teal-400 block text-[11px]">
              عند تفعيل هذا الخيار، سيتم تحديث رقم الهاتف، الهوية، وبيانات ولي الأمر في السجل الأساسي العام للمدرسة تلقائياً.
            </span>
          </div>
        </label>
        <span className="text-[11px] bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-bold px-2 py-0.5 rounded-md shrink-0">
          تزامن تلقائي
        </span>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SECTION 1: بيانات الطالب الأساسية */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection(1)}
          className="w-full p-4 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 text-right hover:bg-slate-100/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" />
                القسم الأول: بيانات الطالب الأساسية
              </h3>
              <p className="text-[11px] text-slate-500">تم جلب البيانات تلقائياً من سجل الطالب المعتمد</p>
            </div>
          </div>
          {openSections[1] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {openSections[1] && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم المدرسة</label>
                <input
                  type="text"
                  value={formData.schoolName}
                  onChange={(e) => updateField('schoolName', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الطالب الرباعي *</label>
                <input
                  type="text"
                  value={formData.studentName}
                  onChange={(e) => updateField('studentName', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الرقم الطلابي *</label>
                <input
                  type="text"
                  value={formData.studentNumber}
                  onChange={(e) => updateField('studentNumber', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الصف</label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => updateField('grade', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الشعبة</label>
                <input
                  type="text"
                  value={formData.section}
                  onChange={(e) => updateField('section', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الجنسية</label>
                <input
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => updateField('nationality', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">تاريخ الميلاد</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => updateField('birthDate', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم هوية الطالب</label>
                <input
                  type="text"
                  value={formData.nationalId}
                  onChange={(e) => updateField('nationalId', e.target.value)}
                  placeholder="784-XXXX-XXXXXXX-X"
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">هاتف الطالب (إن وجد)</label>
                <input
                  type="tel"
                  value={formData.studentPhone}
                  onChange={(e) => updateField('studentPhone', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني للطالب</label>
                <input
                  type="email"
                  value={formData.studentEmail}
                  onChange={(e) => updateField('studentEmail', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                  هل للطالب إخوة في المدرسة؟
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="hasSiblings"
                      checked={formData.hasSiblingsInSchool === true}
                      onChange={() => updateField('hasSiblingsInSchool', true)}
                      disabled={!canEdit}
                    />
                    نعم
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="hasSiblings"
                      checked={formData.hasSiblingsInSchool === false}
                      onChange={() => updateField('hasSiblingsInSchool', false)}
                      disabled={!canEdit}
                    />
                    لا
                  </label>
                </div>
              </div>

              {formData.hasSiblingsInSchool && (
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    أسماء الإخوة وصفوفهم
                  </label>
                  <input
                    type="text"
                    value={formData.siblingsInfo}
                    onChange={(e) => updateField('siblingsInfo', e.target.value)}
                    placeholder="مثال: محمد (11/2)، عبدالله (10/1)"
                    disabled={!canEdit}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              <div className="flex flex-col justify-end">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                  هل الطالب من أصحاب الهمم؟
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="isDetermined"
                      checked={formData.isDeterminedPerson === true}
                      onChange={() => updateField('isDeterminedPerson', true)}
                      disabled={!canEdit}
                    />
                    نعم
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="isDetermined"
                      checked={formData.isDeterminedPerson === false}
                      onChange={() => updateField('isDeterminedPerson', false)}
                      disabled={!canEdit}
                    />
                    لا
                  </label>
                </div>
              </div>

              {formData.isDeterminedPerson && (
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تصنيف حالة أصحاب الهمم
                  </label>
                  <input
                    type="text"
                    value={formData.determinedCategory}
                    onChange={(e) => updateField('determinedCategory', e.target.value)}
                    placeholder="مثال: صعوبات تعلم، اضطراب فرط الحركة وتشتت الانتباه..."
                    disabled={!canEdit}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SECTION 2: البيانات الصحية */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection(2)}
          className="w-full p-4 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 text-right hover:bg-slate-100/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                القسم الثاني: البيانات الصحية
              </h3>
              <p className="text-[11px] text-slate-500">الأمراض المزمنة، الأجهزة المساعدة والتاريخ الصحي</p>
            </div>
          </div>
          {openSections[2] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {openSections[2] && (
          <div className="p-5 space-y-4">
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                  هل يعاني الطالب من أي مشكلة صحية أو مرض مزمن؟
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="hasHealthIssue"
                      checked={formData.hasHealthIssue === true}
                      onChange={() => updateField('hasHealthIssue', true)}
                      disabled={!canEdit}
                    />
                    نعم
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="hasHealthIssue"
                      checked={formData.hasHealthIssue === false}
                      onChange={() => updateField('hasHealthIssue', false)}
                      disabled={!canEdit}
                    />
                    لا
                  </label>
                </div>
              </div>

              {formData.hasHealthIssue && (
                <div className="p-4 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl space-y-3">
                  <div>
                    <span className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                      نوع المشكلة الصحية:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {healthOptions.map((opt) => {
                        const isSelected = formData.healthIssueTypes?.includes(opt);
                        return (
                          <button
                            type="button"
                            key={opt}
                            disabled={!canEdit}
                            onClick={() => toggleArrayItem('healthIssueTypes', opt)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {formData.healthIssueTypes?.includes('أخرى') && (
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        تحديد المشكلة الصحية الأخرى:
                      </label>
                      <input
                        type="text"
                        value={formData.healthIssueOther}
                        onChange={(e) => updateField('healthIssueOther', e.target.value)}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      وصف الحالة الصحية وتوصيات الرعاية:
                    </label>
                    <textarea
                      rows={2}
                      value={formData.healthDescription}
                      onChange={(e) => updateField('healthDescription', e.target.value)}
                      disabled={!canEdit}
                      placeholder="الأدوية المستخدمة، الحالات الطارئة، تعليمات الطبيب..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                    هل يستخدم الطالب أي أجهزة طبية مساعدة؟
                  </label>
                  <div className="flex items-center gap-4 mb-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="usesMedicalDevices"
                        checked={formData.usesMedicalDevices === true}
                        onChange={() => updateField('usesMedicalDevices', true)}
                        disabled={!canEdit}
                      />
                      نعم
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="usesMedicalDevices"
                        checked={formData.usesMedicalDevices === false}
                        onChange={() => updateField('usesMedicalDevices', false)}
                        disabled={!canEdit}
                      />
                      لا
                    </label>
                  </div>
                  {formData.usesMedicalDevices && (
                    <input
                      type="text"
                      placeholder="نوع الجهاز (مثال: سماعة طبية، نظارة، جهاز تنفس...)"
                      value={formData.medicalDeviceType}
                      onChange={(e) => updateField('medicalDeviceType', e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                    هل يوجد فرد في الأسرة يعاني من مرض مزمن أو إعاقة؟
                  </label>
                  <div className="flex items-center gap-4 mb-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="familyChronic"
                        checked={formData.familyHasChronicIllness === true}
                        onChange={() => updateField('familyHasChronicIllness', true)}
                        disabled={!canEdit}
                      />
                      نعم
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="familyChronic"
                        checked={formData.familyHasChronicIllness === false}
                        onChange={() => updateField('familyHasChronicIllness', false)}
                        disabled={!canEdit}
                      />
                      لا
                    </label>
                  </div>
                  {formData.familyHasChronicIllness && (
                    <input
                      type="text"
                      placeholder="التفاصيل وصلة القرابة..."
                      value={formData.familyIllnessDetails}
                      onChange={(e) => updateField('familyIllnessDetails', e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SECTION 3: الأنشطة والمواهب */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection(3)}
          className="w-full p-4 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 text-right hover:bg-slate-100/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                القسم الثالث: الأنشطة، المواهب ووسائل الانتقال
              </h3>
              <p className="text-[11px] text-slate-500">المراكز والنوادي الخارجية، الهوايات، وطريقة الوصول للمدرسة</p>
            </div>
          </div>
          {openSections[3] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {openSections[3] && (
          <div className="p-5 space-y-4 text-xs">
            <div>
              <span className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                الأنشطة والمراكز الخارجية:
              </span>
              <div className="flex flex-wrap gap-2">
                {activitiesOptions.map((opt) => {
                  const isSelected = formData.externalActivities?.includes(opt);
                  return (
                    <button
                      type="button"
                      key={opt}
                      disabled={!canEdit}
                      onClick={() => toggleArrayItem('externalActivities', opt)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {formData.externalActivities?.includes('أخرى') && (
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تحديد النشاط الخارجي الآخر:
                </label>
                <input
                  type="text"
                  value={formData.externalActivitiesOther}
                  onChange={(e) => updateField('externalActivitiesOther', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  هوايات الطالب
                </label>
                <input
                  type="text"
                  placeholder="مثال: القراءة، كرة القدم، البرمجة..."
                  value={formData.hobbies}
                  onChange={(e) => updateField('hobbies', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  مواهب الطالب
                </label>
                <input
                  type="text"
                  placeholder="مثال: الخطابة، الرسم، الابتكار العلمي..."
                  value={formData.talents}
                  onChange={(e) => updateField('talents', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                وسيلة الوصول إلى المدرسة
              </label>
              <select
                value={formData.transportationMethod}
                onChange={(e) => updateField('transportationMethod', e.target.value)}
                disabled={!canEdit}
                className="w-full sm:w-72 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              >
                <option value="الحافلة المدرسية">الحافلة المدرسية</option>
                <option value="ولي الأمر">ولي الأمر</option>
                <option value="السائق">السائق الخاص</option>
                <option value="سيراً على الأقدام">سيراً على الأقدام</option>
                <option value="أخرى">أخرى...</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SECTION 4: ولي الأمر ووسائل التواصل (Multiple Contacts) */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection(4)}
          className="w-full p-4 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 text-right hover:bg-slate-100/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              4
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                القسم الرابع: ولي الأمر وأشخاص التواصل
              </h3>
              <p className="text-[11px] text-slate-500">
                يمكن إضافة أكثر من شخص للتواصل وتحديد ولي الأمر الأساسي
              </p>
            </div>
          </div>
          {openSections[4] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {openSections[4] && (
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                قائمة أشخاص التواصل المعتمدين ({formData.contacts.length}):
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={addContact}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة شخص تواصل آخر
                </button>
              )}
            </div>

            <div className="space-y-4">
              {formData.contacts.map((contact, index) => (
                <div
                  key={contact.id || index}
                  className={`p-4 rounded-xl border transition-all ${
                    contact.isPrimary
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">
                        {index + 1}
                      </span>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {contact.name || `شخص تواصل #${index + 1}`}
                      </span>
                      {contact.isPrimary && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 font-bold px-2 py-0.5 rounded-full">
                          ولي الأمر الأساسي
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!contact.isPrimary && canEdit && (
                        <button
                          type="button"
                          onClick={() => updateContact(contact.id, { isPrimary: true })}
                          className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                        >
                          تعيين كأساسي
                        </button>
                      )}
                      {formData.contacts.length > 1 && canEdit && (
                        <button
                          type="button"
                          onClick={() => removeContact(contact.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="حذف جهة التواصل"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الاسم الرباعي *</label>
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => updateContact(contact.id, { name: e.target.value })}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">صلة القرابة *</label>
                      <select
                        value={contact.relation}
                        onChange={(e) => updateContact(contact.id, { relation: e.target.value })}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                      >
                        <option value="الأب">الأب</option>
                        <option value="الأم">الأم</option>
                        <option value="الأخ">الأخ</option>
                        <option value="الأخت">الأخت</option>
                        <option value="العم">العم</option>
                        <option value="الخال">الخال</option>
                        <option value="الجد">الجد</option>
                        <option value="الجدة">الجدة</option>
                        <option value="وصي قانوني">وصي قانوني</option>
                        <option value="أخرى">أخرى...</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف *</label>
                      <input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => updateContact(contact.id, { phone: e.target.value })}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم واتساب</label>
                      <input
                        type="tel"
                        value={contact.whatsapp}
                        onChange={(e) => updateContact(contact.id, { whatsapp: e.target.value })}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
                      <input
                        type="email"
                        value={contact.email}
                        onChange={(e) => updateContact(contact.id, { email: e.target.value })}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الهوية</label>
                      <input
                        type="text"
                        value={contact.nationalId}
                        onChange={(e) => updateContact(contact.id, { nationalId: e.target.value })}
                        disabled={!canEdit}
                        placeholder="784-XXXX-XXXXXXX-X"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الوظيفة</label>
                      <input
                        type="text"
                        value={contact.job}
                        onChange={(e) => updateContact(contact.id, { job: e.target.value })}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">جهة العمل</label>
                      <input
                        type="text"
                        value={contact.employer}
                        onChange={(e) => updateContact(contact.id, { employer: e.target.value })}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                      />
                    </div>

                    <div className="flex items-center gap-4 pt-4">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={contact.livesWithStudent}
                          onChange={(e) => updateContact(contact.id, { livesWithStudent: e.target.checked })}
                          disabled={!canEdit}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        يسكن مع الطالب في المنزل نفسه
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SECTION 5: الوضع الأسري */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection(5)}
          className="w-full p-4 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 text-right hover:bg-slate-100/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
              5
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                القسم الخامس: الوضع الأسري
              </h3>
              <p className="text-[11px] text-slate-500">الإخوة، حالة الوالدين، مع من يعيش الطالب، وملاحظات الأسرة</p>
            </div>
          </div>
          {openSections[5] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {openSections[5] && (
          <div className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">عدد الإخوة الذكور</label>
                <input
                  type="number"
                  min={0}
                  value={formData.brothersCount}
                  onChange={(e) => updateField('brothersCount', parseInt(e.target.value) || 0)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">عدد الإخوة الإناث</label>
                <input
                  type="number"
                  min={0}
                  value={formData.sistersCount}
                  onChange={(e) => updateField('sistersCount', parseInt(e.target.value) || 0)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ترتيب الطالب بين إخوته</label>
                <input
                  type="number"
                  min={1}
                  value={formData.birthOrder}
                  onChange={(e) => updateField('birthOrder', parseInt(e.target.value) || 1)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                هل يعيش الطالب مع الأب والأم معاً؟
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="bothParents"
                    checked={formData.livesWithBothParents === true}
                    onChange={() => updateField('livesWithBothParents', true)}
                    disabled={!canEdit}
                  />
                  نعم
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="bothParents"
                    checked={formData.livesWithBothParents === false}
                    onChange={() => updateField('livesWithBothParents', false)}
                    disabled={!canEdit}
                  />
                  لا
                </label>
              </div>
            </div>

            {!formData.livesWithBothParents && (
              <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">السبب:</label>
                  <select
                    value={formData.separationReason}
                    onChange={(e) => updateField('separationReason', e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  >
                    <option value="طلاق">طلاق</option>
                    <option value="وفاة الأب">وفاة الأب</option>
                    <option value="وفاة الأم">وفاة الأم</option>
                    <option value="وفاة الوالدين">وفاة الوالدين</option>
                    <option value="انفصال">انفصال دون طلاق رسمي</option>
                    <option value="سفر">سفر أحد الوالدين</option>
                    <option value="أخرى">أخرى...</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">مع من يعيش الطالب حالياً؟</label>
                  <input
                    type="text"
                    value={formData.livesWithWhom}
                    onChange={(e) => updateField('livesWithWhom', e.target.value)}
                    placeholder="مثال: مع الأم، مع الأب، مع الجد/الجدة..."
                    disabled={!canEdit}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                  هل يسكن أفراد آخرون مع الأسرة؟
                </label>
                <div className="flex items-center gap-4 mb-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="otherResidents"
                      checked={formData.otherResidentsInHome === true}
                      onChange={() => updateField('otherResidentsInHome', true)}
                      disabled={!canEdit}
                    />
                    نعم
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="otherResidents"
                      checked={formData.otherResidentsInHome === false}
                      onChange={() => updateField('otherResidentsInHome', false)}
                      disabled={!canEdit}
                    />
                    لا
                  </label>
                </div>
                {formData.otherResidentsInHome && (
                  <input
                    type="text"
                    placeholder="عددهم وصلتهم بالطالب (مثال: الجدة وعمة)..."
                    value={formData.otherResidentsDetails}
                    onChange={(e) => updateField('otherResidentsDetails', e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات إضافية عن الوضع الأسري
                </label>
                <textarea
                  rows={2}
                  value={formData.familyNotes}
                  onChange={(e) => updateField('familyNotes', e.target.value)}
                  disabled={!canEdit}
                  placeholder="ملاحظات حول العلاقات الأسرية، الاستقرار، وغيرها..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SECTION 6: السكن والوضع الاقتصادي */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection(6)}
          className="w-full p-4 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 text-right hover:bg-slate-100/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
              6
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-600" />
                القسم السادس: السكن والوضع الاقتصادي
              </h3>
              <p className="text-[11px] text-slate-500">عنوان السكن، نوع وملكية العقار، والغرفة الخاصة، ومستوى الدخل</p>
            </div>
          </div>
          {openSections[6] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {openSections[6] && (
          <div className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الإمارة</label>
                <select
                  value={formData.emirate}
                  onChange={(e) => updateField('emirate', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                >
                  <option value="الشارقة">الشارقة</option>
                  <option value="أبوظبي">أبوظبي</option>
                  <option value="دبي">دبي</option>
                  <option value="عجمان">عجمان</option>
                  <option value="أم القيوين">أم القيوين</option>
                  <option value="رأس الخيمة">رأس الخيمة</option>
                  <option value="الفجيرة">الفجيرة</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">المنطقة</label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => updateField('area', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الشارع</label>
                <input
                  type="text"
                  value={formData.streetName}
                  onChange={(e) => updateField('streetName', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم المنزل</label>
                <input
                  type="text"
                  value={formData.houseNumber}
                  onChange={(e) => updateField('houseNumber', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">نوع السكن</label>
                <select
                  value={formData.housingType}
                  onChange={(e) => updateField('housingType', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                >
                  <option value="فيلا">فيلا</option>
                  <option value="شقة">شقة</option>
                  <option value="بيت عربي">بيت عربي (شعبي)</option>
                  <option value="سكن مشترك">سكن مشترك</option>
                  <option value="أخرى">أخرى...</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ملكية السكن</label>
                <select
                  value={formData.housingOwnership}
                  onChange={(e) => updateField('housingOwnership', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                >
                  <option value="ملك">ملك</option>
                  <option value="إيجار">إيجار</option>
                  <option value="سكن حكومي">سكن حكومي / منحة</option>
                  <option value="أخرى">أخرى...</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">مستوى دخل الأسرة</label>
                <select
                  value={formData.incomeLevel}
                  onChange={(e) => updateField('incomeLevel', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  <option value="مناسب">مناسب / مستقر</option>
                  <option value="يحتاج إلى دعم">يحتاج إلى دعم ورعاية اجتماعية</option>
                  <option value="غير محدد">غير محدد</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">مصادر الدخل</label>
                <input
                  type="text"
                  placeholder="راتب، عمل تجاري، مساعدات..."
                  value={formData.incomeSources}
                  onChange={(e) => updateField('incomeSources', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                هل للطالب غرفة خاصة به في المنزل؟
              </label>
              <div className="flex items-center gap-4 mb-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="privateRoom"
                    checked={formData.hasPrivateRoom === true}
                    onChange={() => updateField('hasPrivateRoom', true)}
                    disabled={!canEdit}
                  />
                  نعم (غرفة خاصة منفصلة)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="privateRoom"
                    checked={formData.hasPrivateRoom === false}
                    onChange={() => updateField('hasPrivateRoom', false)}
                    disabled={!canEdit}
                  />
                  لا (غرفة مشتركة)
                </label>
              </div>

              {!formData.hasPrivateRoom && (
                <div className="w-full sm:w-96">
                  <input
                    type="text"
                    placeholder="مع من يشارك الغرفة؟ (مثال: الأخوين الأصغر)..."
                    value={formData.sharedRoomWith}
                    onChange={(e) => updateField('sharedRoomWith', e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SECTION 7: اعتماد البيانات */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection(7)}
          className="w-full p-4 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 text-right hover:bg-slate-100/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
              7
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-600" />
                القسم السابع: تدقيق واعتماد الاستمارة
              </h3>
              <p className="text-[11px] text-slate-500">اسم معبئ الاستمارة، تاريخ الاعتماد، وملاحظات المرشد المسؤول</p>
            </div>
          </div>
          {openSections[7] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {openSections[7] && (
          <div className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم معبئ الاستمارة</label>
                <input
                  type="text"
                  value={formData.filledByName}
                  onChange={(e) => updateField('filledByName', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الصفة الوظيفية</label>
                <input
                  type="text"
                  value={formData.filledByRole}
                  onChange={(e) => updateField('filledByRole', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">تاريخ تعبئة النموذج</label>
                <input
                  type="date"
                  value={formData.formDate}
                  onChange={(e) => updateField('formDate', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">حالة الاستمارة</label>
                <select
                  value={formData.formStatus}
                  onChange={(e) => updateField('formStatus', e.target.value as any)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-teal-800 dark:text-teal-300"
                >
                  <option value="مسودة">مسودة (Draft)</option>
                  <option value="مكتمل">مكتمل (Completed)</option>
                  <option value="معتمد">معتمد (Approved)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                ملاحظات وتوصيات المرشد المسؤول
              </label>
              <textarea
                rows={2}
                value={formData.counselorNotes}
                onChange={(e) => updateField('counselorNotes', e.target.value)}
                disabled={!canEdit}
                placeholder="أي ملاحظات نوعية أو إرشادات للمتابعة اللاحقة..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom save bar */}
      {canEdit && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveForm('مسودة')}
            className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            حفظ كمسودة
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveForm('معتمد')}
            className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSaving ? 'جاري الاعتماد...' : 'اعتماد وحفظ نهائي'}
          </button>
        </div>
      )}
    </div>
  );
};
