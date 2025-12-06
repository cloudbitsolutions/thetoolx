import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import React from "react";
import { ChevronLeft, Calendar, User, Clock, Tag, BookOpen, ArrowUpRight, Flower, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
// Use DOMPurify if available at runtime. Avoid build-time type issues by accessing it dynamically.
let sanitizeHtml: (html: string, cfg?: any) => string;
try {
    // If DOMPurify available in node_modules with types, prefer it
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dp = require('dompurify');
    sanitizeHtml = (html: string, cfg?: any) => dp.sanitize(html, cfg);
} catch (e) {
    // Fallback: very small sanitizer that escapes script tags — not full-proof but keeps build working
    sanitizeHtml = (html: string) => html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
}

// Guaranteed working test image
//const TEST_IMAGE = "https://images.unsplash.com/photo-1562690868-60bbe7293e94?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80";
const DEFAULT_IMAGE_HEIGHT = 400; // Default height in pixels
const MAX_IMAGE_HEIGHT = 800; // Maximum allowed height

interface ImageDimensions {
    width: number;
    height: number;
}

interface BlogPostData {
    id?: string;
    slug?: string;
    title: string;
    excerpt?: string;
    content: string;
    coverImage?: string;
    createdAt: string;
    author?: string;
    authorId?: string;
    tags?: string[];
    featured?: boolean;
}

export default function BlogPost() {
    const { id, slug } = useParams();
    const [imgStatus, setImgStatus] = useState<'loading' | 'error' | 'success'>('loading');
    const [imageDimensions, setImageDimensions] = useState<ImageDimensions>({
        width: 0,
        height: DEFAULT_IMAGE_HEIGHT
    });
    // Prefer slug-based fetching for SEO-friendly URLs, fall back to id if present
    const queryKey = slug ? `/api/blog/slug/${slug}` : id ? `/api/blog/${id}` : null;
    const { data: post, isLoading, error } = useQuery<BlogPostData | null>({
        queryKey: [queryKey],
        enabled: !!queryKey,
    });
    const { language } = useLanguage();

    // If non-default language selected, request translated fields for the post after initial fetch
    useEffect(() => {
        if (!post) return;
        if (!language || language === 'en') return;

        (async () => {
            try {
                const idToUse = post.id ? Number(post.id) : undefined;
                if (!idToUse) return;
                const res = await fetch(`/api/translate/blog/${idToUse}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ to: language })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data?.translated) {
                        // Mutate post object locally to show translated content
                        // Note: this doesn't persist to DB; it's for display only
                        (post as any).title = data.translated.title || post.title;
                        (post as any).excerpt = data.translated.excerpt || post.excerpt;
                        (post as any).content = data.translated.content || post.content;
                        // Force re-render by updating a state; using a dummy state below
                        setImageDimensions((d) => ({ ...d }));
                    }
                }
            } catch (err) {
                console.error('Failed to fetch translated post', err);
            }
        })();
    }, [post, language]);

    // Image handling with fallback
    const imageUrl = post?.coverImage;
    console.log("Image url : ", imageUrl)
    useEffect(() => {
        if (!imageUrl) {
            setImgStatus('error');
            return;
        }

        setImgStatus('loading');
        const img = new Image();
        img.src = imageUrl;

        img.onload = () => {
            // Calculate display dimensions while maintaining aspect ratio
            const aspectRatio = img.width / img.height;
            let displayHeight = img.height;

            // If image is smaller than our default, use its natural size
            if (img.height < DEFAULT_IMAGE_HEIGHT) {
                displayHeight = img.height;
            }
            // If larger, scale down but don't exceed max height
            else {
                displayHeight = Math.min(img.height, MAX_IMAGE_HEIGHT);
            }

            const displayWidth = displayHeight * aspectRatio;

            setImageDimensions({
                width: displayWidth,
                height: displayHeight
            });
            setImgStatus('success');
        };

        img.onerror = () => {
            console.error(`Failed to load image: ${imageUrl}`);
            setImgStatus('error');
        };
    }, [imageUrl]);

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
                <div className="text-center p-8 max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                    <BookOpen className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Post Not Found
                    </h2>
                    <Button asChild>
                        <Link href="/blog">
                            Back to Blog
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-8">
                {/* Back button */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-8"
                >
                    <Button asChild variant="ghost" className="gap-2">
                        <Link href="/blog">
                            <ChevronLeft className="w-5 h-5" />
                            Back to all posts
                        </Link>
                    </Button>
                </motion.div>

                {isLoading ? (
                    <div className="space-y-8">
                        <Skeleton className="h-10 w-3/4 mx-auto" />
                        <div className="flex justify-center gap-4">
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-6 w-32" />
                        </div>
                        <Skeleton className="h-96 w-full rounded-lg" />
                        <div className="space-y-4">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-5/6" />
                            <Skeleton className="h-6 w-4/6" />
                            <Skeleton className="h-6 w-5/6" />
                        </div>
                    </div>
                        ) : post ? (
                    <ErrorBoundary>
                    <motion.article
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"
                    >
                        {/* Image section - responsive */}
                        <div className="w-full flex justify-center bg-gray-100 dark:bg-gray-700">
                            {imgStatus === 'success' ? (
                                <motion.img
                                    src={imageUrl}
                                    alt={post.title}
                                    loading="lazy"
                                    className="w-full max-w-5xl object-cover max-h-[800px] h-auto"
                                    style={{ display: 'block' }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-24">
                                    <Flower className="w-16 h-16 text-rose-400 mb-4" />
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {imgStatus === 'loading' ? 'Loading image...' : 'Image not available'}
                                    </p>
                                    {/* Debug info - remove in production */}
                                    <p className="text-xs text-gray-400 mt-2 break-all w-full text-center max-w-[900px]">
                                        Attempted URL: {imageUrl}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Rest of your post content */}
                        <div className="p-6 sm:p-8">
                            {/* Post header */}
                            <header className="mb-8">
                                {post.featured && (
                                    <Badge className="bg-rose-500 hover:bg-rose-600 text-white mb-4">
                                        <Star className="w-4 h-4 mr-1" />
                                        Featured Post
                                    </Badge>
                                )}

                                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4 font-serif">
                                    {post.title}
                                </h1>

                                {post.excerpt && (
                                    <p className="text-lg text-gray-600 dark:text-gray-300 italic mb-6">
                                        {post.excerpt}
                                    </p>
                                )}

                                <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400 mb-6">
                                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                                        <User className="w-4 h-4 mr-2" />
                                        <span>{post.author || post.authorId || 'TheToolx Team'}</span>
                                    </div>
                                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        <span>
                                            {new Date(post.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                                        <Clock className="w-4 h-4 mr-2" />
                                        <span>{Math.ceil(post.content.length / 1000)} min read</span>
                                    </div>
                                </div>

                                {(post.tags && post.tags.length > 0) && (
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {(post.tags || []).map((tag: string) => (
                                            <Badge key={tag} variant="secondary" className="bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100">
                                                <Tag className="w-3 h-3" />
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </header>

                            {/* Post content - sanitize and allow embeds/iframes */}
                            <div className="prose dark:prose-invert prose-p:text-gray-700 dark:prose-p:text-gray-300 max-w-none img:mx-auto img:max-w-full img:h-auto">
                                <div
                                    className="post-content"
                                    dangerouslySetInnerHTML={{ __html: (() => {
                                        // Some editor paths inserted HTML as escaped text (e.g. &lt;div ...&gt;).
                                        // Detect common escaped embed signatures and decode them before sanitizing so
                                        // iframes and provider markup render as HTML instead of being shown as text.
                                        let raw = post.content || '';
                                        try {
                                            if (/&lt;\/?(div|iframe|blockquote)/i.test(raw)) {
                                                // Decode HTML entities using DOMParser (browser only)
                                                const doc = new DOMParser().parseFromString(raw, 'text/html');
                                                const decoded = doc.documentElement.textContent || raw;
                                                raw = decoded;
                                            }
                                        } catch (e) {
                                            // If DOMParser not available or fails, keep raw content
                                        }
                                        return sanitizeHtml(raw, {
                                            ALLOWED_TAGS: ['iframe','blockquote','table','thead','tbody','tr','th','td','img','a','p','div','span','strong','em','ul','ol','li','h1','h2','h3','h4','h5','h6','video','source'],
                                            ALLOWED_ATTR: [
                                                'href', 'src', 'alt', 'class', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'loading', 'sandbox', 'data-instgrm-permalink', 'data-instgrm-version', 'style', 'playsinline', 'controls'
                                            ],
                                        });
                                    })() }}
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 sm:p-8 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                <Button asChild variant="ghost">
                                    <Link href="/blog">
                                        <ChevronLeft className="w-5 h-5 mr-2" />
                                        Back to blog
                                    </Link>
                                </Button>
                                <Button asChild className="bg-rose-600 hover:bg-rose-700">
                                    <Link href="/blog">
                                        More Articles
                                        <ArrowUpRight className="w-4 h-4 ml-2" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </motion.article>
                    </ErrorBoundary>
                ) : null}
            </div>
            <style>{`
                /* Responsive embed wrapper using padding-bottom fallback and aspect-ratio if available */
                .embed-container {
                  position: relative;
                  width: 100%;
                  max-width: 100%;
                  overflow: hidden;
                  /* default fallback to 16:9 */
                  padding-bottom: 56.25%;
                  height: 0;
                }

                /* Explicit aspect classes */
                .embed-container.aspect-16-9 { padding-bottom: 56.25%; }
                .embed-container.aspect-9-16 { padding-bottom: 177.7778%; } /* (16/9)*100% */
                .embed-container.aspect-4-5 { padding-bottom: 125%; } /* (5/4)*100% */
                .embed-container.aspect-auto { padding-bottom: 0; height: auto; overflow: visible; }

                                /* When modern aspect-ratio supported, prefer it and avoid padding hack */
                                @supports (aspect-ratio: 16/9) {
                                    .embed-container { padding-bottom: 0; height: auto; aspect-ratio: 16/9; }
                                    .embed-container.aspect-9-16 { aspect-ratio: 9/16; }
                                    .embed-container.aspect-4-5 { aspect-ratio: 4/5; }
                                    .embed-container.aspect-auto { aspect-ratio: auto; height: auto; }
                                }

                                /* Fill iframe/video/object/embed for fixed-aspect containers only.
                                     For aspect-auto (blockquotes / provider-driven embeds) keep natural flow. */
                                .embed-container:not(.aspect-auto) iframe,
                                .embed-container:not(.aspect-auto) video,
                                .embed-container:not(.aspect-auto) embed,
                                .embed-container:not(.aspect-auto) object {
                                    position: absolute;
                                    top: 0;
                                    left: 0;
                                    width: 100%;
                                    height: 100%;
                                    border: 0;
                                }

                                /* Provider blockquote/auto embeds should flow naturally and scale to container width */
                                .embed-container.aspect-auto > iframe,
                                .embed-container.aspect-auto > video,
                                .embed-container.aspect-auto > embed,
                                .embed-container.aspect-auto > object {
                                    position: static;
                                    width: 100% !important;
                                    height: auto !important;
                                    max-width: 100% !important;
                                    border: 0;
                                }

                /* For blockquote-based providers (Twitter/Instagram) allow natural flow when aspect-auto */
                .embed-container.aspect-auto > blockquote,
                .embed-container.aspect-auto > .twitter-tweet,
                .embed-container.aspect-auto > .instagram-media {
                  position: relative;
                  width: 100% !important;
                  max-width: 100% !important;
                }

                                /* Cap maximum embed height so extremely tall embeds don't blow up layout */
                                .embed-container { max-height: 85vh; }
                                .embed-container.aspect-auto { max-height: none; }
                                .embed-container iframe, .embed-container video { max-height: 85vh; }
                                /* For embedded videos ensure controls remain visible and box doesn't exceed a fixed px cap */
                                .embed-container .embedded-video, .embed-container video { max-height: 720px; height: auto; }

                .post-content img{max-width:100%;height:auto;display:block;margin:0 auto}
                .post-content table{width:100%;border-collapse:collapse}
                .post-content table th,.post-content table td{border:1px solid #e5e7eb;padding:0.5rem}

                /* Make embedded media controls accessible on small screens */
                .embed-container iframe{touch-action:auto}
            `}</style>
            {post?.content && <LoadSocialEmbeds post={post} />}
        </div>
    );
}

// Minimal ErrorBoundary to catch render-time errors in the blog article
class ErrorBoundary extends React.Component<any, { hasError: boolean; error?: any }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, info: any) {
        // eslint-disable-next-line no-console
        console.error('Render error in BlogPost:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center">
                    <h2 className="text-xl font-bold">Sorry — an error occurred rendering this post.</h2>
                    <p className="text-sm text-gray-500 mt-2">Check the console for details.</p>
                </div>
            );
        }
        return this.props.children;
    }
}

// Component to load social scripts after mount to render blockquotes/embeds
function LoadSocialEmbeds({ post }: { post: any }) {
    useEffect(() => {
        // Install short-lived global handlers to capture uncaught errors while embeds hydrate.
        const globalErrorHandler = (ev: ErrorEvent) => {
            try {
                // Many third-party embeds throw cross-origin errors which show as "Script error." with no stack.
                // These are not actionable here and only create noise in the dev overlay. Ignore them.
                if (ev.message === 'Script error.' || ev.filename === '') {
                    try { if (typeof ev.preventDefault === 'function') ev.preventDefault(); } catch (e) {}
                    return;
                }
                // Log other errors to console for debugging
                // eslint-disable-next-line no-console
                console.error('Global error captured in BlogPost:', ev.message, ev.error || ev);
                // Prevent default handling which Vite's overlay relies on
                if (typeof ev.preventDefault === 'function') ev.preventDefault();
                if (typeof (ev as any).stopImmediatePropagation === 'function') (ev as any).stopImmediatePropagation();
            } catch (err) {
                // ignore
            }
        };
        const globalRejectionHandler = (ev: PromiseRejectionEvent) => {
            try {
                // eslint-disable-next-line no-console
                console.error('Unhandled promise rejection in BlogPost:', ev.reason);
                if (typeof ev.preventDefault === 'function') ev.preventDefault();
            } catch (err) {
                // ignore
            }
        };
        window.addEventListener('error', globalErrorHandler, true);
        window.addEventListener('unhandledrejection', globalRejectionHandler);

        try {
            if (!post || !post.content) return;

            // Helper: wrap raw iframes / blockquotes in .embed-container if not already wrapped
            const safeRun = (fn: () => void) => {
                try {
                    fn();
                } catch (err) {
                    // Log but don't throw - prevents dev overlay
                    // eslint-disable-next-line no-console
                    console.error('LoadSocialEmbeds safeRun error:', err);
                }
            };

            const wrapEmbeds = () => safeRun(() => {
                const postEl = document.querySelector('.post-content');
                if (!postEl) return;
                // Select items that commonly represent embeds
                const nodes = Array.from(postEl.querySelectorAll('iframe, blockquote, .twitter-tweet, .instagram-media, .reddit-embed, div.embed-container[data-embed-url]'));
                nodes.forEach((node) => {
                    // If already wrapped skip
                    if ((node as Element).closest('.embed-container')) return;
                    // Create wrapper
                    const wrapper = document.createElement('div');
                    // For blockquote/provider elements prefer natural flow (aspect-auto)
                    const isBlockquote = node.nodeName.toLowerCase() === 'blockquote' || ((node as Element).classList && ((node as Element).classList.contains('twitter-tweet') || (node as Element).classList.contains('instagram-media') || (node as Element).classList.contains('reddit-embed')));
                    wrapper.className = isBlockquote ? 'embed-container aspect-auto' : 'embed-container aspect-16-9'; // default to 16:9 — adjust later
                    // Insert wrapper and move node inside
                    node.parentNode?.insertBefore(wrapper, node);
                    wrapper.appendChild(node);
                });
            });

        // Transform safe editor-inserted placeholders (div.embed-container[data-embed-url]) into provider markup
        const transformPlaceholders = () => safeRun(() => {
            const postEl = document.querySelector('.post-content');
            if (!postEl) return;
            const placeholders = Array.from(postEl.querySelectorAll('div.embed-container[data-embed-url]')) as HTMLElement[];
            placeholders.forEach((ph) => {
                const url = ph.getAttribute('data-embed-url') || '';
                if (!url) return;
                try {
                    if (/instagram\.com\/(p|reel|tv)\//i.test(url)) {
                            const clean = url.split('?')[0].replace(/([^\/ ]$)/, '$1/');
                            try {
                                // Use the instagram embed iframe directly to avoid depending on embed.js which
                                // can throw minified invariant errors in some environments.
                                const iframe = document.createElement('iframe');
                                iframe.src = `${clean}embed`;
                                iframe.width = '400';
                                iframe.height = '480';
                                iframe.setAttribute('frameborder', '0');
                                iframe.setAttribute('scrolling', 'no');
                                iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
                                iframe.setAttribute('allowfullscreen', '');
                                // Some hosts prefer loading the iframe lazily
                                iframe.loading = 'lazy';
                                ph.replaceWith(iframe);
                            } catch (err) {
                                // fallback to blockquote if iframe creation fails
                                const block = document.createElement('blockquote');
                                block.className = 'instagram-media';
                                block.setAttribute('data-instgrm-permalink', clean);
                                block.setAttribute('data-instgrm-version', '14');
                                const a = document.createElement('a');
                                a.href = clean;
                                block.appendChild(a);
                                ph.replaceWith(block);
                            }
                        } else if (/reddit\.com\/.+\/comments\//i.test(url)) {
                        const block = document.createElement('blockquote');
                        block.className = 'reddit-card';
                        const a = document.createElement('a');
                        a.href = url;
                        block.appendChild(a);
                        ph.replaceWith(block);
                    } else if (/facebook\.com\/.+|fb\.watch\/.+/i.test(url)) {
                        const div = document.createElement('div');
                        div.className = 'fb-video';
                        div.setAttribute('data-href', url);
                        div.setAttribute('data-show-text', 'false');
                        ph.replaceWith(div);
                    }
                } catch (err) {
                    // If transformation fails, leave placeholder as-is
                }
            });
        });

            // Run wrappers synchronously now so embed scripts find elements in expected DOM structure
            wrapEmbeds();

        // If some editor paths stored raw HTML as escaped text nodes (e.g. "&lt;iframe ...&gt;"), decode
        // those text nodes into real DOM so provider scripts can hydrate them.
        const decodeEscapedHtmlNodes = () => safeRun(() => {
            const postEl = document.querySelector('.post-content');
            if (!postEl) return;

            // Walk text nodes only to avoid clobbering element structure
            const walker = document.createTreeWalker(postEl, NodeFilter.SHOW_TEXT, null);
            let node: Node | null = walker.nextNode();
            while (node) {
                const txt = (node.nodeValue || '').trim();
                // Look for escaped or raw embed signatures
                if (txt.includes('&lt;') || /<\/?(iframe|div|blockquote)/i.test(txt) || /&lt;\/?(iframe|div|blockquote)/i.test(txt)) {
                    try {
                        // First decode HTML entities if present
                        let decoded = txt;
                        if (decoded.includes('&lt;') || decoded.includes('&gt;') || decoded.includes('&amp;')) {
                            const tmp = document.createElement('div');
                            tmp.innerHTML = decoded;
                            decoded = tmp.textContent || decoded;
                        }

                        // Only proceed if decoded contains real HTML tags we care about
                        if (/<\/?(iframe|div|blockquote)/i.test(decoded)) {
                            const range = document.createRange();
                            const frag = range.createContextualFragment(decoded);
                            node.parentNode?.replaceChild(frag, node);
                            // After replacement, the tree walker is now invalid for siblings of the new fragment.
                            // Create a new walker starting from the postEl to continue scanning.
                            node = document.createTreeWalker(postEl, NodeFilter.SHOW_TEXT, null).nextNode();
                            continue;
                        }
                    } catch (err) {
                        // ignore parse/replace failures and move on
                    }
                }
                node = walker.nextNode();
            }
        });

            decodeEscapedHtmlNodes();

    // Load provider scripts (they will hydrate blockquotes / iframes)
        // Twitter
        if ((window as any).twttr === undefined && /twitter.com\/.+\/status\/.+/i.test(post.content)) {
            const s = document.createElement('script');
            s.src = 'https://platform.twitter.com/widgets.js';
            s.async = true;
            s.crossOrigin = 'anonymous';
            s.referrerPolicy = 'no-referrer-when-downgrade';
            s.onerror = () => console.warn('Twitter embed script failed to load');
            document.body.appendChild(s);
        }

        // Instagram
        // Only load the embed script if there are instagram blockquotes (which need hydration).
        const hasInstagramBlockquote = document.querySelector('.post-content blockquote.instagram-media') !== null;
        const hasInstagramIFrame = document.querySelector('.post-content iframe[src*="instagram.com/embed"]') !== null;
        if (!hasInstagramIFrame && (window as any).instgrm === undefined && /instagram.com\/.+/i.test(post.content) && hasInstagramBlockquote) {
            const s = document.createElement('script');
            s.src = 'https://www.instagram.com/embed.js';
            s.async = true;
            s.crossOrigin = 'anonymous';
            s.referrerPolicy = 'no-referrer-when-downgrade';
            s.onerror = () => console.warn('Instagram embed script failed to load');
            document.body.appendChild(s);
        }

        // Reddit
        if ((window as any).REDDIT === undefined && /reddit.com\/.+\/comments\/.+/i.test(post.content)) {
            const s = document.createElement('script');
            s.src = 'https://embed.redditmedia.com/widgets/platform.js';
            s.async = true;
            s.crossOrigin = 'anonymous';
            s.referrerPolicy = 'no-referrer-when-downgrade';
            s.onerror = () => console.warn('Reddit embed script failed to load');
            document.body.appendChild(s);
        }

        // Facebook SDK (for fb-video and other fb embeds)
        if (/facebook.com|fb\.watch/.test(post.content)) {
            // Ensure fb-root exists
            if (!document.getElementById('fb-root')) {
                const fbRoot = document.createElement('div');
                fbRoot.id = 'fb-root';
                document.body.insertBefore(fbRoot, document.body.firstChild);
            }
            // Load FB SDK once
            if (!document.getElementById('facebook-jssdk')) {
                const f = document.createElement('script');
                f.id = 'facebook-jssdk';
                f.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v12.0';
                f.async = true;
                f.crossOrigin = 'anonymous';
                f.referrerPolicy = 'no-referrer-when-downgrade';
                f.onerror = () => console.warn('Facebook SDK failed to load');
                document.body.appendChild(f);
            }
            // Initialize when available (some pages rely on window.FB)
            (window as any).fbAsyncInit = (window as any).fbAsyncInit || function() {
                try {
                    (window as any).FB.init({ xfbml: true, version: 'v12.0' });
                } catch (err) {
                    // ignore
                }
            };
        }

        // Delegated click handler scoped to embed-container anchors to avoid interfering with player controls.
        const clickHandler = (e: MouseEvent) => {
            try {
                const target = e.target as HTMLElement | null;
                if (!target) return;

                // If user tapped directly on an interactive child (iframe/video/audio), allow native interaction
                const interactive = target.closest('iframe, video, audio, button, .instagram-media, .twitter-tweet') as HTMLElement | null;
                if (interactive) {
                    // Let the browser handle play/pause on mobile
                    return;
                }

                const anchor = target.closest('.embed-container a') as HTMLAnchorElement | null;
                if (!anchor) return;

                const href = anchor.href || '';
                // If anchor wraps interactive elements we already returned above; otherwise
                // for provider links (instagram, reddit, twitter, youtube) we avoid navigating away on mobile
                if (/twitter\.com|instagram\.com|reddit\.com|youtube\.com|youtu\.be/.test(href)) {
                    if (window.innerWidth <= 768) {
                        // Prevent navigation but allow any subsequent user gestures to interact with embedded players
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }
            } catch (err) {
                // ignore
            }
        };

        // Install click handler once
        if (!(window as any).__embed_click_handler_attached) {
            document.addEventListener('click', clickHandler, true);
            (window as any).__embed_click_handler_attached = true;
        }

        // Adjust embed containers after provider scripts run. This tries to set the correct aspect class.
        const adjustEmbeds = () => safeRun(() => {
            // operate only inside post-content
            const containers = Array.from(document.querySelectorAll('.post-content .embed-container')) as HTMLElement[];
            containers.forEach((el) => {
                el.classList.remove('aspect-16-9', 'aspect-9-16', 'aspect-4-5', 'aspect-auto');

                const iframe = el.querySelector('iframe') as HTMLIFrameElement | null;
                const blockquote = el.querySelector('blockquote, .twitter-tweet, .instagram-media') as HTMLElement | null;

                if (iframe) {
                    const src = iframe.src || '';
                    // Use width/height attributes if present to infer orientation
                    const wAttr = iframe.getAttribute('width');
                    const hAttr = iframe.getAttribute('height');
                    let isVertical = false;
                    if (wAttr && hAttr) {
                        const w = parseInt(wAttr, 10) || 0;
                        const h = parseInt(hAttr, 10) || 0;
                        if (h > w) isVertical = true;
                    }
                    // Heuristics: youtube shorts, explicit vertical flags, or common vertical paths
                    if (/\/shorts\//.test(src) || /shorts=|vertical=true|vertical=1|orientation=vertical|embed\/shorts/.test(src)) {
                        isVertical = true;
                    }

                    if (/instagram\.com/.test(src) || (iframe.classList && iframe.classList.contains('instagram-media'))) {
                        el.classList.add('aspect-4-5');
                    } else if (isVertical) {
                        el.classList.add('aspect-9-16');
                    } else {
                        el.classList.add('aspect-16-9');
                    }

                    // Ensure iframe fills container (absolute fill)
                    iframe.style.position = 'absolute';
                    iframe.style.top = '0';
                    iframe.style.left = '0';
                    iframe.style.width = '100%';
                    iframe.style.height = '100%';
                } else if (blockquote) {
                    // For blockquote-based embeds (twitter/instagram) allow natural height and flow
                    el.classList.add('aspect-auto');
                    // ensure nested iframes (if any) flow naturally and scale to width
                    const innerIframe = el.querySelector('iframe') as HTMLIFrameElement | null;
                    if (innerIframe) {
                        innerIframe.style.width = '100%';
                        innerIframe.style.height = 'auto';
                        innerIframe.style.position = 'static';
                        innerIframe.style.top = '';
                        innerIframe.style.left = '';
                    }
                } else {
                    // fallback to 16:9
                    el.classList.add('aspect-16-9');
                }
            });
            // Initialize custom controls for any embedded videos
            const videos = Array.from(document.querySelectorAll('.post-content .embedded-video')) as HTMLVideoElement[];
            videos.forEach((v) => {
                if (!v.hasAttribute('controls')) v.setAttribute('controls', '');
                v.style.width = '100%';
                v.style.height = '100%';
                v.style.objectFit = 'contain';
            });
        });

        // Run adjustEmbeds multiple times to catch async provider hydration
        const t1 = window.setTimeout(() => safeRun(adjustEmbeds), 200);
        const t2 = window.setTimeout(() => safeRun(adjustEmbeds), 800);
        const t3 = window.setTimeout(() => safeRun(adjustEmbeds), 1600);

        // After provider scripts are (likely) loaded, explicitly trigger their hydrate/parsing APIs
        const hydrateProviders = () => safeRun(() => {
            try {
                // Instagram
                if ((window as any).instgrm && (window as any).instgrm.Embeds && typeof (window as any).instgrm.Embeds.process === 'function') {
                    (window as any).instgrm.Embeds.process();
                }
            } catch (err) {
                // ignore
            }

            try {
                // Twitter
                if ((window as any).twttr && (window as any).twttr.widgets && typeof (window as any).twttr.widgets.load === 'function') {
                    (window as any).twttr.widgets.load();
                }
            } catch (err) {
                // ignore
            }

            try {
                // Reddit - embed script typically auto-parses, but attempt safe init if present
                if ((window as any).REDDIT && typeof (window as any).REDDIT?.embed === 'object') {
                    // no-op; rely on script
                }
            } catch (err) {
                // ignore
            }

            try {
                // Facebook
                if ((window as any).FB && (window as any).FB.XFBML && typeof (window as any).FB.XFBML.parse === 'function') {
                    const postEl = document.querySelector('.post-content') as HTMLElement | null;
                    (window as any).FB.XFBML.parse(postEl || document.body);
                }
            } catch (err) {
                // ignore
            }
        });

        const h1 = window.setTimeout(() => safeRun(hydrateProviders), 500);
        const h2 = window.setTimeout(() => safeRun(hydrateProviders), 1200);

        // Also observe DOM changes to re-run adjustments if provider scripts inject content later
        const mo = new MutationObserver(() => {
            safeRun(adjustEmbeds);
        });
        const moTarget = document.querySelector('.post-content') || document.body;
        if (moTarget) mo.observe(moTarget, { childList: true, subtree: true });

            return () => {
                window.clearTimeout(t1);
                window.clearTimeout(t2);
                window.clearTimeout(t3);
                window.clearTimeout(h1);
                window.clearTimeout(h2);
                mo.disconnect();
                // Remove global handlers when leaving this post view
                try {
                    window.removeEventListener('error', globalErrorHandler, true);
                    window.removeEventListener('unhandledrejection', globalRejectionHandler);
                } catch (err) {
                    // ignore
                }
                // We intentionally keep the global click handler (guarded by a flag) to avoid double-registering
            };
        } catch (err) {
            // Prevent uncaught runtime errors from bubbling up to the dev overlay. Log for diagnosis.
            // eslint-disable-next-line no-console
            console.error('LoadSocialEmbeds runtime error:', err);
            return;
        }
    }, [post]);

    return null;
}
