import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  School,
  Building2,
  History,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  Lock,
} from 'lucide-react';
import {
  AppUser,
  AuditLogRecord,
  RegistrationRequest,
  Student,
  DetailedSchool,
  isSystemOwner,
} from '../types';
import {
  fetchUsersList,
  fetchAuditLogs,
} from '../firebase/firestoreService';
import {
  fetchAllRegistrationRequests,
} from '../firebase/registrationService';
import {
  fetchSchoolsList,
} from '../firebase/schoolsService';

import { ActiveUsersTab } from '../components/schools/ActiveUsersTab';
import { UserRegistrationRequestsTab } from '../components/schools/UserRegistrationRequestsTab';
import { SchoolRequestsTab } from '../components/schools/SchoolRequestsTab';
import { RegisteredSchoolsTab } from '../components/schools/RegisteredSchoolsTab';
import { AuditLogTab } from '../components/schools/AuditLogTab';

interface UsersManagementPageProps {
  currentUser: AppUser;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  students?: Student[];
  onDeleteImportBatch?: (batchId: string) => Promise<boolean | void>;
  onImpersonateSchool?: (school: DetailedSchool) => void;
}

export type ManagementTab =
  | 'active_users'
  | 'user_requests'
  | 'school_requests'
  | 'registered_schools'
  | 'audit_log';

