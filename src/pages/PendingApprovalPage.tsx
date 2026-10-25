import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  RotateCw,
  School,
  User,
  Mail,
  Calendar,
  ShieldAlert,
  FileEdit,
  Building2,
  Sparkles,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { RegistrationRequest } from '../types';
import { checkUserRegistrationStatus, logoutUser } from '../firebase/auth';

interface PendingApprovalPageProps {
  fbUser: FirebaseUser;
  request: RegistrationRequest;
  onRefreshStatus: () => Promise<void>;
  onEditRequest: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

export const PendingApprovalPage: React.FC<PendingApprovalPageProps> = ({
  fbUser,
  request,
  onRefreshStatus,
  onEditRequest,
  onShowToast,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshStatus();
      onShowToast('تم تحديث حالة الطلب من الخادم', 'info');
    } catch (err) {
      console.error('Refresh error:', err);
      onShowToast('حدث خطأ أثناء فحص حالة الطلب', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const isRejected = request.status === 'rejected';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0b1320] text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white dark:bg-[#111c2e] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-[#006D77] dark:text-teal-400 shrink-0">
              <School className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300">
                نظام المرشد المدرسي الذكي
              </span>
              <h1 className="text-base sm:text-lg font-black text-[#0C2340] dark:text-white">
                بوابة متابعة طلبات الاعتماد
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => logoutUser()}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>

        {/* Main Status Hero Card */}
        <div
          className={`rounded-2xl p-6 sm:p-8 shadow-md border-2 ${
            isRejected
              ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-400 dark:border-rose-800'
              : 'bg-[#0C2340] text-white border-[#D4AF37]'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            {isRejected ? (
              <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-300">
                <ShieldAlert className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37] relative">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
            )}

            <div>
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black mb-2 ${
                  isRejected
                    ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-200'
                    : 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isRejected ? 'طلب مرفوض' : 'بانتظار الاعتماد والمراجعة'}</span>
              </div>

              <h2
                className={`text-xl sm:text-2xl font-black ${
                  isRejected ? 'text-rose-900 dark:text-rose-100' : 'text-white'
                }`}
              >
                {isRejected
                  ? 'تم رفض طلب إنشاء الحساب'
                  : 'طلبك قيد المراجعة والاعتماد'}
              </h2>

              <p
                className={`text-xs sm:text-sm mt-2 max-w-lg leading-relaxed ${
                  isRejected
                    ? 'text-rose-700 dark:text-rose-300'
                    : 'text-slate-200 font-medium'
                }`}
              >
                {isRejected
                  ? 'يمكنك الاطلاع على ملاحظات الإدارة أدناه ثم تعديل البيانات وإعادة تقديم الطلب مجدداً.'
                  : 'تم إرسال طلب إنشاء الحساب بنجاح، وسيتم إشعارك بعد مراجعته واعتماده من مسؤول النظام.'}
              </p>
            </div>

            {/* Rejection Reason Notice if rejected */}
            {isRejected && request.rejectionReason && (
              <div className="w-full bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-300 dark:border-rose-700 text-right space-y-1">
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block">
                  سبب الرفض المسجل من قبل الإدارة:
                </span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {request.rejectionReason}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Submitted Request Details Card */}
        <div className="bg-white dark:bg-[#111c2e] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-[#006D77]" />
              <span>تفاصيل الطلب المقدم</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">
              #{request.uid.substring(0, 8)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <span className="text-[11px] text-slate-400 block mb-0.5">الاسم الكامل:</span>
              <span className="font-bold text-slate-800 dark:text-white">
                {request.fullNameArabic}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <span className="text-[11px] text-slate-400 block mb-0.5">المسمى الوظيفي المطلوب:</span>
              <span className="font-bold text-[#006D77] dark:text-teal-400">
                {request.jobTitleArabic}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <span className="text-[11px] text-slate-400 block mb-0.5">رقم واسم المدرسة:</span>
              <span className="font-bold text-slate-800 dark:text-white">
                #{request.schoolNumber} • {request.schoolNameArabic}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <span className="text-[11px] text-slate-400 block mb-0.5">الإمارة ونوع المدرسة:</span>
              <span className="font-bold text-slate-800 dark:text-white">
                {request.emirate} •{' '}
                {request.schoolGender === 'boys'
                  ? 'بنين'
                  : request.schoolGender === 'girls'
                  ? 'بنات'
                  : 'مشتركة'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <span className="text-[11px] text-slate-400 block mb-0.5">البريد الإلكتروني المعتمد:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                {request.email}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <span className="text-[11px] text-slate-400 block mb-0.5">تاريخ تقديم الطلب:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {new Date(request.createdAt).toLocaleString('ar-AE')}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
            {isRejected ? (
              <button
                type="button"
                onClick={onEditRequest}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#006D77] hover:bg-[#005a63] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <FileEdit className="w-4 h-4" />
                <span>تعديل البيانات وإعادة التقديم</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#006D77] hover:bg-[#005a63] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>فحص وتحديث حالة الاعتماد</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => logoutUser()}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              تسجيل الخروج والعودة لاحقاً
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
