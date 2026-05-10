import Navbar from '@/src/components/layout/Navbar';
import Footer from '@/src/components/layout/Footer';
import { Check, X, ShieldQuestion, Tag, PlayCircle, Calendar, Rocket, Sun, Receipt, Upload, Loader2, Camera, AlertCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { cn } from '@/src/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

import { SUBSCRIPTION_PLANS } from '../constants';

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) setUserData(snap.data());
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSubscribeClick = (plan: any) => {
    if (!user) {
      navigate('/auth#register');
      return;
    }
    // Redirect logged-in user to dashboard wallet with plan selected
    navigate(`/dashboard?tab=wallet&planId=${plan.id}`);
  };

  const plans = SUBSCRIPTION_PLANS;

  const faqs = [
    { q: 'كيف أدفع وأُرسل وصل الخلاص؟', a: 'بعد إنشاء حسابك، قم بالدفع عبر التحويل البنكي أو البريد التونسي أو تطبيق D17 أو Carte eDinar، ثم ارفع صورة الوصل من لوحة التحكم. سيتم تفعيل حسابك خلال 24 ساعة.' },
    { q: 'هل التسجيلات مجانية مع الحصص المباشرة؟', a: 'نعم! عند الاشتراك في أي عرض حصص مباشرة (ثلاثي أو شهري)، تحصل على إمكانية مشاهدة جميع التسجيلات مجاناً طوال مدة اشتراكك.' },
    { q: 'ماذا يحدث عند انتهاء الاشتراك؟', a: 'ستتلقى تنبيهاً قبل 7 أيام من انتهاء اشتراكك. يمكنك التجديد في أي وقت من لوحة التحكم. في حال عدم التجديد، يتوقف الوصول للحصص المباشرة لكن يمكنك الاطلاع على المحتوى المجاني.' },
    { q: 'هل يمكن لولي الأمر متابعة ابنه؟', a: 'نعم. ينشئ ولي الأمر حساباً خاصاً ثم يربطه بحساب التلميذ. يمكنه بعد ذلك متابعة سجل الحضور وحالة الاشتراك وتاريخ انتهائه ودفع الاشتراك مباشرة.' },
  ];

  return (
    <div className="flex min-h-screen flex-col" dir="rtl">
      <Navbar />
      
      <main className="flex-1 bg-gray-50 font-Tajawal">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-dark via-blue-mid to-blue-brand py-16 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,158,11,0.12)_0%,transparent_60%)]" />
          <div className="container mx-auto px-5 relative z-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-light/30 bg-gold-brand/15 px-4 py-1.5 text-[0.85rem] font-bold text-gold-light">
              <Tag size={16} /> عروض وأسعار 2025-2026
            </div>
            <h1 className="mb-4 text-3xl font-black sm:text-5xl">تعليم <span className="text-gold-brand">ممتاز</span> بسعر في متناول الجميع</h1>
            <p className="mx-auto max-w-xl text-lg text-white/75">اختر العرض المناسب لك — دروس مسجّلة أو حصص مباشرة مع أفضل المدرسين في تونس</p>
          </div>
        </section>

        {/* Recordings Card */}
        <section className="py-16">
          <div className="container mx-auto px-5">
            <div className="mb-12 text-center">
               <span className="mb-3 inline-block rounded-full bg-blue-100 px-4 py-1 text-sm font-bold text-blue-700">📹 عرض التسجيلات</span>
               <h2 className="text-3xl font-black text-blue-dark">شاهد الدروس في أي وقت</h2>
            </div>
            
            <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-br from-blue-dark to-blue-mid p-10 text-white shadow-2xl flex flex-wrap items-center justify-between gap-8 text-right">
              <div className="flex-1 min-w-[300px]">
                <h3 className="text-xl font-black text-gold-light mb-2">عرض التسجيلات السنوي</h3>
                <p className="text-white/70 mb-6 font-Tajawal">مشاهدة التسجيلات فقط (لا يشمل الحصص المباشرة). مثالي لمن يريد المراجعة بمفرده.</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['جميع دروس السنة مسجلة', 'تمارين وسلاسل محلولة', 'برنامج رسمي تونسي', 'متاح 24/7'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/90">
                      <Check size={16} className="text-gold-brand" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-center w-full sm:w-auto">
                <div className="text-5xl font-black text-gold-brand">50</div>
                <div className="text-white/50 text-sm mt-1">د.ت / سنة</div>
                <button 
                  onClick={() => handleSubscribeClick(plans.find(p => p.id === 'recordings_yearly'))}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gold-brand px-8 py-3 text-blue-dark font-black hover:bg-gold-light transition-all"
                >
                   <PlayCircle size={18} /> اشترك الآن
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Live Plans */}
        <section className="py-16 bg-white border-y border-gray-100 text-right">
          <div className="container mx-auto px-5">
            <div className="mb-12 text-center">
               <span className="mb-3 inline-block rounded-full bg-emerald-100 px-4 py-1 text-sm font-bold text-emerald-700">🎥 الحصص المباشرة</span>
               <h2 className="text-3xl font-black text-blue-dark">تمارين وتفاعل مباشر</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.filter(p => !['recordings_yearly', 'monthly'].includes(p.id)).map((plan) => (
                <div key={plan.id} className={cn(
                  "relative group rounded-2xl border-2 p-7 transition-all hover:-translate-y-1.5 hover:shadow-2xl",
                  plan.featured ? "border-blue-light bg-blue-dark text-white shadow-blue-900/10" : 
                  plan.color === 'purple' ? "border-purple-200 bg-purple-50/30" : "border-gray-200 bg-white"
                )}>
                  {plan.featured && <div className="absolute -top-3.5 right-6 rounded-full bg-gold-brand px-4 py-1 text-[0.75rem] font-black text-blue-dark">{plan.id === 'august_review' ? 'عرض خاص' : 'الأكثر طلباً'}</div>}
                  <p className={cn("text-xs font-bold mb-1", plan.featured ? "text-gold-light" : "text-blue-light")}>{plan.period}</p>
                  <h4 className={cn("text-lg font-black mb-1", plan.featured ? "text-white" : "text-blue-dark")}>{plan.name}</h4>
                  <div className="flex items-center gap-1.5 text-[0.75rem] opacity-60 mb-5">
                    {plan.icon && <plan.icon size={14} />} {plan.dates || plan.description}
                  </div>
                  
                  <div className="mb-6 flex items-baseline gap-1.5">
                    <span className={cn("text-4xl font-black", plan.featured ? "text-gold-brand" : "text-blue-dark")}>{plan.price}</span>
                    <span className="text-sm font-bold opacity-60">د.ت</span>
                  </div>

                  {plan.sessions && (
                    <p className="text-xs font-bold mb-4 flex items-center gap-1.5 opacity-80">
                      {plan.icon && <plan.icon size={16} />} {plan.sessions}
                    </p>
                  )}
                  
                  <ul className="space-y-2 mb-8 border-t border-gray-100 pt-5">
                    {(plan.id === 'august_review' ? ['تحضير ذكي', 'تدارك النواقص', 'تفاعل مباشر'] : ['حصتان/أسبوع', 'تسجيلات مجانية', 'تصحيح واجبات']).map(f => (
                       <li key={f} className="flex items-center gap-2 text-xs font-medium opacity-85">
                         <Check size={14} className={plan.featured ? "text-gold-light" : "text-emerald-500"} /> {f}
                       </li>
                    ))}
                  </ul>

                  <button 
                    onClick={() => handleSubscribeClick(plan)}
                    className={cn(
                      "block w-full rounded-xl py-3 text-center text-sm font-black transition-all",
                      plan.featured ? "bg-gold-brand text-blue-dark hover:bg-gold-light" : 
                      "bg-blue-light text-white hover:bg-blue-brand"
                    )}
                  >
                    اشترك الآن
                  </button>
                </div>
              ))}
            </div>

            {/* Monthly Option */}
            <div className="mt-12 mx-auto max-w-2xl rounded-2xl border-2 border-gray-200 bg-gray-50/50 p-8 flex flex-wrap items-center justify-between gap-6 hover:border-blue-light transition-all">
               <div>
                  <h4 className="text-lg font-black text-blue-dark">📅 الاشتراك الشهري</h4>
                  <p className="text-sm text-gray-600 mt-1">مناسب لمن يريد تجربة المنصة أو يحتاج مرونة أكبر.</p>
               </div>
               <div className="flex items-center gap-5">
                  <div className="text-right">
                    <div className="text-3xl font-black text-blue-light leading-none">40</div>
                    <div className="text-[0.7rem] text-gray-400 mt-1">د.ت / شهر</div>
                  </div>
                  <button 
                    onClick={() => handleSubscribeClick(plans.find(p => p.id === 'monthly'))}
                    className="rounded-xl bg-blue-dark px-6 py-3 text-white font-bold text-sm hover:bg-blue-brand transition-all"
                  >
                    اشترك
                  </button>
               </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16">
          <div className="container mx-auto px-5">
            <h2 className="text-3xl font-black text-blue-dark text-center mb-10">مقارنة العروض</h2>
            <div className="overflow-x-auto rounded-2xl shadow-xl border border-gray-100 bg-white">
              <table className="w-full text-right min-w-[700px]">
                <thead className="bg-blue-dark text-white">
                  <tr>
                    <th className="p-5 font-black">الميزة</th>
                    <th className="p-5 font-black text-center">التسجيلات فقط<br /><span className="text-[0.7rem] opacity-60 font-normal">50 د.ت/سنة</span></th>
                    <th className="p-5 font-black text-center">الثلاثي<br /><span className="text-[0.7rem] opacity-60 font-normal">90-100 د.ت</span></th>
                    <th className="p-5 font-black text-center">الشهري<br /><span className="text-[0.7rem] opacity-60 font-normal">40 د.ت/شهر</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { label: 'مشاهدة التسجيلات', v: [true, true, true] },
                    { label: 'حصص مباشرة عبر Meet', v: [false, '~24 حصة', '~8 حصص'] },
                    { label: 'تصحيح واجبات', v: [false, true, true] },
                    { label: 'متابعة ولي الأمر', v: [true, true, true] },
                    { label: 'سعر الحصة الواحدة', v: ['—', '≈ 4.2 د.ت', '≈ 5 د.ت'] },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="p-5 font-bold text-blue-dark">{row.label}</td>
                      {row.v.map((val, j) => (
                        <td key={j} className="p-5 text-center">
                          {val === true ? <Check className="mx-auto text-emerald-500" size={20} /> : 
                           val === false ? <X className="mx-auto text-red-300" size={18} /> : 
                           <span className="font-bold text-gray-700">{val}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-gray-50 border-t border-gray-200 text-right">
          <div className="container mx-auto px-5">
             <div className="mb-12 text-center">
                <ShieldQuestion size={48} className="mx-auto text-blue-light mb-4 opacity-20" />
                <h2 className="text-3xl font-black text-blue-dark">الأسئلة الشائعة</h2>
                <p className="text-gray-600 mt-2">كل ما تحتاج معرفته عن الاشتراك والتعلم</p>
             </div>
             
             <div className="mx-auto max-w-3xl space-y-3">
                {faqs.map((faq, i) => (
                  <div key={i} className="rounded-2xl border border-gray-200 bg-white overflow-hidden transition-all">
                    <button 
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between p-5 text-right font-bold text-blue-dark hover:bg-gray-50 transition-colors"
                    >
                      {faq.q}
                      <X className={cn("text-blue-light transition-transform duration-300", openFaq === i ? "rotate-45" : "rotate-0")} size={18} />
                    </button>
                    <div className={cn("px-5 overflow-hidden transition-all duration-300", openFaq === i ? "max-h-[300px] py-4 border-t border-gray-50" : "max-h-0")}>
                       <p className="text-sm text-gray-600 leading-relaxed leading-[1.8]">{faq.a}</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-blue-dark text-white text-center relative overflow-hidden">
           <div className="absolute inset-0 bg-blue-brand opacity-20 ltr:skew-x-12 rtl:-skew-x-12 translate-x-1/2" />
           <div className="container mx-auto px-5 relative z-10">
              <h2 className="text-3xl font-black mb-4 sm:text-4xl">ابدأ رحلتك نحو <span className="text-gold-brand">التميز</span> اليوم</h2>
              <p className="text-white/60 mb-10 max-w-md mx-auto">انضم لمئات التلاميذ الذين يتعلمون مع أفضل المدرسين في تونس بنظام تفاعلي حديث.</p>
              <button 
                onClick={() => handleSubscribeClick(plans.find(p => p.id === 'recordings_yearly'))}
                className="inline-flex items-center gap-2 rounded-2xl bg-gold-brand px-10 py-5 text-blue-dark font-black text-lg hover:bg-gold-light hover:-translate-y-1 shadow-2xl shadow-gold-brand/20 transition-all"
              >
                اشترك الآن
              </button>
           </div>
        </section>
      
      </main>

      <Footer />
    </div>
  );
}
