import { Link } from 'react-router-dom';
import { Facebook, Youtube, Send, Twitter, Instagram, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-blue-dark text-white/70 py-15 pt-15">
      <div className="container mx-auto px-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="footer-brand">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1 shadow-sm shrink-0">
                <img src="/logo.png" alt="مسار التميز" className="h-full w-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
              </div>
              <div className="logo-text text-white">
                <h1 className="text-[1rem] font-bold">أكاديمية مسار التميز</h1>
              </div>
            </div>
            <p className="text-[0.88rem] leading-[1.8] mt-3.5 max-w-[280px]">
              منصة تعليمية تونسية متخصصة في تعليم الرياضيات للمرحلة الإعدادية. نحو تعليم متميز لمستقبل مشرق.
            </p>
          </div>

          <div className="footer-col">
            <h4 className="text-[0.95rem] font-bold text-white mb-4">روابط سريعة</h4>
            <ul className="flex flex-col gap-2">
              <li><Link to="/#about" className="hover:text-gold-light transition-colors text-[0.88rem]">عن المنصة</Link></li>
              <li><Link to="/#levels" className="hover:text-gold-light transition-colors text-[0.88rem]">المستويات</Link></li>
              <li><Link to="/#pricing" className="hover:text-gold-light transition-colors text-[0.88rem]">العروض</Link></li>
              <li><Link to="/courses" className="hover:text-gold-light transition-colors text-[0.88rem]">الدروس</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="text-[0.95rem] font-bold text-white mb-4">الدعم</h4>
            <ul className="flex flex-col gap-2">
              <li><Link to="/contact" className="hover:text-gold-light transition-colors text-[0.88rem]">تواصل معنا</Link></li>
              <li><Link to="/faq" className="hover:text-gold-light transition-colors text-[0.88rem]">الأسئلة الشائعة</Link></li>
              <li><Link to="/terms" className="hover:text-gold-light transition-colors text-[0.88rem]">سياسة الاستخدام</Link></li>
              <li><Link to="/privacy" className="hover:text-gold-light transition-colors text-[0.88rem]">سياسة الخصوصية</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="text-[0.95rem] font-bold text-white mb-4">تواصل معنا</h4>
            <div className="flex flex-col gap-2">
              <a href="https://www.facebook.com/masartamayoz" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[0.88rem] hover:text-gold-light transition-colors">
                <Facebook size={16} /> فيسبوك
              </a>
              <a href="https://www.youtube.com/@masartamayoz" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[0.88rem] hover:text-gold-light transition-colors">
                <Youtube size={16} /> يوتيوب
              </a>
              <a href="https://t.me/masartamayoz" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[0.88rem] hover:text-gold-light transition-colors">
                <Send size={16} /> تيليغرام
              </a>
              <a href="mailto:academy.masartamayoz@gmail.com" className="flex items-center gap-2 text-[0.88rem] hover:text-gold-light transition-colors">
                <Mail size={16} /> البريد الإلكتروني
              </a>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-3.5 text-[0.85rem]">
          <span>© 2026 أكاديمية مسار التميز. جميع الحقوق محفوظة.</span>
          <div className="flex gap-2.5">
            <a href="https://www.facebook.com/masartamayoz" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:bg-gold-brand hover:text-blue-dark transition-all">
              <Facebook size={18} />
            </a>
            <a href="https://www.youtube.com/@masartamayoz" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:bg-gold-brand hover:text-blue-dark transition-all">
              <Youtube size={18} />
            </a>
            <a href="https://t.me/masartamayoz" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:bg-gold-brand hover:text-blue-dark transition-all">
              <Send size={18} />
            </a>
            <a href="https://twitter.com/masartamayoz" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:bg-gold-brand hover:text-blue-dark transition-all">
              <Twitter size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
