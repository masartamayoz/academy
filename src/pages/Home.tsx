import Hero from '@/src/components/home/Hero';
import Features from '@/src/components/home/Features';
import Levels from '@/src/components/home/Levels';
import Pricing from '@/src/components/home/Pricing';
import HowItWorks from '@/src/components/home/HowItWorks';
import PaymentMethods from '@/src/components/home/PaymentMethods';
import CTA from '@/src/components/home/CTA';
import Navbar from '@/src/components/layout/Navbar';
import Footer from '@/src/components/layout/Footer';
import SEO from '@/src/components/common/SEO';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden" dir="rtl">
      <SEO 
        title="أكاديمية مسار التميز | المنصة الأولى لتدريس الرياضيات في تونس"
        description="اصنع تميزك في مادة الرياضيات مع أفضل الأساتذة في تونس. حصص تفاعلية مباشرة عبر الإنترنت، فيديوهات شرح مفصلة، وسلاسل تمارين ومراجعة للمرحلتين الإعدادية والثانوية."
        keywords="رياضيات تونس, مسار التميز, أكاديمية رياضيات تونس, دروس تفاعلية رياضيات, السنة السابعة أساسي, السنة الثامنة أساسي, السنة التاسعة أساسي, البكالوريا تونس"
        canonical="https://academy.masartamayoz.com/"
        schema={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "أكاديمية مسار التميز",
          "url": "https://academy.masartamayoz.com/",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://academy.masartamayoz.com/courses?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        }}
      />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <Levels />
        <Pricing />
        <HowItWorks />
        <PaymentMethods />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
