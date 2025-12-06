import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

// Helpers to detect types
const isImageUrl = (u: string) => /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(u);
const youtubeEmbed = (u: string) => {
  try {
    const url = new URL(u);
    const host = url.hostname.replace('www.', '');
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      if (host.includes('youtu.be')) return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
      const v = url.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
  } catch (e) {}
  return null;
};

const asEmbed = (u: string) => {
  try {
    const url = new URL(u);
    const host = url.hostname.replace('www.', '');
    const yt = youtubeEmbed(u);
    if (yt) return { src: yt, kind: 'iframe' };
    if (host.includes('instagram.com')) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) return { src: `https://www.instagram.com/${parts[0]}/${parts[1]}/embed`, kind: 'iframe' };
    }
    if (host.includes('facebook.com') || host.includes('fb.watch')) {
      return { src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u)}`, kind: 'iframe' };
    }
    if (host.includes('reddit.com') || host.includes('v.redd.it')) {
      if (host.includes('v.redd.it')) return { src: u, kind: 'video' };
      return { src: `https://www.redditmedia.com${url.pathname}?ref_source=embed&ref=share&embed=true`, kind: 'iframe' };
    }
    return null;
  } catch (e) {
    return null;
  }
};

// Minimal, safe Markdown renderer. Keeps typings loose for react-markdown component
// props to avoid broad repo-wide type issues. Can be enhanced later.
export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: ({ node, inline, className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || '');
          const code = String(children).replace(/\n$/, '');
          if (!inline && match) {
            return (
              <pre className={cn('rounded-lg bg-gray-800 text-sm overflow-auto p-4', className)} {...props}>
                <code className="whitespace-pre">{code}</code>
              </pre>
            );
          }

          return (
            <code className={cn('bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded', className)} {...props}>
              {children}
            </code>
          );
        },
        h1: ({ node, ...props }: any) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
        h2: ({ node, ...props }: any) => <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />,
        h3: ({ node, ...props }: any) => <h3 className="text-xl font-bold mt-5 mb-2.5" {...props} />,
        p: ({ node, ...props }: any) => <p className="mb-4 leading-relaxed" {...props} />,
        a: ({ node, ...props }: any) => {
          const href = props.href || '';
          const embed = asEmbed(href);
          if (isImageUrl(href)) {
            return <img src={href} alt={props.children?.[0] ?? 'image'} className="max-w-full h-auto rounded" />;
          }
          if (embed) {
            if (embed.kind === 'video') {
              return (
                <div className="video-embed-wrapper"><video src={embed.src} controls className="video-embed-element" /></div>
              );
            }

            return (
              <div className="video-embed-wrapper"><iframe src={embed.src} frameBorder={0} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen className="video-embed-element" /></div>
            );
          }

          return <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />;
        },
        ul: ({ node, ...props }: any) => <ul className="list-disc pl-6 mb-4" {...props} />,
        ol: ({ node, ...props }: any) => <ol className="list-decimal pl-6 mb-4" {...props} />,
        blockquote: ({ node, ...props }: any) => (
          <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic mb-4" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}