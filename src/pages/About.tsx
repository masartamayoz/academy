import Navbar from '@/src/components/layout/Navbar';
import Footer from '@/src/components/layout/Footer';
import { Target, Users, Video, Calendar, Award, Clock, FileText, ShieldCheck, Smartphone, CheckCircle, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '@/src/components/common/SEO';

export default function About() {
  return (
    <div className="flex min-h-screen flex-col" dir="rtl">
      <SEO 
        title="من نحن | قصة وأهداف أكاديمية مسار التميز"
        description="تعرف على رؤية ورسالة أكاديمية مسار التميز، رائد الكفاءة البيداغوجية في تونس مادة الرياضيات. نسعى لتمكين غد أفضل للشباب والطلاب."
        keywords="أهداف مسار التميز, بيداغوجيا مادة الرياضيات تونس, مدرسين رياضيات تونس"
        canonical="https://academy.masartamayoz.com/about"
      />
      <Navbar />
      
      <main className="flex-1 font-Tajawal">
        {/* Page Hero */}
        <section className="bg-gradient-to-br from-blue-dark via-blue-mid to-blue-brand py-20 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,158,11,0.12)_0%,transparent_60%)]" />
          <div className="container mx-auto px-5 relative z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold-light/30 bg-gold-brand/15 px-4 py-1.5 text-[0.82rem] font-bold text-gold-light">
              <CheckCircle size={16} /> منصة تعليمية تونسية
            </div>
            <h1 className="mb-5 text-3xl font-black sm:text-4xl lg:text-5xl">
              نحن نؤمن بأن <span className="text-gold-brand">كل تلميذ</span> يستحق<br />التعليم الأفضل
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-white/75">
              أكاديمية مسار التميز — مشروع تعليمي تونسي يجمع بين جودة المحتوى وسهولة الوصول، مخصص لتلاميذ السنوات السابعة والثامنة والتاسعة أساسي.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="py-20 lg:py-28 bg-white">
          <div className="container mx-auto px-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-16">
              <div>
                <div className="mb-3.5 inline-block rounded-full bg-blue-50 px-4 py-1.5 text-[0.8rem] font-bold text-blue-light border border-blue-100">
                  <Target size={16} className="inline ltr:mr-1.5 rtl:ml-1.5" /> رسالتنا
                </div>
                <h2 className="mb-5 text-3xl font-black text-blue-dark lg:text-4xl">
                  نبني <span className="text-blue-light">جيلاً متميزاً</span><br />في الرياضيات
                </h2>
                <p className="text-[1rem] leading-relaxed text-gray-600 mb-6 font-Tajawal">
                  أسّسنا مسار التميز بهدف واحد واضح: تقديم تعليم رياضيات عالي الجودة لكل تلميذ تونسي، بغض النظر عن موقعه الجغرافي أو إمكانياته المادية.
                </p>
                <p className="text-[1rem] leading-relaxed text-gray-600 mb-9 font-Tajawal">
                  نؤمن أن الفهم الحقيقي للرياضيات يُبنى خطوة بخطوة، مع مدرّس متخصص وبيئة تعليمية تفاعلية ومحتوى متكامل.
                </p>
                <div className="flex flex-wrap gap-3.5">
                  <Link to="/pricing" className="rounded-xl bg-gold-brand px-7 py-3 font-bold text-blue-dark hover:bg-gold-light transition-all shadow-lg shadow-gold-brand/20">
                    اكتشف العروض
                  </Link>
                  <Link to="/contact" className="rounded-xl border border-gray-200 bg-white px-7 py-3 font-bold text-gray-600 hover:border-blue-light hover:text-blue-light transition-all">
                    تواصل معنا
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-10 bg-blue-dark rounded-[32px] relative overflow-hidden shadow-2xl">
                 <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-full" />
                 
                 {[
                   { icon: Users, color: 'text-gold-brand bg-white/10', num: '+500', label: 'تلميذ مستفيد' },
                   { icon: GraduationCap, color: 'text-emerald-400 bg-white/10', num: '3', label: 'مستويات دراسية' },
                   { icon: Video, color: 'text-blue-400 bg-white/10', num: '+200', label: 'درس وفرض مسجّل' },
                   { icon: Calendar, color: 'text-purple-400 bg-white/10', num: 'حصتان', label: 'أسبوعياً لكل مجموعة' },
                 ].map((stat, i) => (
                   <div key={i} className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                      <div className={stat.color + " w-12 h-12 rounded-xl flex items-center justify-center"}>
                        <stat.icon size={22} />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-white">{stat.num}</div>
                        <div className="text-[0.75rem] text-white/50">{stat.label}</div>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-5">
            <div className="mb-14 text-center">
              <span className="section-tag">قيمنا</span>
              <h2 className="text-3xl font-black text-blue-dark">ما الذي يميّزنا؟</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Award, color: 'bg-blue-100 text-blue-600', title: 'جودة المحتوى', desc: 'دروس مُعدَّة بعناية فائقة تغطي كامل البرنامج الرسمي بأسلوب واضح ومبسّط يضمن الفهم العميق.' },
                { icon: Clock, color: 'bg-amber-100 text-amber-600', title: 'التعلم في أي وقت', desc: 'سجّلاتنا متاحة على مدار الساعة — يتعلم التلميذ بالإيقاع الذي يناسبه ويُراجع الدروس كم مرة يشاء.' },
                { icon: Users, color: 'bg-emerald-100 text-emerald-600', title: 'حصص تفاعلية مباشرة', desc: 'مجموعات صغيرة لضمان الانتباه الكافي لكل تلميذ والتفاعل المباشر مع المدرّس وطرح الأسئلة.' },
                { icon: FileText, color: 'bg-purple-100 text-purple-600', title: 'موارد شاملة', desc: 'فروض مراقبة وفروض تأليفية وسلاسل تمارين محلولة لكل مستوى — كل ما يحتاجه التلميذ في مكان واحد.' },
                { icon: ShieldCheck, color: 'bg-red-100 text-red-600', title: 'شفافية ومصداقية', desc: 'أسعار واضحة بدون تكاليف خفية، وإمكانية متابعة الولي لأداء منظوره في كل وقت.' },
                { icon: Smartphone, color: 'bg-indigo-100 text-indigo-600', title: 'سهولة الوصول', desc: 'المنصة متاحة على كل الأجهزة — هاتف، تابلت، حاسوب — بدون تطبيق ولا تثبيت.' },
              ].map((value, i) => (
                <div key={i} className="group rounded-[24px] border border-gray-200 bg-white p-8 text-center transition-all hover:-translate-y-1.5 hover:shadow-2xl">
                   <div className={value.color + " mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] transition-transform group-hover:scale-110"}>
                     <value.icon size={28} />
                   </div>
                   <h3 className="mb-3 text-lg font-black text-blue-dark">{value.title}</h3>
                   <p className="text-[0.92rem] leading-relaxed text-gray-600">{value.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About the Academy Section */}
        <section className="py-20 bg-blue-dark text-white relative">
          <div className="container mx-auto px-5">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-4 rounded-3xl bg-white/5 border border-white/10 p-8 text-center backdrop-blur-lg">
                   <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white/20 bg-white p-2">
                      <img src="/logo.png" alt="مسار التميز" className="h-full w-full object-contain" />
                   </div>
                   <h3 className="text-xl font-bold mb-1">أكاديمية مسار التميز</h3>
                   <p className="text-gold-light text-sm font-semibold mb-6">تعليم الرياضيات عن بعد في تونس</p>
                   
                   <div className="space-y-3">
                      {[
                        { icon: GraduationCap, text: 'منصة تابعة لشبكة مسار التميز التعليمية' },
                        { icon: Award, text: 'دروس مشروحة وسلاسل تمارين متكاملة' },
                        { icon: Target, text: 'شرح مبسط يضمن الفهم والتفوق الدراسي' },
                        { icon: Users, text: 'متابعة بيداغوجية ودعم مستمر للتلاميذ' },
                      ].map((b, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white/5 p-3.5 rounded-xl text-[0.85rem] text-white/80">
                           <b.icon size={16} className="text-gold-light shrink-0" />
                           <span className="text-right leading-relaxed">{b.text}</span>
                        </div>
                      ))}
                   </div>
                </div>
                
                <div className="lg:col-span-8 lg:pt-5">
                   <div className="mb-6 inline-block rounded-full bg-white/10 px-4 py-1.5 text-[0.8rem] font-bold text-gold-light">
                      عن الأكاديمية
                   </div>
                   <h2 className="text-3xl font-black mb-6 leading-tight">شريككم الموثوق <span className="text-gold-brand">للتميز الدراسي</span></h2>
                   <div className="space-y-6 text-white/75 text-lg leading-relaxed font-Tajawal">
                      <p>
                        تعد أكاديمية مسار التميز منصة رائدة تابعة لشبكة مسار التميز التعليمية، ومتخصصة بالكامل في تقديم وتطوير محتوى تعليم مادة الرياضيات عن بعد بطرق بيداغوجية حديثة ومبتكرة تلائم تطلعات تلاميذنا وأولياء أمورهم في تونس.
                      </p>
                      <p>
                        نحن نسعى لتبسيط مفاهيم مادة الرياضيات لبناء أساس علمي متين لديهم. لا نهدف فقط لشرح المحتوى الرسمي والمناهج التونسية، بل لمساعدة التلميذ على اكتساب مهارات التفكير المنطقي والرياضي وحل المسائل بثقة تامة تضمن له التميز والارتقاء بنتائجه المدرسية في كل الامتحانات.
                      </p>
                   </div>
                   <div className="mt-10 border-r-4 border-gold-brand bg-gold-brand/10 p-6 rounded-l-2xl italic text-xl text-white/90">
                     "الأكاديمية حريصة كل الحرص على توفير محتوى بيداغوجي ذو جودة عالية، مع المتابعة المستمرة لضمان أفضل مسار نحو التفوق الدراسي."
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-white text-center">
           <div className="container mx-auto px-5">
              <h2 className="text-3xl font-black text-blue-dark mb-4 lg:text-4xl">مستعد للانضمام إلى <span className="text-blue-light">مسار التميز؟</span></h2>
              <p className="text-gray-600 mb-10 max-w-lg mx-auto">سجّل الآن مجاناً واكتشف عالماً من التعليم الجيد المصمم خصيصاً للتفوق.</p>
              <div className="flex flex-wrap justify-center gap-4">
                 <Link to="/auth#register" className="rounded-2xl bg-blue-light px-10 py-4 font-black text-white text-lg hover:bg-blue-brand hover:-translate-y-1 transition-all shadow-xl shadow-blue-500/25">
                   سجّل الآن مجاناً
                 </Link>
                 <Link to="/contact" className="rounded-2xl border-2 border-gray-200 bg-white px-10 py-4 font-black text-gray-700 text-lg hover:border-blue-light hover:text-blue-light transition-all">
                   تواصل معنا
                 </Link>
              </div>
           </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
