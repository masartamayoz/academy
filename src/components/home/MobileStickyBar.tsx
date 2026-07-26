import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, Tags, User } from 'lucide-react';
import { auth } from '@/src/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export default function MobileStickyBar() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currUser) => {
      setUser(currUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 180) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-[850] sm:hidden animate-in slide-in-from-bottom duration-300">
      <div className="rounded-2xl bg-blue-dark/95 backdrop-blur-xl border border-white/20 p-2.5 shadow-2xl flex items-center gap-2">
        {!user ? (
          <>
            <Link 
              to="/auth" 
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gold-brand py-2.5 px-3 text-xs font-black text-blue-dark active:scale-95 transition-all shadow-md"
            >
              <LogIn size={15} />
              <span>تسجيل الدخول</span>
            </Link>
            <a 
              href="#pricing" 
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/15 border border-white/25 py-2.5 px-3 text-xs font-bold text-white active:scale-95 transition-all"
            >
              <Tags size={15} />
              <span>المشاركة في العروض</span>
            </a>
          </>
        ) : (
          <>
            <Link 
              to="/dashboard" 
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gold-brand py-2.5 px-3 text-xs font-black text-blue-dark active:scale-95 transition-all shadow-md"
            >
              <User size={15} />
              <span>لوحة التحكم</span>
            </Link>
            <a 
              href="#pricing" 
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/15 border border-white/25 py-2.5 px-3 text-xs font-bold text-white active:scale-95 transition-all"
            >
              <Tags size={15} />
              <span>العروض المتاحة</span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
