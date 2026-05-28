import React, { useState } from 'react';
import Navbar from '@/src/components/layout/Navbar';
import Footer from '@/src/components/layout/Footer';
import SEO from '@/src/components/common/SEO';
import { 
  Mail, 
  Phone, 
  MessageSquare, 
  Send, 
  Facebook, 
  Youtube, 
  Instagram, 
  Twitter, 
  Clock, 
  CheckCircle2, 
  Loader2,
  ChevronDown,
  HelpCircle
} from 'lucide-react';
import { db } from '@/src/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';

export default function Contact() {
  const [selectedSubject, setSelectedSubject] = useState('استفسار عن الاشتراك');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'contacts'), {
        ...formData,
        subject: selectedSubject,
        createdAt: serverTimestamp()
      });
      setSubmitting(true);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الإرسال. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  const subjects = ['استفسار عن الاشتراك', 'معلومات عن الدورات', 'مشكلة تقنية', 'اقتراح أو ملاحظة', 'أخرى'];

  const faqs = [
    { q: 'كيف يمكنني الاشتراك في المنصة؟', a: 'أنشئ حساباً مجانياً على المنصة، ثم اختر العرض المناسب لك، قم بالدفع عبر البنك أو البريد أو D17، وأرسل صورة الوصل من لوحة التحكم.' },
    { q: 'ما الفرق بين عرض التسجيلات والحصص؟', a: 'عرض التسجيلات يتيح لك مشاهدة جميع الدروس المسجلة. عرض الحصص المباشرة يشمل حصصاً تفاعلية مباشرة مع المدرس، بالإضافة إلى التسجيلات مجاناً.' },
    { q: 'كيف أرسل وصل الخلاص؟', a: 'بعد الدفع، ادخل إلى لوحة التحكم، ارفع صورة واضحة للوصل في قسم "اشتراكي". سيتم تفعيل حسابك خلال 24 ساعة.' },
    { q: 'هل المنصة متاحة على الهاتف؟', a: 'نعم، المنصة متجاوبة بالكامل مع جميع الأجهزة (هاتف، تابلت، حاسوب) ولا تحتاج لتثبيت أي تطبيق.' },
  ];

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col" dir="rtl">
        <Navbar />
        <main className="flex-1 container mx-auto px-5 py-24 flex items-center justify-center">
           <div className="max-w-md w-full text-center p-10 bg-white rounded-[32px] border border-gray-100 shadow-2xl animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={44} />
              </div>
              <h2 className="text-2xl font-black text-blue-dark mb-4">تم إرسال رسالتك بنجاح!</h2>
              <p className="text-gray-600 mb-8 font-Tajawal leading-relaxed">شكراً لتواصلك معنا. سنرد عليك في أقرب وقت ممكن عبر بريدك الإلكتروني أو الهاتف.</p>
              <button onClick={() => window.location.href = '/'} className="w-full rounded-2xl bg-blue-light py-4 font-black text-white hover:bg-blue-brand transition-all">العودة للرئيسية</button>
           </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" dir="rtl">
      <SEO 
        title="اتصل بنا | الدعم الفني والمساعدة بالأكاديمية"
        description="تواصل مع فريق عمل أكاديمية مسار التميز للرياضيات في تونس للاستفسارات بخصوص عروض الاشتراك، باقات الدورة، أو الدعم التقني."
        keywords="اتصال مسار التميز, هاتف مسار التميز, واتساب مسار التميز, دعم أكاديمية الرياضيات"
        canonical="https://academy.masartamayoz.com/contact"
      />
      <Navbar />
      
      <main className="flex-1 bg-gray-50 font-Tajawal pb-20">
        <section className="bg-gradient-to-br from-blue-dark to-blue-brand py-16 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,158,11,0.12)_0%,transparent_60%)]" />
          <div className="container mx-auto px-5 relative z-10">
            <h1 className="mb-4 text-3xl font-black sm:text-5xl">تواصل <span>معنا</span></h1>
            <p className="mx-auto max-w-xl text-lg text-white/75">نحن هنا للإجابة على جميع استفساراتك — لا تتردد في التواصل معنا</p>
          </div>
        </section>

        <div className="container mx-auto px-5 -mt-10 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Info Cards */}
            <div className="lg:col-span-5 space-y-4">
              <a href="https://wa.me/21698346706" target="_blank" className="flex items-center gap-5 p-6 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 text-white shadow-xl hover:shadow-emerald-500/30 transition-all hover:-translate-y-1">
                 <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                    <MessageSquare size={28} />
                 </div>
                 <div>
                    <h4 className="font-bold text-[0.85rem] text-emerald-50 opacity-80 mb-0.5">واتساب — الأسرع</h4>
                    <p className="text-xl font-black" dir="ltr">+216 98 346 706</p>
                 </div>
              </a>

              <a href="mailto:academy.masartamayoz@gmail.com" className="flex items-center gap-5 p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:border-blue-light transition-all hover:shadow-lg">
                 <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shrink-0">
                    <Mail size={28} />
                 </div>
                 <div>
                    <h4 className="font-bold text-[0.85rem] text-gray-500 mb-0.5">البريد الإلكتروني</h4>
                    <p className="text-lg font-black text-blue-dark">academy.masartamayoz@gmail.com</p>
                 </div>
              </a>

              <div className="p-8 rounded-2xl bg-white border border-gray-200 shadow-sm">
                 <h4 className="font-black text-blue-dark mb-5 flex items-center gap-2">
                    <Send size={18} className="text-blue-light" /> تابعنا على المنصات
                 </h4>
                 <div className="flex flex-wrap gap-2.5">
                    {[
                      { icon: Facebook, color: 'hover:bg-blue-600 bg-blue-50 text-blue-600', label: 'فيسبوك', href: 'https://fb.com/masartamayoz' },
                      { icon: Youtube, color: 'hover:bg-red-600 bg-red-50 text-red-600', label: 'يوتيوب', href: 'https://youtube.com/@masartamayoz' },
                      { icon: Instagram, color: 'hover:bg-pink-600 bg-pink-50 text-pink-600', label: 'إنستغرام', href: '#' },
                    ].map((s, i) => (
                      <a key={i} href={s.href} target="_blank" className={cn("px-4 py-2.5 rounded-xl border border-transparent font-bold text-sm flex items-center gap-2 transition-all hover:text-white", s.color)}>
                         <s.icon size={16} /> {s.label}
                      </a>
                    ))}
                 </div>
              </div>

              <div className="p-8 rounded-2xl bg-blue-dark text-white shadow-xl relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-24 h-24 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
                 <h4 className="font-black text-gold-light mb-6 flex items-center gap-2 relative z-10">
                    <Clock size={18} /> أوقات الرد
                 </h4>
                 <div className="space-y-3 relative z-10">
                    {[
                      { day: 'الاثنين — الجمعة', time: '08:00 — 20:00' },
                      { day: 'السبت', time: '09:00 — 18:00' },
                      { day: 'واتساب', time: 'متاح دائماً' },
                    ].map((h, i) => (
                      <div key={i} className="flex justify-between border-b border-white/10 pb-2 text-sm">
                         <span className="text-white/60 font-medium">{h.day}</span>
                         <span className="text-gold-light font-bold">{h.time}</span>
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            {/* Form Card */}
            <div className="lg:col-span-7 bg-white rounded-[32px] border border-gray-200 shadow-2xl p-8 lg:p-12">
               <div className="mb-10">
                  <h2 className="text-2xl font-black text-blue-dark mb-2">أرسل لنا رسالة</h2>
                  <p className="text-gray-600 font-Tajawal text-[0.95rem]">سنرد عليك في أقرب وقت ممكن</p>
               </div>

               <div className="mb-8">
                  <label className="block text-[0.85rem] font-black text-gray-800 mb-4">موضوع الرسالة</label>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map(s => (
                      <button 
                        key={s} 
                        onClick={() => setSelectedSubject(s)}
                        className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all border", selectedSubject === s ? "bg-blue-light border-blue-light text-white shadow-lg shadow-blue-500/30" : "bg-white border-gray-200 text-gray-500 hover:border-blue-light")}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
               </div>

               <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div className="space-y-1.5">
                        <label className="text-[0.85rem] font-bold text-gray-700">الاسم الكامل *</label>
                        <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 italic outline-none focus:border-blue-light focus:bg-white" placeholder="أدخل اسمك الكامل" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[0.85rem] font-bold text-gray-700">رقم الهاتف</label>
                        <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} type="tel" className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 italic outline-none focus:border-blue-light focus:bg-white" placeholder="+216 XX XXX XXX" />
                     </div>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[0.85rem] font-bold text-gray-700">البريد الإلكتروني *</label>
                     <input required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} type="email" className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 italic outline-none focus:border-blue-light focus:bg-white" placeholder="example@email.com" />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[0.85rem] font-bold text-gray-700">رسالتك *</label>
                     <textarea required value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full h-32 rounded-xl border border-gray-200 bg-gray-50 p-4 italic outline-none focus:border-blue-light focus:bg-white resize-none" placeholder="اكتب رسالتك هنا..."></textarea>
                  </div>
                  
                  <button 
                    disabled={loading}
                    className="w-full mt-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-light to-blue-brand py-4 font-black text-white text-lg shadow-xl shadow-blue-500/25 hover:-translate-y-1 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                    إرسال الرسالة
                  </button>
               </form>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="container mx-auto px-5 py-24">
           <div className="mb-14 text-center">
              <h2 className="text-3xl font-black text-blue-dark">الأسئلة الشائعة</h2>
           </div>
           
           <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              {faqs.map((faq, i) => (
                <div key={i} className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-blue-light cursor-pointer" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                   <div className="flex items-center justify-between gap-4 font-bold text-blue-dark">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-light flex items-center justify-center shrink-0">
                            <HelpCircle size={18} />
                         </div>
                         <span className="text-[0.95rem]">{faq.q}</span>
                      </div>
                      <ChevronDown className={cn("text-blue-light transition-transform", openFaq === i ? "rotate-180" : "rotate-0")} size={18} />
                   </div>
                   <div className={cn("overflow-hidden transition-all duration-300", openFaq === i ? "max-h-[300px] mt-4 pt-4 border-t border-gray-50" : "max-h-0")}>
                      <p className="text-[0.88rem] text-gray-600 leading-relaxed font-Tajawal">{faq.a}</p>
                   </div>
                </div>
              ))}
           </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
