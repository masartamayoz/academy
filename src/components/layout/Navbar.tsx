import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '@/src/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { Menu, X, User as UserIcon, LogOut, LayoutDashboard, BookOpen, UserCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  const navLinks = [
    { name: 'الرئيسية', href: '/' },
    { name: 'دروسنا', href: '/courses' },
    { name: 'العروض والمستويات', href: '/pricing' },
    { name: 'من نحن', href: '/about' },
    { name: 'تواصل معنا', href: '/contact' },
  ];

  return (
    <header className="sticky top-0 z-[900] bg-gradient-to-r from-blue-dark via-blue-mid to-blue-brand py-3.5 shadow-2xl">
      <div className="container mx-auto px-5">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-white p-1 shadow-sm">
              <img src="/logo.png" alt="مسار التميز" className="h-full w-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
            </div>
            <div className="logo-text">
              <h1 className="text-[1.2rem] font-black text-white leading-tight">أكاديمية مسار التميز</h1>
              <span className="text-[0.75rem] font-normal text-gold-light">التعليم عن بعد في تونس</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1.5 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={cn(
                  "rounded-lg px-3.5 py-1.75 text-[0.9rem] font-medium text-white/85 transition-all hover:bg-white/10 hover:text-white",
                  location.pathname === link.href && "bg-white/10 font-bold text-white text-gold-light"
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            {!user ? (
              <div className="hidden items-center gap-2.5 sm:flex">
                <Link to="/auth" className="rounded-lg border-[1.5px] border-white/40 px-5 py-2 font-Tajawal text-[0.9rem] font-semibold text-white transition-all hover:border-white hover:bg-white/10">
                  تسجيل الدخول
                </Link>
                <Link to="/auth#register" className="rounded-lg bg-gold-brand px-5 py-2 font-Tajawal text-[0.9rem] font-bold text-blue-dark transition-all hover:bg-gold-light hover:-translate-y-0.5">
                  إنشاء حساب
                </Link>
              </div>
            ) : (
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-gold-brand font-extrabold text-blue-dark transition-all"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    (user.displayName || user.email || '?').charAt(0).toUpperCase()
                  )}
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute left-0 mt-3 min-w-[220px] overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
                    <div className="bg-gray-50/50 p-4 border-b border-gray-100">
                      <p className="text-[0.6rem] font-black text-gray-400 uppercase tracking-widest mb-1">حسابي</p>
                      <p className="text-sm font-black text-blue-dark truncate">{user.displayName || user.email}</p>
                    </div>
                    <div className="p-2">
                      <Link to="/dashboard" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-[0.88rem] font-bold text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-dark rounded-xl">
                        <LayoutDashboard className="h-4 w-4 text-blue-light" />
                        لوحة التحكم
                      </Link>
                      <Link to="/courses" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-[0.88rem] font-bold text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-dark rounded-xl">
                        <BookOpen className="h-4 w-4 text-blue-light" />
                        دروسي
                      </Link>
                      <Link to="/profile" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-[0.88rem] font-bold text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-dark rounded-xl">
                        <UserCircle className="h-4 w-4 text-blue-light" />
                        ملفي الشخصي
                      </Link>
                    </div>
                    <div className="p-2 border-t border-gray-50">
                      <button 
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-[0.88rem] font-bold text-red-500 transition-colors hover:bg-red-50 rounded-xl"
                      >
                        <LogOut className="h-4 w-4" />
                        تسجيل الخروج
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10 lg:hidden"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-[80px] z-[800] bg-blue-dark px-6 py-10 animate-in slide-in-from-right duration-300 lg:hidden flex flex-col gap-2">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              to={link.href} 
              onClick={() => setIsMenuOpen(false)}
              className="block border-b border-white/10 py-3.5 text-[1.1rem] font-semibold text-white/85"
            >
              {link.name}
            </Link>
          ))}
          {!user && (
            <Link 
              to="/auth" 
              onClick={() => setIsMenuOpen(false)}
              className="mt-4 block py-3.5 text-[1.1rem] font-semibold text-gold-brand"
            >
              تسجيل الدخول
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
