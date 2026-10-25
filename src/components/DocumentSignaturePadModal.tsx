import React, { useRef, useState, useEffect } from 'react';
import {
  PenTool,
  CheckCircle2,
  RotateCcw,
  X,
  ShieldCheck,
  UserCheck,
  Award,
  AlertCircle,
  FileSignature,
} from 'lucide-react';
import { DocumentSignature } from '../types';

interface DocumentSignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentNumber: string;
  studentName: string;
  defaultRole?: DocumentSignature['role'];
  defaultSignerName?: string;
  onConfirmSignature: (signature: DocumentSignature) => Promise<void> | void;
}

const ROLES_CONFIG: {
  role: DocumentSignature['role'];
  labelAr: string;
  badge: string;
  allowDigitalApproval: boolean;
}[] = [
  { role: 'teacher', labelAr: 'المعلم / الموظف محرر الواقعة', badge: 'الكادر التعليمي', allowDigitalApproval: true },
  { role: 'counselor', labelAr: 'المرشد الأكاديمي والمهني / الاجتماعي', badge: 'الإرشاد الطلابي', allowDigitalApproval: true },
  { role: 'principal', labelAr: 'مدير المدرسة / رئيس اللجنة', badge: 'الإدارة المدرسية', allowDigitalApproval: true },
  { role: 'parent', labelAr: 'ولي أمر الطالب / الطالبة', badge: 'ولي الأمر', allowDigitalApproval: false },
  { role: 'student', labelAr: 'الطالب / الطالبة بالعلم', badge: 'الطالب', allowDigitalApproval: false },
];

export const DocumentSignaturePadModal: React.FC<DocumentSignaturePadModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  documentNumber,
  studentName,
  defaultRole = 'teacher',
  defaultSignerName = '',
  onConfirmSignature,
}) => {
  const [selectedRole, setSelectedRole] = useState<DocumentSignature['role']>(defaultRole);
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signatureMode, setSignatureMode] = useState<'drawn' | 'digital_approval'>('drawn');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Canvas state for freehand signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedRole(defaultRole);
      setSignerName(defaultSignerName);
      setErrorMsg('');
      setHasDrawn(false);
      // If parent or student, force drawn mode
      if (defaultRole === 'parent' || defaultRole === 'student') {
        setSignatureMode('drawn');
      } else {
        setSignatureMode('drawn');
      }
      setTimeout(initCanvas, 50);
    }
  }, [isOpen, defaultRole, defaultSignerName]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset dimensions for high DPR
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // dark slate
    ctx.lineWidth = 2.5;

    // Clear background
    ctx.clearRect(0, 0, rect.width, rect.height);
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
    setErrorMsg('');
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const activeRoleConfig = ROLES_CONFIG.find((r) => r.role === selectedRole) || ROLES_CONFIG[0];

  const handleSaveSignature = async () => {
    if (!signerName.trim()) {
      setErrorMsg('يرجى إدخال اسم الموقع الثلاثي بالكامل');
      return;
    }

    let signatureDataUrl: string | undefined = undefined;

    if (signatureMode === 'drawn') {
      if (!hasDrawn) {
        setErrorMsg('يرجى رسم التوقيع داخل المساحة المخصصة قبل الحفظ');
        return;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        signatureDataUrl = canvas.toDataURL('image/png');
      }
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const now = new Date().toISOString();
      const verificationCode = `SIG-${selectedRole.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`;

      const newSignature: DocumentSignature = {
        role: selectedRole,
        roleTitleAr: activeRoleConfig.labelAr,
        signerName: signerName.trim(),
        signedAt: now,
        signatureType: signatureMode,
        signatureDataUrl,
        verificationBadge: verificationCode,
        isVerified: true,
      };

      await onConfirmSignature(newSignature);
      onClose();
    } catch (err: any) {
      console.error('Error saving signature:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ التوقيع الإلكتروني');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl">
              <FileSignature className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                التوقيع الإلكتروني والاعتماد الرسمي
              </h3>
              <p className="text-xs text-slate-300">
                {documentTitle} ({documentNumber}) · الطالب: {studentName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              صفة الموقّع على المستند:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES_CONFIG.map((r) => {
                const isSelected = selectedRole === r.role;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => {
                      setSelectedRole(r.role);
                      if (!r.allowDigitalApproval && signatureMode === 'digital_approval') {
                        setSignatureMode('drawn');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-800">{r.labelAr}</span>
                    <span className="text-[10px] text-slate-500 mt-1">{r.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Signer Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              الاسم الكامل للموقع:
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="اكتب الاسم الثلاثي أو الرباعي..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Signature Mode Toggle (If role allows digital approval) */}
          {activeRoleConfig.allowDigitalApproval && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                طريقة التوقيع:
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSignatureMode('drawn')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                    signatureMode === 'drawn'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>رسم يدوي (قلم / لمس)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode('digital_approval')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                    signatureMode === 'digital_approval'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>اعتماد إداري رسمي</span>
                </button>
              </div>
            </div>
          )}

          {/* Mode 1: Freehand Drawing Canvas */}
          {signatureMode === 'drawn' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                  <span>لوحة الرسم اليدوي والتوقيع:</span>
                </span>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>مسح وإعادة الرسم</span>
                </button>
              </div>

              <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/60 overflow-hidden hover:border-indigo-400 transition-colors">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 cursor-crosshair touch-none bg-white"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 gap-1.5">
                    <PenTool className="w-6 h-6 opacity-40 text-slate-400" />
                    <span className="text-xs">وقع هنا باستخدام إصبعك أو قلم الشاشة أو الفأرة</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                يتم حفظ التوقيع كصورة رقمية مشفرة ومقترنة بسجل المستند رسمياً.
              </p>
            </div>
          ) : (
            /* Mode 2: Digital Admin Approval */
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>الاعتماد الرقمي الموثق للإدارة المدرسية</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                بالضغط على «تأكيد الاعتماد»، سيتم توثيق موافقتكم الرسمية على هذا المستند مع تسجيل اسمك الثلاثي، صفتك الوظيفية، ورقم المعاملة وطابع زمني دقيق في سجل التدقيق السحابي.
              </p>
              <div className="pt-2 flex items-center gap-2 text-[11px] text-emerald-700 font-mono">
                <Award className="w-3.5 h-3.5" />
                <span>الختم الرقمي: معتمد رسمياً من نظام الرعاية والإرشاد المدرسي</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSaveSignature}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <span>جاري الحفظ...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ وتثبيت التوقيع</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
