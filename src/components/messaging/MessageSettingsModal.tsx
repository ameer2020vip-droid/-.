import React, { useState } from 'react';
import {
  X,
  Settings as SettingsIcon,
  Save,
  Building,
  Phone,
  Mail,
  User,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { SchoolMessageSettings } from '../../types';

interface MessageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SchoolMessageSettings;
  onSave: (updated: SchoolMessageSettings) => Promise<void>;
  isAdmin?: boolean;
}

export const MessageSettingsModal: React.FC<MessageSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  isAdmin = false,
}) => {
  const [formData, setFormData] = useState<SchoolMessageSettings>({ ...settings });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#006D77]/10 text-[#006D77] flex items-center justify-center">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                إعدادات هوية وترويسة الرسائل المدرسية
              </h3>
              <p className="text-[11px] text-slate-500">
                تطبق هذه الإعدادات تلقائياً على كافة الترويسات والرسائل الصادرة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-[#006D77]" />
              <span>هوية المدرسة</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  اسم المدرسة (بالعربية)
                </label>
                <input
                  type="text"
                  required
                  value={formData.schoolNameAr}
                  onChange={(e) => setFormData({ ...formData, schoolNameAr: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-[#006D77]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  اسم المدرسة (بالإنجليزية)
                </label>
                <input
                  type="text"
                  required
                  value={formData.schoolNameEn}
                  onChange={(e) => setFormData({ ...formData, schoolNameEn: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-[#006D77]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">الإمارة</label>
                <input
                  type="text"
                  value={formData.emirate}
                  onChange={(e) => setFormData({ ...formData, emirate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-[#006D77]"
                  placeholder="الشارقة"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">العام الدراسي</label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-[#006D77]"
                  placeholder="2026–2027"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">الفصل الدراسي</label>
                <input
                  type="text"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-[#006D77]"
                  placeholder="الفصل الدراسي الأول"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#006D77]" />
              <span>المرسل والتوقيع الافتراضي</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">اسم المرسل الافتراضي</label>
                <input
                  type="text"
                  value={formData.defaultSenderName}
                  onChange={(e) => setFormData({ ...formData, defaultSenderName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-[#006D77]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">المسمى الوظيفي</label>
                <input
                  type="text"
                  value={formData.defaultSenderRole}
                  onChange={(e) => setFormData({ ...formData, defaultSenderRole: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-[#006D77]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-[#006D77]" />
              <span>بيانات الاتصال بالمدرسة</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">رقم الهاتف الرسمي</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-[#006D77]"
                  placeholder="06-5000000"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-[#006D77]"
                  placeholder="school@moe.gov.ae"
                />
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-2 -mx-5 -mb-5 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#006D77] hover:bg-[#00555d] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