export const UsersManagementPage: React.FC<UsersManagementPageProps> = ({
  currentUser,
  onShowToast,
  students = [],
  onDeleteImportBatch,
  onImpersonateSchool,
}) => {
  const [activeTab, setActiveTab] = useState<ManagementTab>('active_users');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [schools, setSchools] = useState<DetailedSchool[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [pendingUserRequestsCount, setPendingUserRequestsCount] = useState(0);
  const [pendingSchoolRequestsCount, setPendingSchoolRequestsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const isUserSystemOwner = isSystemOwner(currentUser.role);

  // Extract distinct import batches from students list
  const importBatches = useMemo(() => {
    if (!students || students.length === 0) return [];
    const map = new Map<string, { batchId: string; date?: string; students: Student[] }>();
    students.forEach((st) => {
      const bId = st.importBatchId;
      if (!bId) return;
      if (!map.has(bId)) {
        map.set(bId, {
          batchId: bId,
          date: st.importBatchDate,
          students: [],
        });
      }
      map.get(bId)!.students.push(st);
    });
    return Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [students]);

  // Load all foundational data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [uList, aList, reqsList, schoolsList] = await Promise.all([
        fetchUsersList(isUserSystemOwner ? undefined : currentUser.schoolId),
        fetchAuditLogs(currentUser.schoolId || '7001'),
        fetchAllRegistrationRequests(isUserSystemOwner ? undefined : currentUser.schoolId),
        isUserSystemOwner ? fetchSchoolsList(currentUser, 'all') : Promise.resolve([]),
      ]);

      setUsers(uList);
      setAuditLogs(aList);
      setSchools(schoolsList);

      // Counts
      const pendingUsers = reqsList.filter((r) => r.status === 'pending').length;
      setPendingUserRequestsCount(pendingUsers);

      const pendingSchools = schoolsList.filter((s) => s.status === 'pending').length;
      setPendingSchoolRequestsCount(pendingSchools);
    } catch (err: any) {
      console.error('Error loading management data:', err);
      onShowToast('حدث خطأ أثناء تحميل بيانات الإدارة', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.schoolId, currentUser.role]);

  // Handle attempt to access school tabs without system_owner permission
  const handleSelectTab = (tab: ManagementTab) => {
    if ((tab === 'school_requests' || tab === 'registered_schools') && !isUserSystemOwner) {
      onShowToast('غير مصرح لك بالوصول إلى قسم إدارة المدارس. يتطلب صلاحية system_owner.', 'error');
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-[#121e31] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#006D77] dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800 w-fit mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>بوابة الإدارة والصلاحيات المتقدمة (RBAC)</span>
            {isUserSystemOwner && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-black">
                صلاحية المالك system_owner
              </span>
            )}
          </div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            إدارة المستخدمين والمدارس وسجل التدقيق
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            التحكم المركزي في حسابات الكوادر المدرسية، اعتماد المدارس، وإدارة السجلات الإدارية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title="تحديث البيانات"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#006D77]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 border border-slate-200 dark:border-slate-700">
        {/* Tab 1: Active Users */}
        <button
          type="button"
          onClick={() => handleSelectTab('active_users')}
          className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'active_users'
              ? 'bg-white dark:bg-[#006D77] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>المستخدمون النشطون</span>
          <span className="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-[10px] font-bold">
            {users.length}
          </span>
        </button>

        {/* Tab 2: User Registration Requests */}
        <button
          type="button"
          onClick={() => handleSelectTab('user_requests')}
          className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'user_requests'
              ? 'bg-white dark:bg-[#006D77] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>طلبات تسجيل المستخدمين</span>
          {pendingUserRequestsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
              {pendingUserRequestsCount}
            </span>
          )}
        </button>

        {/* Tab 3: School Registration Requests (Strictly system_owner) */}
        {isUserSystemOwner && (
          <button
            type="button"
            onClick={() => handleSelectTab('school_requests')}
            className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'school_requests'
                ? 'bg-white dark:bg-[#006D77] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4 text-[#D4AF37]" />
            <span>طلبات إضافة المدارس</span>
            {pendingSchoolRequestsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                {pendingSchoolRequestsCount}
              </span>
            )}
          </button>
        )}

        {/* Tab 4: Registered Schools (Strictly system_owner) */}
        {isUserSystemOwner && (
          <button
            type="button"
            onClick={() => handleSelectTab('registered_schools')}
            className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'registered_schools'
                ? 'bg-white dark:bg-[#006D77] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <School className="w-4 h-4 text-emerald-500" />
            <span>المدارس المسجلة</span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-[10px] font-bold">
              {schools.filter((s) => s.status !== 'pending').length}
            </span>
          </button>
        )}

        {/* Tab 5: Audit Log */}
        <button
          type="button"
          onClick={() => handleSelectTab('audit_log')}
          className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'audit_log'
              ? 'bg-white dark:bg-[#006D77] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="w-4 h-4 text-amber-500" />
          <span>سجل التدقيق</span>
          <span className="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-[10px] font-bold">
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT RENDERING */}

      {/* 1. Active Users Tab */}
      {activeTab === 'active_users' && (
        <ActiveUsersTab
          users={users}
          currentUser={currentUser}
          schools={schools}
          isLoading={isLoading}
          onRefresh={loadData}
          onShowToast={onShowToast}
        />
      )}

      {/* 2. User Registration Requests Tab */}
      {activeTab === 'user_requests' && (
        <UserRegistrationRequestsTab
          currentUser={currentUser}
          onShowToast={onShowToast}
          onRefreshStats={loadData}
        />
      )}

      {/* 3. School Registration Requests Tab */}
      {activeTab === 'school_requests' && (
        isUserSystemOwner ? (
          <SchoolRequestsTab
            currentUser={currentUser}
            onShowToast={onShowToast}
            onRefreshStats={loadData}
          />
        ) : (
          <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-rose-200 dark:border-rose-900/50 space-y-3">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              غير مصرح بالوصول إلى قسم إدارة المدارس
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              هذا القسم مخصص حصرياً لمدير النظام العام (system_owner). تم تفعيل قواعد الأمان والعزل التام في قواعد بيانات Firebase لحماية بيانات المؤسسات التعليمية.
            </p>
          </div>
        )
      )}

      {/* 4. Registered Schools Tab */}
      {activeTab === 'registered_schools' && (
        isUserSystemOwner ? (
          <RegisteredSchoolsTab
            currentUser={currentUser}
            onShowToast={onShowToast}
            onImpersonateSchool={onImpersonateSchool}
            onRefreshStats={loadData}
          />
        ) : (
          <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-rose-200 dark:border-rose-900/50 space-y-3">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              غير مصرح بالوصول إلى بيانات المدارس المسجلة
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              وفقاً لقواعد النظام وسياسة العزل التام بين المدارس، يقتصر استعراض وتعديل بيانات المدارس على صلاحية (system_owner).
            </p>
          </div>
        )
      )}

      {/* 5. Audit Log Tab */}
      {activeTab === 'audit_log' && (
        <AuditLogTab
          auditLogs={auditLogs}
          currentUser={currentUser}
          importBatches={importBatches}
          onDeleteImportBatch={onDeleteImportBatch}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
