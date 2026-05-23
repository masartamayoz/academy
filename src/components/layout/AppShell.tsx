import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, query, collection, where, onSnapshot } from 'firebase/firestore';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Loader2, Menu, Search, Bell, Wallet, Trophy, User as UserIcon, LayoutDashboard, BookOpen } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function AppShell({ children, title, description }: AppShellProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        navigate('/auth');
        return;
      }
      setUser(authUser);
      try {
        let snap = await getDoc(doc(db, 'users', authUser.uid));
        const isAdminEmail = authUser.email === 'masartamayoz@gmail.com' || authUser.email === 'academy.masartamayoz@gmail.com';
        
        if (!snap.exists() && isAdminEmail) {
          // Auto create user admin document if it doesn't exist
          const adminData = {
            firstName: 'المشرف',
            lastName: 'العام',
            email: authUser.email,
            userType: 'admin',
            subscriptionStatus: 'active',
            createdAt: new Date()
          };
          await setDoc(doc(db, 'users', authUser.uid), adminData);
          snap = await getDoc(doc(db, 'users', authUser.uid));
        }

        if (snap.exists()) {
          const data = snap.data();
          if (isAdminEmail && data.userType !== 'admin') {
             data.userType = 'admin';
             await updateDoc(doc(db, 'users', authUser.uid), {
                userType: 'admin'
             });
          }
          // Check for subscription expiry
          if (data.userType === 'student' && data.subscriptionExpiry && data.subscriptionStatus === 'active') {
             const expiry = new Date(data.subscriptionExpiry);
             if (expiry < new Date()) {
                data.subscriptionStatus = 'inactive';
                // Trigger a firestore update as well to keep it consistent
                await updateDoc(doc(db, 'users', authUser.uid), {
                   subscriptionStatus: 'inactive'
                });
             }
          }
          setUserData(data);
        } else {
          navigate('/auth#register');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'messages'),
      where('recipientId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: any[] = [];
      let unread = 0;
      snapshot.forEach((doc) => {
        const d = doc.data();
        msgs.push({ id: doc.id, ...d });
        if (!d.isRead) {
          unread++;
        }
      });
      // Client side sort by createdAt desc to avoid composite index query failures
      msgs.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      setNotifications(msgs);
      setUnreadCount(unread);
    }, (error) => {
      console.error("Notifications listener failure:", error);
    });
    return () => unsubscribe();
  }, [user]);

  const handleMarkAsRead = async (msgId: string) => {
    try {
      await updateDoc(doc(db, 'messages', msgId), {
        isRead: true
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const promises = notifications
        .filter(n => !n.isRead)
        .map(n => updateDoc(doc(db, 'messages', n.id), { isRead: true }));
      await Promise.all(promises);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-blue-dark">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-gold-brand" />
          <p className="mt-4 font-Tajawal text-white/70 tracking-widest text-xs uppercase font-black">جاري تحضير القاعة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]" dir="rtl">
      <Sidebar 
        user={user} 
        userData={userData} 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Modern Header Inspired by Taki Academy */}
        <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-100 bg-white/80 p-3 px-6 backdrop-blur-md">
           <div className="flex items-center gap-4 flex-1">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-400 hover:text-blue-dark hover:bg-gray-50 rounded-xl transition-all"
              >
                <Menu size={20} />
              </button>
              
              {/* Search Bar */}
              <div className="relative max-w-md w-full hidden md:block">
                 <input 
                  type="text" 
                  placeholder="ابحث عن دروس، أساتذة، أو مواد..." 
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 p-2.5 pr-10 text-[0.82rem] font-bold outline-none focus:border-blue-light focus:bg-white transition-all"
                 />
                 <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              {/* Wallet/Points - Role specific ideally, but showing generic for now */}
              <div className="hidden sm:flex items-center gap-4 ml-6">
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-blue-50/50 border border-blue-100/30 relative overflow-hidden">
                    <div className="h-7 w-7 rounded-lg bg-blue-brand/10 flex items-center justify-center text-blue-brand">
                       <Wallet size={14} />
                    </div>
                    <div className="pl-4">
                       <p className="text-[0.6rem] font-black text-gray-400 uppercase leading-none">الرصيد</p>
                       <p className="text-xs font-black text-blue-dark/50 font-Tajawal">0.000 <span className="text-[0.65rem] text-blue-light/50">د.ت</span></p>
                    </div>
                    <span className="absolute left-0 top-0 bg-amber-500 text-white text-[0.485rem] font-bold px-1.5 py-0.5 rounded-br font-Tajawal animate-pulse">قريباً</span>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-50/50 border border-amber-100/30 relative overflow-hidden">
                    <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                       <Trophy size={14} />
                    </div>
                    <div className="pl-4">
                       <p className="text-[0.6rem] font-black text-gray-400 uppercase leading-none font-Tajawal">النقاط</p>
                       <p className="text-xs font-black text-amber-700/50">0 <span className="text-[0.65rem] text-amber-500/50">نقطة</span></p>
                    </div>
                    <span className="absolute left-0 top-0 bg-amber-500 text-white text-[0.485rem] font-bold px-1.5 py-0.5 rounded-br font-Tajawal animate-pulse">قريباً</span>
                 </div>
              </div>

              <div className="flex items-center gap-2 relative">
                 <button 
                   onClick={() => setShowNotifications(!showNotifications)}
                   className="relative h-10 w-10 flex items-center justify-center rounded-2xl text-gray-400 hover:bg-gray-50 hover:text-blue-dark transition-all focus:outline-none"
                 >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[0.55rem] font-black text-white ring-2 ring-white">
                        {unreadCount}
                      </span>
                    )}
                 </button>

                 <AnimatePresence>
                   {showNotifications && (
                     <motion.div 
                       initial={{ opacity: 0, y: 10, scale: 0.95 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       exit={{ opacity: 0, y: 10, scale: 0.95 }}
                       className="absolute left-0 top-12 w-80 md:w-[350px] rounded-3xl border border-gray-100 bg-white p-5 shadow-2xl z-50 text-right"
                     >
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 font-Tajawal">
                           <span className="text-xs font-black text-blue-dark">الإشعارات ({unreadCount})</span>
                           {unreadCount > 0 && (
                             <button 
                               onClick={handleMarkAllAsRead}
                               className="text-[0.65rem] font-bold text-blue-light hover:text-blue-brand transition-colors"
                             >
                               تحديد الكل كمقروء
                             </button>
                           )}
                        </div>

                        <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-0.5 font-Tajawal">
                           {notifications.length > 0 ? (
                             notifications.map((n) => (
                               <div 
                                 key={n.id} 
                                 onClick={() => handleMarkAsRead(n.id)}
                                 className={cn(
                                   "p-3 rounded-2xl text-[0.76rem] transition-all cursor-pointer border border-transparent",
                                   n.isRead ? "bg-gray-50/50 hover:bg-gray-50" : "bg-blue-50/40 hover:bg-blue-50/80 border-blue-50/50 shadow-sm"
                                 )}
                               >
                                  <div className="flex items-start gap-2">
                                     <div className={cn(
                                        "h-6 w-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                        n.type === 'success' ? "bg-emerald-50 text-emerald-600" :
                                        n.type === 'warning' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-brand"
                                     )}>
                                        <Bell size={11} />
                                     </div>
                                     <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                           <p className="font-extrabold text-blue-dark truncate text-[0.78rem]">{n.title}</p>
                                           {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-blue-brand shrink-0" />}
                                        </div>
                                        <p className="text-gray-500 leading-relaxed text-[0.7rem]">{n.content}</p>
                                        <p className="text-[0.55rem] text-gray-400 mt-1 font-semibold text-left">
                                           {n.createdAt ? new Date(n.createdAt.toDate ? n.createdAt.toDate() : n.createdAt).toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' }) : 'الآن'}
                                        </p>
                                     </div>
                                  </div>
                               </div>
                             ))
                           ) : (
                             <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-2">
                                   <Bell size={16} />
                                </div>
                                <p className="text-[0.7rem] font-bold">لا توجد إشعارات حالياً</p>
                                <p className="text-[0.6rem] text-gray-300 mt-1">كل شيء هادئ هنا!</p>
                             </div>
                           )}
                        </div>
                     </motion.div>
                   )}
                 </AnimatePresence>

                 <Link to="/profile" className="h-10 w-10 overflow-hidden rounded-2xl bg-blue-dark border-2 border-white shadow-sm flex items-center justify-center text-white text-xs font-black uppercase">
                    {userData?.displayName?.charAt(0) || <UserIcon size={18} />}
                 </Link>
              </div>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto font-Tajawal bg-[#F8FAFC] pb-24 lg:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-gray-100 bg-white/95 p-3 backdrop-blur-md lg:hidden">
           {[
             { id: 'overview', icon: LayoutDashboard, label: 'لوحة التحكم', href: '/dashboard' },
             { id: 'courses', icon: BookOpen, label: 'دروسي', href: '/courses' },
             { id: 'wallet', icon: Wallet, label: 'المحفظة', href: '/dashboard?tab=wallet' },
             { id: 'profile', icon: UserIcon, label: 'حسابي', href: '/profile' }
           ].map((item) => {
             const searchTab = new URLSearchParams(window.location.search).get('tab') || 'overview';
             const isActive = window.location.pathname === item.href || 
                             (window.location.pathname === '/dashboard' && searchTab === item.id);

             return (
               <Link 
                 key={item.id} 
                 to={item.href}
                 className={cn(
                   "flex flex-col items-center gap-1 transition-all",
                   isActive ? "text-blue-brand" : "text-gray-400"
                 )}
               >
                 <div className={cn(
                   "flex h-10 w-10 items-center justify-center rounded-2xl transition-all",
                   isActive ? "bg-blue-50" : "bg-transparent"
                 )}>
                   <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                 </div>
                 <span className="text-[0.62rem] font-black uppercase tracking-tighter">{item.label}</span>
               </Link>
             );
           })}
        </nav>
      </div>
    </div>
  );
}
