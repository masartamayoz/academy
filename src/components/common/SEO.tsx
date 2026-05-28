import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  schema?: Record<string, any>;
}

export default function SEO({ title, description, keywords, canonical, schema }: SEOProps) {
  useEffect(() => {
    // 1. Update document title
    const fullTitle = title.includes('مسار التميز') ? title : `${title} | أكاديمية مسار التميز`;
    document.title = fullTitle;

    // 2. Update meta description
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);
    }

    // 3. Update meta keywords
    if (keywords) {
      let metaKey = document.querySelector('meta[name="keywords"]');
      if (!metaKey) {
        metaKey = document.createElement('meta');
        metaKey.setAttribute('name', 'keywords');
        document.head.appendChild(metaKey);
      }
      metaKey.setAttribute('content', keywords);
    }

    // 4. Update canonical URL
    if (canonical) {
      let linkCanonical = document.querySelector('link[rel="canonical"]');
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.setAttribute('rel', 'canonical');
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute('href', canonical);
    }

    // 5. Inject / update JSON-LD Schema
    const existingSchemaScript = document.getElementById('dynamic-seo-schema');
    if (existingSchemaScript) {
      existingSchemaScript.remove();
    }

    if (schema) {
      const script = document.createElement('script');
      script.id = 'dynamic-seo-schema';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    }

    // Clean up if component unmounts
    return () => {
      const scriptToRemove = document.getElementById('dynamic-seo-schema');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [title, description, keywords, canonical, schema]);

  return null;
}
