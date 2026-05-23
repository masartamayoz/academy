import { Link } from 'react-router-dom';
import { Check, PlayCircle, Gift, Tag as Tags } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function Pricing() {
  return (
    <section className="bg-gray-50 py-20 pb-24" id="pricing">
      <div className="container mx-auto px-5">
        <div className="mb-14 text-center">
          <div className="mb-3.5 inline-block rounded-full border border-blue-light/10 bg-blue-light/10 px-4 py-1.5 text-[0.82rem] font-bold text-blue-light">
            العروض والأسعار
          </div>
          <h2 className="mb-3 text-3xl font-black text-blue-dark sm:text-4xl leading-tight">
            اختر العرض المناسب لك
          </h2>
          <p className="mx-auto max-w-[560px] text-[1.05rem] text-gray-600 font-Tajawal">
            عروض مرنة تناسب جميع الاحتياجات — التسجيلات مجانية مع أي اشتراك في الحصص
          </p>
        </div>

        {/* التسجيلات فقط */}
        <div className="mx-auto mb-14 flex max-w-[640px] flex-wrap items-center justify-between gap-5 rounded-[18px] bg-gradient-to-br from-blue-dark to-blue-brand p-8 md:px-10">
          <div className="flex-1 min-w-0">
            <div className="mb-1 text-[0.82rem] font-bold text-gold-light">📹 عرض التسجيلات السنوي</div>
            <div className="mb-2 text-[1.1rem] font-extrabold text-white">مشاهدة جميع الدروس المسجّلة طوال السنة</div>
            <ul className="flex flex-wrap gap-2">
              <li className="rounded-full bg-white/10 px-2.5 py-1 text-[0.78rem] text-white/85">✅ فيديو + PDF لكل درس</li>
              <li className="rounded-full bg-white/10 px-2.5 py-1 text-[0.78rem] text-white/85">✅ فروض + تمارين</li>
              <li className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[0.78rem] font-bold text-emerald-300">
                <Gift size={12} />
                مجاني مع الحصص
              </li>
            </ul>
          </div>
          <div className="w-full text-center md:w-auto md:ltr:text-left md:rtl:text-right">
            <div className="text-5xl font-black text-gold-brand leading-none">50</div>
            <div className="mt-1 text-[0.88rem] text-white/60">د.ت / سنة</div>
            <Link to="/auth#register" className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-gold-brand px-5 py-2.5 text-[0.88rem] font-bold text-blue-dark transition-all hover:bg-gold-light">
              <PlayCircle size={16} />
              اشترك
            </Link>
          </div>
        </div>

        {/* الحصص المباشرة */}
        <div className="mx-auto grid max-w-[860px] grid-cols-1 gap-7 md:grid-cols-2">
          
          {/* Trimester 1 */}
          <div className="relative rounded-[20px] border-2 border-blue-light bg-gradient-to-br from-blue-dark to-blue-mid p-9 shadow-2xl text-white">
            <div className="absolute -top-3.5 right-6 rounded-full bg-gold-brand px-4.5 py-1 text-[0.8rem] font-extrabold text-blue-dark">
              الأكثر طلباً
            </div>
            <div className="mb-2 text-lg font-bold text-gold-light">🏆 الثلاثي الأول</div>
            <div className="mb-6 text-[0.88rem] text-white/65">1 سبتمبر — 22 ديسمبر 2025</div>
            <div className="mb-7 flex items-baseline gap-1.5">
              <span className="text-5xl font-black text-gold-brand">100</span>
              <span className="text-lg font-bold text-white/70">د.ت</span>
            </div>
            <ul className="mb-8.5 space-y-2.5">
              {[
                'حصتان/أسبوع عبر Meet',
                'التسجيلات مجاناً',
                'الوثائق مع الاصلاح',
                'متابعة ولي الأمر',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 border-b border-white/10 pb-2 text-[0.92rem]">
                  <Check size={16} className="mt-1 text-gold-light" />
                  {f}
                </li>
              ))}
            </ul>
            <button className="w-full rounded-xl bg-gold-brand py-3.5 text-lg font-bold text-blue-dark transition-all hover:bg-gold-light hover:-translate-y-0.5">
              احجز الآن
            </button>
          </div>

          {/* Monthly */}
          <div className="rounded-[20px] border-2 border-gray-200 bg-white p-9 text-gray-800 transition-all hover:-translate-y-1.5 hover:shadow-2xl">
            <div className="mb-2 text-lg font-bold">📅 الشهري</div>
            <div className="mb-6 text-[0.88rem] text-gray-600">30 يوماً من تاريخ التفعيل</div>
            <div className="mb-7 flex items-baseline gap-1.5">
              <span className="text-5xl font-black text-blue-dark leading-none">40</span>
              <span className="text-lg font-bold text-gray-600">د.ت</span>
              <span className="text-[0.85rem] text-gray-400">/ شهر</span>
            </div>
             <ul className="mb-8.5 space-y-2.5 font-Tajawal">
              {[
                'حصتان/أسبوع',
                'التسجيلات مجاناً',
                'مرونة تامة',
                'دعم تفاعلي مستمر',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 border-b border-gray-100 pb-2 text-[0.92rem]">
                  <Check size={16} className="mt-1 text-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>
            <button className="w-full rounded-xl border-2 border-blue-light py-3.5 text-lg font-bold text-blue-light transition-all hover:bg-blue-light hover:text-white">
              احجز الآن
            </button>
          </div>

        </div>

        <div className="mt-10 text-center">
          <Link to="/pricing" className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-light px-6 py-2.5 text-[0.95rem] font-bold text-blue-light transition-all hover:bg-blue-light/5">
            <Tags size={18} />
            عرض تفاصيل جميع الأسعار
          </Link>
        </div>
      </div>
    </section>
  );
}
