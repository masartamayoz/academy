import { useState } from 'react';
import { PAYMENT_METHODS } from '@/src/constants';
import { toast } from 'sonner';
import { Check, Clipboard, QrCode } from 'lucide-react';

export default function PaymentMethods() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('تم نسخ الرقم بنجاح!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const steps = [
    { num: 1, title: 'قم بعملية الدفع', desc: 'حوّل المبلغ عبر طريقة الدفع التي تناسبك واحتفظ بوصل الخلاص' },
    { num: 2, title: 'سجّل دخولك للمنصة', desc: 'ادخل إلى حسابك على أكاديمية مسار التميز' },
    { num: 3, title: 'أرسل صورة الوصل', desc: 'ارفع صورة وصل الخلاص عبر نموذج الاشتراك في لوحة التحكم' },
    { num: 4, title: 'انتظر التفعيل', desc: 'يتم مراجعة وصلك وتفعيل اشتراكك خلال 24 ساعة كحد أقصى' },
  ];

  return (
    <section className="bg-white py-20 pb-24 font-Tajawal" id="payment">
      <div className="container mx-auto px-5">
        <div className="mb-14 text-center">
          <div className="mb-3.5 inline-block rounded-full border border-blue-light/10 bg-blue-light/10 px-4 py-1.5 text-[0.82rem] font-bold text-blue-light">
            طرق الدفع
          </div>
          <h2 className="mb-3 text-3xl font-black text-blue-dark sm:text-4xl">
            طرق دفع متعددة في متناولك
          </h2>
          <p className="mx-auto max-w-[560px] text-[1.05rem] text-gray-600 text-center">
            اختر الطريقة الأنسب لك لإرسال وصل الخلاص وتفعيل الاشتراك
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-start">
          {/* Payment Options Column */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="text-xl font-black text-blue-dark mb-4 text-right">معلومات الحسابات الرسمية</h3>
            
            {PAYMENT_METHODS.map((m) => (
              <div 
                key={m.id} 
                className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6 transition-all hover:border-blue-light/30 hover:bg-white hover:shadow-md text-right border-r-4"
                style={{ 
                  borderRightColor: m.id === 'bank' ? '#10b981' : m.id === 'ccp' ? '#f59e0b' : '#ef4444' 
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Icon & Title */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white text-[1.5rem] shadow-sm border border-gray-100">
                      {m.id === 'bank' ? '🏦' : m.id === 'ccp' ? '📮' : '📱'}
                    </div>
                    <div>
                      <h4 className="text-[1.1rem] font-black text-blue-dark">{m.name}</h4>
                      <p className="text-xs text-gray-500 font-bold mt-1">{m.bankName}</p>
                    </div>
                  </div>

                  {/* Account detail line */}
                  <div className="bg-white px-4 py-3 rounded-xl border border-gray-200/80 flex items-center justify-between gap-4 flex-1 max-w-md">
                    <span className="font-mono text-[0.92rem] font-black tracking-wider text-blue-dark select-all ltr">
                      {m.id === 'd17' ? m.phone : m.accountNumber}
                    </span>
                    <button 
                      type="button"
                      onClick={() => handleCopy(m.id, m.id === 'd17' ? m.phone || '' : m.accountNumber || '')}
                      className="text-xs bg-gray-50 border border-gray-200 hover:bg-gray-100 font-black text-blue-dark px-3 py-2 rounded-lg flex flex-shrink-0 items-center gap-1.5 transition-all"
                    >
                      {copiedId === m.id ? <Check size={14} className="text-emerald-500" /> : <Clipboard size={14} />}
                      {copiedId === m.id ? 'تم النسخ' : 'نسخ'}
                    </button>
                  </div>
                </div>

                {/* QR Code display for D17 inside Card */}
                {m.id === 'd17' && m.qrCode && (
                  <div className="mt-5 pt-5 border-t border-gray-100 flex flex-col md:flex-row items-center gap-6 justify-between bg-white/70 p-4 rounded-xl border border-dashed border-gray-200">
                    <div className="text-right space-y-1 md:flex-1">
                      <p className="text-[0.88rem] font-black text-blue-dark flex items-center gap-1.5 justify-end">
                        <QrCode size={16} className="text-red-500" /> مسح رمز الـ QR Code
                      </p>
                      <p className="text-xs text-gray-500 leading-relaxed font-bold">
                        يمكنك فتح تطبيق D17 واستخدام ماسح الـ QR للتحويل مباشرة إلى هذا الهاتف الحساب مع تأكيد المبلغ.
                      </p>
                    </div>
                    <div className="relative p-1.5 border border-gray-100 bg-white rounded-xl shadow-inner flex-shrink-0">
                      <img 
                        src={m.qrCode} 
                        alt="D17 QR Code" 
                        className="w-32 h-32 object-contain rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Steps Column */}
          <div className="lg:col-span-5 bg-gradient-to-br from-blue-dark/5 to-blue-dark/[0.01] rounded-3xl p-8 border border-gray-150 text-right">
            <h3 className="mb-5 text-[1.2rem] font-black text-blue-dark">
              كيف ترسل وصل الخلاص؟
            </h3>
            <ol className="flex flex-col gap-0">
              {steps.map((s) => (
                <li key={s.num} className="group flex items-start gap-4 border-b border-gray-100 py-4 last:border-0 text-right">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-light to-blue-mid text-[0.85rem] font-extrabold text-white shadow-md">
                    {s.num}
                  </div>
                  <div>
                    <h4 className="mb-1 text-[0.95rem] font-bold text-blue-dark">{s.title}</h4>
                    <p className="text-[0.82rem] text-gray-600 leading-relaxed font-bold">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
