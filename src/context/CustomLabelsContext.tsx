import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseReady } from '../firebase/config';

export interface LabelDefinition {
  key: string;
  defaultText: string;
  category:
    | 'nav'
    | 'header'
    | 'dashboard'
    | 'students'
    | 'tardiness'
    | 'violations'
    | 'forms'
    | 'cases_intake'
    | 'committee_reports_users';
  descriptionAr: string;
}

export const DEFAULT_LABELS_REGISTRY: LabelDefinition[] = [
  // --- Navigation & Sidebar ---
  {
    key: 'nav.dashboard',
    defaultText: 'الصفحة الرئيسية',
    category: 'nav',
    descriptionAr: 'تبويب الصفحة الرئيسية في الشريط الجانبي',
  },
  {
    key: 'nav.students',
    defaultText: 'سجل الطلبة',
    category: 'nav',
    descriptionAr: 'تبويب سجل الطلبة في الشريط الجانبي',
  },
  {
    key: 'nav.tardiness',
    defaultText: 'التأخير الصباحي',
    category: 'nav',
    descriptionAr: 'تبويب التأخير الصباحي في الشريط الجانبي',
  },
  {
    key: 'nav.violations',
    defaultText: 'سجل المخالفات',
    category: 'nav',
    descriptionAr: 'تبويب سجل المخالفات في الشريط الجانبي',
  },
  {
    key: 'nav.warning-form',
    defaultText: 'الإنذار الكتابي',
    category: 'nav',
    descriptionAr: 'تبويب الإنذار الكتابي في الشريط الجانبي',
  },
  {
    key: 'nav.cases',
    defaultText: 'دراسة الحالة الفردية',
    category: 'nav',
    descriptionAr: 'تبويب دراسة الحالة الفردية في الشريط الجانبي',
  },
  {
    key: 'nav.bylaws',
    defaultText: 'اللائحة المدرسية والنماذج',
    category: 'nav',
    descriptionAr: 'تبويب لائحة المخالفات والنماذج في الشريط الجانبي',
  },
  {
    key: 'nav.forms',
    defaultText: 'تسجيل مخالفة',
    category: 'nav',
    descriptionAr: 'تبويب تسجيل مخالفة في الشريط الجانبي',
  },
  {
    key: 'nav.committee',
    defaultText: 'لجنة إدارة السلوك',
    category: 'nav',
    descriptionAr: 'تبويب لجنة إدارة السلوك في الشريط الجانبي',
  },
  {
    key: 'nav.reports',
    defaultText: 'التقارير والإحصائيات',
    category: 'nav',
    descriptionAr: 'تبويب التقارير والإحصائيات في الشريط الجانبي',
  },
  {
    key: 'nav.messages',
    defaultText: 'الرسائل المدرسية',
    category: 'nav',
    descriptionAr: 'تبويب الرسائل المدرسية في الشريط الجانبي',
  },
  {
    key: 'nav.users',
    defaultText: 'إدارة المستخدمين والمدارس',
    category: 'nav',
    descriptionAr: 'تبويب إدارة المستخدمين والمدارس في الشريط الجانبي',
  },
  {
    key: 'nav.settings',
    defaultText: 'الإعدادات العامة',
    category: 'nav',
    descriptionAr: 'تبويب الإعدادات والتقارير في الشريط الجانبي',
  },
  {
    key: 'navGroup.main',
    defaultText: 'الرئيسية',
    category: 'nav',
    descriptionAr: 'عنوان مجموعة الرئيسية في الشريط الجانبي',
  },
  {
    key: 'navGroup.students',
    defaultText: 'الطلبة',
    category: 'nav',
    descriptionAr: 'عنوان مجموعة الطلبة في الشريط الجانبي',
  },
  {
    key: 'navGroup.attendance',
    defaultText: 'الحضور',
    category: 'nav',
    descriptionAr: 'عنوان مجموعة الحضور في الشريط الجانبي',
  },
  {
    key: 'navGroup.guidance',
    defaultText: 'الإرشاد الطلابي',
    category: 'nav',
    descriptionAr: 'عنوان مجموعة الإرشاد الطلابي في الشريط الجانبي',
  },
  {
    key: 'navGroup.behavior',
    defaultText: 'إدارة السلوك',
    category: 'nav',
    descriptionAr: 'عنوان مجموعة إدارة السلوك في الشريط الجانبي',
  },
  {
    key: 'navGroup.forms',
    defaultText: 'النماذج واللوائح',
    category: 'nav',
    descriptionAr: 'عنوان مجموعة النماذج واللوائح في الشريط الجانبي',
  },
  {
    key: 'navGroup.reports',
    defaultText: 'التقارير',
    category: 'nav',
    descriptionAr: 'عنوان مجموعة التقارير في الشريط الجانبي',
  },
  {
    key: 'navGroup.admin',
    defaultText: 'الإدارة والنظام',
    category: 'nav',
    descriptionAr: 'عنوان مجموعة الإدارة والنظام في الشريط الجانبي',
  },

  // --- Header & School Identity ---
  {
    key: 'header.appName',
    defaultText: 'البوابة الإلكترونية والمنظومة الذكية',
    category: 'header',
    descriptionAr: 'اسم المنظومة / التطبيق في الترويسة',
  },
  {
    key: 'header.schoolName',
    defaultText: 'أكاديمية الفجيرة العلمية الإسلامية',
    category: 'header',
    descriptionAr: 'اسم الأكاديمية الرسمي في أعلى الصفحة',
  },
  {
    key: 'header.educationStage',
    defaultText: 'الحلقة الثالثة بنين (9 - 12)',
    category: 'header',
    descriptionAr: 'شارة المرحلة الدراسية والصفوف',
  },
  {
    key: 'header.academicYear',
    defaultText: 'العام الدراسي 2026–2027',
    category: 'header',
    descriptionAr: 'شارة العام الدراسي',
  },
  {
    key: 'header.subTitle',
    defaultText: 'الإرشاد الطلابي ولائحة الانضباط والسلوك',
    category: 'header',
    descriptionAr: 'الوصف الفرعي في ترويسة الصفحة',
  },
  {
    key: 'header.countryTitle',
    defaultText: 'دولة الإمارات العربية المتحدة',
    category: 'header',
    descriptionAr: 'عنوان الدولة في الشريط العلوي',
  },

  // --- Dashboard & Cards ---
  {
    key: 'dashboard.welcomeTitle',
    defaultText: 'أهلاً بك، سعادة المرشد المدرسي',
    category: 'dashboard',
    descriptionAr: 'عنوان الترحيب في الصفحة الرئيسية',
  },
  {
    key: 'dashboard.welcomeSubtitle',
    defaultText: 'منظومة المتابعة اليومية للإرشاد الطلابي وتطبيق لائحة الانضباط المدرسي وإدارة السلوك.',
    category: 'dashboard',
    descriptionAr: 'نص الترحيب التوضيحي بالصفحة الرئيسية',
  },
  {
    key: 'dashboard.card.tardiness',
    defaultText: 'التأخير الصباحي اليوم',
    category: 'dashboard',
    descriptionAr: 'عنوان بطاقة إحصائية التأخير اليوم',
  },
  {
    key: 'dashboard.card.violations',
    defaultText: 'المخالفات النشطة',
    category: 'dashboard',
    descriptionAr: 'عنوان بطاقة إحصائية المخالفات المفتوحة',
  },
  {
    key: 'dashboard.card.students',
    defaultText: 'إجمالي الطلبة المسجلين',
    category: 'dashboard',
    descriptionAr: 'عنوان بطاقة إجمالي عدد الطلبة',
  },
  {
    key: 'dashboard.card.signatures',
    defaultText: 'تعهدات ونماذج معلقة',
    category: 'dashboard',
    descriptionAr: 'عنوان بطاقة النماذج المعلقة والتوقيعات',
  },
  {
    key: 'dashboard.card.criticalTardy',
    defaultText: 'تنبيهات تأخير حرجة (3 فأكثر)',
    category: 'dashboard',
    descriptionAr: 'عنوان بطاقة رصد حالات التأخير الحرجة',
  },
  {
    key: 'dashboard.action.intake',
    defaultText: 'تسجيل حالة جديدة',
    category: 'dashboard',
    descriptionAr: 'زر الرصد السريع لتسجيل حالة',
  },
  {
    key: 'dashboard.action.cases',
    defaultText: 'الحالات المفتوحة',
    category: 'dashboard',
    descriptionAr: 'زر استعراض الحالات الإرشادية المفتوحة',
  },
  {
    key: 'dashboard.action.bylaws',
    defaultText: 'لائحة المخالفات والنماذج',
    category: 'dashboard',
    descriptionAr: 'زر الوصول المباشر للائحة المخالفات',
  },
  {
    key: 'dashboard.action.committee',
    defaultText: 'لجنة إدارة السلوك',
    category: 'dashboard',
    descriptionAr: 'زر الوصول لمحاضر واجتماعات اللجنة',
  },
  {
    key: 'dashboard.action.reports',
    defaultText: 'التقارير الشاملة',
    category: 'dashboard',
    descriptionAr: 'زر التقارير السريعة في الصفحة الرئيسية',
  },
  {
    key: 'dashboard.section.topTardy',
    defaultText: 'الطلبة الأكثر تسجيلاً للتأخير',
    category: 'dashboard',
    descriptionAr: 'عنوان قسم الطلبة المتكرر تأخرهم',
  },
  {
    key: 'dashboard.section.openViolations',
    defaultText: 'أحدث المخالفات المسجلة',
    category: 'dashboard',
    descriptionAr: 'عنوان قسم أحدث المخالفات الجارية',
  },
  {
    key: 'dashboard.section.quickActions',
    defaultText: 'الإجراءات والعمليات السريعة',
    category: 'dashboard',
    descriptionAr: 'عنوان قسم الإجراءات السريعة بالصفحة الرئيسية',
  },

  // --- Students Page ---
  {
    key: 'students.pageTitle',
    defaultText: 'سجل الطلبة الشامل',
    category: 'students',
    descriptionAr: 'العنوان الرئيسي لصفحة سجل الطلبة',
  },
  {
    key: 'students.pageSubtitle',
    defaultText: 'إدارة بيانات الطلبة والتواصل مع أولياء الأمور وتصدير القوائم الرسمية',
    category: 'students',
    descriptionAr: 'الوصف التوضيحي لصفحة سجل الطلبة',
  },
  {
    key: 'students.btnAdd',
    defaultText: 'إضافة طالب جديد',
    category: 'students',
    descriptionAr: 'زر فتح نافذة إضافة طالب',
  },
  {
    key: 'students.btnImport',
    defaultText: 'استيراد من إكسل',
    category: 'students',
    descriptionAr: 'زر استيراد قوائم الطلبة من ملف Excel',
  },
  {
    key: 'students.searchPlaceholder',
    defaultText: 'بحث باسم الطالب أو الرقم الطلابي أو الشعبة...',
    category: 'students',
    descriptionAr: 'نص حقل البحث في جدول الطلبة',
  },
  {
    key: 'students.colName',
    defaultText: 'اسم الطالب',
    category: 'students',
    descriptionAr: 'عنوان عمود اسم الطالب',
  },
  {
    key: 'students.colId',
    defaultText: 'الرقم الطلابي',
    category: 'students',
    descriptionAr: 'عنوان عمود الرقم الطلابي الوزاري',
  },
  {
    key: 'students.colGrade',
    defaultText: 'الصف والشعبة',
    category: 'students',
    descriptionAr: 'عنوان عمود الصف الدراسي والشعبة',
  },
  {
    key: 'students.colPhone',
    defaultText: 'هاتف ولي الأمر',
    category: 'students',
    descriptionAr: 'عنوان عمود هاتف ولي الأمر',
  },
  {
    key: 'students.colTardiness',
    defaultText: 'مرات التأخير',
    category: 'students',
    descriptionAr: 'عنوان عمود إجمالي رصيد التأخير',
  },
  {
    key: 'students.colViolations',
    defaultText: 'المخالفات',
    category: 'students',
    descriptionAr: 'عنوان عمود إجمالي رصيد المخالفات',
  },

  // --- Tardiness Page ---
  {
    key: 'tardiness.pageTitle',
    defaultText: 'رصد ومتابعة التأخير الصباحي',
    category: 'tardiness',
    descriptionAr: 'العنوان الرئيسي لصفحة التأخير الصباحي',
  },
  {
    key: 'tardiness.pageSubtitle',
    defaultText: 'تسجيل فوري لحالات التأخير وتنبيه أولياء الأمور وحساب التكرار التراكمي',
    category: 'tardiness',
    descriptionAr: 'الوصف التوضيحي لصفحة التأخير',
  },
  {
    key: 'tardiness.btnRecord',
    defaultText: 'تسجيل تأخير طالب',
    category: 'tardiness',
    descriptionAr: 'زر تسجيل تأخير جديد',
  },
  {
    key: 'tardiness.tabToday',
    defaultText: 'تأخيرات اليوم',
    category: 'tardiness',
    descriptionAr: 'تبويب استعراض تأخيرات اليوم الحالي',
  },
  {
    key: 'tardiness.tabCritical',
    defaultText: 'المتكرر (3 مرات فأكثر)',
    category: 'tardiness',
    descriptionAr: 'تبويب الطلبة ذوي التأخير الحرج',
  },
  {
    key: 'tardiness.tabAll',
    defaultText: 'السجل التراكمي العام',
    category: 'tardiness',
    descriptionAr: 'تبويب السجل الكامل لجميع التأخيرات',
  },

  // --- Violations Page ---
  {
    key: 'violations.pageTitle',
    defaultText: 'سجل المخالفات والإجراءات التربوية',
    category: 'violations',
    descriptionAr: 'العنوان الرئيسي لصفحة المخالفات السلوكية',
  },
  {
    key: 'violations.pageSubtitle',
    defaultText: 'توثيق المخالفات السلوكية ومتابعة الإجراءات العلاجية وفق القرار الوزاري 851',
    category: 'violations',
    descriptionAr: 'الوصف التوضيحي لصفحة المخالفات',
  },
  {
    key: 'violations.btnAdd',
    defaultText: 'تسجيل مخالفة جديدة',
    category: 'violations',
    descriptionAr: 'زر تسجيل مخالفة سلوكية جديدة',
  },
  {
    key: 'violations.degree1',
    defaultText: 'الدرجة الأولى (بسيطة)',
    category: 'violations',
    descriptionAr: 'مسمى مخالفات الدرجة الأولى',
  },
  {
    key: 'violations.degree2',
    defaultText: 'الدرجة الثانية (متوسطة الخطورة)',
    category: 'violations',
    descriptionAr: 'مسمى مخالفات الدرجة الثانية',
  },
  {
    key: 'violations.degree3',
    defaultText: 'الدرجة الثالثة (جسيمة)',
    category: 'violations',
    descriptionAr: 'مسمى مخالفات الدرجة الثالثة',
  },
  {
    key: 'violations.degree4',
    defaultText: 'الدرجة الرابعة (شديدة الخطورة)',
    category: 'violations',
    descriptionAr: 'مسمى مخالفات الدرجة الرابعة',
  },

  // --- Forms & Bylaws ---
  {
    key: 'forms.pageTitle',
    defaultText: 'النماذج الرسمية المعتمدة',
    category: 'forms',
    descriptionAr: 'العنوان الرئيسي لصفحة النماذج',
  },
  {
    key: 'forms.pageSubtitle',
    defaultText: 'نماذج لائحة إدارة سلوك الطلبة المعتمدة للتوليد والطباعة والتوقيع',
    category: 'forms',
    descriptionAr: 'الوصف التوضيحي لصفحة النماذج',
  },
  {
    key: 'forms.model6',
    defaultText: 'نموذج (6): تقرير مخالفة سلوكية',
    category: 'forms',
    descriptionAr: 'مسمى النموذج الوزاري رقم 6',
  },
  {
    key: 'forms.model8',
    defaultText: 'نموذج (8): إشعار استدعاء ولي أمر',
    category: 'forms',
    descriptionAr: 'مسمى النموذج الوزاري رقم 8',
  },
  {
    key: 'forms.model9',
    defaultText: 'نموذج (9): إنذار كتابي للطالب',
    category: 'forms',
    descriptionAr: 'مسمى النموذج الوزاري رقم 9',
  },
  {
    key: 'forms.model10',
    defaultText: 'نموذج (10): تعهد ولي الأمر بالانضباط',
    category: 'forms',
    descriptionAr: 'مسمى النموذج الوزاري رقم 10',
  },
  {
    key: 'bylaws.pageTitle',
    defaultText: 'لائحة إدارة السلوك الطلابي',
    category: 'forms',
    descriptionAr: 'العنوان الرئيسي لصفحة اللائحة المدرسية',
  },
  {
    key: 'bylaws.pageSubtitle',
    defaultText: 'الدليل المرجعي وتصنيف المخالفات والإجراءات المعتمدة بموجب القرار الوزاري 851',
    category: 'forms',
    descriptionAr: 'الوصف التوضيحي للائحة السلوك',
  },

  // --- Cases & Intake ---
  {
    key: 'cases.pageTitle',
    defaultText: 'سجل دراسة الحالة الفردية',
    category: 'cases_intake',
    descriptionAr: 'العنوان الرئيسي لصفحة دراسة الحالة',
  },
  {
    key: 'cases.pageSubtitle',
    defaultText: 'المتابعة الإرشادية الخاصة، خطط الدعم السلوكي والنفسي، وجلسات الرعاية',
    category: 'cases_intake',
    descriptionAr: 'الوصف التوضيحي لصفحة دراسة الحالة',
  },
  {
    key: 'cases.btnNewCase',
    defaultText: 'فتح ملف حالة جديدة',
    category: 'cases_intake',
    descriptionAr: 'زر فتح ملف حالة إرشادية جديدة',
  },
  {
    key: 'intake.pageTitle',
    defaultText: 'الاستقبال والملاحظات اليومية',
    category: 'cases_intake',
    descriptionAr: 'العنوان الرئيسي لصفحة الاستقبال اليومي',
  },
  {
    key: 'intake.pageSubtitle',
    defaultText: 'توثيق المراجعات السريعة، استفسارات أولياء الأمور، والملاحظات الميدانية العاجلة',
    category: 'cases_intake',
    descriptionAr: 'الوصف التوضيحي لصفحة الاستقبال',
  },

  // --- Committee, Reports & Users ---
  {
    key: 'committee.pageTitle',
    defaultText: 'لجنة إدارة السلوك المدرسي',
    category: 'committee_reports_users',
    descriptionAr: 'العنوان الرئيسي لصفحة لجنة إدارة السلوك',
  },
  {
    key: 'committee.pageSubtitle',
    defaultText: 'توثيق اجتماعات اللجنة، القرارات التربوية المعتمدة، ومتابعة تنفيذ التوصيات',
    category: 'committee_reports_users',
    descriptionAr: 'الوصف التوضيحي لصفحة اللجنة',
  },
  {
    key: 'reports.pageTitle',
    defaultText: 'التقارير والمؤشرات البيانية',
    category: 'committee_reports_users',
    descriptionAr: 'العنوان الرئيسي لصفحة التقارير',
  },
  {
    key: 'reports.pageSubtitle',
    defaultText: 'استخراج تقارير الأداء السلوكي والانضباط والتصدير الإحصائي',
    category: 'committee_reports_users',
    descriptionAr: 'الوصف التوضيحي لصفحة التقارير',
  },
  {
    key: 'users.pageTitle',
    defaultText: 'إدارة المستخدمين والمدارس وسجل التدقيق',
    category: 'committee_reports_users',
    descriptionAr: 'العنوان الرئيسي لصفحة إدارة المستخدمين والمدارس',
  },
  {
    key: 'users.pageSubtitle',
    defaultText: 'التحكم المركزي في حسابات الكوادر المدرسية، اعتماد المدارس، وإدارة السجلات الإدارية',
    category: 'committee_reports_users',
    descriptionAr: 'الوصف التوضيحي لصفحة إدارة المستخدمين',
  },
];

