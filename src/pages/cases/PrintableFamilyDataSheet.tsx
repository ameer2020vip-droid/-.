import React from 'react';
import { StudentCaseRecord, StudentCaseFormRecord } from '../../types';
import { PrintPreviewModalWrapper } from '../../components/PrintPreviewModalWrapper';
import { useSchoolSettings } from '../../context/SchoolSettingsContext';

interface PrintableFamilyDataSheetProps {
  caseRecord: StudentCaseRecord;
  formRecord: StudentCaseFormRecord;
  schoolName?: string;
  academicYear?: string;
  onClose?: () => void;
}

export const PrintableFamilyDataSheet: React.FC<PrintableFamilyDataSheetProps> = ({
  caseRecord,
  formRecord,
  schoolName: propSchoolName,
  academicYear: propAcademicYear,
  onClose = () => {},
}) => {
  const { schoolSettings } = useSchoolSettings();
  const schoolName = propSchoolName || schoolSettings.schoolName;
  const academicYear = propAcademicYear || schoolSettings.academicYear;
  const data = formRecord.data;

  return (
    <PrintPreviewModalWrapper
      isOpen={true}
      onClose={onClose}
      title="معاينة استمارة بيانات الطالب والأسرة للطباعة"
      subtitle={`الطالب: ${caseRecord.studentName} • ملف الحالة #${caseRecord.caseNumber}`}
      printButtonId="btn-print-family-data"
      printButtonText="طباعة الاستمارة (A4) / حفظ PDF"
      defaultZoom={80}
    >
      {/* Printable Sheet Container */}
      <div id="printable-official-form" className="p-8 max-w-4xl mx-auto bg-white text-slate-950">
        {/* Official Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-5">
          <div className="flex justify-between items-start text-xs text-slate-800">
            <div className="text-right space-y-1">
              <p className="font-bold text-sm">دولة الإمارات العربية المتحدة</p>
              <p className="font-medium">مؤسسة الإمارات للتعليم المدرسي</p>
              <p className="font-bold text-teal-900">{schoolName}</p>
              <p>وحدة الإرشاد الطلابي ورعاية المتعلمين</p>
            </div>
            <div className="text-center">
              <div className="inline-block p-2 border border-slate-300 rounded mb-1 bg-slate-50">
                <span className="text-base font-black text-slate-900 tracking-wider">ملف حالة الطالب</span>
              </div>
              <p className="text-[11px] text-slate-600">العام الدراسي: {academicYear}</p>
            </div>
            <div className="text-left text-[11px] space-y-1 text-slate-700 font-mono">
              <p><span className="font-sans font-bold">رقم الحالة:</span> {caseRecord.caseNumber}</p>
              <p><span className="font-sans font-bold">تاريخ الفتح:</span> {caseRecord.openedAt || '-'}</p>
              <p><span className="font-sans font-bold">مستوى السرية:</span> {caseRecord.confidentialityLevel}</p>
              <p><span className="font-sans font-bold">حالة الاستمارة:</span> {formRecord.formStatus}</p>
            </div>
          </div>

          <div className="text-center mt-3">
            <h1 className="text-lg font-black text-slate-900 underline underline-offset-4">
              استمارة بيانات الطالب والأسرة الموحدة
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              تصنيف الحالة: <span className="font-bold text-slate-900">{caseRecord.caseType}</span> • مصدر الإحالة: <span className="font-bold text-slate-900">{caseRecord.referralSource}</span>
            </p>
          </div>
        </div>

        {/* Section 1: بيانات الطالب الأساسية */}
        <div className="mb-4">
          <div className="bg-slate-100 border border-slate-300 px-3 py-1 font-bold text-xs text-slate-900 flex justify-between">
            <span>أولاً: بيانات الطالب الأساسية</span>
            <span className="font-normal text-[11px] text-slate-600">الرقم الطلابي: {data.studentNumber || '-'}</span>
          </div>
          <table className="w-full text-xs border-collapse border border-slate-300 mt-1">
            <tbody>
              <tr>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold w-28">اسم الطالب الرباعي:</td>
                <td className="border border-slate-300 p-1.5 font-bold" colSpan={3}>{data.studentName || '-'}</td>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold w-20">الصف/الشعبة:</td>
                <td className="border border-slate-300 p-1.5">{data.grade} / {data.section}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold">رقم الهوية:</td>
                <td className="border border-slate-300 p-1.5 font-mono">{data.nationalId || '-'}</td>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold w-20">الجنسية:</td>
                <td className="border border-slate-300 p-1.5">{data.nationality || '-'}</td>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold">تاريخ الميلاد:</td>
                <td className="border border-slate-300 p-1.5">{data.birthDate || '-'}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold">هاتف الطالب:</td>
                <td className="border border-slate-300 p-1.5 font-mono">{data.studentPhone || 'غير متوفر'}</td>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold">البريد الإلكتروني:</td>
                <td className="border border-slate-300 p-1.5" colSpan={3}>{data.studentEmail || 'غير متوفر'}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold">أصحاب الهمم:</td>
                <td className="border border-slate-300 p-1.5">
                  {data.isDeterminedPerson ? `نعم (${data.determinedCategory || 'محدد'})` : 'لا'}
                </td>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold">إخوة في المدرسة:</td>
                <td className="border border-slate-300 p-1.5" colSpan={3}>
                  {data.hasSiblingsInSchool ? data.siblingsInfo || 'نعم' : 'لا يوجد'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: البيانات الصحية */}
        <div className="mb-4">
          <div className="bg-slate-100 border border-slate-300 px-3 py-1 font-bold text-xs text-slate-900">
            ثانياً: البيانات الصحية
          </div>
          <table className="w-full text-xs border-collapse border border-slate-300 mt-1">
            <tbody>
              <tr>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold w-36">يعاني من مشكلة صحية:</td>
                <td className="border border-slate-300 p-1.5">
                  {data.hasHealthIssue
                    ? `نعم (${data.healthIssueTypes?.join('، ') || ''}${data.healthIssueOther ? ' - ' + data.healthIssueOther : ''})`
                    : 'لا يعاني من أمراض مزمنة معروفة'}
                </td>
              </tr>
              {data.hasHealthIssue && (
                <tr>
                  <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold">وصف الحالة الصحية:</td>
                  <td className="border border-slate-300 p-1.5">{data.healthDescription || 'لا توجد تفاصيل إضافية'}</td>
                </tr>
              )}
              <tr>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold">استخدام أجهزة مساعدة:</td>
                <td className="border border-slate-300 p-1.5">
                  {data.usesMedicalDevices ? `نعم (${data.medicalDeviceType || 'محدد'})` : 'لا يستخدم'}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold">مرض مزمن في الأسرة:</td>
                <td className="border border-slate-300 p-1.5">
                  {data.familyHasChronicIllness ? `نعم (${data.familyIllnessDetails || 'محدد'})` : 'لا يوجد'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3: الأنشطة والمواهب */}
        <div className="mb-4">
          <div className="bg-slate-100 border border-slate-300 px-3 py-1 font-bold text-xs text-slate-900">
            ثالثاً: الأنشطة، المواهب ووسيلة النقل
          </div>
          <table className="w-full text-xs border-collapse border border-slate-300 mt-1">
            <tbody>
              <tr>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold w-36">الأنشطة الخارجية:</td>
                <td className="border border-slate-300 p-1.5">
                  {data.externalActivities && data.externalActivities.length > 0
                    ? `${data.externalActivities.join('، ')}${data.externalActivitiesOther ? ' (' + data.externalActivitiesOther + ')' : ''}`
                    : 'لا يشارك حالياً في أنشطة خارجية مسجلة'}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold">الهوايات والمواهب:</td>
                <td className="border border-slate-300 p-1.5">
                  الهوايات: <span className="font-semibold">{data.hobbies || '-'}</span> • المواهب: <span className="font-semibold">{data.talents || '-'}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold">وسيلة الوصول للمدرسة:</td>
                <td className="border border-slate-300 p-1.5">
                  {data.transportationMethod || 'الحافلة المدرسية'} {data.transportationOther ? `(${data.transportationOther})` : ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 4: ولي الأمر وأشخاص التواصل */}
        <div className="mb-4">
          <div className="bg-slate-100 border border-slate-300 px-3 py-1 font-bold text-xs text-slate-900">
            رابعاً: بيانات ولي الأمر وأشخاص التواصل
          </div>
          <table className="w-full text-xs border-collapse border border-slate-300 mt-1">
            <thead>
              <tr className="bg-slate-50 font-semibold text-center">
                <th className="border border-slate-300 p-1">الاسم</th>
                <th className="border border-slate-300 p-1 w-20">صلة القرابة</th>
                <th className="border border-slate-300 p-1 w-24">الهاتف</th>
                <th className="border border-slate-300 p-1 w-24">واتساب</th>
                <th className="border border-slate-300 p-1">الوظيفة وجهة العمل</th>
                <th className="border border-slate-300 p-1 w-20">يسكن معه</th>
              </tr>
            </thead>
            <tbody>
              {data.contacts && data.contacts.length > 0 ? (
                data.contacts.map((contact, idx) => (
                  <tr key={contact.id || idx} className="text-center">
                    <td className="border border-slate-300 p-1.5 text-right font-medium">
                      {contact.name} {contact.isPrimary && <span className="text-[10px] bg-teal-100 text-teal-800 px-1 rounded font-bold mr-1">الأساسي</span>}
                    </td>
                    <td className="border border-slate-300 p-1.5">{contact.relation}</td>
                    <td className="border border-slate-300 p-1.5 font-mono text-[11px]">{contact.phone || '-'}</td>
                    <td className="border border-slate-300 p-1.5 font-mono text-[11px]">{contact.whatsapp || contact.phone || '-'}</td>
                    <td className="border border-slate-300 p-1.5 text-right text-[11px]">
                      {contact.job || '-'} {contact.employer ? `(${contact.employer})` : ''}
                    </td>
                    <td className="border border-slate-300 p-1.5">{contact.livesWithStudent ? 'نعم' : 'لا'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="border border-slate-300 p-2 text-center text-slate-500">
                    لا توجد بيانات تواصل مسجلة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section 5 & 6: الوضع الأسري والسكني */}
        <div className="mb-4">
          <div className="bg-slate-100 border border-slate-300 px-3 py-1 font-bold text-xs text-slate-900">
            خامساً: الوضع الأسري والسكن
          </div>
          <table className="w-full text-xs border-collapse border border-slate-300 mt-1">
            <tbody>
              <tr>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold w-32">تركيبة الإخوة:</td>
                <td className="border border-slate-300 p-1.5">
                  ذكور: <span className="font-bold">{data.brothersCount ?? 0}</span> • إناث: <span className="font-bold">{data.sistersCount ?? 0}</span> • ترتيب الطالب: <span className="font-bold">{data.birthOrder || 1}</span>
                </td>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold w-32">يعيش مع الوالدين:</td>
                <td className="border border-slate-300 p-1.5">
                  {data.livesWithBothParents
                    ? 'نعم (مع الأب والأم)'
                    : `لا - ${data.separationReason || ''} (يعيش مع: ${data.livesWithWhom || 'محدد'})`}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold">عنوان السكن:</td>
                <td className="border border-slate-300 p-1.5" colSpan={3}>
                  {data.emirate || '-'}، منطقة {data.area || '-'}، شارع {data.streetName || '-'}، منزل {data.houseNumber || '-'}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold">نوع وملكية السكن:</td>
                <td className="border border-slate-300 p-1.5">
                  {data.housingType || 'فيلا'} • {data.housingOwnership || 'ملك'}
                </td>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold">غرفة خاصة للطالب:</td>
                <td className="border border-slate-300 p-1.5">
                  {data.hasPrivateRoom ? 'نعم (غرفة منفصلة)' : `مشتركة (مع: ${data.sharedRoomWith || 'الإخوة'})`}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold">مستوى الدخل:</td>
                <td className="border border-slate-300 p-1.5">
                  {data.incomeLevel || 'مناسب'} {data.incomeSources ? `(مصادر الدخل: ${data.incomeSources})` : ''}
                </td>
                <td className="border border-slate-300 p-1.5 bg-slate-50 font-semibold">ملاحظات أسرية:</td>
                <td className="border border-slate-300 p-1.5">{data.familyNotes || 'لا توجد ملاحظات خاصة'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 7: الاعتماد والتوقيعات */}
        <div className="mt-6 border-t-2 border-slate-900 pt-4">
          <div className="grid grid-cols-2 gap-8 text-xs">
            <div className="border border-slate-300 p-3 rounded bg-slate-50 space-y-2">
              <p className="font-bold text-slate-900 underline">معبئ الاستمارة:</p>
              <p><span className="font-semibold">الاسم:</span> {data.filledByName || '-'}</p>
              <p><span className="font-semibold">الصفة:</span> {data.filledByRole || 'المرشد الأكاديمي والمهني'}</p>
              <p><span className="font-semibold">تاريخ التعبئة:</span> {data.formDate || '-'}</p>
              <p className="pt-4 text-slate-400">التوقيع: .......................................</p>
            </div>
            <div className="border border-slate-300 p-3 rounded bg-slate-50 space-y-2">
              <p className="font-bold text-slate-900 underline">اعتماد وتدقيق المرشد المدرسي:</p>
              <p><span className="font-semibold">المرشد المسؤول:</span> {caseRecord.assignedCounselorName || '-'}</p>
              <p><span className="font-semibold">تاريخ المراجعة:</span> {data.reviewedAt || '-'}</p>
              <p><span className="font-semibold">ملاحظات الاعتماد:</span> {data.counselorNotes || 'تمت مطابقة البيانات والتأكد من صحتها.'}</p>
              <p className="pt-4 text-slate-400">الختم والتوقيع: .......................................</p>
            </div>
          </div>
          <div className="mt-4 text-center text-[10px] text-slate-500 font-mono">
            وثيقة إرشادية سرية ومحمية قانوناً وفق لائحة حماية الطالب والإرشاد المدرسي بدولة الإمارات العربية المتحدة
          </div>
        </div>
      </div>
    </PrintPreviewModalWrapper>
  );
};
