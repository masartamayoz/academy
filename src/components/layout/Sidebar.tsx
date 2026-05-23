import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { auth, db } from '@/src/lib/firebase';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  CreditCard, 
  Receipt, 
  Users, 
  Wallet, 
  PlusCircle, 
  Settings, 
  LogOut, 
  Home as HomeIcon,
  UserCircle,
  Bell,
  X,
  FileText,
  UserPlus,
  Video,
  HardDrive,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface SidebarProps {
  user: any;
  userData: any;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ user, userData, isOpen, setIsOpen, isCollapsed, setIsCollapsed }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = userData?.userType || 'student';
  const name = userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : (user?.displayName || user?.email || '...');

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const menuItems = {
    student: [
      { id: 'overview', icon: LayoutDashboard, label: 'الإستقبال', href: '/dashboard' },
      { id: 'courses', icon: BookOpen, label: 'الدروس التعليمية', href: '/courses' },
      { id: 'sessions', icon: Calendar, label: 'الحصص المباشرة', href: '/dashboard?tab=sessions' },
      { id: 'schedule', icon: Calendar, label: 'الجدول الأسبوعي', href: '/dashboard?tab=schedule' },
      { id: 'wallet', icon: Wallet, label: 'المحفظة', href: '/dashboard?tab=wallet' },
      { id: 'referral', icon: Users, label: 'إحالة الأصدقاء', href: '/dashboard?tab=referral' },
      { id: 'help', icon: Settings, label: 'المساعدة', href: '/dashboard?tab=help' },
    ],
    parent: [
      { id: 'overview', icon: LayoutDashboard, label: 'لوحة التحكم', href: '/dashboard' },
      { id: 'children', icon: Users, label: 'متابعة الأبناء', href: '/dashboard?tab=children' },
      { id: 'schedule', icon: Calendar, label: 'الجداول الأسبوعية', href: '/dashboard?tab=schedule' },
      { id: 'absences', icon: Bell, label: 'الغيابات', href: '/dashboard?tab=absences' },
      { id: 'wallet', icon: Wallet, label: 'المحفظة والاشتراكات', href: '/dashboard?tab=wallet' },
      { id: 'pricing', icon: CreditCard, label: 'قائمة العروض', href: '/pricing' },
    ],
    teacher: [
      { id: 'overview', icon: LayoutDashboard, label: 'لوحة التحكم', href: '/dashboard' },
      { id: 'courses', icon: BookOpen, label: 'الدروس والبرامج', href: '/courses' },
      { id: 'sessions', icon: Calendar, label: 'الحصص المباشرة', href: '/dashboard?tab=sessions' },
      { id: 'schedule', icon: Calendar, label: 'الجدول الأسبوعي', href: '/dashboard?tab=schedule' },
      { id: 'attendance', icon: Users, label: 'تسجيل الحضور', href: '/dashboard?tab=attendance' },
      { id: 'wallet', icon: Wallet, label: 'محفظتي المادية', href: '/dashboard?tab=wallet' },
    ],
    admin: [
      { id: 'overview', icon: LayoutDashboard, label: 'لوحة التحكم', href: '/dashboard' },
      { id: 'courses', icon: BookOpen, label: 'تصفح الدروس', href: '/courses' },
      { id: 'content', icon: Video, label: 'إدارة المحتوى', href: '/dashboard?tab=content' },
      { id: 'addUser', icon: UserPlus, label: 'إضافة مستخدم جديد', href: '/dashboard?tab=addUser' },
      { id: 'users', icon: Users, label: 'قائمة المستخدمين', href: '/dashboard?tab=users' },
      { id: 'subscriptions', icon: CreditCard, label: 'الاشتراكات', href: '/dashboard?tab=subscriptions' },
      { id: 'groups', icon: Users, label: 'المجموعات', href: '/dashboard?tab=groups' },
      { id: 'schedule', icon: Calendar, label: 'الجدول الأسبوعي', href: '/dashboard?tab=schedule' },
      { id: 'attendance', icon: FileText, label: 'الحصص والحضور', href: '/dashboard?tab=attendance' },
      { id: 'wallets', icon: Wallet, label: 'محافظ المدرسين', href: '/dashboard?tab=wallets' },
      { id: 'maintenance', icon: HardDrive, label: 'الصيانة', href: '/dashboard?tab=maintenance' },
    ]
  };

  const menuItemsList = menuItems[role as keyof typeof menuItems] || menuItems.student;
  
  // Filter items for recordings-only subscribers
  const currentItems = (role === 'student' && (userData?.planId === 'recordings_yearly' || userData?.plan === 'recordings_yearly'))
    ? menuItemsList.filter(item => !['sessions', 'schedule'].includes(item.id))
    : menuItemsList;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isCollapsed ? 88 : 280,
          translateX: isOpen ? 0 : (window.innerWidth < 1024 ? '100%' : '0%')
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          "fixed inset-y-0 right-0 z-[110] bg-blue-sidebar text-white flex flex-col h-full lg:relative border-l border-white/5 shadow-2xl",
          !isOpen && "translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header/Logo */}
        <div className={cn(
          "flex items-center justify-between border-b border-white/5 p-6",
          isCollapsed ? "justify-center px-4" : "p-6"
        )}>
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 rounded-xl bg-white p-1.5 shadow-lg shrink-0">
               <img src="/logo.png" alt="M" className="h-full w-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
            </div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <h2 className="text-[1rem] font-black leading-tight text-white whitespace-nowrap">مسار التميز</h2>
                <span className="text-[0.68rem] text-gold-light font-bold whitespace-nowrap">الأكاديمية التعليمية</span>
              </motion.div>
            )}
          </Link>
          
          {!isCollapsed && (
            <button onClick={() => setIsOpen(false)} className="lg:hidden text-white/40 hover:text-white">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Toggle Button for Desktop */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -left-3 top-24 h-6 w-6 items-center justify-center rounded-full bg-gold-brand text-blue-dark shadow-lg z-[120] hover:scale-110 transition-transform"
        >
          {isCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* User Card */}
        <div className={cn("p-4 transition-all", isCollapsed ? "px-2" : "p-6")}>
           <div className={cn(
             "relative overflow-hidden rounded-[24px] bg-white/5 border border-white/10 text-white shadow-sm backdrop-blur-md transition-all",
             isCollapsed ? "p-3" : "p-5"
           )}>
              <div className="absolute -top-8 -left-8 h-24 w-24 rounded-full bg-white/5" />
              <div className="flex items-center gap-4 relative z-10">
                 <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-2xl bg-gradient-to-br from-blue-light to-blue-brand flex items-center justify-center text-white font-black text-xl border border-white/10 shrink-0 shadow-lg">
                    {name.charAt(0).toUpperCase()}
                 </div>
                 {!isCollapsed && (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     className="overflow-hidden"
                   >
                      <h4 className="truncate text-[0.85rem] font-bold">{name}</h4>
                      <p className="text-[0.65rem] text-white/50 truncate font-medium">{userData?.email}</p>
                   </motion.div>
                 )}
              </div>
              {!isCollapsed && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-center justify-between relative z-10"
                >
                   <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[0.65rem] font-bold text-white/70">
                         {role === 'student' ? 'تلميذ' : role === 'parent' ? 'ولي أمر' : role === 'teacher' ? 'أستاذ' : 'مدير'}
                      </span>
                   </div>
                   <Link to="/profile" className="text-[0.68rem] font-bold text-gold-light hover:text-white transition-colors">تعديل</Link>
                </motion.div>
              )}
           </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
          <p className={cn(
            "px-4 text-[0.65rem] font-black uppercase tracking-[0.1em] text-white/20 mb-4 transition-all",
            isCollapsed ? "opacity-0 h-0 p-0" : "opacity-100"
          )}>
            القائمة الرئيسية
          </p>
          {currentItems.map((item) => {
            const currentTab = searchParams.get('tab') || 'overview';
            const isActive = location.pathname === item.href || 
                            (location.pathname === '/dashboard' && currentTab === item.id);
            
            return (
              <Link
                key={item.id}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center px-4 py-3 rounded-2xl text-[0.92rem] font-bold transition-all group relative overflow-hidden",
                  isCollapsed ? "justify-center gap-0" : "gap-3.5",
                  isActive
                    ? "bg-blue-hover text-white shadow-lg border border-white/10" 
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
                title={isCollapsed ? item.label : ""}
              >
                {isActive && (
                   <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-gold-light rounded-r-full shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
                )}
                <item.icon size={20} className={cn(
                   "transition-all shrink-0",
                   isActive ? "text-gold-light scale-110" : "text-white/40 group-hover:text-white group-hover:scale-110"
                )} />
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="whitespace-nowrap flex items-center gap-2"
                  >
                    <span>{item.label}</span>
                    {item.id === 'referral' && (
                      <span className="bg-gold-light/15 text-gold-light text-[0.55rem] font-bold px-1.5 py-0.5 rounded-lg border border-gold-light/25 select-none shrink-0">قريباً</span>
                    )}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className={cn("p-4 border-t border-white/5 space-y-2", isCollapsed ? "px-2" : "p-6")}>
           <Link 
             to="/" 
             className={cn(
               "flex items-center px-4 py-2.5 text-[0.88rem] font-bold text-white/50 hover:text-white transition-all group",
               isCollapsed ? "justify-center gap-0" : "gap-3.5"
             )}
             title={isCollapsed ? "الرئيسية" : ""}
           >
             <HomeIcon size={18} className="text-white/30 group-hover:text-white group-hover:scale-110 transition-all shrink-0" /> 
             {!isCollapsed && <span className="whitespace-nowrap">الرئيسية</span>}
           </Link>
           <button 
             onClick={handleLogout}
             className={cn(
               "flex w-full items-center px-4 py-2.5 text-[0.88rem] font-bold text-white/50 hover:text-red-400 transition-all group text-right",
               isCollapsed ? "justify-center gap-0" : "gap-3.5"
             )}
             title={isCollapsed ? "خروج" : ""}
           >
             <LogOut size={18} className="text-white/30 group-hover:text-red-400 group-hover:scale-110 transition-all shrink-0" /> 
             {!isCollapsed && <span className="whitespace-nowrap">تسجيل الخروج</span>}
           </button>
        </div>
      </motion.aside>
    </>
  );
}
