import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Loader2, Menu, Search, Bell, Wallet, Trophy, User as UserIcon, LayoutDashboard, BookOpen } from 'lucide-react';
import { cn } from '@/src/lib/utils';

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        navigate('/auth');
        return;
      }
      setUser(authUser);
      try {
        const snap = await getDoc(doc(db, 'users', authUser.uid));
        if (snap.exists()) {
          setUserData(snap.data());
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
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-blue-50 border border-blue-100/50">
                    <div className="h-7 w-7 rounded-lg bg-blue-brand/10 flex items-center justify-center text-blue-brand">
                       <Wallet size={14} />
                    </div>
                    <div>
                       <p className="text-[0.6rem] font-black text-gray-400 uppercase leading-none">الرصيد</p>
                       <p className="text-xs font-black text-blue-dark">0.000 <span className="text-[0.65rem] text-blue-light">د.ت</span></p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-50 border border-amber-100/50">
                    <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                       <Trophy size={14} />
                    </div>
                    <div>
                       <p className="text-[0.6rem] font-black text-gray-400 uppercase leading-none">النقاط</p>
                       <p className="text-xs font-black text-amber-700">0 <span className="text-[0.65rem] text-amber-500">نقطة</span></p>
                    </div>
                 </div>
              </div>

              <div className="flex items-center gap-2">
                 <button className="relative h-10 w-10 flex items-center justify-center rounded-2xl text-gray-400 hover:bg-gray-50 hover:text-blue-dark transition-all">
                    <Bell size={20} />
                    <span className="absolute top-2.5 left-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                 </button>
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
