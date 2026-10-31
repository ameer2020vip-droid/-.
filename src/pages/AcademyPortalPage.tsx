import React, { useState, useMemo, useEffect } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  BookOpen,
  Users,
  UserCheck,
  Briefcase,
  FileText,
  Bell,
  Calendar,
  ClipboardCheck,
  PhoneCall,
  Search,
  Download,
  Eye,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Mail,
  Globe,
  Sparkles,
  Award,
  HeartHandshake,
  Scale,
  Laptop,
  Headphones,
  ChevronLeft,
  Plus,
  Send,
  X,
  Check,
  Menu,
  LogIn,
  LayoutDashboard,
  Building2,
  FileSignature,
  MessageSquare,
} from 'lucide-react';
import { Student } from '../types';
import { NavTab } from '../components/Navigation';

export type PortalSectionId =
  | 'home'
  | 'about'
  | 'esystems'
  | 'student-services'
  | 'parent-portal'
  | 'student-portal'
  | 'staff-portal'
  | 'policies'
  | 'news'
  | 'events'
  | 'forms-surveys'
  | 'contact'
  | 'admin-portal';

interface ElectronicSystemItem {
  id: string;
  title: string;
  category:
    | 'student'
    | 'parent'
    | 'staff'
    | 'forms'
    | 'admin'
    | 'policies'
    | 'support';
  categoryLabel: string;
  description: string;
  status: 'متاح الآن' | 'قيد التحديث' | 'مغلق مؤقتًا';
  targetTab?: NavTab;
  targetPortalSection?: PortalSectionId;
}

interface PolicyDocumentItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  version: string;
  updatedDate: string;
  clauses: string[];
}

interface NewsItem {
  id: string;
  title: string;
  category: 'أخبار الأكاديمية' | 'تعميم رسمي' | 'إنجازات طلابية' | 'إعلان إداري';
  date: string;
  summary: string;
  isUrgent?: boolean;
}

interface EventInitiativeItem {
  id: string;
  title: string;
  category: string;
  date: string;
  location: string;
  targetAudience: string;
  description: string;
}

interface SurveySubmissionRecord {
  id: string;
  formId: string;
  formTitle: string;
  applicantRole: string;
  fullName: string;
  studentName?: string;
  gradeSection?: string;
  phone: string;
  email: string;
  rating: string;
  details: string;
  submittedAt: string;
}

const PORTAL_SUBMISSIONS_KEY = 'fsia_portal_form_submissions_v1';
const PORTAL_NEWS_KEY = 'fsia_portal_news_v1';
const PORTAL_SYSTEMS_KEY = 'fsia_portal_esystems_v1';

const INITIAL_ESYSTEMS: ElectronicSystemItem[] = [
  {
    id: 'sys-counselor',
    title: 'نظام الرعاية والإرشاد الطلابي الذكي',
    category: 'staff',
    categoryLabel: 'أنظمة المعلمين والإداريين',
    description: 'منظومة متكاملة لمتابعة شؤون الطلبة، الحالات الإرشادية، الانضباط السلوكي، والتقارير الرسمية.',
    status: 'متاح الآن',
    targetTab: 'dashboard',
  },
  {
    id: 'sys-attendance',
    title: 'منظومة رصد الحضور والغياب والتأخر الصباحي',
    category: 'student',
    categoryLabel: 'أنظمة الطلبة',
    description: 'متابعة يومية دقيقة للانتظام الدراسي وطابور الصباح وإشعارات أولياء الأمور الفورية.',
    status: 'متاح الآن',
    targetTab: 'absences',
  },
  {
    id: 'sys-behavior',
    title: 'بوابة الانضباط السلوكي ولجنة إدارة السلوك',
    category: 'admin',
    categoryLabel: 'الخدمات الإدارية',
    description: 'توثيق المواقف السلوكية وتطبيق لائحة السلوك الطلابي المعتمدة وإصدار النماذج الرسمية.',
    status: 'متاح الآن',
    targetTab: 'violations',
  },
  {
    id: 'sys-parent-comm',
    title: 'منصة التواصل الموحد مع أولياء الأمور',
    category: 'parent',
    categoryLabel: 'أنظمة أولياء الأمور',
    description: 'إرسال واستقبال الإشعارات الرسمية والتعاميم التربوية وتحديد مواعيد المقابلات الإرشادية.',
    status: 'متاح الآن',
    targetTab: 'messages',
  },
  {
    id: 'sys-student-portal',
    title: 'بوابة الطالب الأكاديمية والإرشادية',
    category: 'student',
    categoryLabel: 'أنظمة الطلبة',
    description: 'الاطلاع على الجداول الدراسية، الأنشطة، المسابقات، طلبات الإرشاد، ولائحة السلوك.',
    status: 'متاح الآن',
    targetPortalSection: 'student-portal',
  },
  {
    id: 'sys-parent-portal',
    title: 'بوابة ولي الأمر الإلكترونية',
    category: 'parent',
    categoryLabel: 'أنظمة أولياء الأمور',
    description: 'متابعة حضور الأبناء، الاطلاع على التعاميم، تقديم المقترحات، وتحديث بيانات التواصل.',
    status: 'متاح الآن',
    targetPortalSection: 'parent-portal',
  },
  {
    id: 'sys-official-forms',
    title: 'مركز النماذج والاستبيانات الإلكترونية',
    category: 'forms',
    categoryLabel: 'النماذج والاستبيانات الإلكترونية',
    description: 'تعبئة النماذج الرسمية واستبيانات قياس الرضا والمقترحات التطويرية للأكاديمية.',
    status: 'متاح الآن',
    targetPortalSection: 'forms-surveys',
  },
  {
    id: 'sys-policies-lib',
    title: 'المكتبة الرقمية للسياسات واللوائح المعتمدة',
    category: 'policies',
    categoryLabel: 'السياسات والوثائق الرسمية',
    description: 'استعراض وتحميل اللوائح المعتمدة: حماية الطفل، قانون وديمة، لائحة السلوك، ومكافحة التنمر.',
    status: 'متاح الآن',
    targetPortalSection: 'policies',
  },
  {
    id: 'sys-tech-support',
    title: 'مكتب الدعم الفني والمساعدة الرقمية',
    category: 'support',
    categoryLabel: 'الدعم الفني والمساعدة',
    description: 'تقديم طلبات الدعم التقني للطلبة وأولياء الأمور والهيئة التدريسية والإدارية.',
    status: 'متاح الآن',
    targetPortalSection: 'contact',
  },
];

