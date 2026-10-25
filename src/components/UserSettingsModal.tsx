import React, { useState } from 'react';
import {
  X,
  User,
  Shield,
  Phone,
  Mail,
  Briefcase,
  School,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  UserCog,
  Loader2,
  Save,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { AppUser, UserRole } from '../types';
import { updateUserProfileData } from '../firebase/firestoreService';
import { updateCurrentFirebaseUserProfile, sendResetPassword } from '../firebase/auth';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onUpdateCurrentUser: (updatedUser: AppUser) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigateToUsersManagement?: () => void;
}

// Preset avatars suitable for UAE school counselors & educators
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
];

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateCurrentUser,
  onShowToast,
  onNavigateToUsersManagement,
}) => {
  const { schoolSettings } = useSchoolSettings();
  // Determine if user has permission to edit their profile
  const canEdit = currentUser.role !== 'viewer' && currentUser.active !== false;

  // Form states
  const [fullName, setFullName] = useState(currentUser.fullName || currentUser.displayName || '');
  const [jobTitle, setJobTitle] = useState(currentUser.jobTitle || 'المرشد الأكاديمي والمهني');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Convert uploaded image to Data URL (optimized max size)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      onShowToast('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 2 ميجابايت', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPhotoURL(result);
        onShowToast('تم تحميل الصورة بنجاح، اضغط حفظ التعديلات لتثبيتها', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  // Save changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      onShowToast('لا تملك صلاحية تعديل البيانات الشخصية (حساب للمشاهدة فقط)', 'warning');
      return;
    }

    if (!fullName.trim()) {
      onShowToast('يرجى كتابة الاسم الكامل للمستخدم', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateUserProfileData(
        currentUser.uid,
        {
          fullName: fullName.trim(),
          jobTitle: jobTitle.trim(),
          phone: phone.trim(),
          photoURL: photoURL.trim(),
        },
        currentUser
      );

      // Sync with Firebase Auth
      await updateCurrentFirebaseUserProfile({
        displayName: fullName.trim(),
        photoURL: photoURL.trim() || undefined,
      });

      onUpdateCurrentUser(updated);
      onShowToast('تم تحديث إعدادات الملف الشخصي بنجاح', 'success');
      onClose();
    } catch (err: any) {
      console.error('Error updating user profile:', err);
      onShowToast(err?.message || 'تعذر حفظ تعديلات الملف الشخصي', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Password reset request
  const handleResetPassword = async () => {
    if (!currentUser.email) return;
    setIsSendingReset(true);
    try {
      await sendResetPassword(currentUser.email);
      onShowToast(`تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد: ${currentUser.email}`, 'success');
    } catch (err: any) {
      console.error('Reset password error:', err);
      onShowToast('تعذر إرسال رابط إعادة التعيين. يرجى المحاولة لاحقاً', 'error');
    } finally {
      setIsSendingReset(false);
    }
  };

  // Role badges helper
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'systemAdmin':
        return { label: 'مدير نظام', bg: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700' };
      case 'schoolAdmin':
        return { label: 'مدير مدرسة', bg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700' };
      case 'counselor':
        return { label: 'مرشد أكاديمي ومهني', bg: 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700' };
      case 'viewer':
      default:
        return { label: 'مشاهد (قراءة فقط)', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700' };
    }
  };

  const roleInfo = getRoleBadge(currentUser.role);
  const isAdmin = currentUser.role === 'systemAdmin' || currentUser.role === 'schoolAdmin';

  if (!isOpen) return null;

  return (
    <div
      id="user-settings-modal"
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-[#0f1a2a] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden text-right my-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#07172b] via-[#0C2340] to-[#0a1e36] text-white p-5 sm:p-6 border-b-2 border-[#D4AF37]/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006D77] flex items-center justify-center shadow-md border border-[#D4AF37]/40">
              <UserCog className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">إعدادات المستخدم والملف الشخصي</h2>
              <p className="text-xs text-slate-300">تحديث البيانات الشخصية وصورة الحساب وبيانات التواصل</p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-user-settings"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5">
          {/* Permission Notice if Viewer */}
          {!canEdit && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">حساب بصلاحية مشاهد فقط (عرض فقط)</p>
                <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                  لا تتوفر صلاحية لتعديل البيانات في هذا الحساب. يرجى التواصل مع مسؤول النظام أو إدارة المدرسة لتحديث بياناتك.
                </p>
              </div>
            </div>
          )}

          {/* User Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#0C2340] border-2 border-[#D4AF37] flex items-center justify-center shadow-md">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt={fullName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setPhotoURL('')}
                  />
                ) : (
                  <User className="w-10 h-10 text-[#D4AF37]" />
                )}
              </div>
              {canEdit && (
                <label
                  htmlFor="user-avatar-upload"
                  className="absolute -bottom-2 -left-2 bg-[#006D77] hover:bg-[#005a63] text-white p-1.5 rounded-xl shadow-md border border-white dark:border-slate-800 cursor-pointer transition-transform group-hover:scale-110"
                  title="رفع صورة جديدة"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    id="user-avatar-upload"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex-1 text-center sm:text-right space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {fullName || 'المستخدم'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${roleInfo.bg}`}>
                  {roleInfo.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono" dir="ltr">
                {currentUser.email}
              </p>

              {canEdit && (
                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="px-2.5 py-1 text-xs font-semibold text-[#006D77] dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg border border-teal-200 dark:border-teal-800/40 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>اختيار صورة جاهزة</span>
                  </button>
                  {photoURL && (
                    <button
                      type="button"
                      onClick={() => setPhotoURL('')}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800/40 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>إزالة الصورة</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Preset Avatar Selection Tray */}
          {showAvatarPicker && canEdit && (
            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-2">
                اختر صورة رمزية مناسبة للمرشد / المعلم:
              </span>
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPhotoURL(url);
                      setShowAvatarPicker(false);
                    }}
                    className={`shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      photoURL === url ? 'border-[#006D77] scale-105 shadow-md' : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Profile Form Fields */}
          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="user-fullname-input"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-[#006D77] dark:text-teal-400" />
                <span>الاسم الكامل للمستخدم:</span>
              </label>
              <input
                id="user-fullname-input"
                type="text"
                disabled={!canEdit}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="أدخل الاسم الثلاثي أو الرباعي الرسمي"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-[#006D77] focus:border-transparent outline-hidden transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                required
              />
            </div>

            {/* Job Title */}
            <div>
              <label
                htmlFor="user-jobtitle-input"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5"
              >
                <Briefcase className="w-3.5 h-3.5 text-[#006D77] dark:text-teal-400" />
                <span>المسمى الوظيفي:</span>
              </label>
              <input
                id="user-jobtitle-input"
                type="text"
                disabled={!canEdit}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="مثال: المرشد الأكاديمي والمهني / الأخصائي الاجتماعي"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-[#006D77] focus:border-transparent outline-hidden transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Contact Phone / WhatsApp */}
            <div>
              <label
                htmlFor="user-phone-input"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-[#006D77] dark:text-teal-400" />
                <span>رقم الهاتف / الواتساب للتواصل:</span>
              </label>
              <input
                id="user-phone-input"
                type="tel"
                disabled={!canEdit}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050 123 4567 أو +971 50 123 4567"
                dir="ltr"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium text-right focus:ring-2 focus:ring-[#006D77] focus:border-transparent outline-hidden transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                يُستخدم لتنسيق الاتصال الرسمي وتوقيع الإفادات والاستدعاءات الصادرة من المرشد
              </span>
            </div>

            {/* Official School & System Info (Read-only) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                  <School className="w-3.5 h-3.5 text-slate-400" />
                  المدرسة المعتمدة:
                </span>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {currentUser.schoolName || schoolSettings.schoolName}
                </p>
                <span className="text-[10px] text-slate-400 font-mono">
                  كود المدرسة: {currentUser.schoolId || '7001'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  نوع الصلاحية والنظام:
                </span>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {roleInfo.label}
                </p>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                  حساب نشط ومسجل بقاعدة البيانات
                </span>
              </div>
            </div>
          </div>

          {/* Additional Account Actions (Security & Admin Links) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              id="btn-user-reset-pwd"
              onClick={handleResetPassword}
              disabled={isSendingReset}
              className="text-xs text-[#006D77] dark:text-teal-400 hover:underline flex items-center gap-1 font-bold cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isSendingReset ? 'جاري إرسال الرابط...' : 'إرسال رابط إعادة تعيين كلمة المرور'}</span>
            </button>

            {isAdmin && onNavigateToUsersManagement && (
              <button
                type="button"
                id="btn-goto-users-management"
                onClick={() => {
                  onClose();
                  onNavigateToUsersManagement();
                }}
                className="text-xs font-bold text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <UserCog className="w-3.5 h-3.5" />
                <span>إدارة المستخدمين والصلاحيات &larr;</span>
              </button>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              id="btn-cancel-user-settings"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            {canEdit && (
              <button
                type="submit"
                id="btn-save-user-settings"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-[#006D77] hover:bg-[#005a63] text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ التعديلات</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
