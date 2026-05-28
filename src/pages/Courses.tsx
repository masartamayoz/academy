import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db, auth } from '@/src/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Search, BookOpen, FileText, Play, Lock, X, 
  Loader2, Plus, Download, ExternalLink, File,
  Video, Award
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import AppShell from '@/src/components/layout/AppShell';
import SEO from '@/src/components/common/SEO';

export default function Courses() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [currentLevel, setCurrentLevel] = useState('7');
  const [currentType, setCurrentType] = useState('lesson');
  const [allContent, setAllContent] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewerItem, setViewerOpened] = useState<any | null>(null);
  const [activeRes, setActiveRes] = useState<{type: 'video' | 'pdf', url: string, name: string} | null>(null);

  const LEVELS: Record<string, string> = { 
    '7': 'السنة السابعة أساسي', 
    '8': 'السنة الثامنة أساسي', 
    '9': 'السنة التاسعة أساسي',
    '1sec': 'الأولى ثانوي',
    '2sec': 'الثانية ثانوي',
    '3sec': 'الثالثة ثانوي',
    '4sec': 'الرابعة ثانوي (باكالوريا)'
  };
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          const d = snap.data();
          setUserData(d);
          if (d.level) setCurrentLevel(d.level);
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (userData) {
      loadContent();
    }
  }, [currentLevel, currentType, userData]);

  useEffect(() => {
    if (viewerItem) {
      const vUrls = viewerItem.videoUrls || (viewerItem.videoUrl ? [viewerItem.videoUrl] : []);
      if (vUrls.length > 0 && vUrls[0]) {
        setActiveRes({ type: 'video', url: vUrls[0], name: 'شرح الفيديو' });
      } else if (viewerItem.pdfText) {
        setActiveRes({ type: 'pdf', url: viewerItem.pdfText, name: 'الوثيقة التعليمية' });
      } else if (viewerItem.pdfSolution) {
        setActiveRes({ type: 'pdf', url: viewerItem.pdfSolution, name: 'الإصلاح النموذجي' });
      }
    } else {
      setActiveRes(null);
    }
  }, [viewerItem]);

  const loadContent = async () => {
    let targetLevel = currentLevel;
    if (userData?.userType === 'student' && userData?.level) {
      targetLevel = userData.level;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, 'videos'), 
        where('level', '==', String(targetLevel)), 
        where('type', '==', currentType)
      );
      const snap = await getDocs(q);
      
      // Sort in-memory instead
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => {
        // Sort by order primarily (ascending)
        if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
           return a.order - b.order;
        }
        // Fallback to createdAt (descending)
        const timeA = a.createdAt?.toMillis?.() || a.createdAt || 0;
        const timeB = b.createdAt?.toMillis?.() || b.createdAt || 0;
        return timeB - timeA;
      });

      setAllContent(docs);
    } catch (err) {
      console.error(err);
      setAllContent([]);
    } finally {
      setLoading(false);
    }
  };

  const hasAugustReviewAccess = (() => {
    if (!userData || (userData.planId !== 'august_review' && userData.plan !== 'august_review')) return false;
    const now = new Date();
    const year = now.getFullYear();
    const start = new Date(year, 4, 20); // 20 May (month 4 is May)
    const end = new Date(year, 7, 31, 23, 59, 59); // 31 August (month 7 is August)
    return now >= start && now <= end;
  })();

  const isSubscribed = userData?.subscriptionStatus === 'active' || hasAugustReviewAccess;
  const filtered = allContent.filter(c => 
    c.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.chapter?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const extractYTId = (url: string) => {
    const m = (url || '').match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  };

  return (
    <AppShell 
      title="مكتبة الدروس" 
      description={`اكتشف المحتوى التعليمي لـ ${LEVELS[currentLevel]}`}
    >
      <SEO 
        title={`مكتبة الدروس والتمارين - ${LEVELS[currentLevel] || 'جميع المستويات'}`}
        description={`تصفح وحمل جميع ملخصات مادة الرياضيات، سلاسل التمارين مع الإصلاح، ونماذج الفروض المدرسية لـ ${LEVELS[currentLevel] || 'جميع المستويات الإعدادية والثانوية'} في تونس.`}
        keywords={`اصلاح تمارين رياضيات تونس, ${LEVELS[currentLevel] || 'الرياضيات تونس'}, فروض مراقبة رياضيات, فروض تأليفية رياضيات`}
        canonical={`https://academy.masartamayoz.com/courses?level=${currentLevel}`}
        schema={{
          "@context": "https://schema.org",
          "@type": "Course",
          "name": `مادة الرياضيات - ${LEVELS[currentLevel] || 'جميع المستويات الدراسيّة'}`,
          "description": `دروس وشروحات مصورة لتبسيط مادة الرياضيات لبرنامج وزارة التربية التونسية لـ ${LEVELS[currentLevel] || 'تلاميذ الإعدادي والثانوي'}.`,
          "provider": {
            "@type": "EducationalOrganization",
            "name": "أكاديمية مسار التميز",
            "sameAs": "https://academy.masartamayoz.com"
          }
        }}
      />
      <div className="flex h-full overflow-hidden bg-gray-50/50">
        {/* Content Filtering Sidebar - Modernized */}
        <aside className="w-[300px] border-l border-gray-100 bg-white hidden lg:flex flex-col shadow-sm">
          <div className="p-8 border-b border-gray-50 bg-gradient-to-br from-blue-dark to-blue-mid">
             <label className="text-[0.65rem] font-black uppercase tracking-[0.15em] text-white/40 mb-4 block">المستوى الدراسي (أساسي)</label>
             <div className="flex gap-2 mb-6">
               {['7', '8', '9'].map(lvl => {
                 const isSameLevel = lvl === String(userData?.level);
                 const canAccess = userData?.userType === 'admin' || userData?.userType === 'teacher' || isSameLevel;
                 
                 return (
                   <button 
                    key={lvl} 
                    disabled={!canAccess}
                    onClick={() => canAccess && setCurrentLevel(lvl)} 
                    className={cn(
                      "flex-1 rounded-[18px] py-3 text-[1rem] font-black transition-all duration-300 relative", 
                      currentLevel === lvl 
                        ? "bg-gold-brand text-blue-dark shadow-lg shadow-gold-brand/20 scale-105" 
                        : "bg-white/10 text-white hover:bg-white/20 border border-white/10",
                      !canAccess && "opacity-40 cursor-not-allowed grayscale"
                    )}
                   >
                     {lvl}
                     {!canAccess && (
                       <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 shadow-lg flex items-center justify-center">
                         <Lock size={8} className="text-white" />
                       </div>
                     )}
                   </button>
                 );
               })}
             </div>

             <label className="text-[0.65rem] font-black uppercase tracking-[0.15em] text-white/40 mb-4 block">المستوى الدراسي (ثانوي)</label>
             <div className="grid grid-cols-2 gap-2">
               {['1sec', '2sec', '3sec', '4sec'].map(lvl => {
                 const isSameLevel = lvl === String(userData?.level);
                 const canAccess = userData?.userType === 'admin' || userData?.userType === 'teacher' || isSameLevel;
                 
                 return (
                   <button 
                    key={lvl} 
                    disabled={!canAccess}
                    onClick={() => canAccess && setCurrentLevel(lvl)} 
                    className={cn(
                      "rounded-[14px] py-2.5 text-[0.8rem] font-black transition-all duration-300 relative", 
                      currentLevel === lvl 
                        ? "bg-gold-brand text-blue-dark shadow-lg shadow-gold-brand/20" 
                        : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/5",
                      !canAccess && "opacity-40 cursor-not-allowed grayscale"
                    )}
                   >
                     {lvl === '1sec' ? '1 ثانوي' : lvl === '2sec' ? '2 ثانوي' : lvl === '3sec' ? '3 ثانوي' : 'باكالوريا'}
                     {!canAccess && (
                       <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 shadow-lg flex items-center justify-center">
                         <Lock size={6} className="text-white" />
                       </div>
                     )}
                   </button>
                 );
               })}
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
             <div className="space-y-1.5">
               <p className="px-3 text-[0.65rem] font-black uppercase tracking-widest text-gray-400 mb-2">المحتوى التعليمي</p>
               <SidebarItem id="lesson" icon={BookOpen} label="الدروس المشروحة" current={currentType} onClick={setCurrentType} />
               <SidebarItem id="exercise" icon={FileText} label="سلاسل التمارين" current={currentType} onClick={setCurrentType} />
             </div>

             <div className="space-y-1.5">
               <p className="px-3 text-[0.65rem] font-black uppercase tracking-widest text-gray-400 mb-2">الفروض والاختبارات</p>
               <SidebarItem id="assignment" icon={FileText} label="فروض المراقبة" current={currentType} onClick={setCurrentType} />
               <SidebarItem id="synthesis" icon={FileText} label="الفروض التأليفية" current={currentType} onClick={setCurrentType} />
             </div>
          </div>
          
          <div className="p-6 border-t border-gray-50 bg-gray-50/30">
             <div className="rounded-2xl bg-blue-dark p-4 text-white">
                <p className="text-[0.65rem] font-bold text-blue-light uppercase mb-1">دعم فني</p>
                <p className="text-xs font-medium text-white/70 leading-relaxed mb-3">هل تواجه مشكلة في الوصول للدروس؟</p>
                <button className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-black transition-all">تواصل معنا</button>
             </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex items-center justify-between border-b border-gray-100 bg-white p-5 px-8 shadow-sm relative z-10">
             <div className="relative max-w-lg flex-1">
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full rounded-[20px] border border-gray-100 bg-gray-50/50 p-3.5 pr-12 text-sm font-bold outline-none focus:border-blue-light focus:bg-white transition-all shadow-inner" 
                  placeholder="ابحث عن درس، محور، أو تمرين..." 
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             </div>
             
             <div className="flex items-center gap-3">
                {userData?.userType === 'admin' && (
                  <button 
                    onClick={() => navigate('/dashboard?tab=content')} 
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-dark text-white text-[0.8rem] font-black hover:bg-black transition-all shadow-lg shadow-blue-900/10"
                  >
                    <Plus size={16} />
                    <span>إضافة محتوى</span>
                  </button>
                )}
                
                <div className="hidden xl:flex items-center gap-2 text-[0.7rem] font-black text-gray-400 uppercase bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                   <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                   {filtered.length} عنصر متوفر
                </div>
                
                <div className="lg:hidden">
                   {userData?.userType === 'student' && userData?.level ? (
                     <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold-brand/10 border border-gold-brand/20 text-xs font-black text-blue-dark shadow-sm">
                       <Lock size={12} className="text-gold-brand shrink-0" />
                       <span>{LEVELS[userData.level] || userData.level}</span>
                     </div>
                   ) : (
                     <select 
                      value={currentLevel} 
                      onChange={e => setCurrentLevel(e.target.value)} 
                      className="rounded-xl border border-gray-100 bg-white px-4 py-2 text-xs font-black text-blue-dark outline-none cursor-pointer focus:border-blue-brand transition-colors shadow-sm"
                     >
                       <option value="7">السنة السابعة</option>
                       <option value="8">السنة الثامنة</option>
                       <option value="9">السنة التاسعة</option>
                       <option value="1sec">السنة الأولى ثانوي</option>
                       <option value="2sec">السنة الثانية ثانوي</option>
                       <option value="3sec">السنة الثالثة ثانوي</option>
                       <option value="4sec">باكالوريا</option>
                     </select>
                   )}
                </div>
             </div>
          </div>

          {/* Mobile content categories scroll bar */}
          <div className="lg:hidden flex items-center justify-start gap-2 overflow-x-auto px-6 py-3.5 bg-white border-b border-gray-100/80 scrollbar-none shrink-0 border-t border-gray-50" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style dangerouslySetInnerHTML={{__html: `
              .scrollbar-none::-webkit-scrollbar {
                display: none;
              }
            `}} />
            <div className="flex gap-2 min-w-max">
              {[
                { id: 'lesson', label: 'الدروس المشروحة', icon: BookOpen },
                { id: 'exercise', label: 'سلاسل التمارين', icon: FileText },
                { id: 'assignment', label: 'فروض المراقبة', icon: FileText },
                { id: 'synthesis', label: 'الفروض التأليفية', icon: Award }
              ].map(subItem => {
                const Icon = subItem.icon;
                const active = currentType === subItem.id;
                return (
                  <button
                    key={subItem.id}
                    onClick={() => setCurrentType(subItem.id)}
                    className={cn(
                      "flex items-center gap-2 px-4.5 py-2.5 rounded-2xl text-[0.78rem] font-bold transition-all border",
                      active
                        ? "bg-blue-dark text-white border-blue-dark shadow-sm"
                        : "bg-gray-50/50 text-gray-500 border-gray-100 hover:bg-gray-100/50 hover:text-blue-dark"
                    )}
                  >
                    <Icon size={14} className={active ? "text-gold-brand" : "text-gray-400"} />
                    <span>{subItem.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto animate-spin text-blue-light" size={48} />
                  <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest">جاري تحميل المحتوى...</p>
                </div>
              </div>
            ) : filtered.length > 0 ? (
              <div className="space-y-16 pb-20">
                {[
                  { id: 'algebra', label: 'الجبر / ALGÈBRE' },
                  { id: 'geometry', label: 'الهندسة / GÉOMÉTRIE' },
                  { id: 'stats', label: 'إحصاءات واحتمالات / STATISTIQUES' },
                  { id: 'general', label: 'عام / GÉNÉRAL' },
                ].map(cat => {
                   const catItems = filtered.filter(item => {
                     const itemCat = item.category || 'general';
                     return itemCat === cat.id;
                   });
                   
                   if (catItems.length === 0) return null;
                   
                   return (
                     <div key={cat.id} className="space-y-8">
                        <div className="flex items-center gap-6">
                           <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-200 to-gray-200" />
                           <div className="flex flex-col items-center">
                              <h2 className="text-xl font-black text-blue-dark tracking-tight">{cat.label}</h2>
                              <div className="h-1 w-8 bg-gold-brand mt-1 rounded-full" />
                           </div>
                           <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-gray-200" />
                        </div>

                        <div className="flex flex-col gap-4 px-2">
                          {catItems.map((item, idx) => (
                            <div 
                              key={item.id} 
                              className="group relative flex flex-col md:flex-row items-center gap-6 p-4 rounded-[28px] border border-gray-100 bg-white transition-all duration-500 hover:shadow-[0_15px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1"
                            >
                              {/* Thumbnail Section */}
                              <div 
                                className="relative w-full md:w-[180px] aspect-[16/10] rounded-[20px] bg-blue-dark cursor-pointer overflow-hidden shrink-0" 
                                onClick={() => (isSubscribed || item.isFree) && setViewerOpened(item)}
                              >
                                {extractYTId(item.videoUrls?.[0] || item.videoUrl) ? (
                                  <img 
                                    src={`https://img.youtube.com/vi/${extractYTId(item.videoUrls?.[0] || item.videoUrl)}/hqdefault.jpg`} 
                                    className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110" 
                                    alt={item.title}
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-white/10">
                                    <FileText size={32} strokeWidth={1} />
                                  </div>
                                )}
                                
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                                
                                {item.isFree && (
                                  <span className="absolute top-2 right-2 rounded-lg bg-gold-brand px-2 py-0.5 text-[0.55rem] font-black text-blue-dark shadow-lg">مجاني</span>
                                )}

                                {(isSubscribed || item.isFree) && (
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-75 group-hover:scale-100">
                                      <div className="h-10 w-10 rounded-full bg-white text-blue-dark flex items-center justify-center shadow-xl">
                                          <Play fill="currentColor" size={16} className="mr-0.5" />
                                      </div>
                                  </div>
                                )}

                                {(!isSubscribed && !item.isFree) && (
                                  <div className="absolute inset-0 bg-blue-dark/60 backdrop-blur-[2px] flex items-center justify-center">
                                    <Lock size={18} className="text-gold-brand" />
                                  </div>
                                )}
                              </div>
                              
                              {/* Content Info */}
                              <div className="flex-1 min-w-0 flex flex-col md:flex-row items-center gap-6 w-full">
                                 {/* Order Number */}
                                 <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-gray-50 border border-gray-100 text-blue-dark shrink-0">
                                    <span className="text-[0.6rem] font-black text-gray-400 uppercase leading-none mb-1">الرقم</span>
                                    <span className="text-sm font-black leading-none">{item.order || (idx + 1)}</span>
                                 </div>

                                 <div className="flex-1 text-center md:text-right min-w-0">
                                    <div className="flex items-center justify-center md:justify-start gap-2 mb-1.5">
                                       <span className="text-[0.65rem] font-black text-blue-light uppercase tracking-wider">{item.chapter}</span>
                                       <span className="w-1 h-1 rounded-full bg-gray-200" />
                                       <span className="text-[0.65rem] font-bold text-gray-400">
                                          {item.type === 'lesson' ? 'درس فيديو' : item.type === 'exercise' ? 'سلسلة تمارين' : 'نموذج فرض'}
                                       </span>
                                    </div>
                                    <h4 className="text-[0.95rem] font-black text-blue-dark truncate leading-tight tracking-tight group-hover:text-blue-brand transition-colors">
                                       {item.title}
                                    </h4>
                                 </div>

                                 <div className="shrink-0 w-full md:w-auto">
                                    <button 
                                      onClick={() => (isSubscribed || item.isFree) && setViewerOpened(item)} 
                                      className={cn(
                                        "w-full md:w-[140px] flex items-center justify-center gap-2.5 rounded-[18px] py-3.5 text-[0.8rem] font-black transition-all duration-300",
                                        isSubscribed || item.isFree 
                                          ? "bg-blue-dark text-white hover:bg-blue-brand shadow-lg hover:shadow-blue-900/20" 
                                          : "bg-gray-50 text-gray-400 cursor-not-allowed"
                                      )}
                                    >
                                        {isSubscribed || item.isFree ? (
                                          <>
                                              <Play size={12} fill="currentColor" />
                                              <span>شاهد الآن</span>
                                          </>
                                        ) : (
                                          <>
                                            <Lock size={12} />
                                            <span>محتوى مقفل</span>
                                          </>
                                        )}
                                    </button>
                                 </div>
                              </div>
                            </div>
                          ))}
                        </div>
                     </div>
                   );
                })}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center flex-col text-gray-300 animate-in fade-in slide-in-from-bottom-5 duration-700">
                <div className="h-24 w-24 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-6">
                   <BookOpen size={48} strokeWidth={1} className="text-gray-200" />
                </div>
                <p className="font-black text-xl text-blue-dark/20 italic">لم نجد محتوى يطابق بحثك</p>
                <p className="text-sm font-bold text-gray-400 mt-2">جرب البحث بكلمات أخرى أو تغيير القسم</p>
                <button onClick={() => {setSearchTerm(''); setCurrentType('lesson');}} className="mt-6 px-8 py-3 rounded-2xl bg-blue-dark text-white text-xs font-black hover:scale-105 transition-all">إعادة ضبط البحث</button>
              </div>
            )}
          </div>
        </main>
      </div>

      {viewerItem && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500">
           <div className="relative w-full h-full flex flex-col lg:flex-row overflow-hidden">
              
              {/* Main Stage (Player/PDF) */}
              <div className="flex-1 h-full flex flex-col bg-black">
                 {/* Top Controls Overlay */}
                 <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-6 px-10 bg-gradient-to-b from-black/80 to-transparent">
                    <div className="flex items-center gap-5">
                       <button onClick={() => setViewerOpened(null)} className="h-12 w-12 rounded-2xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all border border-white/20 group">
                          <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                       </button>
                       <div>
                          <h3 className="font-black text-white text-xl tracking-tight leading-none">{viewerItem.title}</h3>
                          <div className="flex items-center gap-3 mt-2">
                             <span className="text-[0.65rem] font-black text-gold-light uppercase tracking-widest bg-gold-brand/10 px-2 py-0.5 rounded border border-gold-brand/20">{LEVELS[viewerItem.level]}</span>
                             <span className="text-[0.65rem] text-white/40 font-bold">{viewerItem.chapter}</span>
                          </div>
                       </div>
                    </div>

                    <div className="flex items-center gap-4">
                       {activeRes?.type === 'pdf' && (
                          <>
                            <a 
                              href={activeRes.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="hidden sm:flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white text-white hover:text-blue-dark font-black text-xs transition-all border border-white/10"
                            >
                               <ExternalLink size={16} />
                               <span>فتح في نافذة مستقلة</span>
                            </a>
                            <a 
                              href={activeRes.url} 
                              download
                              className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gold-brand hover:bg-gold-light text-blue-dark font-black text-xs transition-all shadow-lg shadow-gold-500/20"
                            >
                               <Download size={16} />
                               <span>تحميل الوثيقة</span>
                            </a>
                          </>
                       )}
                    </div>
                 </div>

                 {/* Content Frame */}
                 <div className="flex-1 flex items-center justify-center relative pt-24 lg:pt-0">
                    {activeRes?.type === 'video' ? (
                       <div className="w-full h-full">
                          <iframe 
                            className="w-full h-full shadow-[0_0_100px_rgba(37,99,235,0.1)]" 
                            src={`https://www.youtube.com/embed/${extractYTId(activeRes.url)}?rel=0&autoplay=1&modestbranding=1&showinfo=0`} 
                            allowFullScreen 
                            allow="autoplay"
                          />
                       </div>
                    ) : activeRes?.type === 'pdf' ? (
                       <div className="w-full h-full bg-[#1a1a1a] flex flex-col">
                          <div className="flex-1 relative">
                             <iframe 
                               className="w-full h-full border-none" 
                               src={`https://docs.google.com/viewer?url=${encodeURIComponent(activeRes.url)}&embedded=true`} 
                               title={activeRes.name}
                             />
                             {/* Overlay to catch clicks if needed or add custom zoom but simple iframe is better */}
                          </div>
                       </div>
                    ) : (
                       <div className="text-white/20 flex flex-col items-center gap-5">
                          <Loader2 className="animate-spin" size={48} />
                          <p className="font-black text-sm uppercase tracking-widest">جاري تجهيز المصدر تعليمي...</p>
                       </div>
                    )}
                 </div>
              </div>

              {/* Enhanced Resource Sidebar */}
              <aside className="w-full lg:w-[400px] h-full bg-blue-dark border-r border-white/5 flex flex-col shadow-2xl relative z-40">
                 <div className="p-8 border-b border-white/5 bg-white/5">
                    <p className="text-[0.65rem] font-black text-blue-light uppercase tracking-[0.2em] mb-4">قائمة المحتويات</p>
                    <div className="flex items-center justify-between">
                       <h4 className="text-white font-black text-lg">مصادر الدرس</h4>
                       <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    </div>
                 </div>

                 <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Multiple Videos Support */}
                    {(viewerItem.videoUrls || (viewerItem.videoUrl ? [viewerItem.videoUrl] : [])).map((url: string, idx: number) => url && (
                       <ResourceButton 
                          key={`vid-${idx}`}
                          icon={Video} 
                          title={idx === 0 ? "شرح بالفيديو" : `فيديو إضافي ${idx + 1}`} 
                          sub="الحل المفصل والمنهجية" 
                          active={activeRes?.url === url} 
                          onClick={() => setActiveRes({ type: 'video', url, name: idx === 0 ? 'شرح الفيديو' : `فيديو ${idx + 1}` })}
                       />
                    ))}

                    {/* Lesson / Text PDF */}
                    {viewerItem.pdfText && (
                       <ResourceButton 
                          icon={FileText} 
                          title={viewerItem.type === 'lesson' ? "ملخص الدرس" : "نص التمرين / الفرض"} 
                          sub="وثيقة بصيغة PDF" 
                          active={activeRes?.url === viewerItem.pdfText} 
                          onClick={() => setActiveRes({ type: 'pdf', url: viewerItem.pdfText, name: 'الوثيقة التعليمية' })}
                       />
                    )}

                    {/* Solution PDF */}
                    {viewerItem.pdfSolution && (
                       <ResourceButton 
                          icon={Award} 
                          title="الإصلاح النموذجي" 
                          sub="النتائج والتعليلات" 
                          active={activeRes?.url === viewerItem.pdfSolution} 
                          onClick={() => setActiveRes({ type: 'pdf', url: viewerItem.pdfSolution, name: 'الإصلاح النموذجي' })}
                       />
                    )}

                    {/* Backwards compatibility / Other fields */}
                    {viewerItem.pdfUrl && !viewerItem.pdfText && (
                       <ResourceButton 
                          icon={FileText} 
                          title="الوثيقة التعليمية" 
                          sub="قواعد هامة وملخصات" 
                          active={activeRes?.url === viewerItem.pdfUrl} 
                          onClick={() => setActiveRes({ type: 'pdf', url: viewerItem.pdfUrl, name: 'الوثيقة التعليمية' })}
                       />
                    )}

                    <div className="mt-10 p-6 rounded-[24px] bg-gradient-to-br from-blue-brand/20 to-transparent border border-white/5">
                       <BookOpen className="text-gold-brand mb-4" size={24} />
                       <p className="text-white font-black text-sm mb-2">نصيحة مسار التميز</p>
                       <p className="text-[0.75rem] text-white/50 leading-relaxed">
                          ننصحك بمشاهدة الفيديو بالكامل أولاً، ثم محاولة حل التمارين بمفردك قبل الإطلاع على الإصلاح لضمان أفضل استيعاب للمعلومة.
                       </p>
                    </div>
                 </div>

                 <div className="p-8 border-t border-white/5 text-center">
                    <p className="text-[0.6rem] font-bold text-white/20 uppercase tracking-widest">جميع الحقوق محفوظة © أكاديمية مسار التميز</p>
                 </div>
              </aside>

           </div>
        </div>
      )}
    </AppShell>
  );
}

function ResourceButton({ icon: Icon, title, sub, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-5 p-5 rounded-[24px] border transition-all duration-500 group",
        active 
          ? "bg-white/10 border-blue-light shadow-xl shadow-blue-500/10 scale-[1.02]" 
          : "bg-transparent border-white/5 hover:bg-white/5 hover:border-white/10"
      )}
    >
      <div className={cn(
        "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110 shadow-lg",
        active ? "bg-blue-light text-white" : "bg-white/5 text-white/40 group-hover:text-white"
      )}>
        <Icon size={22} strokeWidth={2.5} />
      </div>
      <div className="text-right overflow-hidden">
        <p className={cn("font-black text-[0.9rem] truncate transition-colors", active ? "text-white" : "text-white/60")}>{title}</p>
        <p className="text-[0.68rem] text-white/30 font-bold truncate mt-1">{sub}</p>
      </div>
      {active && (
         <div className="mr-auto h-2 w-2 rounded-full bg-gold-brand shadow-[0_0_10px_rgba(245,158,11,0.4)]" />
      )}
    </button>
  );
}

function SidebarItem({ id, icon: Icon, label, current, onClick }: any) {
  const active = current === id;
  return (
    <button onClick={() => onClick(id)} className={cn("w-full flex items-center gap-3.5 p-3 rounded-xl transition-all", active ? "bg-blue-light text-white shadow-md shadow-blue-500/10" : "text-gray-500 hover:bg-gray-50 hover:text-blue-dark")}>
      <Icon size={18} className={cn(active ? "text-white" : "text-gray-400")} />
      <span className="text-[0.92rem] font-bold">{label}</span>
    </button>
  );
}