const INITIAL_POLICIES: PolicyDocumentItem[] = [
  {
    id: 'pol-attendance',
    title: 'سياسة الحضور والغياب والانضباط الصباحي',
    category: 'السياسات الطلابية',
    summary: 'تنظيم مواعيد الطابور الصباحي (07:45 ص) وإجراءات التعامل مع الغياب بعذر أو بدون عذر وفق اللوائح المعتمدة.',
    version: 'الإصدار 3.2 – 2026/2027',
    updatedDate: '2026-09-01',
    clauses: [
      'يبدأ الطابور الصباحي في تمام الساعة 07:45 صباحاً وتُغلق البوابة الساعة 08:00 صباحاً.',
      'يلتزم ولي الأمر بتزويد إدارة أكاديمية الفجيرة العلمية الإسلامية بالعذر الطبي أو الرسمي خلال 3 أيام عمل.',
      'عند تكرار التأخر الصباحي أو الغياب لـ 3 مرات يتم إصدار تنبيه خطي وتوثيق تعهد الالتزام المدرسي.',
    ],
  },
  {
    id: 'pol-behavior',
    title: 'لائحة السلوك والانضباط الطلابي المعتمدة',
    category: 'اللوائح السلوكية',
    summary: 'المرجع الرسمي لتعزيز السلوك الإيجابي ومعالجة المخالفات السلوكية وفق الدرجات الأربع المعتمدة تربوياً.',
    version: 'الإصدار المعتمد 2026–2027',
    updatedDate: '2026-09-01',
    clauses: [
      'ترسيخ القيم الإسلامية والأخلاق الحميدة والهوية الوطنية الإماراتية لدى جميع طلبة الأكاديمية.',
      'تدرج الإجراءات التربوية من التوجيه الفردي والتنبيه الخطي إلى خطط تعديل السلوك ولجنة إدارة السلوك.',
      'مشاركة ولي الأمر كشريك استراتيجي في دعم السلوك الإيجابي والتميز الأخلاقي والعلمي.',
    ],
  },
  {
    id: 'pol-child-protection',
    title: 'سياسة حماية الطفل وسلامة البيئة المدرسية',
    category: 'الحماية والرعاية',
    summary: 'إجراءات شاملة لضمان بيئة تعليمية آمنة ومحفزة تحمي حقوق الطالب النفسية والجسدية والاجتماعية.',
    version: 'الإصدار 2.5 – 2026',
    updatedDate: '2026-09-05',
    clauses: [
      'توفير بيئة مدرسية خالية من أي شكل من أشكال الإيذاء أو الإهمال داخل أكاديمية الفجيرة العلمية الإسلامية.',
      'تخصيص قنوات إبلاغ سرية وآمنة للطلبة وأولياء الأمور عبر مكتب الإرشاد الطلابي ووحدة حماية الطفل.',
      'التدخل الفوري المهني والتربوي لمعالجة أي ملاحظة تمس أمن وسلامة الطالب.',
    ],
  },
  {
    id: 'pol-wadeema',
    title: 'قانون وديمة (القانون الاتحادي رقم 3 لسنة 2016 بشأن حقوق الطفل)',
    category: 'التشريعات الوطنية',
    summary: 'الدليل التطبيقي لقانون حقوق الطفل (وديمة) في دولة الإمارات العربية المتحدة داخل المجتمع المدرسي.',
    version: 'التشريع الاتحادي المعتمد',
    updatedDate: '2026-08-25',
    clauses: [
      'حق كل طفل في التعليم والرعاية الصحية والحماية من كافة أشكال التمييز أو الإساءة.',
      'التزام كافة العاملين في الأكاديمية بالإبلاغ الفوري عن أي تهديد لسلامة الطفل وفق القنوات الرسمية.',
      'تعزيز وعي الطلبة وأولياء الأمور بحقوق الطفل وواجباته في المجتمع الإماراتي.',
    ],
  },
  {
    id: 'pol-anti-bullying',
    title: 'سياسة مكافحة التنمر وتعزيز التسامح والاحترام المتبادل',
    category: 'الحماية والرعاية',
    summary: 'برامج وقائية وإجرائية لمنع التنمر اللفظي أو الجسدي أو الإلكتروني وبناء بيئة قائمة على الأخوة والاحترام.',
    version: 'الإصدار 2.0 – 2026/2027',
    updatedDate: '2026-09-10',
    clauses: [
      'يُحظر التنمر بكافة أشكاله (المباشر والإلكتروني) ويُعامل بجدية تامة وفق لائحة السلوك الطلابي.',
      'تنفيذ برامج توعوية دورية في الفصول الدراسية والإذاعة المدرسية لتعزيز قيم التسامح والرفق.',
      'تقديم جلسات دعم وإرشاد نفسي وتربوي للطلبة المتأثرين وبرامج تقويمية للطلبة المخالفين.',
    ],
  },
  {
    id: 'pol-drug-prevention',
    title: 'دليل الوقاية من المخدرات والمؤثرات العقلية والسموم الرقمية',
    category: 'الأدلة التوعوية',
    summary: 'دليل وقائي وتثقيفي لحماية النشء والشباب من الآفات السلوكية والمؤثرات الضارة وتعزيز الحصانة القيمية.',
    version: 'الإصدار 1.8 – 2026',
    updatedDate: '2026-09-12',
    clauses: [
      'بناء الوعي الذاتي والوازع الديني والوطني لدى الطلبة للوقاية من كافة المؤثرات الضارة.',
      'التعاون مع الجهات المختصة في إمارة الفجيرة لتنظيم محاضرات وورش عمل وقائية للطلبة وأولياء الأمور.',
      'رصد أي مؤشرات سلوكية أو صحية مبكرة والتعامل معها بسرية ومهنية عالية.',
    ],
  },
  {
    id: 'pol-internal-bylaws',
    title: 'اللوائح الداخلية والأدلة الإجرائية للطلبة وأولياء الأمور والكادر',
    category: 'الأدلة الإجرائية',
    summary: 'تنظيم الزي المدرسي الرسمي، استخدام الأجهزة الإلكترونية، ضوابط الانصراف، والتعهدات الرسمية.',
    version: 'الإصدار الموحد 2026–2027',
    updatedDate: '2026-09-01',
    clauses: [
      'الالتزام التام بالزي المدرسي الرسمي المعتمد في أكاديمية الفجيرة العلمية الإسلامية.',
      'تنظيم إحضار واستخدام الأجهزة الذكية وفق الضوابط التعليمية المعتمدة ونماذج الاستلام والتسليم.',
      'توثيق المخولين باستلام الطلبة (نموذج 26) حفاظاً على أمن وسلامة الطلبة عند الانصراف.',
    ],
  },
];

const INITIAL_NEWS: NewsItem[] = [
  {
    id: 'news-1',
    title: 'أكاديمية الفجيرة العلمية الإسلامية تطلق البوابة الرقمية الموحدة للعام الدراسي 2026–2027',
    category: 'أخبار الأكاديمية',
    date: '2026-10-20',
    summary: 'في إطار التحول الرقمي الشامل، أطلقت الأكاديمية بوابتها الإلكترونية الرسمية التي تجمع كافة الأنظمة الطلابية والإرشادية وخدمات أولياء الأمور في منصة واحدة.',
    isUrgent: true,
  },
  {
    id: 'news-2',
    title: 'تعميم لأولياء الأمور الكرام بشأن مواعيد الطابور الصباحي والانتظام الدراسي',
    category: 'تعميم رسمي',
    date: '2026-10-18',
    summary: 'تؤكد إدارة أكاديمية الفجيرة العلمية الإسلامية على أهمية حضور الطلبة قبل الساعة 07:45 صباحاً للمشاركة في الطابور الصباحي والبرنامج القيمي اليومي.',
    isUrgent: true,
  },
  {
    id: 'news-3',
    title: 'تكريم الطلبة المتميزين في مسابقة القرآن الكريم والعلوم الحديثة على مستوى إمارة الفجيرة',
    category: 'إنجازات طلابية',
    date: '2026-10-14',
    summary: 'حققت الأكاديمية مراكز متقدمة في مسابقات التميز العلمي وحفظ القرآن الكريم، وتم تكريم الطلبة الفائزين بحضور أولياء أمورهم.',
  },
  {
    id: 'news-4',
    title: 'انطلاق برنامج التوجيه الأكاديمي والمهني لطلبة المرحلة الثانوية (الصفوف 9 - 12)',
    category: 'إعلان إداري',
    date: '2026-10-10',
    summary: 'بدأ مكتب الإرشاد الطلابي بعقد الجلسات الفردية والجماعية لإرشاد الطلبة نحو المسارات الجامعية والتخصصات المستقبلية.',
  },
];

const INITIAL_EVENTS: EventInitiativeItem[] = [
  {
    id: 'ev-1',
    title: 'ملتقى الفجيرة للقيم الإسلامية والابتكار العلمي',
    category: 'الأنشطة العلمية والدينية',
    date: '15 نوفمبر 2026',
    location: 'المسرح الرئيسي – أكاديمية الفجيرة العلمية الإسلامية',
    targetAudience: 'الطلبة وأولياء الأمور والكادر التعليمي',
    description: 'معرض ومؤتمر طلابي يجمع بين المشاريع العلمية المبتكرة والبحوث الإسلامية الأصيلة بمشاركة نخبة من المختصين.',
  },
  {
    id: 'ev-2',
    title: 'أسبوع السلوك الإيجابي والوقاية من التنمر («بيئتنا آمنة وراقية»)',
    category: 'المبادرات التربوية',
    date: '22 نوفمبر 2026',
    location: 'جميع المراحل الدراسية بالأكاديمية',
    targetAudience: 'جميع طلبة الأكاديمية',
    description: 'حملة تربوية وإرشادية شاملة لتعزيز قيم الاحترام المتبادل والتسامح والانضباط المدرسي وتكريم الفصول المثالية.',
  },
  {
    id: 'ev-3',
    title: 'اللقاء التربوي الدوري لأولياء الأمور والمرشدين الأكاديميين',
    category: 'لقاءات أولياء الأمور',
    date: '29 نوفمبر 2026',
    location: 'قاعة المؤتمرات ومكتب الإرشاد الطلابي',
    targetAudience: 'أولياء الأمور والهيئة التدريسية',
    description: 'لقاء تشاركي لمناقشة التحصيل الدراسي والانضباط السلوكي وخطط الدعم الفردي للطلبة.',
  },
];

interface AcademyPortalPageProps {
  students: Student[];
  onOpenCounselorWorkspace: (tab?: NavTab) => void;
  onOpenLoginModalOrPage?: () => void;
  isAuthenticated?: boolean;
  currentUserName?: string;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  initialSection?: PortalSectionId;
}

