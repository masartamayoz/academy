import { Link } from 'react-router-dom';
import { Check, PlayCircle, Gift, Tag as Tags, Sparkles, ArrowLeft } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function Pricing() {
  return (
    <section className="bg-gray-50 py-16 md:py-20 pb-20 md:pb-24" id="pricing">
      <div className="container mx-auto px-5">
        <div className="mb-10 md:mb-14 text-center">
          <div className="mb-3.5 inline-block rounded-full border border-blue-light/10 bg-blue-light/10 px-4 py-1.5 text-[0.82rem] font-bold text-blue-light">
            العروض والأسعار
          </div>
          <h2 className="mb-3 text-2xl sm:text-3xl md:text-4xl font-black text-blue-dark leading-tight">
            اختر العرض المناسب وابلغ طريق التميز
          </h2>
          <p className="mx-auto max-w-[560px] text-sm sm:text-[1.05rem] text-gray-600 font-Tajawal">
            عروض مرنة تناسب جميع الاحتياجات — التسجيلات مجانية مع أي اشتراك في الحصص المباشرة
          </p>
        </div>

        {/* التسجيلات فقط */}
        <div className="mx-auto mb-10 md:mb-14 flex max-w-[640px] flex-wrap items-center justify-between gap-5 rounded-[22px] bg-gradient-to-br from-blue-dark to-blue-brand p-6 sm:p-8 md:px-10 shadow-xl">
          <div className="flex-1 min-w-0">
            <div className="mb-1 text-xs sm:text-[0.82rem] font-bold text-gold-light">📹 عرض التسجيلات السنوي</div>
            <div className="mb-2 text-base sm:text-[1.1rem] font-extrabold text-white">مشاهدة جميع الدروس المسجّلة طوال السنة</div>
            <ul className="flex flex-wrap gap-2">
              <li className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/85">✅ فيديو + PDF لكل درس</li>
              <li className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/85">✅ فروض + تمارين</li>
              <li className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300">
                <Gift size={12} />
                مجاني مع الحصص
              </li>
            </ul>
          </div>
          <div className="w-full text-center md:w-auto md:ltr:text-left md:rtl:text-right">
            <div className="text-4xl sm:text-5xl font-black text-gold-brand leading-none">50</div>
            <div className="mt-1 text-xs sm:text-[0.88rem] text-white/60">د.ت / سنة</div>
            <Link 
              to="/auth#register" 
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-gold-brand px-6 py-3 text-sm font-black text-blue-dark transition-all hover:bg-gold-light active:scale-95 shadow-lg w-full md:w-auto"
            >
              <PlayCircle size={18} />
              <span>اشترك في العرض</span>
            </Link>
          </div>
        </div>

        {/* الحصص المباشرة */}
        <div className="mx-auto grid max-w-[860px] grid-cols-1 gap-7 md:grid-cols-2">
          
          {/* Trimester 1 */}
          <div className="relative rounded-[22px] border-2 border-blue-light bg-gradient-to-br from-blue-dark to-blue-mid p-7 sm:p-9 shadow-2xl text-white flex flex-col justify-between">
            <div>
              <div className="absolute -top-3.5 right-6 rounded-full bg-gold-brand px-4 py-1 text-xs font-extrabold text-blue-dark shadow-md">
                الأكثر طلباً 🌟
              </div>
              <div className="mb-2 text-lg font-bold text-gold-light">🏆 الثلاثي الأول</div>
              <div className="mb-5 text-[0.85rem] text-white/65">1 سبتمبر — 22 ديسمبر 2025</div>
              <div className="mb-6 flex items-baseline gap-1.5">
                <span className="text-4xl sm:text-5xl font-black text-gold-brand">100</span>
                <span className="text-lg font-bold text-white/70">د.ت</span>
              </div>
              <ul className="mb-7 space-y-2.5">
                {[
                  'حصتان/أسبوع عبر Meet',
                  'التسجيلات مجاناً',
                  'الوثائق مع الاصلاح',
                  'متابعة ولي الأمر',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 border-b border-white/10 pb-2 text-sm sm:text-[0.92rem]">
                    <Check size={16} className="mt-1 text-gold-light shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Link 
                to="/auth#register" 
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gold-brand py-3.5 text-base font-black text-blue-dark transition-all hover:bg-gold-light active:scale-98 shadow-lg"
              >
                <span>المشاركة في العرض الآن</span>
                <ArrowLeft size={18} />
              </Link>
              <p className="text-[0.7rem] text-white/60 text-center mt-2">يتطلب تسجيل الدخول لتفعيل الاشتراك</p>
            </div>
          </div>

          {/* Monthly */}
          <div className="rounded-[22px] border-2 border-gray-200 bg-white p-7 sm:p-9 text-gray-800 transition-all hover:shadow-2xl flex flex-col justify-between">
            <div>
              <div className="mb-2 text-lg font-bold">📅 الشهري</div>
              <div className="mb-5 text-[0.85rem] text-gray-500">30 يوماً من تاريخ التفعيل</div>
              <div className="mb-6 flex items-baseline gap-1.5">
                <span className="text-4xl sm:text-5xl font-black text-blue-dark leading-none">40</span>
                <span className="text-lg font-bold text-gray-600">د.ت</span>
                <span className="text-xs text-gray-400">/ شهر</span>
              </div>
              <ul className="mb-7 space-y-2.5 font-Tajawal">
                {[
                  'حصتان/أسبوع',
                  'التسجيلات مجاناً',
                  'مرونة تامة',
                  'دعم تفاعلي مستمر',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 border-b border-gray-100 pb-2 text-sm sm:text-[0.92rem]">
                    <Check size={16} className="mt-1 text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Link 
                to="/auth#register" 
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-blue-light py-3.5 text-base font-black text-blue-light transition-all hover:bg-blue-light hover:text-white active:scale-98"
              >
                <span>اشترك في هذا العرض</span>
                <ArrowLeft size={18} />
              </Link>
              <p className="text-[0.7rem] text-gray-400 text-center mt-2">انشئ حسابك كطالب لتفعيل الاشتراك</p>
            </div>
          </div>

        </div>

        <div className="mt-10 text-center">
          <Link to="/pricing" className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-light px-6 py-3 text-sm sm:text-[0.95rem] font-bold text-blue-light transition-all hover:bg-blue-light/5">
            <Tags size={18} />
            عرض تفاصيل جميع الأسعار والعروض
          </Link>
        </div>
      </div>
    </section>
  );
}
