import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  UserX,
  UserCheck,
  RotateCcw,
  Clock,
  ShieldCheck,
  Edit,
  ArrowRightLeft,
  Archive,
  AlertTriangle,
  Mail,
  School,
  Calendar,
  Lock,
} from 'lucide-react';
import { AppUser, UserRole, DetailedSchool, isSystemOwner } from '../../types';
import { sendResetPassword } from '../../firebase/auth';
import {
  createUserRecord,
  toggleUserActiveStatus,
  updateUserRole,
} from '../../firebase/firestoreService';
import {
  transferUserToSchool,
  archiveUserAccount,
  updateUserExtended,
} from '../../firebase/schoolsService';

interface ActiveUsersTabProps {
  users: AppUser[];
  currentUser: AppUser;
  schools: DetailedSchool[];
  isLoading: boolean;
  onRefresh: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

export const ActiveUsersTab: React.FC<ActiveUsersTabProps> = ({
  users,
  currentUser,
  schools,
  isLoading,
  onRefresh,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modals
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [transferUser, setTransferUser] = useState<AppUser | null>(null);
  const [archiveUser, setArchiveUser] = useState<AppUser | null>(null);

  // Form States
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('مرشد أكاديمي ومهني');
  const [newRole, setNewRole] = useState<UserRole>('counselor');
  const [newSchoolId, setNewSchoolId] = useState(currentUser.schoolId || '7001');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Form States
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('counselor');
  const [actionReason, setActionReason] = useState('');

  // Transfer Form
  const [targetSchoolId, setTargetSchoolId] = useState('');

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'system_owner':
        return {
          text: 'مدير النظام العام (system_owner)',
          color: 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700',
        };
      case 'systemAdmin':
        return {
          text: 'مدير النظام (systemAdmin)',
          color: 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border-purple-300 dark:border-purple-700',
        };
      case 'schoolAdmin':
        return {
          text: 'مدير مدرسة (schoolAdmin)',
          color: 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-700',
        };
      case 'counselor':
        return {
          text: 'مرشد (counselor)',
          color: 'bg-teal-100 dark:bg-teal-950/60 text-[#006D77] dark:text-teal-300 border-teal-300 dark:border-teal-700',
        };
      default:
        return {
          text: 'مشاهد (viewer)',
          color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
        };
    }
  };

