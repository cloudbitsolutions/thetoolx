import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

interface Props {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements; // allow rendering as span/div etc
}

export default function TranslatableBlock({ children, className, as = 'div' }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const $el = el; // narrowed non-null alias for TS
    const original = $el.innerHTML;

    // If default language, restore original (prevents double translation)
    if (!language || language === 'en') {
      // don't mutate if already same
      if ($el.innerHTML !== original) $el.innerHTML = original;
      return;
    }

    let cancelled = false;
    const cacheKey = `trans:${language}:${hashString(original)}`;
    const cached = (() => {
      try { return sessionStorage.getItem(cacheKey); } catch { return null; }
    })();

    async function doTranslate() {
      setLoading(true);
      try {
        if (cancelled) return;
        if (cached) {
          if (!cancelled) $el.innerHTML = cached;
          return;
        }

        const payload = { text: $el.innerText || stripHtml(original), to: language } as { text: string; to: string };
        const res = await fetch('/api/translate/public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return;
        const json: any = await res.json();
        if (cancelled) return;
        // The server returns plain translated text; convert newlines to paragraphs
    const translated = (json.translated || '').split('\n').map((s: string) => `<p>${escapeHtml(s)}</p>`).join('');
    if (!cancelled) $el.innerHTML = translated || original;
  try { sessionStorage.setItem(cacheKey, $el.innerHTML); } catch (_) {}
      } catch (err) {
        // noop - keep original
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    doTranslate();

    return () => { cancelled = true; };
  }, [language, children]);

  const Tag = as as any;
  return (
    // render as the requested tag so this component can be used inline (as="span")
    <Tag className={className} ref={ref as any}>
      {children}
      { /* Optionally show a spinner or style for loading; kept minimal to avoid changing UX */ }
    </Tag>
  );
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ');
}

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
