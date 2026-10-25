import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, PenTool, ShieldCheck } from 'lucide-react';
import { getUaeFullDateTimeString } from '../utils/time';

interface SignatureCanvasProps {
  id: string;
  title: string;
  subtitle?: string;
  initialSignature?: string;
  onSave: (dataUrl: string, timestamp: string) => void;
  onClear?: () => void;
  isLocked?: boolean;
  signerType: 'طالب' | 'ولي أمر' | 'محرر البلاغ' | 'المرشد المدرسي' | 'المسؤول الإداري';
  counselorName?: string;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  id,
  title,
  subtitle,
  initialSignature,
  onSave,
  onClear,
  isLocked = false,
  signerType,
  counselorName = 'المرشد المدرسي',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(Boolean(initialSignature));
  const [signatureDate, setSignatureDate] = useState<string>('');
  const [attestationChecked, setAttestationChecked] = useState(true);

  // Set up canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set display resolution vs internal resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = 160 * 2;
    ctx.scale(2, 2);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0F284E'; // Navy ink color

    // Load initial signature if exists
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, rect.width, 160);
      };
      img.src = initialSignature;
      setHasSignature(true);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      setSignatureDate('');
    }
  }, [initialSignature]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isLocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isLocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const handleClear = () => {
    if (isLocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureDate('');
    if (onClear) onClear();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const dataUrl = canvas.toDataURL('image/png');
    const uaeStamp = getUaeFullDateTimeString();
    setSignatureDate(uaeStamp);
    onSave(dataUrl, uaeStamp);
  };

  return (
    <div id={`sig-container-${id}`} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center">
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>

        {signatureDate && (
          <span className="text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            تم الحفظ والتأكيد
          </span>
        )}
      </div>

      {/* Canvas Box */}
      <div className="relative border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-slate-50/70 touch-none">
        <canvas
          ref={canvasRef}
          id={`canvas-${id}`}
          className="w-full h-40 cursor-crosshair block"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs gap-1.5 select-none">
            <PenTool className="w-4 h-4 opacity-50" />
            <span>وقّع هنا باستخدام الماوس أو اللمس</span>
          </div>
        )}
      </div>

      {/* Attestation check */}
      {signerType === 'طالب' && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={attestationChecked}
              onChange={(e) => setAttestationChecked(e.target.checked)}
              className="rounded text-teal-700 focus:ring-teal-700"
            />
            <span className="font-medium text-slate-700">
              إقرار بأن التوقيع تم بحضور {counselorName}
            </span>
          </label>
        </div>
      )}

      {/* Timestamp note */}
      {signatureDate ? (
        <div className="mt-2 text-[11px] text-slate-500 bg-slate-100 p-2 rounded-md font-mono text-center">
          تاريخ وتوقيت التوقيع (توقيت الإمارات): {signatureDate}
        </div>
      ) : (
        <p className="mt-1 text-[11px] text-slate-400">
          * يُسجل التاريخ والوقت بتوقيت دولة الإمارات فور حفظ التوقيع.
        </p>
      )}

      {/* Actions */}
      {!isLocked && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            id={`btn-clear-${id}`}
            onClick={handleClear}
            disabled={!hasSignature}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            مسح التوقيع
          </button>
          <button
            type="button"
            id={`btn-save-${id}`}
            onClick={handleSave}
            disabled={!hasSignature}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" />
            حفظ التوقيع
          </button>
        </div>
      )}
    </div>
  );
};
