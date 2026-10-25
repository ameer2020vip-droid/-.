import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  Filter,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  Phone,
  Mail,
  Building2,
  Briefcase,
  Shield,
  Layers,
  ArrowRight,
  RefreshCw,
  Plus,
  Eye,
  Check,
  UserCheck,
  HelpCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  EmployeeRecord,
  CommitteeMemberConfig,
  CommitteeFormationConfig,
  AppUser,
} from '../types';
import {
  getEmployees,
  saveEmployeesLocal,
  addEmployeeLocal,
  updateEmployeeLocal,
  deleteEmployeeLocal,
  batchSaveEmployeesLocal,
  getCommitteeFormationLocal,
  saveCommitteeFormationLocal,
  getInitialEmployees,
  getInitialCommitteeFormation,
} from '../storage';
import {
  fetchEmployees,
  saveEmployeeFirestore,
  deleteEmployeeFirestore,
  batchSaveEmployeesFirestore,
  fetchCommitteeFormation,
  saveCommitteeFormationFirestore,
} from '../firebase/firestoreService';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface EmployeesPageProps {
  currentUser?: AppUser | null;
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onNavigateToTab?: (tab: any) => void;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({
  currentUser,
  onShowToast,
  onNavigateToTab,
}) => {
  const { schoolSettings } = useSchoolSettings();
  const schoolId = schoolSettings.schoolId || '7001';

  // Active Tab: 'directory' (سجل الموظفين) vs 'committee_formation' (تشكيل لجنة السلوك)
  const [activeTab, setActiveTab] = useState<'directory' | 'committee_formation'>('directory');

  // Staff state
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [committeeFilter, setCommitteeFilter] = useState<string>('all');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);

  // Form fields for Add/Edit Employee
  const [formEmployeeNumber, setFormEmployeeNumber] = useState<string>('');
  const [formFullName, setFormFullName] = useState<string>('');
  const [formJobTitle, setFormJobTitle] = useState<string>('');
  const [formDepartment, setFormDepartment] = useState<string>('');
  const [formPhoneNumber, setFormPhoneNumber] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formIsCommitteeMember, setFormIsCommitteeMember] = useState<boolean>(false);
  const [formCommitteeRole, setFormCommitteeRole] = useState<string>('عضو');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formNotes, setFormNotes] = useState<string>('');

  // Excel Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importPreviewData, setImportPreviewData] = useState<Partial<EmployeeRecord>[]>([]);
  const [importFileName, setImportFileName] = useState<string>('');
  const [isProcessingImport, setIsProcessingImport] = useState<boolean>(false);

  // Committee Formation state
  const [committeeFormation, setCommitteeFormation] = useState<CommitteeFormationConfig>(
    getInitialCommitteeFormation()
  );
  const [isSavingFormation, setIsSavingFormation] = useState<boolean>(false);

  // Load initial data from LocalStorage & Firestore
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      // 1. Local
      const localStaff = getEmployees();
      setEmployees(localStaff);

      const localFormation = getCommitteeFormationLocal();
      setCommitteeFormation(localFormation);

      // 2. Remote Firestore sync
      try {
        const remoteStaff = await fetchEmployees(schoolId);
        if (remoteStaff && remoteStaff.length > 0) {
          setEmployees(remoteStaff);
          saveEmployeesLocal(remoteStaff);
        }

        const remoteFormation = await fetchCommitteeFormation(schoolId);
        if (remoteFormation && remoteFormation.members && remoteFormation.members.length > 0) {
          setCommitteeFormation(remoteFormation);
          saveCommitteeFormationLocal(remoteFormation);
        }
      } catch (err) {
        console.warn('Firestore employees sync warning:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [schoolId]);

  // Compute departments list
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (departmentFilter !== 'all' && emp.department !== departmentFilter) {
        return false;
      }
      if (committeeFilter === 'committee_only' && !emp.isCommitteeMember) {
        return false;
      }
      if (committeeFilter === 'non_committee' && emp.isCommitteeMember) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (emp.fullName || '').toLowerCase().includes(q);
        const numMatch = (emp.employeeNumber || '').toLowerCase().includes(q);
        const titleMatch = (emp.jobTitle || '').toLowerCase().includes(q);
        const deptMatch = (emp.department || '').toLowerCase().includes(q);
        const phoneMatch = (emp.phoneNumber || '').toLowerCase().includes(q);
        if (!nameMatch && !numMatch && !titleMatch && !deptMatch && !phoneMatch) {
          return false;
        }
      }
      return true;
    });
  }, [employees, departmentFilter, committeeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = employees.length;
    const committeeCount = employees.filter((e) => e.isCommitteeMember).length;
    const teachingCount = employees.filter((e) => (e.jobTitle || '').includes('معلم')).length;
    const adminCount = total - teachingCount;
    return { total, committeeCount, teachingCount, adminCount };
  }, [employees]);

  // --- Handlers: Add / Edit Employee ---
  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    setFormEmployeeNumber(`${1000 + employees.length + 1}`);
    setFormFullName('');
    setFormJobTitle('معلم');
    setFormDepartment('الهيئة التعليمية');
    setFormPhoneNumber('');
    setFormEmail('');
    setFormIsCommitteeMember(false);
    setFormCommitteeRole('عضو');
    setFormStatus('active');
    setFormNotes('');
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (emp: EmployeeRecord) => {
    setEditingEmployee(emp);
    setFormEmployeeNumber(emp.employeeNumber || '');
    setFormFullName(emp.fullName || '');
    setFormJobTitle(emp.jobTitle || '');
    setFormDepartment(emp.department || '');
    setFormPhoneNumber(emp.phoneNumber || '');
    setFormEmail(emp.email || '');
    setFormIsCommitteeMember(!!emp.isCommitteeMember);
    setFormCommitteeRole(emp.committeeRole || 'عضو');
    setFormStatus(emp.status || 'active');
    setFormNotes(emp.notes || '');
    setIsAddEditModalOpen(true);
  };

  const handleSaveEmployee = async () => {
    if (!formFullName.trim()) {
      onShowToast('يرجى كتابة اسم الموظف كاملاً', 'warning');
      return;
    }
    if (!formEmployeeNumber.trim()) {
      onShowToast('يرجى تحديد الرقم الوظيفي للموظف', 'warning');
      return;
    }

    // Check duplicate employee number if adding new
    if (!editingEmployee) {
      const isDup = employees.some((e) => e.employeeNumber === formEmployeeNumber.trim());
      if (isDup) {
        onShowToast('الرقم الوظيفي مسجل مسبقاً لموظف آخر', 'warning');
        return;
      }
    }

    const now = new Date().toISOString();
    const employeeData: EmployeeRecord = {
      id: editingEmployee ? editingEmployee.id : `EMP-${Date.now().toString().slice(-6)}`,
      employeeNumber: formEmployeeNumber.trim(),
      fullName: formFullName.trim(),
      jobTitle: formJobTitle.trim(),
      department: formDepartment.trim() || 'عام',
      phoneNumber: formPhoneNumber.trim() || undefined,
      email: formEmail.trim() || undefined,
      isCommitteeMember: formIsCommitteeMember,
      committeeRole: formIsCommitteeMember ? formCommitteeRole : undefined,
      status: formStatus,
      notes: formNotes.trim() || undefined,
      schoolId,
      createdAt: editingEmployee?.createdAt || now,
      updatedAt: now,
    };

    if (editingEmployee) {
      updateEmployeeLocal(employeeData);
      setEmployees((prev) => prev.map((e) => (e.id === employeeData.id ? employeeData : e)));
      onShowToast(`تم تحديث بيانات الموظف (${employeeData.fullName}) بنجاح`, 'success');
    } else {
      addEmployeeLocal(employeeData);
      setEmployees((prev) => [employeeData, ...prev]);
      onShowToast(`تمت إضافة الموظف (${employeeData.fullName}) بنجاح`, 'success');
    }

    setIsAddEditModalOpen(false);

    // Sync to Firestore
    try {
      await saveEmployeeFirestore(schoolId, employeeData, currentUser as any);
    } catch (err) {
      console.warn('Sync employee to Firestore notice:', err);
    }
  };

  const handleDeleteEmployee = async (emp: EmployeeRecord) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف الموظف (${emp.fullName}) من السجل؟`);
    if (!confirmed) return;

    deleteEmployeeLocal(emp.id);
    setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
    onShowToast(`تم حذف الموظف (${emp.fullName}) من السجل`, 'info');

    try {
      await deleteEmployeeFirestore(schoolId, emp.id, currentUser as any);
    } catch (err) {
      console.warn('Delete employee from Firestore notice:', err);
    }
  };

  // --- Handlers: Excel Export & Template Download ---
  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        'الرقم الوظيفي': '1011',
        'الاسم الكامل': 'سعيد محمد الكتبي',
        'المسمى الوظيفي': 'معلم لغة إنجليزية',
        'القسم': 'اللغة الإنجليزية',
        'رقم الهاتف': '0501112233',
        'البريد الإلكتروني': 'saeed.kutbi@school.edu.ae',
        'عضو بلجنة السلوك (نعم/لا)': 'لا',
        'دور العضو باللجنة': '',
      },
      {
        'الرقم الوظيفي': '1012',
        'الاسم الكامل': 'فاطمة راشد المنصوري',
        'المسمى الوظيفي': 'معلمة حاسوب وتكنولوجيا',
        'القسم': 'تكنولوجيا المعلومات',
        'رقم الهاتف': '0502223344',
        'البريد الإلكتروني': 'fatima.mansoori@school.edu.ae',
        'عضو بلجنة السلوك (نعم/لا)': 'لا',
        'دور العضو باللجنة': '',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'قالب الموظفين');
    XLSX.writeFile(workbook, 'قالب_استيراد_سجل_الموظفين.xlsx');
    onShowToast('تم تنزيل قالب الإكسل المعتمد بنجاح', 'success');
  };

  const handleExportEmployeesExcel = () => {
    if (employees.length === 0) {
      onShowToast('لا يوجد موظفون للتصدير', 'warning');
      return;
    }

    const exportRows = employees.map((emp) => ({
      'الرقم الوظيفي': emp.employeeNumber,
      'الاسم الكامل': emp.fullName,
      'المسمى الوظيفي': emp.jobTitle,
      'القسم': emp.department,
      'رقم الهاتف': emp.phoneNumber || '',
      'البريد الإلكتروني': emp.email || '',
      'عضو بلجنة السلوك': emp.isCommitteeMember ? 'نعم' : 'لا',
      'الدور باللجنة': emp.committeeRole || '',
      'الحالة': emp.status === 'active' ? 'على رأس العمل' : 'غير نشط',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل الموظفين');
    XLSX.writeFile(workbook, `سجل_موظفي_المدرسة_${schoolId}.xlsx`);
    onShowToast('تم تصدير سجل الموظفين إلى ملف إكسل بنجاح', 'success');
  };

  // --- Handlers: Excel File Upload & Preview ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawData || rawData.length === 0) {
          onShowToast('الملف المرفوع فارغ ولا يحتوي على صفوف بيانات', 'warning');
          return;
        }

        // Map columns
        const parsed: Partial<EmployeeRecord>[] = rawData.map((row, idx) => {
          const empNum = String(
            row['الرقم الوظيفي'] || row['رقم الموظف'] || row['Employee ID'] || row['id'] || `${2000 + idx + 1}`
          ).trim();
          const fullName = String(
            row['الاسم الكامل'] || row['اسم الموظف'] || row['الاسم'] || row['Name'] || row['Full Name'] || ''
          ).trim();
          const jobTitle = String(
            row['المسمى الوظيفي'] || row['الوظيفة'] || row['المسمى'] || row['Job Title'] || 'معلم'
          ).trim();
          const department = String(
            row['القسم'] || row['المادة'] || row['الإدارة'] || row['Department'] || 'عام'
          ).trim();
          const phone = String(row['رقم الهاتف'] || row['الهاتف'] || row['Phone'] || '').trim();
          const email = String(row['البريد الإلكتروني'] || row['البريد'] || row['Email'] || '').trim();
          const isComm = String(row['عضو بلجنة السلوك'] || row['عضو بلجنة السلوك (نعم/لا)'] || '')
            .trim()
            .toLowerCase();
          const isCommittee = isComm === 'نعم' || isComm === 'yes' || isComm === 'true';
          const commRole = String(row['الدور باللجنة'] || row['دور العضو باللجنة'] || 'عضو').trim();

          return {
            id: `EMP-${Date.now().toString().slice(-5)}-${idx}`,
            employeeNumber: empNum,
            fullName,
            jobTitle,
            department,
            phoneNumber: phone || undefined,
            email: email || undefined,
            isCommitteeMember: isCommittee,
            committeeRole: isCommittee ? commRole : undefined,
            status: 'active',
            schoolId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });

        // Filter out rows without a name
        const validRows = parsed.filter((p) => p.fullName && p.fullName.length > 2);
        if (validRows.length === 0) {
          onShowToast('لم يتم العثور على أسماء موظفين صالحة في الملف المرفوع', 'warning');
          return;
        }

        setImportPreviewData(validRows);
        onShowToast(`تمت قراءة ${validRows.length} سجلاً بنجاح، راجع المعاينة قبل الاعتماد`, 'info');
      } catch (err) {
        console.error('Error parsing excel:', err);
        onShowToast('حدث خطأ أثناء قراءة ملف الإكسل. يرجى التأكد من صيغة الملف', 'error');
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (importPreviewData.length === 0) {
      onShowToast('لا توجد بيانات صالحة للاستيراد', 'warning');
      return;
    }

    setIsProcessingImport(true);
    try {
      const recordsToImport: EmployeeRecord[] = importPreviewData as EmployeeRecord[];

      batchSaveEmployeesLocal(recordsToImport);

      // Re-read merged
      const updatedList = getEmployees();
      setEmployees(updatedList);

      // Firestore Batch
      await batchSaveEmployeesFirestore(schoolId, recordsToImport, currentUser as any);

      onShowToast(`تم استيراد ${recordsToImport.length} موظفاً وتحديث السجل بنجاح!`, 'success');
      setIsImportModalOpen(false);
      setImportPreviewData([]);
      setImportFileName('');
    } catch (err) {
      console.error('Import confirmation error:', err);
      onShowToast('حدث خطأ أثناء استيراد البيانات إلى الخادم', 'error');
    } finally {
      setIsProcessingImport(false);
    }
  };

  // --- Handlers: Committee Formation Config ---
  const handleUpdateCommitteeMember = (index: number, field: keyof CommitteeMemberConfig, value: any) => {
    setCommitteeFormation((prev) => {
      const members = [...prev.members];
      members[index] = { ...members[index], [field]: value };
      return { ...prev, members, updatedAt: new Date().toISOString() };
    });
  };

  const handleSelectEmployeeForCommitteeSlot = (index: number, empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;

    setCommitteeFormation((prev) => {
      const members = [...prev.members];
      members[index] = {
        ...members[index],
        employeeId: emp.id,
        name: emp.fullName,
        department: emp.department,
        phoneNumber: emp.phoneNumber || members[index].phoneNumber,
      };
      return { ...prev, members, updatedAt: new Date().toISOString() };
    });

    // Also toggle employee isCommitteeMember flag
    const updatedEmp: EmployeeRecord = {
      ...emp,
      isCommitteeMember: true,
      committeeRole: committeeFormation.members[index].roleTitle,
    };
    updateEmployeeLocal(updatedEmp);
    setEmployees((prev) => prev.map((e) => (e.id === emp.id ? updatedEmp : e)));
  };

  const handleAddCustomCommitteeMember = () => {
    const newMember: CommitteeMemberConfig = {
      id: `CFM-${Date.now().toString().slice(-4)}`,
      name: '',
      roleTitle: 'عضو مكلف بلجنة إدارة السلوك',
      department: 'الكادر المدرسي',
      isRequired: false,
    };

    setCommitteeFormation((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleRemoveCommitteeMember = (index: number) => {
    const target = committeeFormation.members[index];
    if (target.isRequired) {
      onShowToast('لا يمكن حذف الأعضاء الأساسيين المشترطين في اللائحة الرسمية', 'warning');
      return;
    }
    setCommitteeFormation((prev) => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleSaveCommitteeFormation = async () => {
    setIsSavingFormation(true);
    try {
      saveCommitteeFormationLocal(committeeFormation);
      await saveCommitteeFormationFirestore(schoolId, committeeFormation, currentUser as any);
      onShowToast('تم حفظ وتوثيق التشكيل الرسمي لأعضاء لجنة إدارة السلوك بنجاح!', 'success');
    } catch (err) {
      console.warn('Error saving formation:', err);
      onShowToast('تم الحفظ محلياً مع تعذر المزامنة السحابية المؤقتة', 'info');
    } finally {
      setIsSavingFormation(false);
    }
  };

  const handleResetDefaultFormation = () => {
    const confirmed = window.confirm('هل ترغب في إعادة التشكيل الرسمي للجنة إلى الضوابط الافتراضية للائحة؟');
    if (!confirmed) return;

    const initial = getInitialCommitteeFormation();
    setCommitteeFormation(initial);
    saveCommitteeFormationLocal(initial);
    onShowToast('تمت استعادة التشكيل الافتراضي للجنة', 'info');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#006D77]/10 text-[#006D77] dark:bg-[#006D77]/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                سجل الموظفين وتشكيل لجنة إدارة السلوك
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                إدارة قاعدة بيانات الكادر المدرسي وربطهم برصد المخالفات وتشكيل لجنة الانضباط المعتمدة
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
            title="تنزيل قالب إكسل فارغ لملء بيانات الكادر"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>قالب الإكسل</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setImportPreviewData([]);
              setImportFileName('');
              setIsImportModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-black flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>استيراد ملف إكسل</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-[#006D77] hover:bg-teal-700 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ موظف جديد</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'directory'
              ? 'bg-[#006D77] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>سجل الكادر والموظفين ({employees.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('committee_formation')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'committee_formation'
              ? 'bg-[#006D77] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Shield className="w-4 h-4 text-amber-500" />
          <span>تشكيل لجنة إدارة السلوك المعتمد ({committeeFormation.members.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EMPLOYEES DIRECTORY                                                */}
      {/* ========================================================================= */}
      {activeTab === 'directory' && (
        <div className="space-y-5">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">إجمالي الكادر المدرسي</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                  {stats.total}
                </span>
                <span className="text-xs text-slate-400">موظفاً</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">الهيئة التعليمية (معلمون)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-teal-700 dark:text-teal-400 tabular-nums">
                  {stats.teachingCount}
                </span>
                <span className="text-xs text-slate-400">معلماً</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">الهيئة الإدارية والفنية</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-200 tabular-nums">
                  {stats.adminCount}
                </span>
                <span className="text-xs text-slate-400">إدارياً</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">المكلفون بلجنة السلوك</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                  {stats.committeeCount}
                </span>
                <span className="text-xs text-slate-400">عضواً</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم، الرقم الوظيفي، المسمى، أو القسم..."
                className="w-full pr-10 pl-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-[#006D77] focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span>القسم:</span>
              </div>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
              >
                <option value="all">كافة الأقسام</option>
                {departmentsList.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              <select
                value={committeeFilter}
                onChange={(e) => setCommitteeFilter(e.target.value)}
                className="p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
              >
                <option value="all">كافة الموظفين</option>
                <option value="committee_only">أعضاء لجنة السلوك فقط</option>
                <option value="non_committee">باقي الكادر</option>
              </select>

              <button
                type="button"
                onClick={handleExportEmployeesExcel}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                title="تصدير السجل الحالي إلى إكسل"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>تصدير إكسل</span>
              </button>
            </div>
          </div>

          {/* Employees Table / Cards */}
          {filteredEmployees.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-3xl bg-slate-50/50 dark:bg-slate-900/30">
              <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">لم يتم العثور على موظفين مطابقين</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                يمكنك إضافة موظف جديد أو استيراد ملف إكسل بالكامل لتعبئة بيانات الكادر المدرسي.
              </p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-4 px-4 py-2 bg-[#006D77] text-white text-xs font-bold rounded-xl hover:bg-teal-700"
              >
                + إضافة موظف الآن
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-black">
                    <tr>
                      <th className="p-3.5">الرقم الوظيفي</th>
                      <th className="p-3.5">اسم الموظف</th>
                      <th className="p-3.5">المسمى الوظيفي</th>
                      <th className="p-3.5">القسم / الإدارة</th>
                      <th className="p-3.5">الهاتف / التواصل</th>
                      <th className="p-3.5">عضوية لجنة السلوك</th>
                      <th className="p-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredEmployees.map((emp) => (
                      <tr
                        key={emp.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                      >
                        <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                          {emp.employeeNumber}
                        </td>
                        <td className="p-3.5">
                          <div className="font-black text-slate-900 dark:text-white text-xs">
                            {emp.fullName}
                          </div>
                          {emp.email && (
                            <span className="text-[10px] text-slate-400 block truncate max-w-xs">{emp.email}</span>
                          )}
                        </td>
                        <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300">
                          {emp.jobTitle}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-[11px] font-bold">
                            {emp.department}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400">
                          {emp.phoneNumber ? (
                            <div className="flex items-center gap-1 tabular-nums font-bold">
                              <Phone className="w-3 h-3 text-[#006D77]" />
                              <span>{emp.phoneNumber}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">غير مسجل</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {emp.isCommitteeMember ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-[10px] font-black border border-amber-200 dark:border-amber-900/60">
                              <Shield className="w-3 h-3 text-amber-600" />
                              <span>{emp.committeeRole || 'عضو باللجنة'}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(emp)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 cursor-pointer transition-colors"
                              title="تعديل بيانات الموظف"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEmployee(emp)}
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                              title="حذف الموظف من السجل"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMMITTEE FORMATION CONFIG                                         */}
      {/* ========================================================================= */}
      {activeTab === 'committee_formation' && (
        <div className="space-y-6">
          {/* Bylaw Information Box */}
          <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-black text-sm">
              <Shield className="w-4 h-4 text-amber-600" />
              <span>الضوابط الرسمية لتشكيل لجنة إدارة السلوك بالمدرسة</span>
            </div>
            <p className="leading-relaxed">
              وفقاً لدليل إدارة سلوك الطلبة والقرارات الوزارية المنظمة، تُشكل لجنة إدارة السلوك برئاسة مدير المدرسة،
              وعضوية مساعد المدير، والمرشد الأكاديمي والمهني (مقرراً)، والاختصاصي الاجتماعي، وممثل المعلمين، ورئيس
              مجلس أولياء الأمور. يُعتمد هذا التشكيل لجميع جلسات واجتماعات اللجنة وتوقيعات النماذج الرسمية (كنموذج 12).
            </p>
          </div>

          {/* Committee Member Slots Grid */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-sm">
                  التشكيل المعتمد لأعضاء اللجنة للعام الدراسي الحالي
                </h3>
                <p className="text-[11px] text-slate-500">
                  حدد الموظف المكلف بكل منصب من سجل الموظفين، أو خصص الاسم والصفة يدوياً
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetDefaultFormation}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  استعادة الافتراضي
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomCommitteeMember}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ إضافة عضو مكلف</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {committeeFormation.members.map((slot, idx) => (
                <div
                  key={slot.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/40 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#006D77] dark:text-teal-400 text-xs flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span>{slot.roleTitle}</span>
                    </span>
                    {slot.isRequired ? (
                      <span className="text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-black px-2 py-0.5 rounded">
                        منصب إلزامي
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveCommitteeMember(idx)}
                        className="text-rose-500 hover:text-rose-700 text-[11px] font-bold cursor-pointer"
                      >
                        حذف العضو
                      </button>
                    )}
                  </div>

                  {/* Pick from Employees Dropdown */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      تعيين موظف من السجل:
                    </label>
                    <select
                      value={slot.employeeId || ''}
                      onChange={(e) => handleSelectEmployeeForCommitteeSlot(idx, e.target.value)}
                      className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                    >
                      <option value="">-- اختيار من سجل الكادر المدرسي --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName} ({emp.jobTitle} - {emp.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Direct Name and Role Inputs */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">اسم العضو المعتمد:</label>
                      <input
                        type="text"
                        value={slot.name}
                        onChange={(e) => handleUpdateCommitteeMember(idx, 'name', e.target.value)}
                        placeholder="اسم العضو..."
                        className="w-full p-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">المنصب والصفة باللجنة:</label>
                      <input
                        type="text"
                        value={slot.roleTitle}
                        onChange={(e) => handleUpdateCommitteeMember(idx, 'roleTitle', e.target.value)}
                        placeholder="الصفة باللجنة..."
                        className="w-full p-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Save Formation Button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                آخر تحديث لتشكيل اللجنة: {new Date(committeeFormation.updatedAt).toLocaleDateString('ar-AE')}
              </span>
              <button
                type="button"
                onClick={handleSaveCommitteeFormation}
                disabled={isSavingFormation}
                className="px-5 py-2.5 rounded-xl bg-[#006D77] hover:bg-teal-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingFormation ? 'جارٍ الحفظ...' : 'حفظ واعتماد التشكيل الرسمي للجنة'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT EMPLOYEE                                                */}
      {/* ========================================================================= */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0C2340] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#006D77]/10 text-[#006D77] rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                    {editingEmployee ? 'تعديل بيانات موظف' : 'إضافة موظف جديد إلى السجل'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    تسجيل بيانات الكادر المدرسي وتحديد دوره في اللجان ورصد المخالفات
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 dark:text-white block mb-1">
                    الاسم الكامل للموظف: *
                  </label>
                  <input
                    type="text"
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="مثال: سالم راشد المنصوري"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-white block mb-1">
                    الرقم الوظيفي: *
                  </label>
                  <input
                    type="text"
                    value={formEmployeeNumber}
                    onChange={(e) => setFormEmployeeNumber(e.target.value)}
                    placeholder="مثال: 1045"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 dark:text-white block mb-1">
                    المسمى الوظيفي: *
                  </label>
                  <input
                    type="text"
                    value={formJobTitle}
                    onChange={(e) => setFormJobTitle(e.target.value)}
                    placeholder="معلم رياضيات، اختصاصي، مساعد مدير..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-white block mb-1">
                    القسم / المادة / الإدارة: *
                  </label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="الرياضيات، العلوم، الإدارة المدرسية..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 dark:text-white block mb-1">
                    رقم الهاتف / الواتساب:
                  </label>
                  <input
                    type="text"
                    value={formPhoneNumber}
                    onChange={(e) => setFormPhoneNumber(e.target.value)}
                    placeholder="050xxxxxxx"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs tabular-nums"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-white block mb-1">
                    البريد الإلكتروني المؤسسي:
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="employee@school.edu.ae"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              {/* Committee Membership Toggle */}
              <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsCommitteeMember}
                    onChange={(e) => setFormIsCommitteeMember(e.target.checked)}
                    className="w-4 h-4 rounded text-[#006D77] focus:ring-[#006D77]"
                  />
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    عضو في لجنة إدارة السلوك بالمدرسة
                  </span>
                </label>

                {formIsCommitteeMember && (
                  <div className="pt-2 animate-in fade-in duration-150">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      الصفة أو الدور في اللجنة:
                    </label>
                    <input
                      type="text"
                      value={formCommitteeRole}
                      onChange={(e) => setFormCommitteeRole(e.target.value)}
                      placeholder="رئيس اللجنة، مقرر اللجنة، ممثل المعلمين، عضو..."
                      className="w-full p-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs font-bold text-amber-900 dark:text-amber-300"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-800 dark:text-white block mb-1">ملاحظات إضافية:</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="ملاحظات حول التكليفات والمهام..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsAddEditModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveEmployee}
                className="px-5 py-2.5 rounded-xl bg-[#006D77] hover:bg-teal-700 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>حفظ بيانات الموظف</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EXCEL IMPORT WITH PREVIEW                                          */}
      {/* ========================================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0C2340] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                    استيراد سجل الموظفين من ملف إكسل
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    رفع ملف (.xlsx أو .csv) وتأكيد معاينة السجلات قبل الحفظ النهائي
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-[#006D77] transition-colors bg-slate-50/50 dark:bg-slate-900/30">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-bold text-slate-700 dark:text-slate-300 text-xs mb-1">
                  اختر ملف إكسل أو اسحبه هنا
                </p>
                <p className="text-[11px] text-slate-500 mb-3">يدعم صيغ (.xlsx, .xls, .csv)</p>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="excel-staff-upload"
                />
                <label
                  htmlFor="excel-staff-upload"
                  className="px-4 py-2 rounded-xl bg-[#006D77] text-white font-bold text-xs cursor-pointer hover:bg-teal-700 inline-block shadow-sm"
                >
                  تصفح الملفات
                </label>
                {importFileName && (
                  <p className="mt-2 text-xs font-bold text-[#006D77]">{importFileName}</p>
                )}
              </div>

              {/* Template Download Help Box */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                <span>لتفادي أخطاء الأعمدة، نوصي باستخدام قالب الإكسل المعتمد للنظام:</span>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-[#006D77] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تنزيل القالب</span>
                </button>
              </div>

              {/* Preview Table */}
              {importPreviewData.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">
                      معاينة البيانات المقروءة ({importPreviewData.length} موظف):
                    </span>
                    <span className="text-[11px] text-emerald-600 font-bold">جاهز للاستيراد</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-right text-[11px]">
                      <thead className="bg-slate-50 dark:bg-slate-900 font-bold sticky top-0">
                        <tr>
                          <th className="p-2">الرقم الوظيفي</th>
                          <th className="p-2">الاسم الكامل</th>
                          <th className="p-2">المسمى الوظيفي</th>
                          <th className="p-2">القسم</th>
                          <th className="p-2">الهاتف</th>
                          <th className="p-2">لجنة السلوك</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {importPreviewData.map((row, idx) => (
                          <tr key={idx}>
                            <td className="p-2 tabular-nums">{row.employeeNumber}</td>
                            <td className="p-2 font-bold">{row.fullName}</td>
                            <td className="p-2">{row.jobTitle}</td>
                            <td className="p-2">{row.department}</td>
                            <td className="p-2 tabular-nums">{row.phoneNumber || '—'}</td>
                            <td className="p-2 font-bold text-amber-600">
                              {row.isCommitteeMember ? 'نعم' : 'لا'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importPreviewData.length === 0 || isProcessingImport}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isProcessingImport
                    ? 'جارٍ استيراد السجلات...'
                    : `تأكيد استيراد (${importPreviewData.length}) موظف`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