export const CATEGORY_NAMES_AR: Record<LabelDefinition['category'] | 'all', string> = {
  all: 'جميع المسميات',
  nav: 'التبويبات والشريط الجانبي',
  header: 'ترويسة وهوية المدرسة',
  dashboard: 'الصفحة الرئيسية والبطاقات',
  students: 'سجل وشؤون الطلبة',
  tardiness: 'التأخير الصباحي',
  violations: 'المخالفات والسلوك',
  forms: 'النماذج واللوائح الرسمية',
  cases_intake: 'دراسة الحالة والاستقبال',
  committee_reports_users: 'اللجنة والتقارير والإدارة',
};

const STORAGE_CUSTOM_LABELS_KEY = 'al_khalil_custom_labels_v1';
const STORAGE_LIVE_EDIT_KEY = 'al_khalil_live_edit_mode_v1';

interface CustomLabelsContextType {
  customLabels: Record<string, string>;
  isLiveEditMode: boolean;
  toggleLiveEditMode: () => void;
  setLiveEditMode: (active: boolean) => void;
  isCustomizerOpen: boolean;
  openCustomizer: (initialCategory?: LabelDefinition['category'] | 'all') => void;
  closeCustomizer: () => void;
  activeCategoryFilter: LabelDefinition['category'] | 'all';
  setActiveCategoryFilter: (cat: LabelDefinition['category'] | 'all') => void;
  t: (key: string, fallback?: string) => string;
  updateLabel: (key: string, value: string) => Promise<void>;
  updateMultipleLabels: (updates: Record<string, string>) => Promise<void>;
  resetLabel: (key: string) => Promise<void>;
  resetAllLabels: () => Promise<void>;
  editingLabelKey: string | null;
  setEditingLabelKey: (key: string | null) => void;
  schoolId?: string;
  setSchoolId: (id: string) => void;
}