export const AcademyPortalPage: React.FC<AcademyPortalPageProps> = ({
  students,
  onOpenCounselorWorkspace,
  onOpenLoginModalOrPage,
  isAuthenticated = false,
  currentUserName,
  onShowToast,
  initialSection = 'home',
}) => {
  const [activeSection, setActiveSection] = useState<PortalSectionId>(initialSection);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  // E-Systems Filter
  const [systemCategoryFilter, setSystemCategoryFilter] = useState<string>('all');
  const [systemSearchQuery, setSystemSearchQuery] = useState<string>('');
  const [systemsList, setSystemsList] = useState<ElectronicSystemItem[]>(() => {
    try {
      const saved = localStorage.getItem(PORTAL_SYSTEMS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_ESYSTEMS;
  });

  // Policies Search & Modal
  const [policySearchQuery, setPolicySearchQuery] = useState<string>('');
  const [policyCategoryFilter, setPolicyCategoryFilter] = useState<string>('all');
  const [selectedPolicyForView, setSelectedPolicyForView] = useState<PolicyDocumentItem | null>(null);

  // News State
  const [newsList, setNewsList] = useState<NewsItem[]>(() => {
    try {
      const saved = localStorage.getItem(PORTAL_NEWS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_NEWS;
  });

  // Forms & Surveys State
  const [selectedFormType, setSelectedFormType] = useState<
    'parent-feedback' | 'student-guidance' | 'data-update' | 'suggestion-survey'
  >('parent-feedback');
  const [applicantRole, setApplicantRole] = useState<'ولي أمر' | 'طالب' | 'موظف / معلم' | 'زائر'>('ولي أمر');
  const [fullName, setFullName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [gradeSection, setGradeSection] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState('ممتاز');
  const [details, setDetails] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isReviewStep, setIsReviewStep] = useState(false);
  const [submissionSuccessMessage, setSubmissionSuccessMessage] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<SurveySubmissionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(PORTAL_SUBMISSIONS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Admin New News Form State
  const [newNewsTitle, setNewNewsTitle] = useState('');
  const [newNewsCategory, setNewNewsCategory] = useState<NewsItem['category']>('أخبار الأكاديمية');
  const [newNewsSummary, setNewNewsSummary] = useState('');

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactDepartment, setContactDepartment] = useState('الإدارة العامة للأكاديمية');
  const [contactMessage, setContactMessage] = useState('');
  const [contactConfirmMsg, setContactConfirmMsg] = useState<string | null>(null);

  const navLinks: Array<{ id: PortalSectionId; label: string }> = [
    { id: 'home', label: 'الرئيسية' },
    { id: 'about', label: 'عن الأكاديمية' },
    { id: 'esystems', label: 'الأنظمة الإلكترونية' },
    { id: 'student-services', label: 'الخدمات الطلابية' },
    { id: 'parent-portal', label: 'أولياء الأمور' },
    { id: 'student-portal', label: 'الطلبة' },
    { id: 'staff-portal', label: 'الكادر التعليمي والإداري' },
    { id: 'policies', label: 'السياسات واللوائح' },
    { id: 'news', label: 'الأخبار والإعلانات' },
    { id: 'forms-surveys', label: 'النماذج والاستبيانات' },
    { id: 'contact', label: 'التواصل معنا' },
  ];

  const filteredSystems = useMemo(() => {
    return systemsList.filter((sys) => {
      const matchesCat = systemCategoryFilter === 'all' || sys.category === systemCategoryFilter;
      const q = systemSearchQuery.trim().toLowerCase();
      const matchesQ =
        !q ||
        sys.title.toLowerCase().includes(q) ||
        sys.description.toLowerCase().includes(q) ||
        sys.categoryLabel.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [systemsList, systemCategoryFilter, systemSearchQuery]);

  const filteredPolicies = useMemo(() => {
    return INITIAL_POLICIES.filter((pol) => {
      const matchesCat = policyCategoryFilter === 'all' || pol.category === policyCategoryFilter;
      const q = policySearchQuery.trim().toLowerCase();
      const matchesQ =
        !q ||
        pol.title.toLowerCase().includes(q) ||
        pol.summary.toLowerCase().includes(q) ||
        pol.clauses.some((c) => c.toLowerCase().includes(q));
      return matchesCat && matchesQ;
    });
  }, [policyCategoryFilter, policySearchQuery]);

  const handleOpenSystem = (sys: ElectronicSystemItem) => {
    if (sys.status === 'مغلق مؤقتًا') {
      if (onShowToast) {
        onShowToast('هذه الخدمة مغلقة مؤقتاً للصيانة الدورية، يرجى المحاولة لاحقاً.', 'warning');
      }
      return;
    }
    if (sys.targetPortalSection) {
      setActiveSection(sys.targetPortalSection);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (sys.targetTab) {
      onOpenCounselorWorkspace(sys.targetTab);
    }
  };

  const handleDownloadPolicy = (pol: PolicyDocumentItem) => {
    const content = [
      '====================================================================',
      'دولة الإمارات العربية المتحدة – إمارة الفجيرة',
      'أكاديمية الفجيرة العلمية الإسلامية (Fujairah Scientific Islamic Academy)',
      '====================================================================',
      `الوثيقة الرسمية: ${pol.title}`,
      `التصنيف: ${pol.category}`,
      `الإصدار: ${pol.version}`,
      `تاريخ التحديث: ${pol.updatedDate}`,
      '--------------------------------------------------------------------',
      'ملخص السياسة:',
      pol.summary,
      '',
      'البنود والضوابط المعتمدة:',
      ...pol.clauses.map((c, idx) => `${idx + 1}. ${c}`),
      '',
      '--------------------------------------------------------------------',
      'جميع الحقوق محفوظة لأكاديمية الفجيرة العلمية الإسلامية © 2026–2027',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pol.title.replace(/\s+/g, '_')}_أكاديمية_الفجيرة_العلمية_الإسلامية.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (onShowToast) {
      onShowToast(`تم تحميل وثيقة «${pol.title}» المعتمدة لدى أكاديمية الفجيرة العلمية الإسلامية`, 'success');
    }
  };

  // Validate Digital Form before Review / Submission
  const validateSurveyForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 3) {
      errors.fullName = 'يرجى إدخال الاسم الكامل بشكل صحيح (حقل إلزامي).';
    }
    const cleanPhone = phone.replace(/[\s-]/g, '');
    if (!cleanPhone || !/^(05|9715|\+9715|09)\d{7,8}$/.test(cleanPhone)) {
      errors.phone = 'يرجى إدخال رقم هاتف إماراتي صحيح يبدأ بـ 05 أو 09 (مثال: 0501234567).';
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'يرجى إدخال بريد إلكتروني بصيغة صحيحة.';
    }
    if (!details.trim() || details.trim().length < 10) {
      errors.details = 'يرجى كتابة تفاصيل الطلب أو الملاحظة بوضوح (10 أحرف على الأقل).';
    }

    // Check duplicate submission
    const duplicate = submissions.find(
      (s) =>
        s.formId === selectedFormType &&
        s.phone.replace(/[\s-]/g, '') === cleanPhone &&
        s.details.trim() === details.trim()
    );
    if (duplicate) {
      errors.duplicate = 'تم إرسال هذا النموذج بنفس البيانات مسبقاً. شكرًا لتعاونكم.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getFormTitle = (type: typeof selectedFormType) => {
    switch (type) {
      case 'parent-feedback':
        return 'استبانة قياس رضا أولياء الأمور ومقترحات التطوير';
      case 'student-guidance':
        return 'نموذج طلب جلسة إرشاد أكاديمي أو مهني أو سلوكي للطلبة';
      case 'data-update':
        return 'نموذج تحديث بيانات التواصل للطالب وولي الأمر';
      case 'suggestion-survey':
        return 'نموذج الملاحظات والمقترحات العامة لأكاديمية الفجيرة العلمية الإسلامية';
    }
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionSuccessMessage(null);
    if (validateSurveyForm()) {
      setIsReviewStep(true);
    }
  };

  const handleConfirmSubmitForm = () => {
    const newRecord: SurveySubmissionRecord = {
      id: `SUB-${Date.now()}`,
      formId: selectedFormType,
      formTitle: getFormTitle(selectedFormType),
      applicantRole,
      fullName: fullName.trim(),
      studentName: studentName.trim(),
      gradeSection: gradeSection.trim(),
      phone: phone.trim(),
      email: email.trim(),
      rating,
      details: details.trim(),
      submittedAt: new Date().toLocaleString('ar-AE'),
    };

    const next = [newRecord, ...submissions];
    setSubmissions(next);
    try {
      localStorage.setItem(PORTAL_SUBMISSIONS_KEY, JSON.stringify(next));
    } catch {}

    setIsReviewStep(false);
    setFullName('');
    setStudentName('');
    setGradeSection('');
    setPhone('');
    setEmail('');
    setDetails('');
    setFormErrors({});

    const officialConfirm =
      'شكرًا لتعاونكم. تم استلام البيانات بنجاح لدى أكاديمية الفجيرة العلمية الإسلامية، وسيتم التواصل معكم عند الحاجة.';
    setSubmissionSuccessMessage(officialConfirm);
    if (onShowToast) {
      onShowToast(officialConfirm, 'success');
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim() || !contactMessage.trim()) {
      if (onShowToast) {
        onShowToast('يرجى تعبئة جميع الحقول المطلوبة في نموذج التواصل.', 'warning');
      }
      return;
    }
    const officialConfirm =
      'شكرًا لتعاونكم. تم استلام البيانات بنجاح لدى أكاديمية الفجيرة العلمية الإسلامية، وسيتم التواصل معكم عند الحاجة.';
    setContactConfirmMsg(officialConfirm);
    setContactName('');
    setContactPhone('');
    setContactMessage('');
    if (onShowToast) {
      onShowToast(officialConfirm, 'success');
    }
  };

  const handleAddNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNewsTitle.trim() || !newNewsSummary.trim()) return;
    const item: NewsItem = {
      id: `news-${Date.now()}`,
      title: newNewsTitle.trim(),
      category: newNewsCategory,
      date: new Date().toISOString().split('T')[0],
      summary: newNewsSummary.trim(),
      isUrgent: newNewsCategory === 'تعميم رسمي',
    };
    const next = [item, ...newsList];
    setNewsList(next);
    try {
      localStorage.setItem(PORTAL_NEWS_KEY, JSON.stringify(next));
    } catch {}
    setNewNewsTitle('');
    setNewNewsSummary('');
    if (onShowToast) {
      onShowToast('تم نشر الخبر/الإعلان في بوابة أكاديمية الفجيرة العلمية الإسلامية بنجاح.', 'success');
    }
  };

  const handleToggleSystemStatus = (id: string) => {
    const order: Array<ElectronicSystemItem['status']> = ['متاح الآن', 'قيد التحديث', 'مغلق مؤقتًا'];
    const next = systemsList.map((s) => {
      if (s.id !== id) return s;
      const nextIdx = (order.indexOf(s.status) + 1) % order.length;
      return { ...s, status: order[nextIdx] };
    });
    setSystemsList(next);
    try {
      localStorage.setItem(PORTAL_SYSTEMS_KEY, JSON.stringify(next));
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#FAF7EF] dark:bg-[#0B2748] text-[#0B2748] dark:text-slate-100 font-sans" dir="rtl">
      {/* Unified Official Top Header & Sticky Main Navigation */}
      <div className="bg-[#0B2748] text-white border-b-2 border-[#C9A227] sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Institutional Bar */}
          <div className="flex items-center justify-between py-3 gap-3">
            {/* Academy Emblem & Official Name */}
            <div
              onClick={() => setActiveSection('home')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C9A227] to-[#A67C00] p-0.5 shadow-md shrink-0">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center overflow-hidden p-0.5 group-hover:scale-105 transition-transform">
                  <img
                    src="/assets/aistudio/image_3c0494bc.png"
                    alt="شعار أكاديمية الفجيرة العلمية الإسلامية"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/40">
                    دولة الإمارات العربية المتحدة • إمارة الفجيرة
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#147A4A]/30 text-emerald-300 border border-[#147A4A]/50 hidden sm:inline-block">
                    العام الأكاديمي 2026–2027
                  </span>
                </div>
                <h1 className="text-base sm:text-xl font-black text-white tracking-tight mt-0.5">
                  أكاديمية الفجيرة العلمية الإسلامية
                </h1>
                <p className="text-[11px] text-[#C9A227] font-semibold hidden sm:block">
                  Fujairah Scientific Islamic Academy • البوابة الإلكترونية الرسمية والمنظومة الذكية
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSection('esystems')}
                className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#12395B] hover:bg-[#12395B]/80 text-[#C9A227] border border-[#C9A227]/40 transition-all cursor-pointer"
              >
                <Laptop className="w-4 h-4" />
                <span>الخدمات الإلكترونية</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenCounselorWorkspace('dashboard')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-[#C9A227] hover:bg-[#A67C00] text-[#0B2748] hover:text-white shadow-sm transition-all cursor-pointer"
              >
                {isAuthenticated ? (
                  <>
                    <LayoutDashboard className="w-4 h-4" />
                    <span>منظومة المرشد والعمل اليومي</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول للمنظومة</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsMobileNavOpen((prev) => !prev)}
                className="lg:hidden p-2 rounded-xl bg-[#12395B] text-[#C9A227] border border-[#C9A227]/30 cursor-pointer"
                aria-label="القائمة الرئيسية"
              >
                {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Main Horizontal Navigation Bar (Desktop) */}
          <nav
            aria-label="أقسام أكاديمية الفجيرة العلمية الإسلامية"
            className="hidden lg:flex items-center gap-1 py-2 border-t border-[#12395B] overflow-x-auto"
          >
            {navLinks.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#C9A227] text-[#0B2748] font-black shadow-xs'
                      : 'text-slate-200 hover:text-[#C9A227] hover:bg-[#12395B]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setActiveSection('events')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeSection === 'events'
                  ? 'bg-[#C9A227] text-[#0B2748] font-black shadow-xs'
                  : 'text-slate-200 hover:text-[#C9A227] hover:bg-[#12395B]'
              }`}
            >
              الفعاليات والمبادرات
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('admin-portal')}
              className={`mr-auto px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                activeSection === 'admin-portal'
                  ? 'bg-[#147A4A] text-white border-[#147A4A]'
                  : 'text-[#C9A227] border-[#C9A227]/30 hover:bg-[#12395B]'
              }`}
            >
              لوحة إدارة البوابة
            </button>
          </nav>

          {/* Mobile Navigation Menu */}
          {isMobileNavOpen && (
            <div className="lg:hidden py-3 border-t border-[#12395B] grid grid-cols-2 sm:grid-cols-3 gap-1.5 animate-in fade-in duration-150">
              {[
                ...navLinks,
                { id: 'events' as PortalSectionId, label: 'الفعاليات والمبادرات' },
                { id: 'admin-portal' as PortalSectionId, label: 'لوحة إدارة البوابة' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setIsMobileNavOpen(false);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold text-right transition-colors cursor-pointer ${
                    activeSection === item.id
                      ? 'bg-[#C9A227] text-[#0B2748] font-black'
                      : 'bg-[#12395B]/60 text-slate-100 hover:bg-[#12395B]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* ================================================================= */}
        {/* 1. HOME SECTION (الصفحة الرئيسية الشاملة)                         */}
        {/* ================================================================= */}
        {activeSection === 'home' && (
          <div className="space-y-12">
            {/* Hero Banner */}
            <section className="relative rounded-3xl overflow-hidden bg-gradient-to-l from-[#0B2748] via-[#12395B] to-[#0B2748] text-white border-2 border-[#C9A227]/60 shadow-xl p-6 sm:p-10 lg:p-12">
              <div className="max-w-3xl space-y-5 relative z-10">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C9A227]/20 border border-[#C9A227]/50 text-[#C9A227] text-xs font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>مرحباً بكم في البوابة الإلكترونية الرسمية</span>
                </div>
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                  أكاديمية الفجيرة العلمية الإسلامية
                </h2>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium">
                  صرح تربوي وعلمي رائد في إمارة الفجيرة بدولة الإمارات العربية المتحدة، يجمع بين الأصالة الإسلامية الراسخة والتميز العلمي الحديث والابتكار الرقمي لخدمة الطلبة وأولياء الأمور والكادر التعليمي والإداري.
                </p>

                {/* Hero Quick Access Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveSection('esystems')}
                    className="px-5 py-3 rounded-xl bg-[#C9A227] hover:bg-[#A67C00] text-[#0B2748] hover:text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Laptop className="w-4 h-4" />
                    <span>تصفح الأنظمة الإلكترونية</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenCounselorWorkspace('dashboard')}
                    className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-[#C9A227]/50 font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
                    <span>نظام الرعاية والإرشاد الطلابي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('policies')}
                    className="px-4 py-3 rounded-xl bg-[#147A4A] hover:bg-[#147A4A]/90 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Scale className="w-4 h-4" />
                    <span>السياسات واللوائح المعتمدة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('forms-surveys')}
                    className="px-4 py-3 rounded-xl bg-[#12395B] hover:bg-[#0B2748] text-[#C9A227] border border-[#C9A227]/40 font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>النماذج والاستبيانات</span>
                  </button>
                </div>
              </div>

              {/* Key Statistics Strip inside Hero */}
              <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-[#C9A227]/30 rounded-2xl p-4">
                  <span className="text-xs text-slate-300 block">الطلبة المسجلون بالمنظومة</span>
                  <span className="text-2xl font-black text-[#C9A227] mt-1 block">
                    {students.length > 0 ? students.length : 450}+
                  </span>
                  <span className="text-[11px] text-emerald-300">جميع المراحل الدراسية</span>
                </div>
                <div className="bg-white/5 border border-[#C9A227]/30 rounded-2xl p-4">
                  <span className="text-xs text-slate-300 block">الأنظمة والمنصات الرقمية</span>
                  <span className="text-2xl font-black text-[#C9A227] mt-1 block">
                    {systemsList.length} أنظمة
                  </span>
                  <span className="text-[11px] text-emerald-300">متاحة على مدار الساعة</span>
                </div>
                <div className="bg-white/5 border border-[#C9A227]/30 rounded-2xl p-4">
                  <span className="text-xs text-slate-300 block">اللوائح والسياسات المعتمدة</span>
                  <span className="text-2xl font-black text-[#C9A227] mt-1 block">
                    {INITIAL_POLICIES.length} وثائق
                  </span>
                  <span className="text-[11px] text-emerald-300">محدثة للعام 2026–2027</span>
                </div>
                <div className="bg-white/5 border border-[#C9A227]/30 rounded-2xl p-4">
                  <span className="text-xs text-slate-300 block">النماذج الرسمية المعتمدة</span>
                  <span className="text-2xl font-black text-[#C9A227] mt-1 block">
                    12 نموذجاً
                  </span>
                  <span className="text-[11px] text-emerald-300">إلكترونية وقابلة للطباعة</span>
                </div>
              </div>
            </section>

            {/* User Portals Quick Cards (بوابات المستخدمين الثلاث) */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#0B2748] dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#C9A227]" />
                    <span>البوابات الإلكترونية المخصصة للمجتمع الأكاديمي</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    وصول مباشر ومرتب لخدمات الطلبة، أولياء الأمور، والكادر التعليمي والإداري في أكاديمية الفجيرة العلمية الإسلامية
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Student Portal Card */}
                <div className="bg-white dark:bg-[#12395B] rounded-2xl p-6 border-2 border-[#C9A227]/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-[#0B2748] text-[#C9A227] flex items-center justify-center mb-4">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-black text-[#0B2748] dark:text-white">
                      بوابة الطالب
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-200 mt-2 leading-relaxed">
                      الجداول الدراسية، المواد والواجبات، الأنشطة والمسابقات العلمية والقرآنية، الإرشاد الطلابي، ولائحة السلوك والانضباط.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('student-portal')}
                    className="mt-5 w-full py-2.5 px-4 rounded-xl bg-[#0B2748] hover:bg-[#12395B] text-[#C9A227] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <span>الدخول إلى بوابة الطالب</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* Parent Portal Card */}
                <div className="bg-white dark:bg-[#12395B] rounded-2xl p-6 border-2 border-[#C9A227]/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-[#C9A227] text-[#0B2748] flex items-center justify-center mb-4">
                      <HeartHandshake className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-black text-[#0B2748] dark:text-white">
                      بوابة ولي الأمر
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-200 mt-2 leading-relaxed">
                      متابعة الحضور والانضباط، الاطلاع على التعاميم والإشعارات، التواصل مع الإدارة والأخصائيين، وتحديث البيانات.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('parent-portal')}
                    className="mt-5 w-full py-2.5 px-4 rounded-xl bg-[#C9A227] hover:bg-[#A67C00] text-[#0B2748] hover:text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <span>الدخول إلى بوابة ولي الأمر</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* Staff Portal Card */}
                <div className="bg-white dark:bg-[#12395B] rounded-2xl p-6 border-2 border-[#C9A227]/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-[#147A4A] text-white flex items-center justify-center mb-4">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-black text-[#0B2748] dark:text-white">
                      بوابة الكادر التعليمي والإداري
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-200 mt-2 leading-relaxed">
                      النماذج الإدارية، التقارير والملفات الداخلية، الإعلانات الداخلية، الأنظمة التعليمية، والدخول لمنظومة المرشد.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('staff-portal')}
                    className="mt-5 w-full py-2.5 px-4 rounded-xl bg-[#147A4A] hover:bg-[#147A4A]/90 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <span>الدخول إلى بوابة الكادر</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>

            {/* Electronic Systems Preview Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-black text-[#0B2748] dark:text-white flex items-center gap-2">
                    <Laptop className="w-5 h-5 text-[#C9A227]" />
                    <span>الأنظمة والمنصات الإلكترونية</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    حالة الأنظمة الرقمية المعتمدة في أكاديمية الفجيرة العلمية الإسلامية والوصول المباشر إليها
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('esystems')}
                  className="text-xs font-bold text-[#A67C00] dark:text-[#C9A227] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>عرض جميع الأنظمة ({systemsList.length})</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {systemsList.slice(0, 6).map((sys) => (
                  <div
                    key={sys.id}
                    className="bg-white dark:bg-[#12395B] rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:border-[#C9A227] transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-[#FAF7EF] dark:bg-[#0B2748] text-[#A67C00] dark:text-[#C9A227] border border-[#C9A227]/30">
                          {sys.categoryLabel}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            sys.status === 'متاح الآن'
                              ? 'bg-[#147A4A]/15 text-[#147A4A] dark:text-emerald-300'
                              : sys.status === 'قيد التحديث'
                              ? 'bg-[#C9A227]/20 text-[#A67C00] dark:text-[#C9A227]'
                              : 'bg-[#B4232C]/15 text-[#B4232C] dark:text-rose-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              sys.status === 'متاح الآن'
                                ? 'bg-[#147A4A]'
                                : sys.status === 'قيد التحديث'
                                ? 'bg-[#C9A227]'
                                : 'bg-[#B4232C]'
                            }`}
                          />
                          {sys.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-[#0B2748] dark:text-white">
                        {sys.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                        {sys.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenSystem(sys)}
                      className="mt-4 w-full py-2 px-3 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748] hover:bg-[#C9A227] text-[#0B2748] dark:text-white hover:text-[#0B2748] font-bold text-xs border border-[#C9A227]/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>الدخول للنظام</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Latest News & Policies Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Latest News (7 cols) */}
              <div className="lg:col-span-7 bg-white dark:bg-[#12395B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[#C9A227]" />
                    <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                      أحدث الأخبار والتعاميم الرسمية
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('news')}
                    className="text-xs font-bold text-[#A67C00] dark:text-[#C9A227] hover:underline cursor-pointer"
                  >
                    كل الأخبار
                  </button>
                </div>

                <div className="space-y-3">
                  {newsList.slice(0, 3).map((n) => (
                    <div
                      key={n.id}
                      className="p-4 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748]/70 border border-[#C9A227]/25 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0B2748] text-[#C9A227]">
                          {n.category}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {n.date}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-[#0B2748] dark:text-white">
                        {n.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {n.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Important Policies & Regulations (5 cols) */}
              <div className="lg:col-span-5 bg-white dark:bg-[#12395B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-[#C9A227]" />
                    <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                      السياسات واللوائح المهمة
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('policies')}
                    className="text-xs font-bold text-[#A67C00] dark:text-[#C9A227] hover:underline cursor-pointer"
                  >
                    المكتبة الكاملة
                  </button>
                </div>

                <div className="space-y-2.5">
                  {INITIAL_POLICIES.slice(0, 5).map((pol) => (
                    <div
                      key={pol.id}
                      className="p-3 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748]/70 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#0B2748] dark:text-white block truncate">
                          {pol.title}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {pol.category} • {pol.version}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedPolicyForView(pol)}
                          className="p-1.5 rounded-lg bg-white dark:bg-[#12395B] text-[#0B2748] dark:text-[#C9A227] border border-slate-200 dark:border-slate-600 hover:border-[#C9A227] cursor-pointer"
                          title="عرض الوثيقة"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPolicy(pol)}
                          className="p-1.5 rounded-lg bg-[#C9A227] text-[#0B2748] hover:bg-[#A67C00] hover:text-white cursor-pointer"
                          title="تحميل الوثيقة"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Events & Initiatives Strip */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-[#0B2748] dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#C9A227]" />
                  <span>الفعاليات والمبادرات التربوية والعلمية</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveSection('events')}
                  className="text-xs font-bold text-[#A67C00] dark:text-[#C9A227] hover:underline cursor-pointer"
                >
                  عرض كافة الفعاليات
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {INITIAL_EVENTS.map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-white dark:bg-[#12395B] rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#147A4A]/15 text-[#147A4A] dark:text-emerald-300 font-bold">
                        {ev.category}
                      </span>
                      <span className="font-bold text-[#A67C00] dark:text-[#C9A227]">
                        {ev.date}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-[#0B2748] dark:text-white">
                      {ev.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {ev.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. ABOUT SECTION (عن أكاديمية الفجيرة العلمية الإسلامية)         */}
        {/* ================================================================= */}
        {activeSection === 'about' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="bg-gradient-to-l from-[#0B2748] to-[#12395B] text-white rounded-3xl p-8 border-2 border-[#C9A227]/60">
              <span className="text-xs font-bold text-[#C9A227]">هويتنا ورسالتنا</span>
              <h2 className="text-2xl sm:text-3xl font-black mt-1">
                عن أكاديمية الفجيرة العلمية الإسلامية
              </h2>
              <p className="text-sm text-slate-200 mt-3 max-w-3xl leading-relaxed">
                تُعد أكاديمية الفجيرة العلمية الإسلامية في إمارة الفجيرة بدولة الإمارات العربية المتحدة صرحاً تعليمياً وتربوياً متميزاً يعنى ببناء جيل واعٍ متمسك بقيمه الإسلامية السمحة وهويته الوطنية الإماراتية، ومتسلح بأرقى العلوم المعاصرة والمهارات الرقمية.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-[#12395B] p-6 rounded-2xl border border-[#C9A227]/40 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#0B2748] text-[#C9A227] flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-[#0B2748] dark:text-white">رؤية الأكاديمية</h3>
                <p className="text-xs text-slate-600 dark:text-slate-200 leading-relaxed">
                  الريادة في تقديم تعليم علمي وإسلامي متكامل يواكب تطلعات دولة الإمارات العربية المتحدة في إعداد قادة المستقبل المبدعين والمعتزين بهويتهم.
                </p>
              </div>

              <div className="bg-white dark:bg-[#12395B] p-6 rounded-2xl border border-[#C9A227]/40 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#C9A227] text-[#0B2748] flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-[#0B2748] dark:text-white">رسالة الأكاديمية</h3>
                <p className="text-xs text-slate-600 dark:text-slate-200 leading-relaxed">
                  توفير بيئة تربوية آمنة ومحفزة تركز على التميز الأكاديمي، حفظ القرآن الكريم، الرعاية الطلابية الشاملة، والشراكة الفاعلة مع أولياء الأمور والمجتمع المحلي في الفجيرة.
                </p>
              </div>

              <div className="bg-white dark:bg-[#12395B] p-6 rounded-2xl border border-[#C9A227]/40 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#147A4A] text-white flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-[#0B2748] dark:text-white">القيم المؤسسية</h3>
                <p className="text-xs text-slate-600 dark:text-slate-200 leading-relaxed">
                  الأصالة الإسلامية، الولاء والانتماء الوطني، الانضباط والقدوة الحسنة، الابتكار والتميز العلمي، والتسامح والمسؤولية المجتمعية.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 3. ELECTRONIC SYSTEMS HUB (قسم الأنظمة الإلكترونية المتكامل)      */}
        {/* ================================================================= */}
        {activeSection === 'esystems' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#0B2748] text-white rounded-3xl p-6 sm:p-8 border-2 border-[#C9A227]/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-[#C9A227]">المنظومة الرقمية الموحدة</span>
                <h2 className="text-2xl font-black mt-1">
                  دليل الأنظمة والمنصات الإلكترونية – أكاديمية الفجيرة العلمية الإسلامية
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  جميع الأنظمة الإلكترونية مصنفة حسب الفئة المستفيدة مع بيان حالة النظام والوصول المباشر
                </p>
              </div>
              <div className="relative w-full md:w-72">
                <input
                  type="text"
                  value={systemSearchQuery}
                  onChange={(e) => setSystemSearchQuery(e.target.value)}
                  placeholder="ابحث عن نظام أو خدمة إلكترونية..."
                  className="w-full py-2.5 pr-9 pl-4 rounded-xl bg-[#12395B] text-white placeholder-slate-300 text-xs border border-[#C9A227]/40 focus:outline-none focus:border-[#C9A227]"
                />
                <Search className="w-4 h-4 text-[#C9A227] absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Category Filter Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'جميع الأنظمة' },
                { id: 'student', label: 'أنظمة الطلبة' },
                { id: 'parent', label: 'أنظمة أولياء الأمور' },
                { id: 'staff', label: 'أنظمة المعلمين والإداريين' },
                { id: 'forms', label: 'النماذج والاستبيانات' },
                { id: 'admin', label: 'الخدمات الإدارية' },
                { id: 'policies', label: 'السياسات والوثائق' },
                { id: 'support', label: 'الدعم الفني والمساعدة' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSystemCategoryFilter(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    systemCategoryFilter === cat.id
                      ? 'bg-[#0B2748] text-[#C9A227] border border-[#C9A227]'
                      : 'bg-white dark:bg-[#12395B] text-[#0B2748] dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-[#C9A227]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Systems Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSystems.map((sys) => (
                <div
                  key={sys.id}
                  className="bg-white dark:bg-[#12395B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:border-[#C9A227] shadow-xs flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-[#FAF7EF] dark:bg-[#0B2748] text-[#0B2748] dark:text-[#C9A227] border border-[#C9A227]/30">
                        {sys.categoryLabel}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          sys.status === 'متاح الآن'
                            ? 'bg-[#147A4A]/15 text-[#147A4A] dark:text-emerald-300'
                            : sys.status === 'قيد التحديث'
                            ? 'bg-[#C9A227]/20 text-[#A67C00] dark:text-[#C9A227]'
                            : 'bg-[#B4232C]/15 text-[#B4232C] dark:text-rose-300'
                        }`}
                      >
                        {sys.status}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                      {sys.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-200 mt-2 leading-relaxed">
                      {sys.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenSystem(sys)}
                    className="mt-5 w-full py-2.5 px-4 rounded-xl bg-[#0B2748] hover:bg-[#C9A227] text-white hover:text-[#0B2748] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>الدخول المباشر للنظام</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 4. STUDENT SERVICES & STUDENT PORTAL (الخدمات الطلابية وبوابة الطالب) */}
        {/* ================================================================= */}
        {(activeSection === 'student-services' || activeSection === 'student-portal') && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-gradient-to-l from-[#0B2748] to-[#12395B] text-white rounded-3xl p-6 sm:p-8 border-2 border-[#C9A227]/60">
              <span className="text-xs font-bold text-[#C9A227]">بوابة الطالب والخدمات الطلابية</span>
              <h2 className="text-2xl font-black mt-1">
                بوابة الطالب – أكاديمية الفجيرة العلمية الإسلامية
              </h2>
              <p className="text-xs sm:text-sm text-slate-200 mt-1">
                منصة موحدة تمكّن طلبة الأكاديمية من متابعة شؤونهم الدراسية والإرشادية والأنشطة والمسابقات واللوائح المدرسية
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  title: 'الجداول الدراسية والاختبارات',
                  desc: 'استعراض الجدول الدراسي اليومي ومواعيد الحصص والاختبارات الفصلية لجميع المراحل الدراسية.',
                  actionLabel: 'فتح نموذج الاستعلام',
                  onClick: () => setActiveSection('forms-surveys'),
                },
                {
                  title: 'المواد الدراسية والواجبات',
                  desc: 'الوصول إلى الخطط الفصلية للمقررات العلمية والإسلامية ومتابعة التكليفات والمشاريع.',
                  actionLabel: 'استعراض المقررات',
                  onClick: () => setActiveSection('esystems'),
                },
                {
                  title: 'الأنشطة والمسابقات القرآنية والعلمية',
                  desc: 'التسجيل في مسابقات حفظ القرآن الكريم، أولمبياد العلوم، ونوادي الابتكار الطلابية بالأكاديمية.',
                  actionLabel: 'استعراض الفعاليات',
                  onClick: () => setActiveSection('events'),
                },
                {
                  title: 'الإرشاد الطلابي والتوجيه المهني',
                  desc: 'طلب جلسة إرشاد فردية مع المرشد الأكاديمي والمهني واستكشاف المسارات الجامعية.',
                  actionLabel: 'طلب جلسة إرشادية',
                  onClick: () => {
                    setSelectedFormType('student-guidance');
                    setApplicantRole('طالب');
                    setActiveSection('forms-surveys');
                  },
                },
                {
                  title: 'النماذج الخاصة بالطلبة',
                  desc: 'الاطلاع على نماذج التعهد السلوكي، الالتزام بالحضور، وضوابط استخدام الأجهزة التعليمية.',
                  actionLabel: 'فتح النماذج',
                  onClick: () => onOpenCounselorWorkspace('forms'),
                },
                {
                  title: 'لائحة السلوك والانضباط الطلابي',
                  desc: 'التعرف على حقوق وواجبات الطالب ومعايير التميز السلوكي الإيجابي في الأكاديمية.',
                  actionLabel: 'قراءة اللائحة',
                  onClick: () => setActiveSection('policies'),
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-[#12395B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:border-[#C9A227] flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-200 mt-2 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={card.onClick}
                    className="mt-5 w-full py-2.5 px-4 rounded-xl bg-[#0B2748] hover:bg-[#C9A227] text-[#C9A227] hover:text-[#0B2748] font-bold text-xs cursor-pointer transition-colors"
                  >
                    {card.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 5. PARENT PORTAL (بوابة ولي الأمر)                                */}
        {/* ================================================================= */}
        {activeSection === 'parent-portal' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-gradient-to-l from-[#0B2748] to-[#12395B] text-white rounded-3xl p-6 sm:p-8 border-2 border-[#C9A227]/60">
              <span className="text-xs font-bold text-[#C9A227]">الشراكة الأسرية والتربوية</span>
              <h2 className="text-2xl font-black mt-1">
                بوابة ولي الأمر – أكاديمية الفجيرة العلمية الإسلامية
              </h2>
              <p className="text-xs sm:text-sm text-slate-200 mt-1">
                نرحب بأولياء الأمور الكرام شركاء النجاح في متابعة المسيرة العلمية والتربوية لأبنائنا الطلبة
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  title: 'متابعة الحضور والانضباط المدرسي',
                  desc: 'متابعة انتظام الطالب في الطابور الصباحي والحصص الدراسية وتقديم الأعذار الرسمية للغياب.',
                  btn: 'الانتقال لسجل الحضور',
                  action: () => onOpenCounselorWorkspace('absences'),
                },
                {
                  title: 'الاطلاع على التعاميم والإشعارات',
                  desc: 'متابعة أحدث التعاميم الرسمية والرسائل التربوية الصادرة عن إدارة الأكاديمية.',
                  btn: 'استعراض التعاميم',
                  action: () => setActiveSection('news'),
                },
                {
                  title: 'التواصل مع الإدارة والأخصائيين',
                  desc: 'حجز موعد مقابلة مع المرشد الأكاديمي أو إدارة الأكاديمية والتواصل المباشر.',
                  btn: 'فتح قناة التواصل',
                  action: () => setActiveSection('contact'),
                },
                {
                  title: 'استبيانات أولياء الأمور والمقترحات',
                  desc: 'المشاركة في استبانات قياس الرضا وتقديم الملاحظات والمقترحات التطويرية.',
                  btn: 'المشاركة في الاستبيان',
                  action: () => {
                    setSelectedFormType('parent-feedback');
                    setApplicantRole('ولي أمر');
                    setActiveSection('forms-surveys');
                  },
                },
                {
                  title: 'السياسات المدرسية وحقوق الطفل',
                  desc: 'الاطلاع على سياسة الحضور، لائحة السلوك، سياسة حماية الطفل، وقانون وديمة.',
                  btn: 'مكتبة السياسات',
                  action: () => setActiveSection('policies'),
                },
                {
                  title: 'طلبات تحديث بيانات ولي الأمر والطالب',
                  desc: 'تحديث أرقام الهواتف المعتمدة للتواصل والمخولين باستلام الطالب عند الانصراف.',
                  btn: 'تحديث البيانات الآن',
                  action: () => {
                    setSelectedFormType('data-update');
                    setApplicantRole('ولي أمر');
                    setActiveSection('forms-surveys');
                  },
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#12395B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:border-[#C9A227] flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-200 mt-2 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={item.action}
                    className="mt-5 w-full py-2.5 px-4 rounded-xl bg-[#C9A227] hover:bg-[#A67C00] text-[#0B2748] hover:text-white font-black text-xs cursor-pointer transition-colors"
                  >
                    {item.btn}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 6. STAFF PORTAL (بوابة الكادر التعليمي والإداري)                  */}
        {/* ================================================================= */}
        {activeSection === 'staff-portal' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-gradient-to-l from-[#0B2748] to-[#12395B] text-white rounded-3xl p-6 sm:p-8 border-2 border-[#C9A227]/60">
              <span className="text-xs font-bold text-[#C9A227]">بوابة الموظف والهيئة التدريسية</span>
              <h2 className="text-2xl font-black mt-1">
                بوابة الكادر التعليمي والإداري – أكاديمية الفجيرة العلمية الإسلامية
              </h2>
              <p className="text-xs sm:text-sm text-slate-200 mt-1">
                الوصول السريع للأنظمة اليومية، النماذج الرسمية، لجنة إدارة السلوك، والتقارير الإحصائية
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  title: 'لوحة التحكم ومنظومة المرشد الذكي',
                  desc: 'الدخول المباشر إلى لوحة التحكم اليومية وسجلات الطلبة والحالات الإرشادية.',
                  tab: 'dashboard' as NavTab,
                },
                {
                  title: 'حزمة النماذج الرسمية المعتمدة (6 إلى 27)',
                  desc: 'إصدار واعتماد وطباعة نماذج التنبيه الخطي، استدعاء ولي الأمر، وتقارير المخالفات.',
                  tab: 'forms' as NavTab,
                },
                {
                  title: 'سجل الكادر والاجتماعات والشراكات',
                  desc: 'إدارة بيانات الهيئة التدريسية والإدارية ومحاضر اجتماعات اللجان المدرسية.',
                  tab: 'employees' as NavTab,
                },
                {
                  title: 'لجنة إدارة السلوك الطلابي',
                  desc: 'إدارة جلسات لجنة السلوك، القرارات التربوية، ومحاضر الاجتماعات المعتمدة.',
                  tab: 'committee' as NavTab,
                },
                {
                  title: 'التقارير والإحصائيات الشاملة',
                  desc: 'استخراج التقارير الدورية للحضور والانضباط السلوكي ومؤشرات الأداء.',
                  tab: 'reports' as NavTab,
                },
                {
                  title: 'إعدادات الأكاديمية والمستخدمين',
                  desc: 'ضبط إعدادات النظام، قوالب الرسائل، وصلاحيات المستخدمين.',
                  tab: 'settings' as NavTab,
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-[#12395B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:border-[#C9A227] flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-200 mt-2 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenCounselorWorkspace(card.tab)}
                    className="mt-5 w-full py-2.5 px-4 rounded-xl bg-[#0B2748] hover:bg-[#C9A227] text-white hover:text-[#0B2748] font-bold text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>فتح الخدمة في المنظومة</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 7. POLICIES & REGULATIONS LIBRARY (السياسات واللوائح)             */}
        {/* ================================================================= */}
        {activeSection === 'policies' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#0B2748] text-white rounded-3xl p-6 sm:p-8 border-2 border-[#C9A227]/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-[#C9A227]">المكتبة التنظيمية والتشريعية</span>
                <h2 className="text-2xl font-black mt-1">
                  السياسات واللوائح والأدلة المعتمدة – أكاديمية الفجيرة العلمية الإسلامية
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  استعراض وتحميل اللوائح الرسمية والسياسات التربوية والتشريعات الوطنية المعتمدة
                </p>
              </div>
              <div className="relative w-full md:w-72">
                <input
                  type="text"
                  value={policySearchQuery}
                  onChange={(e) => setPolicySearchQuery(e.target.value)}
                  placeholder="ابحث في السياسات واللوائح..."
                  className="w-full py-2.5 pr-9 pl-4 rounded-xl bg-[#12395B] text-white placeholder-slate-300 text-xs border border-[#C9A227]/40 focus:outline-none focus:border-[#C9A227]"
                />
                <Search className="w-4 h-4 text-[#C9A227] absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredPolicies.map((pol) => (
                <div
                  key={pol.id}
                  className="bg-white dark:bg-[#12395B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:border-[#C9A227] shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-[#FAF7EF] dark:bg-[#0B2748] text-[#A67C00] dark:text-[#C9A227] border border-[#C9A227]/30">
                        {pol.category}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-300 font-semibold">
                        {pol.version}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                      {pol.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-200 leading-relaxed">
                      {pol.summary}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedPolicyForView(pol)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#0B2748] hover:bg-[#12395B] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#C9A227]" />
                      <span>عرض الوثيقة والبنود</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadPolicy(pol)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#C9A227] hover:bg-[#A67C00] text-[#0B2748] hover:text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل النسخة المعتمدة</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 8. NEWS & ANNOUNCEMENTS (الأخبار والإعلانات)                     */}
        {/* ================================================================= */}
        {activeSection === 'news' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#0B2748] text-white rounded-3xl p-6 sm:p-8 border-2 border-[#C9A227]/60">
              <span className="text-xs font-bold text-[#C9A227]">المركز الإعلامي والتعاميم</span>
              <h2 className="text-2xl font-black mt-1">
                الأخبار والإعلانات والتعاميم – أكاديمية الفجيرة العلمية الإسلامية
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {newsList.map((n) => (
                <div
                  key={n.id}
                  className="bg-white dark:bg-[#12395B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#0B2748] text-[#C9A227]">
                      {n.category}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-300 font-mono">
                      {n.date}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                    {n.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-200 leading-relaxed">
                    {n.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 9. EVENTS & INITIATIVES (الفعاليات والمبادرات)                    */}
        {/* ================================================================= */}
        {activeSection === 'events' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#0B2748] text-white rounded-3xl p-6 sm:p-8 border-2 border-[#C9A227]/60">
              <span className="text-xs font-bold text-[#C9A227]">الأجندة الأكاديمية والتربوية</span>
              <h2 className="text-2xl font-black mt-1">
                الفعاليات والمبادرات – أكاديمية الفجيرة العلمية الإسلامية
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {INITIAL_EVENTS.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-white dark:bg-[#12395B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-3"
                >
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#147A4A]/15 text-[#147A4A] dark:text-emerald-300 inline-block">
                    {ev.category}
                  </span>
                  <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                    {ev.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-200 leading-relaxed">
                    {ev.description}
                  </p>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-300 space-y-1">
                    <div>التاريخ: {ev.date}</div>
                    <div>المكان: {ev.location}</div>
                    <div>الفئة المستهدفة: {ev.targetAudience}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 10. FORMS & SURVEYS (النماذج والاستبيانات الإلكترونية)             */}
        {/* ================================================================= */}
        {activeSection === 'forms-surveys' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#0B2748] text-white rounded-3xl p-6 sm:p-8 border-2 border-[#C9A227]/60">
              <span className="text-xs font-bold text-[#C9A227]">النماذج والاستبانات التفاعلية</span>
              <h2 className="text-2xl font-black mt-1">
                مركز النماذج والاستبيانات – أكاديمية الفجيرة العلمية الإسلامية
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                يرجى اختيار النموذج المطلوب وتعبئة الحقول بدقة ومراجعتها قبل الإرسال النهائي
              </p>
            </div>

            {/* Form Selector Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  id: 'parent-feedback' as const,
                  title: 'استبانة رضا أولياء الأمور',
                  sub: 'تقييم الخدمات التعليمية والتربوية',
                },
                {
                  id: 'student-guidance' as const,
                  title: 'طلب جلسة إرشاد طلابي',
                  sub: 'إرشاد أكاديمي ومهني وسلوكي',
                },
                {
                  id: 'data-update' as const,
                  title: 'تحديث بيانات الطالب وولي الأمر',
                  sub: 'أرقام التواصل والعنوان والمخولين',
                },
                {
                  id: 'suggestion-survey' as const,
                  title: 'نموذج المقترحات والملاحظات',
                  sub: 'تطوير البيئة المدرسية والخدمات',
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedFormType(tab.id);
                    setIsReviewStep(false);
                    setSubmissionSuccessMessage(null);
                  }}
                  className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                    selectedFormType === tab.id
                      ? 'bg-[#0B2748] text-white border-2 border-[#C9A227] shadow-md'
                      : 'bg-white dark:bg-[#12395B] text-[#0B2748] dark:text-white border-slate-200 dark:border-slate-700 hover:border-[#C9A227]'
                  }`}
                >
                  <span className="text-xs font-black block">{tab.title}</span>
                  <span
                    className={`text-[11px] mt-1 block ${
                      selectedFormType === tab.id ? 'text-[#C9A227]' : 'text-slate-500 dark:text-slate-300'
                    }`}
                  >
                    {tab.sub}
                  </span>
                </button>
              ))}
            </div>

            {/* Official Confirmation Banner upon Submission */}
            {submissionSuccessMessage && (
              <div className="p-6 rounded-2xl bg-[#147A4A]/10 border-2 border-[#147A4A] text-[#0B2748] dark:text-white flex items-start gap-3 shadow-sm">
                <CheckCircle2 className="w-6 h-6 text-[#147A4A] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-[#147A4A] dark:text-emerald-300">
                    تأكيد استلام البيانات الرسمي
                  </h4>
                  <p className="text-sm font-bold leading-relaxed">
                    {submissionSuccessMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Form Card */}
            <div className="bg-white dark:bg-[#12395B] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4 mb-6 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-black text-[#0B2748] dark:text-white">
                    {getFormTitle(selectedFormType)}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                    أكاديمية الفجيرة العلمية الإسلامية • الحقول المشار إليها بعلامة (*) إلزامية
                  </p>
                </div>
              </div>

              {!isReviewStep ? (
                <form onSubmit={handleProceedToReview} className="space-y-5">
                  {Object.keys(formErrors).length > 0 && (
                    <div className="p-4 rounded-xl bg-[#B4232C]/10 border border-[#B4232C] text-[#B4232C] dark:text-rose-300 text-xs space-y-1">
                      <div className="font-black flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        <span>يرجى تصحيح الملاحظات التالية قبل المتابعة:</span>
                      </div>
                      {Object.values(formErrors).map((err, i) => (
                        <p key={i}>• {err}</p>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold mb-1.5">
                        صفة مقدم الطلب <span className="text-[#B4232C]">*</span>
                      </label>
                      <select
                        value={applicantRole}
                        onChange={(e) => setApplicantRole(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748] border border-slate-300 dark:border-slate-600 text-xs font-bold"
                      >
                        <option value="ولي أمر">ولي أمر</option>
                        <option value="طالب">طالب</option>
                        <option value="موظف / معلم">موظف / معلم</option>
                        <option value="زائر">زائر</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5">
                        الاسم الكامل <span className="text-[#B4232C]">*</span>
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="أدخل الاسم الثلاثي والقبيلة"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748] border border-slate-300 dark:border-slate-600 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5">
                        اسم الطالب (اختياري)
                      </label>
                      <input
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="اسم الطالب المقيد بالأكاديمية"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748] border border-slate-300 dark:border-slate-600 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5">
                        الصف والشعبة (اختياري)
                      </label>
                      <input
                        type="text"
                        value={gradeSection}
                        onChange={(e) => setGradeSection(e.target.value)}
                        placeholder="مثال: العاشر / 1"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748] border border-slate-300 dark:border-slate-600 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5">
                        رقم الهاتف المتحرك <span className="text-[#B4232C]">*</span>
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0501234567"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748] border border-slate-300 dark:border-slate-600 text-xs text-right"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5">
                        البريد الإلكتروني (اختياري)
                      </label>
                      <input
                        type="email"
                        dir="ltr"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@domain.ae"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748] border border-slate-300 dark:border-slate-600 text-xs text-right"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5">
                      التقييم العام لمستوى الخدمة
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['ممتاز', 'جيد جداً', 'جيد', 'يحتاج إلى تطوير'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setRating(opt)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                            rating === opt
                              ? 'bg-[#C9A227] text-[#0B2748] border-[#C9A227]'
                              : 'bg-[#FAF7EF] dark:bg-[#0B2748] border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5">
                      التفاصيل / الملاحظات / البيانات المطلوب إرسالها <span className="text-[#B4232C]">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="اكتب التفاصيل أو المقترحات هنا بوضوح..."
                      className="w-full p-3.5 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748] border border-slate-300 dark:border-slate-600 text-xs"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl bg-[#0B2748] hover:bg-[#C9A227] text-white hover:text-[#0B2748] font-black text-xs flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>مراجعة البيانات قبل الإرسال النهائي</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Pre-Submission Review Step */
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-[#FAF7EF] dark:bg-[#0B2748] border-2 border-[#C9A227] space-y-3">
                    <h4 className="text-sm font-black text-[#0B2748] dark:text-[#C9A227]">
                      مراجعة البيانات قبل الاعتماد والإرسال إلى أكاديمية الفجيرة العلمية الإسلامية
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500">النموذج: </span>
                        <span className="font-bold">{getFormTitle(selectedFormType)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">الصفة: </span>
                        <span className="font-bold">{applicantRole}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">الاسم الكامل: </span>
                        <span className="font-bold">{fullName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">رقم الهاتف: </span>
                        <span className="font-bold">{phone}</span>
                      </div>
                      {studentName && (
                        <div>
                          <span className="text-slate-500">اسم الطالب: </span>
                          <span className="font-bold">{studentName}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500">التقييم العام: </span>
                        <span className="font-bold">{rating}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                      <span className="text-slate-500 block mb-1">التفاصيل:</span>
                      <p className="font-semibold">{details}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsReviewStep(false)}
                      className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold cursor-pointer"
                    >
                      تعديل البيانات
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmSubmitForm}
                      className="px-6 py-2.5 rounded-xl bg-[#147A4A] hover:bg-[#147A4A]/90 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <Send className="w-4 h-4" />
                      <span>تأكيد وإرسال النموذج رسمياً</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 11. CONTACT US SECTION (قسم التواصل معنا)                         */}
        {/* ================================================================= */}
        {activeSection === 'contact' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#0B2748] text-white rounded-3xl p-6 sm:p-8 border-2 border-[#C9A227]/60">
              <span className="text-xs font-bold text-[#C9A227]">قنوات الاتصال الرسمية</span>
              <h2 className="text-2xl font-black mt-1">
                التواصل مع أكاديمية الفجيرة العلمية الإسلامية
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Contact Information Cards */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white dark:bg-[#12395B] rounded-2xl p-6 border border-[#C9A227]/40 space-y-4">
                  <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                    بيانات الاتصال والموقع الجغرافي
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">العنوان الرسمي:</span>
                        <span className="text-slate-600 dark:text-slate-300">
                          أكاديمية الفجيرة العلمية الإسلامية – إمارة الفجيرة – دولة الإمارات العربية المتحدة
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <PhoneCall className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">الهاتف الرسمي:</span>
                        <span className="text-slate-600 dark:text-slate-300 font-mono">09-2220000</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">البريد الإلكتروني الرسمي:</span>
                        <span className="text-slate-600 dark:text-slate-300 font-mono">info@fsia.edu.ae</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">أوقات الدوام الرسمي:</span>
                        <span className="text-slate-600 dark:text-slate-300">
                          الإثنين – الخميس: 07:30 صباحاً – 02:30 ظهراً | الجمعة: 07:30 صباحاً – 11:30 صباحاً
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Contact Form */}
              <div className="lg:col-span-7 bg-white dark:bg-[#12395B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-black text-[#0B2748] dark:text-white mb-4">
                  نموذج المراسلة المباشرة
                </h3>

                {contactConfirmMsg && (
                  <div className="mb-4 p-4 rounded-xl bg-[#147A4A]/15 border border-[#147A4A] text-xs font-bold text-[#147A4A] dark:text-emerald-300">
                    {contactConfirmMsg}
                  </div>
                )}

                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1">الاسم الكامل *</label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748] border border-slate-300 dark:border-slate-600 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">رقم الهاتف *</label>
                      <input
                        type="text"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748] border border-slate-300 dark:border-slate-600 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">الجهة / القسم المعني</label>
                    <select
                      value={contactDepartment}
                      onChange={(e) => setContactDepartment(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748] border border-slate-300 dark:border-slate-600 text-xs font-bold"
                    >
                      <option value="الإدارة العامة للأكاديمية">الإدارة العامة للأكاديمية</option>
                      <option value="مكتب الإرشاد الطلابي والرعاية">مكتب الإرشاد الطلابي والرعاية</option>
                      <option value="شؤون الطلبة والقبول والتسجيل">شؤون الطلبة والقبول والتسجيل</option>
                      <option value="الدعم الفني والأنظمة الإلكترونية">الدعم الفني والأنظمة الإلكترونية</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">نص الرسالة أو الاستفسار *</label>
                    <textarea
                      rows={4}
                      required
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="w-full p-3.5 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748] border border-slate-300 dark:border-slate-600 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#C9A227] hover:bg-[#A67C00] text-[#0B2748] hover:text-white font-black text-xs cursor-pointer transition-colors"
                  >
                    إرسال الرسالة
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 12. PORTAL ADMIN PANEL (لوحة إدارة البوابة والمحتوى)              */}
        {/* ================================================================= */}
        {activeSection === 'admin-portal' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="bg-[#0B2748] text-white rounded-3xl p-6 sm:p-8 border-2 border-[#C9A227]/60 flex items-center justify-between flex-wrap gap-4">
              <div>
                <span className="text-xs font-bold text-[#C9A227]">لوحة التحكم الإدارية للبوابة</span>
                <h2 className="text-2xl font-black mt-1">
                  إدارة محتوى وأنظمة أكاديمية الفجيرة العلمية الإسلامية
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onOpenCounselorWorkspace('dashboard')}
                className="px-4 py-2.5 rounded-xl bg-[#C9A227] text-[#0B2748] font-black text-xs cursor-pointer"
              >
                فتح منظومة المرشد الشاملة
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add News / Announcement */}
              <div className="bg-white dark:bg-[#12395B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
                <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                  نشر خبر أو تعميم رسمي جديد
                </h3>
                <form onSubmit={handleAddNews} className="space-y-3">
                  <input
                    type="text"
                    required
                    value={newNewsTitle}
                    onChange={(e) => setNewNewsTitle(e.target.value)}
                    placeholder="عنوان الخبر أو التعميم..."
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748] border border-slate-300 dark:border-slate-600 text-xs"
                  />
                  <select
                    value={newNewsCategory}
                    onChange={(e) => setNewNewsCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748] border border-slate-300 dark:border-slate-600 text-xs font-bold"
                  >
                    <option value="أخبار الأكاديمية">أخبار الأكاديمية</option>
                    <option value="تعميم رسمي">تعميم رسمي</option>
                    <option value="إنجازات طلابية">إنجازات طلابية</option>
                    <option value="إعلان إداري">إعلان إداري</option>
                  </select>
                  <textarea
                    rows={3}
                    required
                    value={newNewsSummary}
                    onChange={(e) => setNewNewsSummary(e.target.value)}
                    placeholder="ملخص الخبر أو تفاصيل التعميم..."
                    className="w-full p-3 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748] border border-slate-300 dark:border-slate-600 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#0B2748] text-[#C9A227] font-bold text-xs cursor-pointer"
                  >
                    نشر في البوابة
                  </button>
                </form>
              </div>

              {/* Manage Electronic Systems Status */}
              <div className="bg-white dark:bg-[#12395B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
                <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                  إدارة حالة الأنظمة الإلكترونية (اضغط لتغيير الحالة)
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {systemsList.map((sys) => (
                    <div
                      key={sys.id}
                      className="p-2.5 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748] border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-bold truncate">{sys.title}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleSystemStatus(sys.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#0B2748] text-[#C9A227] font-bold text-[10px] shrink-0 cursor-pointer"
                      >
                        {sys.status}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Submitted Forms & Surveys Log */}
            <div className="bg-white dark:bg-[#12395B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                سجل الردود والنماذج المستلمة ({submissions.length})
              </h3>
              {submissions.length === 0 ? (
                <p className="text-xs text-slate-500">لا توجد ردود مستلمة حتى الآن.</p>
              ) : (
                <div className="space-y-2.5">
                  {submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-xl bg-[#FAF7EF] dark:bg-[#0B2748] border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>
                          {sub.formTitle} — {sub.fullName} ({sub.applicantRole})
                        </span>
                        <span className="text-[11px] text-slate-500">{sub.submittedAt}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">{sub.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Policy Document Viewer Modal */}
      {selectedPolicyForView && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-white dark:bg-[#0B2748] border-2 border-[#C9A227] rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
              <div>
                <span className="text-xs font-bold text-[#A67C00] dark:text-[#C9A227]">
                  أكاديمية الفجيرة العلمية الإسلامية • {selectedPolicyForView.category}
                </span>
                <h3 className="text-lg font-black text-[#0B2748] dark:text-white mt-1">
                  {selectedPolicyForView.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPolicyForView(null)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#12395B] text-slate-600 dark:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              {selectedPolicyForView.summary}
            </p>

            <div className="bg-[#FAF7EF] dark:bg-[#12395B] p-4 rounded-2xl border border-[#C9A227]/40 space-y-2">
              <h4 className="text-xs font-black text-[#0B2748] dark:text-[#C9A227]">
                البنود والضوابط التنفيذية المعتمدة:
              </h4>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-200">
                {selectedPolicyForView.clauses.map((c, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-black text-[#C9A227]">{idx + 1}.</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadPolicy(selectedPolicyForView)}
                className="px-5 py-2.5 rounded-xl bg-[#C9A227] text-[#0B2748] font-black text-xs flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تحميل الوثيقة الرسمية</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPolicyForView(null)}
                className="px-5 py-2.5 rounded-xl bg-[#0B2748] text-white font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