  const openAddModal = () => {
    setNewFullName('');
    setNewEmail('');
    setNewPhone('');
    setNewJobTitle('مرشد أكاديمي ومهني');
    setNewRole('counselor');
    setNewSchoolId(currentUser.schoolId || '7001');
    setIsAddUserModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newEmail.trim()) {
      onShowToast('يرجى كتابة الاسم والبريد الإلكتروني', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await createUserRecord(
        {
          uid: generatedUid,
          email: newEmail.trim().toLowerCase(),
          fullName: newFullName.trim(),
          jobTitle: newJobTitle.trim(),
          role: newRole,
          schoolId: newSchoolId,
          active: true,
          phone: newPhone.trim() || undefined,
          createdBy: currentUser.fullName || currentUser.email,
        },
        currentUser
      );

      onShowToast(`تمت إضافة المستخدم (${newFullName}) بنجاح`, 'success');
      setIsAddUserModalOpen(false);
      onRefresh();
    } catch (err: any) {
      onShowToast(err.message || 'تعذر إضافة المستخدم', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (u: AppUser) => {
    setEditingUser(u);
    setEditFullName(u.fullName);
    setEditPhone(u.phone || '');
    setEditJobTitle(u.jobTitle || '');
    setEditRole(u.role);
    setActionReason('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);
    try {
      await updateUserExtended(
        editingUser,
        {
          fullName: editFullName.trim(),
          phone: editPhone.trim() || undefined,
          jobTitle: editJobTitle.trim(),
          role: editRole,
        },
        currentUser,
        actionReason.trim() || undefined
      );

      onShowToast(`تم تحديث بيانات المستخدم (${editFullName}) بنجاح`, 'success');
      setEditingUser(null);
      onRefresh();
    } catch (err: any) {
      onShowToast(err.message || 'تعذر تحديث بيانات المستخدم', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTransferModal = (u: AppUser) => {
    setTransferUser(u);
    setTargetSchoolId(schools[0]?.schoolNumber || schools[0]?.schoolId || '7002');
    setActionReason('');
  };

  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferUser || !targetSchoolId) return;

    setIsSubmitting(true);
    try {
      await transferUserToSchool(transferUser, targetSchoolId, currentUser, actionReason.trim());
      onShowToast(`تم نقل المستخدم إلى المدرسة المحددة بنجاح`, 'success');
      setTransferUser(null);
      onRefresh();
    } catch (err: any) {
      onShowToast(err.message || 'تعذر نقل المستخدم', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (targetUser: AppUser) => {
    if (targetUser.uid === currentUser.uid) {
      onShowToast('لا يمكنك تعطيل حسابك الشخصي الذي تستخدمه حالياً', 'warning');
      return;
    }

    try {
      await toggleUserActiveStatus(targetUser, !targetUser.active, currentUser);
      onShowToast(
        `تم ${!targetUser.active ? 'تفعيل' : 'إيقاف'} حساب المستخدم (${targetUser.fullName})`,
        'success'
      );
      onRefresh();
    } catch (err: any) {
      onShowToast(err.message || 'تعذر تغيير حالة الحساب', 'error');
    }
  };

  const handleSendReset = async (targetUser: AppUser) => {
    try {
      await sendResetPassword(targetUser.email);
      onShowToast(`تم إرسال رابط إعادة تعيين كلمة المرور إلى ${targetUser.email}`, 'info');
    } catch (err: any) {
      onShowToast(err.message || 'تعذر إرسال رابط إعادة التعيين', 'error');
    }
  };

  const handlePromoteToSchoolAdmin = async (targetUser: AppUser) => {
    try {
      await updateUserRole(targetUser, 'schoolAdmin', currentUser);
      onShowToast(`تم ترقية (${targetUser.fullName}) إلى مدير مدرسة بنجاح`, 'success');
      onRefresh();
    } catch (err: any) {
      onShowToast(err.message || 'تعذر تعديل الصلاحية', 'error');
    }
  };

  const openArchiveModal = (u: AppUser) => {
    if (u.uid === currentUser.uid) {
      onShowToast('لا يمكنك أرشفة حسابك الشخصي النشط', 'warning');
      return;
    }
    setArchiveUser(u);
    setActionReason('');
  };

  const handleConfirmArchive = async () => {
    if (!archiveUser) return;
    if (!actionReason.trim()) {
      onShowToast('يرجى تحديد سبب الأرشفة لحماية البيانات', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await archiveUserAccount(archiveUser, currentUser, actionReason.trim());
      onShowToast(`تمت أرشفة حساب المستخدم (${archiveUser.fullName}) بنجاح`, 'info');
      setArchiveUser(null);
      onRefresh();
    } catch (err: any) {
      onShowToast(err.message || 'تعذر أرشفة الحساب', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (u.archived) return false;
    if (schoolFilter !== 'all' && u.schoolId !== schoolFilter) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;

    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      (u.jobTitle && u.jobTitle.toLowerCase().includes(q)) ||
      (u.schoolId && u.schoolId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#006D77]" />
            <span>المستخدمون النشطون في النظام</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-[#006D77] dark:text-teal-400 border border-teal-200 dark:border-teal-800">
              {filteredUsers.length} مستخدم
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة الحسابات النشطة، الصلاحيات، النقل بين المدارس، وإعادة تعيين كلمات المرور
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={openAddModal}
            className="flex-1 sm:flex-none px-4 py-2 bg-[#006D77] hover:bg-[#005a63] text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مستخدم جديد</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="تحديث البيانات"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#006D77]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم، البريد، أو المسمى الوظيفي..."
            className="w-full pr-9 pl-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#006D77]"
          />
        </div>

        {schools.length > 0 && (
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white w-full sm:w-auto"
          >
            <option value="all">كل المدارس</option>
            {schools.map((s) => (
              <option key={s.schoolId} value={s.schoolNumber || s.schoolId}>
                {s.schoolNameArabic} (#{s.schoolNumber})
              </option>
            ))}
          </select>
        )}

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white w-full sm:w-auto"
        >
          <option value="all">كل الصلاحيات</option>
          <option value="schoolAdmin">مدير مدرسة</option>
          <option value="counselor">مرشد</option>
          <option value="viewer">مشاهد</option>
          <option value="system_owner">مدير النظام العام</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                <th className="py-3 px-4">المستخدم</th>
                <th className="py-3 px-4">البريد الإلكتروني والتواصل</th>
                <th className="py-3 px-3">المسمى الوظيفي</th>
                <th className="py-3 px-3">الدور / الصلاحية</th>
                <th className="py-3 px-3">المدرسة</th>
                <th className="py-3 px-3">حالة الحساب</th>
                <th className="py-3 px-3">تاريخ الإنشاء</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Clock className="w-6 h-6 animate-spin mx-auto text-[#006D77] mb-2" />
                    <span>جاري تحميل بيانات المستخدمين...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    لا يوجد مستخدمون يطابقون شروط البحث
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleBadge = getRoleBadge(user.role);
                  return (
                    <tr
                      key={user.uid}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt=""
                              className="w-8 h-8 rounded-full border border-teal-500 object-cover shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0">
                              {user.fullName?.charAt(0) || 'م'}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {user.fullName}
                            </span>
                            {user.uid === currentUser.uid && (
                              <span className="text-[10px] text-teal-600 font-bold">
                                (حسابك الحالي)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email & Phone */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-slate-600 dark:text-slate-300 block" dir="ltr">
                          {user.email}
                        </span>
                        {user.phone && (
                          <span className="font-mono text-[11px] text-slate-400 block mt-0.5" dir="ltr">
                            {user.phone}
                          </span>
                        )}
                      </td>

                      {/* Job Title */}
                      <td className="py-3.5 px-3 font-medium">
                        {user.jobTitle || 'مرشد مدرسي'}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${roleBadge.color}`}>
                          {roleBadge.text}
                        </span>
                      </td>

                      {/* School */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          #{user.schoolId || '7001'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            user.active
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          />
                          <span>{user.active ? 'نشط' : 'معطل'}</span>
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400" dir="ltr">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-EG') : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                            title="تعديل البيانات والصلاحيات"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Transfer School */}
                          {isSystemOwner(currentUser.role) && schools.length > 1 && (
                            <button
                              type="button"
                              onClick={() => openTransferModal(user)}
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg transition-colors cursor-pointer"
                              title="نقل المستخدم لمدرسة أخرى"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}

                          {/* Toggle Active */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(user)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              user.active
                                ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                            title={user.active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                          >
                            {user.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => handleSendReset(user)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors cursor-pointer"
                            title="إرسال رابط إعادة تعيين كلمة المرور"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Promote to School Admin if counselor */}
                          {user.role === 'counselor' && (
                            <button
                              type="button"
                              onClick={() => handlePromoteToSchoolAdmin(user)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                              title="ترقية إلى مدير مدرسة"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}

                          {/* Archive (strictly NO direct hard delete) */}
                          <button
                            type="button"
                            onClick={() => openArchiveModal(user)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="أرشفة الحساب مع حفظ البيانات"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#006D77]" />
                  <span>إضافة مستخدم جديد للنظام</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  إنشاء حساب جديد وتعيين الصلاحيات والمدرسة التابع لها
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم الكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="مثال: د. أحمد المنصوري"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    البريد الإلكتروني <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@school.ae"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
                    dir="ltr"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+971500000000"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المسمى الوظيفي
                  </label>
                  <input
                    type="text"
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الدور / الصلاحية <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    <option value="counselor">مرشد (أكاديمي / مهني)</option>
                    <option value="schoolAdmin">مدير مدرسة</option>
                    <option value="viewer">مشاهد (تقارير فقط)</option>
                    {isSystemOwner(currentUser.role) && (
                      <option value="system_owner">مدير النظام العام</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المدرسة التابع لها <span className="text-rose-500">*</span>
                </label>
                {schools.length > 0 ? (
                  <select
                    value={newSchoolId}
                    onChange={(e) => setNewSchoolId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    {schools.map((s) => (
                      <option key={s.schoolId} value={s.schoolNumber || s.schoolId}>
                        {s.schoolNameArabic} (#{s.schoolNumber})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newSchoolId}
                    onChange={(e) => setNewSchoolId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#006D77] hover:bg-[#005a63] rounded-xl transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting ? <RotateCcw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>إنشاء المستخدم</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit className="w-4 h-4 text-blue-600" />
                  <span>تعديل بيانات وصلاحية المستخدم</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingUser.email}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم الكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المسمى الوظيفي
                  </label>
                  <input
                    type="text"
                    value={editJobTitle}
                    onChange={(e) => setEditJobTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الدور / الصلاحية
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="counselor">مرشد (أكاديمي / مهني)</option>
                  <option value="schoolAdmin">مدير مدرسة</option>
                  <option value="viewer">مشاهد (تقارير فقط)</option>
                  {isSystemOwner(currentUser.role) && (
                    <option value="system_owner">مدير النظام العام</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سبب التعديل (لتوثيقه بسجل التدقيق)
                </label>
                <input
                  type="text"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="مثال: ترقية إدارية..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER USER SCHOOL MODAL */}
      {transferUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-[#006D77]" />
                  <span>نقل المستخدم إلى مدرسة أخرى</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {transferUser.fullName} (المدرسة الحالية: #{transferUser.schoolId})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTransferUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmTransfer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اختيار المدرسة الجديدة <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetSchoolId}
                  onChange={(e) => setTargetSchoolId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  required
                >
                  {schools.map((s) => (
                    <option key={s.schoolId} value={s.schoolNumber || s.schoolId}>
                      {s.schoolNameArabic} (#{s.schoolNumber}) - {s.emirate}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سبب النقل (لتوثيقه بسجل التدقيق)
                </label>
                <input
                  type="text"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="مثال: نقل وظيفي رسمي..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setTransferUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#006D77] hover:bg-[#005a63] rounded-xl transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting ? <RotateCcw className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                  <span>تأكيد النقل</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARCHIVE USER MODAL (STRICTLY NO DIRECT HARD DELETE) */}
      {archiveUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/60 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  أرشفة حساب مستخدم
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {archiveUser.fullName} ({archiveUser.email})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              وفقاً لقواعد النظام، لا يُسمح بالحذف النهائي المباشر لحماية السجلات المرتبطة بالغياب والتعهدات والتقارير الأكاديمية. سيتم إيقاف الحساب ونقله إلى الأرشيف بأمان.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                سبب الأرشفة <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="يرجى توضيح سبب أرشفة الحساب..."
                rows={2}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setArchiveUser(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                <span>تأكيد الأرشفة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