const CustomLabelsContext = createContext<CustomLabelsContextType | undefined>(undefined);

export const CustomLabelsProvider: React.FC<{
  children: React.ReactNode;
  initialSchoolId?: string;
}> = ({ children, initialSchoolId = '7001' }) => {
  const [schoolId, setSchoolId] = useState<string>(initialSchoolId);
  const [customLabels, setCustomLabels] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CUSTOM_LABELS_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      if (parsed && (parsed['nav.dashboard'] === 'لوحة السلوك' || parsed['nav.dashboard'] === 'لوحة التحكم')) {
        parsed['nav.dashboard'] = 'الصفحة الرئيسية';
        localStorage.setItem(STORAGE_CUSTOM_LABELS_KEY, JSON.stringify(parsed));
      }
      if (
        parsed &&
        parsed['header.schoolName'] &&
        (parsed['header.schoolName'].includes('الخليل') || parsed['header.schoolName'].includes('المستقبل'))
      ) {
        parsed['header.schoolName'] = 'أكاديمية الفجيرة العلمية الإسلامية';
        localStorage.setItem(STORAGE_CUSTOM_LABELS_KEY, JSON.stringify(parsed));
      }
      return parsed || {};
    } catch {
      return {};
    }
  });

  const [isLiveEditMode, setIsLiveEditMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LIVE_EDIT_KEY);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<LabelDefinition['category'] | 'all'>('all');
  const [editingLabelKey, setEditingLabelKey] = useState<string | null>(null);

  // Sync with Firestore school settings on mount or school change
  useEffect(() => {
    let isCancelled = false;
    async function loadCloudLabels() {
      if (!isFirebaseReady || !db || !schoolId) return;
      try {
        const docRef = doc(db, 'schools', schoolId, 'settings', 'customLabels');
        const snap = await getDoc(docRef);
        if (!isCancelled && snap.exists()) {
          const data = snap.data();
          if (data && data.labels && typeof data.labels === 'object') {
            setCustomLabels((prev) => {
              const merged = { ...prev, ...data.labels };
              try {
                localStorage.setItem(STORAGE_CUSTOM_LABELS_KEY, JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn('Could not sync custom labels from cloud:', err);
      }
    }
    loadCloudLabels();
    return () => {
      isCancelled = true;
    };
  }, [schoolId]);

  const toggleLiveEditMode = useCallback(() => {
    setIsLiveEditMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_LIVE_EDIT_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const setLiveEditMode = useCallback((active: boolean) => {
    setIsLiveEditMode(active);
    try {
      localStorage.setItem(STORAGE_LIVE_EDIT_KEY, JSON.stringify(active));
    } catch {}
  }, []);

  const openCustomizer = useCallback((initialCategory: LabelDefinition['category'] | 'all' = 'all') => {
    setActiveCategoryFilter(initialCategory);
    setIsCustomizerOpen(true);
  }, []);

  const closeCustomizer = useCallback(() => {
    setIsCustomizerOpen(false);
  }, []);

  // Translate / lookup with fallback
  const t = useCallback(
    (key: string, fallback?: string): string => {
      if (customLabels[key] !== undefined && customLabels[key].trim() !== '') {
        return customLabels[key];
      }
      if (fallback !== undefined) {
        return fallback;
      }
      const def = DEFAULT_LABELS_REGISTRY.find((item) => item.key === key);
      return def ? def.defaultText : key;
    },
    [customLabels]
  );

  const saveToStorageAndCloud = async (updated: Record<string, string>) => {
    try {
      localStorage.setItem(STORAGE_CUSTOM_LABELS_KEY, JSON.stringify(updated));
    } catch {}

    if (isFirebaseReady && db && schoolId) {
      try {
        const docRef = doc(db, 'schools', schoolId, 'settings', 'customLabels');
        await setDoc(docRef, { labels: updated, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (err) {
        console.warn('Could not persist custom labels to cloud:', err);
      }
    }
  };

  const updateLabel = useCallback(
    async (key: string, value: string) => {
      const trimmed = value.trim();
      const def = DEFAULT_LABELS_REGISTRY.find((item) => item.key === key);
      setCustomLabels((prev) => {
        const next = { ...prev };
        // If empty or identical to default, delete custom override to keep storage clean
        if (!trimmed || (def && def.defaultText === trimmed)) {
          delete next[key];
        } else {
          next[key] = trimmed;
        }
        saveToStorageAndCloud(next);
        return next;
      });
    },
    [schoolId]
  );

  const updateMultipleLabels = useCallback(
    async (updates: Record<string, string>) => {
      setCustomLabels((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(updates)) {
          const trimmed = v.trim();
          const def = DEFAULT_LABELS_REGISTRY.find((item) => item.key === k);
          if (!trimmed || (def && def.defaultText === trimmed)) {
            delete next[k];
          } else {
            next[k] = trimmed;
          }
        }
        saveToStorageAndCloud(next);
        return next;
      });
    },
    [schoolId]
  );

  const resetLabel = useCallback(
    async (key: string) => {
      setCustomLabels((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        saveToStorageAndCloud(next);
        return next;
      });
    },
    [schoolId]
  );

  const resetAllLabels = useCallback(async () => {
    setCustomLabels({});
    try {
      localStorage.removeItem(STORAGE_CUSTOM_LABELS_KEY);
    } catch {}
    if (isFirebaseReady && db && schoolId) {
      try {
        const docRef = doc(db, 'schools', schoolId, 'settings', 'customLabels');
        await setDoc(docRef, { labels: {}, updatedAt: new Date().toISOString() });
      } catch (err) {
        console.warn('Could not reset custom labels in cloud:', err);
      }
    }
  }, [schoolId]);

  const value = useMemo(
    () => ({
      customLabels,
      isLiveEditMode,
      toggleLiveEditMode,
      setLiveEditMode,
      isCustomizerOpen,
      openCustomizer,
      closeCustomizer,
      activeCategoryFilter,
      setActiveCategoryFilter,
      t,
      updateLabel,
      updateMultipleLabels,
      resetLabel,
      resetAllLabels,
      editingLabelKey,
      setEditingLabelKey,
      schoolId,
      setSchoolId,
    }),
    [
      customLabels,
      isLiveEditMode,
      toggleLiveEditMode,
      setLiveEditMode,
      isCustomizerOpen,
      openCustomizer,
      closeCustomizer,
      activeCategoryFilter,
      t,
      updateLabel,
      updateMultipleLabels,
      resetLabel,
      resetAllLabels,
      editingLabelKey,
      schoolId,
    ]
  );

  return <CustomLabelsContext.Provider value={value}>{children}</CustomLabelsContext.Provider>;
};

const defaultFallbackContext: CustomLabelsContextType = {
  customLabels: {},
  isLiveEditMode: false,
  toggleLiveEditMode: () => {},
  setLiveEditMode: () => {},
  isCustomizerOpen: false,
  openCustomizer: () => {},
  closeCustomizer: () => {},
  activeCategoryFilter: 'all',
  setActiveCategoryFilter: () => {},
  t: (_key: string, defaultText: string) => defaultText,
  updateLabel: async () => {},
  updateMultipleLabels: async () => {},
  resetLabel: async () => {},
  resetAllLabels: async () => {},
  editingLabelKey: null,
  setEditingLabelKey: () => {},
  schoolId: null,
  setSchoolId: () => {},
};

export function useCustomLabels() {
  const context = useContext(CustomLabelsContext);
  if (!context) {
    console.warn('useCustomLabels was called outside CustomLabelsProvider, falling back to default labels.');
    return defaultFallbackContext;
  }
  return context;
}
