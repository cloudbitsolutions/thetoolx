import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import slugify from "slugify";
import { ArrowLeft, Save, Send } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EditorContent, useEditor } from "@tiptap/react";
import { TextSelection } from "prosemirror-state";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Youtube from "@tiptap/extension-youtube";
import TiptapImage from '@tiptap/extension-image';
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Blockquote from "@tiptap/extension-blockquote";
import Heading from "@tiptap/extension-heading";
import { useMutation } from "@tanstack/react-query";

import { Node } from '@tiptap/core';

// Custom TableCell with Ctrl+Enter to exit table
const CustomTableCell = TableCell.extend({
  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => {
        const { state, dispatch } = this.editor.view;
        const { selection, schema } = state;
        const { $from } = selection;

        for (let depth = $from.depth; depth > 0; depth--) {
          const node = $from.node(depth);
          if (node.type.name === "table") {
            const tablePos = $from.before(depth);
            const tableNode = node;

            const tr = state.tr.insert(
              tablePos + tableNode.nodeSize,
              schema.nodes.paragraph.create()
            );

            tr.setSelection(
              TextSelection.near(
                tr.doc.resolve(tablePos + tableNode.nodeSize + 1)
              )
            );

            dispatch(tr.scrollIntoView());
            return true;
          }
        }

        return false;
      },
    };
  },
});

// Provider embed node: stored as <div class="embed-container" data-embed-url="..."></div>
const ProviderEmbed = Node.create({
  name: 'providerEmbed',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      url: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-embed-url]' }];
  },
  renderHTML({ node }) {
    const url: string = node.attrs.url || '';
    if (!url) return ['div', { class: 'embed-container', 'data-embed-url': '' }, ['a', { href: '#', rel: 'noopener noreferrer' }, '']];

    // If the URL is an image file, render a responsive <img>
    if (/\.(png|jpe?g|gif|webp|svg)(?:\?|$)/i.test(url)) {
      return ['div', { class: 'embed-container embed-image', 'data-embed-url': url }, ['img', { src: url, alt: '', loading: 'lazy' }]];
    }

    // If the URL is a direct video file, render a responsive <video> with controls
    if (/\.(mp4|webm|ogg)(?:\?|$)/i.test(url)) {
      return ['div', { class: 'embed-container', 'data-embed-url': url }, ['video', { src: url, controls: 'true', playsinline: 'true' }]];
    }

    // Instagram posts/reels -> embed via instagram.com/.../embed
    if (/instagram\.com\//i.test(url)) {
      try {
        const u = new URL(url);
        // Build an /embed src robustly: append /embed if not present
        const pathNoSlash = u.pathname.replace(/\/$/, '');
        const src = u.href.includes('/embed') ? u.href : `${u.origin}${pathNoSlash}/embed`;
        return ['div', { class: 'embed-container', 'data-embed-url': url }, ['iframe', { src, frameborder: '0', scrolling: 'no', allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture', allowfullscreen: 'true' }]];
      } catch (e) {
        return ['div', { class: 'embed-container', 'data-embed-url': url }, ['a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, url]];
      }
    }

    // Facebook video/embed -> use plugins/video.php
    if (/facebook\.com\/.+|fb\.watch\/.+/i.test(url)) {
      try {
        const src = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=560`;
        return ['div', { class: 'embed-container', 'data-embed-url': url }, ['iframe', { src, frameborder: '0', scrolling: 'no', allow: 'autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: 'true' }]];
      } catch (e) {
        return ['div', { class: 'embed-container', 'data-embed-url': url }, ['a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, url]];
      }
    }

    // Reddit posts -> redditmedia embed
    if (/reddit\.com\/.+\/comments\//i.test(url)) {
      try {
        const u = new URL(url);
        const src = `https://www.redditmedia.com${u.pathname}?embed=true`;
        return ['div', { class: 'embed-container', 'data-embed-url': url }, ['iframe', { src, frameborder: '0', scrolling: 'no', allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: 'true' }]];
      } catch (e) {
        return ['div', { class: 'embed-container', 'data-embed-url': url }, ['a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, url]];
      }
    }

    // fallback: clickable link
    return ['div', { class: 'embed-container', 'data-embed-url': url }, ['a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, url]];
  },
});

// Helpers
const isImageUrl = (u: string) => /\.(png|jpe?g|gif|webp|svg)(?:\?|$)/i.test(u) || u.startsWith('data:image/');
const preloadImage = (url: string) => new Promise<boolean>((resolve) => {
  try {
    const ImgCtor: any = (window as any).Image;
    const img = new ImgCtor();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  } catch (e) {
    resolve(false);
  }
});

const fetchPageTitle = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, { method: 'GET', mode: 'cors' });
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/<title>([^<]*)<\/title>/i);
    if (match && match[1]) return match[1].trim();
    return null;
  } catch (e) {
    return null;
  }
};

interface TiptapEditorProps {
  value: string;
  onChange: (v: string) => void;
}

// Link Dialog Component
interface LinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (text: string, href: string) => void;
  initialText?: string;
  initialHref?: string;
}

function LinkDialog({ isOpen, onClose, onApply, initialText = "", initialHref = "" }: LinkDialogProps) {
  const [text, setText] = useState(initialText);
  const [href, setHref] = useState(initialHref);

  // Reset form when dialog opens/closes or initial values change
  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      setHref(initialHref);
    }
  }, [isOpen, initialText, initialHref]);

  const handleApply = () => {
    if (href.trim()) {
      onApply(text.trim() || href.trim(), href.trim());
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-96">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          {initialText || initialHref ? "Edit Link" : "Insert Link"}
        </h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="link-text" className="text-gray-700 dark:text-gray-300">
              Link Text
            </Label>
            <Input
              id="link-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter link text..."
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Leave empty to use URL as text
            </p>
          </div>

          <div>
            <Label htmlFor="link-url" className="text-gray-700 dark:text-gray-300">
              URL *
            </Label>
            <Input
              id="link-url"
              value={href}
              onChange={(e) => setHref(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="https://example.com"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!href.trim()}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

// Embed Dialog (for videos/embeds)
function EmbedDialog({ isOpen, onClose, onApply, initialUrl = "" }: { isOpen: boolean; onClose: () => void; onApply: (url: string) => void; initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    if (isOpen) setUrl(initialUrl || "");
  }, [isOpen, initialUrl]);

  const handleApply = () => {
    if (url.trim()) {
      onApply(url.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-96">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Insert Embed</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="embed-url" className="text-gray-700 dark:text-gray-300">Embed URL</Label>
            <Input id="embed-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="mt-1" />
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={!url.trim()}>Insert</Button>
        </div>
      </div>
    </div>
  );
}

function TiptapEditor({ value, onChange }: TiptapEditorProps) {
  const { toast } = useToast();
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [gridSize, setGridSize] = useState({ rows: 0, cols: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const [linkDialogProps, setLinkDialogProps] = useState<{ text?: string, href?: string }>({});
  const [, setEditorState] = useState(0);

  const editor = useEditor({
    extensions: [
  StarterKit,
  TiptapImage,
  ProviderEmbed,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline hover:text-blue-800 cursor-pointer",
        },
      }),
      Highlight.configure({ multicolor: true }),
      Youtube,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      CustomTableCell,
      Blockquote,
      Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const update = () => setEditorState((x) => x + 1);

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);

    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  // Update editor content if value changes (for pre-filled post)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      const sanitizeForEditor = (html: string | null | undefined) => {
        if (!html) return "<p></p>";
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');

          const iframes = Array.from(doc.querySelectorAll('iframe'));
          iframes.forEach((iframe) => {
            try {
              const src = iframe.getAttribute('src') || iframe.getAttribute('data-src') || '';
              const clean = src.split('?')[0] || '';
              const placeholder = doc.createElement('div');
              placeholder.setAttribute('data-embed-url', clean || iframe.outerHTML);
              placeholder.className = 'embed-container';
              placeholder.textContent = clean || iframe.outerHTML;
              if (iframe && iframe.parentNode) iframe.parentNode.replaceChild(placeholder, iframe);
            } catch (err) {
              // defensive: skip problematic node
            }
          });

          const blockquotes = Array.from(doc.querySelectorAll('blockquote'));
          blockquotes.forEach((bq) => {
            // Only convert blockquotes that look like provider embeds (contain provider links or Instagram attributes)
            const providerLink = bq.querySelector('a[href*="instagram.com"], a[href*="reddit.com"], a[href*="facebook.com"], a[href*="fb.watch"]') as HTMLAnchorElement | null;
            const instAttr = (bq as HTMLElement).getAttribute('data-instgrm-permalink');
            if (providerLink || instAttr) {
              try {
                const href = providerLink ? providerLink.href : instAttr || bq.textContent || '';
                const placeholder = doc.createElement('div');
                placeholder.setAttribute('data-embed-url', (href || '').toString());
                placeholder.className = 'embed-container';
                placeholder.textContent = (href || '').toString();
                if (bq && bq.parentNode) bq.parentNode.replaceChild(placeholder, bq);
              } catch (err) {
                // ignore
              }
            }
          });

          const providerLinkSelector = 'a[href*="instagram.com"], a[href*="reddit.com"], a[href*="facebook.com"], a[href*="fb.watch"]';
          const providerLinks = Array.from(doc.querySelectorAll(providerLinkSelector));
          providerLinks.forEach((ln) => {
            try {
              const href = (ln as HTMLAnchorElement).href || (ln as HTMLAnchorElement).getAttribute('href') || '';
              const placeholder = doc.createElement('div');
              placeholder.setAttribute('data-embed-url', href.toString());
              placeholder.className = 'embed-container';
              placeholder.textContent = href.toString();
              try {
                const el = ln as unknown as HTMLElement | null;
                if (el && el.parentNode) el.parentNode.replaceChild(placeholder as any, el as any);
                else (ln as any).replaceWith(placeholder);
              } catch (err) {
                // ignore
              }
            } catch (err) {
              // ignore
            }
          });

          return doc.body.innerHTML || "<p></p>";
        } catch (err) {
          console.warn('sanitizeForEditor failed', err);
          return html || "<p></p>";
        }
      };

      const processed = sanitizeForEditor(value);
      editor.commands.setContent(processed || "<p></p>");
    }
  }, [value, editor]);

  // Handle paste of raw URLs: convert provider links into embeds immediately
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement | null;
    if (!dom) return;

    const handlePaste = (ev: ClipboardEvent) => {
      try {
        const text = ev.clipboardData?.getData('text') || '';
        if (!text) return;
        const u = text.trim();
        // Check common provider URLs
        if (/^https?:\/\/(?:www\.)?instagram\.com\//i.test(u) || /^https?:\/\/(?:www\.)?reddit\.com\//i.test(u) || /^https?:\/\/(?:www\.)?facebook\.com\//i.test(u) || /^https?:\/\/fb\.watch\//i.test(u)) {
          ev.preventDefault();
          insertMediaFromUrl(u);
        }
      } catch (err) {
        // ignore
      }
    };

    dom.addEventListener('paste', handlePaste as EventListener);
    return () => dom.removeEventListener('paste', handlePaste as EventListener);
  }, [editor]);

  // Helper: detect media type and insert appropriate embed (image, video, youtube, or provider link)
  const insertMediaFromUrl = async (url: string) => {
    // normalize
    const u = (url || '').trim();
    if (!u) return;

    // If user pasted raw provider iframe/blockquotes, convert to providerEmbed node
    if (/^\s*<\/?(iframe|blockquote)/i.test(u) || u.includes('<iframe') || u.includes('<blockquote')) {
      try {
        const doc = new DOMParser().parseFromString(u, 'text/html');
        // Try to extract a meaningful URL from iframe/src or anchor
        let urlCandidate = '';
        const iframe = doc.querySelector('iframe');
        if (iframe) urlCandidate = iframe.getAttribute('src') || iframe.getAttribute('data-src') || '';
        if (!urlCandidate) {
          const a = doc.querySelector('a') as HTMLAnchorElement | null;
          if (a) urlCandidate = a.href || a.getAttribute('href') || '';
        }
        const clean = (urlCandidate || u).split('?')[0];
        try { (editor as any).chain().focus().insertContent({ type: 'providerEmbed', attrs: { url: clean } }).run(); } catch (e) { console.error(e); toast({ title: 'Insert failed', description: 'Could not insert embed', variant: 'destructive' }); }
      } catch (e) {
        console.error('Failed to parse pasted HTML for embed', e);
      }
      return;
    }

  // YouTube ID extraction
    const ytMatch = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (ytMatch && ytMatch[1]) {
      const id = ytMatch[1];
      // Use the youtube extension node so the editor can render a playable preview inline
      try {
        (editor as any).chain().focus().insertContent({ type: 'youtube', attrs: { src: `https://www.youtube.com/watch?v=${id}` } }).run();
      } catch (e) {
        console.error(e);
        toast({ title: 'Insert failed', description: 'Could not insert YouTube embed', variant: 'destructive' });
      }
      return;
    }

    // direct video files
    if (/\.(mp4|webm|ogg)(?:\?|$)/i.test(u)) {
      try {
        (editor as any).chain().focus().insertContent({ type: 'providerEmbed', attrs: { url: u } }).run();
      } catch (e) {
        console.error(e);
        toast({ title: 'Insert failed', description: 'Could not insert video', variant: 'destructive' });
      }
      return;
    }

    // Image URLs: attempt to preload, then insert image node
    if (isImageUrl(u)) {
      const ok = await preloadImage(u);
      if (ok) {
        try { (editor as any).chain().focus().setImage({ src: u }).run(); } catch (e) { console.error(e); toast({ title: 'Insert failed', description: 'Could not insert image', variant: 'destructive' }); }
        return;
      }
      // fallback to providerEmbed if preload fails
    }

    // Provider-specific embeds
    // Instagram: insert stable placeholder
    if (/instagram\.com\/(p|reel|tv)\//i.test(u)) {
      const clean = u.split('?')[0].replace(/([^\/]$)/, '$1/');
      try { (editor as any).chain().focus().insertContent({ type: 'providerEmbed', attrs: { url: clean } }).run(); } catch (e) { console.error(e); toast({ title: 'Insert failed', description: 'Could not insert Instagram embed', variant: 'destructive' }); }
      return;
    }

    // Reddit: insert stable placeholder
    if (/reddit\.com\/.+\/comments\/.+/i.test(u)) {
      try { (editor as any).chain().focus().insertContent({ type: 'providerEmbed', attrs: { url: u } }).run(); } catch (e) { console.error(e); toast({ title: 'Insert failed', description: 'Could not insert Reddit embed', variant: 'destructive' }); }
      return;
    }

    // Facebook: insert stable placeholder
    if (/facebook\.com\/.+|fb.watch\/.+/i.test(u)) {
      try { (editor as any).chain().focus().insertContent({ type: 'providerEmbed', attrs: { url: u } }).run(); } catch (e) { console.error(e); toast({ title: 'Insert failed', description: 'Could not insert Facebook embed', variant: 'destructive' }); }
      return;
    }

    // Generic link fallback: try to fetch page title and insert a link with title
    try {
      const title = await fetchPageTitle(u);
      if (title) {
        try {
          (editor as any).chain().focus().insertContent({ type: 'paragraph', content: [{ type: 'text', text: title, marks: [{ type: 'link', attrs: { href: u } }] }] }).run();
          return;
        } catch (e) {
          // fall through
        }
      }
    } catch (e) {
      // ignore
    }
    const embed = { type: 'providerEmbed', attrs: { url: u } };
    try { (editor as any).chain().focus().insertContent(embed).run(); } catch (e) { console.error(e); toast({ title: 'Insert failed', description: 'Could not insert link', variant: 'destructive' }); }
  };

  // Listen for global 'insert-image' events dispatched after uploads
  useEffect(() => {
    if (!editor) return;
    const handler = (e: any) => {
      const url = e?.detail?.url;
      if (!url) return;
      try {
        // Preload and insert only after successful load
        insertMediaFromUrl(url);
      } catch (err) {
        console.error('Failed to insert media into editor', err);
      }
    };

    window.addEventListener('insert-image', handler as EventListener);
    window.addEventListener('insert-media', handler as EventListener);
    return () => {
      window.removeEventListener('insert-image', handler as EventListener);
      window.removeEventListener('insert-media', handler as EventListener);
    };
  }, [editor]);

  // Add CSS for link styling
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .ProseMirror a {
        color: #2563eb;
        text-decoration: underline;
        cursor: pointer;
      }
      
      .ProseMirror a:hover {
        color: #1d4ed8;
      }
      /* Responsive embed styles for the editor preview */
      .ProseMirror .embed-container{position:relative;width:100%;max-width:100%;overflow:hidden;padding-bottom:56.25%;height:0}
      @supports (aspect-ratio:16/9){.ProseMirror .embed-container{padding-bottom:0;height:auto;aspect-ratio:16/9}}
      .ProseMirror .embed-container iframe,.ProseMirror .embed-container video{position:absolute;top:0;left:0;width:100%;height:100%}
      .ProseMirror iframe{max-width:100%;height:auto}
      /* Images inserted as embeds should display as normal responsive images */
      .ProseMirror .embed-image{width:100%;max-width:100%;display:block;margin:0 auto}
      .ProseMirror .embed-image img{display:block;width:100%;height:auto;object-fit:contain}
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!editor) return <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 min-h-[300px] flex items-center justify-center">
    <p className="text-gray-500">Loading editor...</p>
  </div>;

  const handleLinkButtonClick = () => {
    if (editor.isActive('link')) {
      // Editing existing link
      const { href } = editor.getAttributes('link');
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to);

      setLinkDialogProps({
        text: text,
        href: href
      });
    } else {
      // Inserting new link
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to);

      setLinkDialogProps({
        text: text,
        href: ""
      });
    }
    setShowLinkDialog(true);
  };

  const handleLinkApply = (text: string, href: string) => {
    editor.chain().focus();

    // Ensure href starts with http:// or https://
    const formattedHref = href.startsWith('http') ? href : `https://${href}`;

    if (editor.state.selection.empty) {
      // If no text is selected, insert the text as a link
      editor
        .chain()
        .insertContent({
          type: 'text',
          text: text,
          marks: [
            {
              type: 'link',
              attrs: { href: formattedHref }
            }
          ]
        })
        .run();
    } else {
      // If text is selected, convert it to a link
      editor
        .chain()
        .extendMarkRange('link')
        .setLink({ href: formattedHref })
        .run();

      // If text is provided and different from selected text, update the text
      if (text && text !== editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)) {
        editor.chain().insertContentAt(editor.state.selection, text).run();
      }
    }
  };

  const applyHeading = (level: number) => {
    editor.chain().focus().toggleHeading({ level: level as any }).run();
  };

  const colors = [
    "#fff59d", "#c8e6c9", "#bbdefb", "#f8bbd0", "#ffcdd2",
    "#d1c4e9", "#b2dfdb", "#ffcc80", "#b0bec5", "#eeeeee",
    "#e57373", "#81c784", "#64b5f6", "#ba68c8", "#ffd54f",
    "#4db6ac", "#90a4ae", "#ff8a65", "#a1887f", "#f5f5f5",
  ];

  return (
    <div className="relative">
      {/* Link Dialog */}
      <LinkDialog
        isOpen={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        onApply={handleLinkApply}
        initialText={linkDialogProps.text}
        initialHref={linkDialogProps.href}
      />
      {/* Embed Dialog */}
      <EmbedDialog
        isOpen={showEmbedDialog}
        onClose={() => setShowEmbedDialog(false)}
        onApply={(url: string) => {
          insertMediaFromUrl(url);
        }}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-2 items-center relative">
        {/* Heading selector */}
        <select
          className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          onChange={(e) => applyHeading(parseInt(e.target.value))}
          value={
            editor.isActive("heading", { level: 1 }) ? "1" :
              editor.isActive("heading", { level: 2 }) ? "2" :
                editor.isActive("heading", { level: 3 }) ? "3" :
                  editor.isActive("heading", { level: 4 }) ? "4" :
                    editor.isActive("heading", { level: 5 }) ? "5" :
                      editor.isActive("heading", { level: 6 }) ? "6" :
                        "0"
          }
        >
          <option value="0">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
          <option value="4">Heading 4</option>
          <option value="5">Heading 5</option>
          <option value="6">Heading 6</option>
        </select>

        {/* Bold */}
        <Button
          size="sm"
          variant={editor.isActive("bold") ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </Button>

        {/* Italic */}
        <Button
          size="sm"
          variant={editor.isActive("italic") ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </Button>

        {/* Highlight */}
        <Button
          size="sm"
          variant={editor.isActive("highlight") ? "default" : "outline"}
          onClick={() => setShowColorPicker((prev) => !prev)}
        >
          Highlight
        </Button>

        {showColorPicker && (
          <div className="absolute top-12 left-0 z-50 bg-white dark:bg-gray-800 p-2 rounded shadow grid grid-cols-10 gap-1">
            {colors.map((c) => (
              <button
                key={c}
                className="w-6 h-6 rounded border"
                style={{ backgroundColor: c }}
                onClick={() => {
                  editor.chain().focus().toggleHighlight({ color: c }).run();
                  setShowColorPicker(false);
                }}
              />
            ))}
          </div>
        )}

        {/* Blockquote */}
        <Button
          size="sm"
          variant={editor.isActive("blockquote") ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          Quote
        </Button>

        {/* Link */}
        <Button
          size="sm"
          variant={editor.isActive("link") ? "default" : "outline"}
          onClick={handleLinkButtonClick}
        >
          Link
        </Button>

        {/* Unlink */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive('link')}
        >
          Unlink
        </Button>

        {/* Table */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowTableGrid((prev) => !prev)}
        >
          Insert Table
        </Button>

        {/* Embed (moved next to table as requested) */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowEmbedDialog(true)}
        >
          Embed
        </Button>

        {showTableGrid && (
          <div className="absolute top-12 left-40 z-50 bg-white dark:bg-gray-800 p-2 rounded shadow">
            <div className="grid grid-cols-10 gap-0.5">
              {Array.from({ length: 100 }).map((_, i) => {
                const row = Math.floor(i / 10) + 1;
                const col = (i % 10) + 1;
                const active = row <= gridSize.rows && col <= gridSize.cols;
                return (
                  <div
                    key={i}
                    onMouseEnter={() => setGridSize({ rows: row, cols: col })}
                    onClick={() => {
                      editor.chain().focus().insertTable({
                        rows: gridSize.rows,
                        cols: gridSize.cols,
                        withHeaderRow: true,
                      }).run();
                      setShowTableGrid(false);
                    }}
                    className={`w-6 h-6 border ${active ? "bg-blue-400 border-blue-600" : "bg-gray-100 dark:bg-gray-700"}`}
                  />
                );
              })}
            </div>
            <p className="text-xs text-gray-600 mt-1">{gridSize.rows} × {gridSize.cols}</p>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg min-h-[300px]">
        <EditorContent editor={editor} />
      </div>
      <div className="mt-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full">
        <Input id="insertImageUrl" placeholder="https://..." onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const val = (e.target as HTMLInputElement).value.trim();
            if (val) {
                insertMediaFromUrl(val);
                (e.target as HTMLInputElement).value = '';
              }
          }
        }} />
        <Button size="sm" className="w-full sm:w-auto" onClick={() => {
          const el = document.getElementById('insertImageUrl') as HTMLInputElement | null;
          if (!el) return;
          const val = el.value.trim();
          if (!val) return;
          insertMediaFromUrl(val);
          el.value = '';
        }}>Insert Image</Button>
      </div>
    </div>
  );
}

// The BlogCreate component remains the same as your original code
// You can just replace your old TiptapEditor with this new one
// Everything else (form, submit, sidebar, etc.) remains unchanged
export default function BlogCreate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    status: "draft",
    category: "",
    tags: "",
    coverImage: "",
    seoTitle: "",
    seoDescription: "",
  });
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [insertIntoContent, setInsertIntoContent] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const postData = {
        ...data,
        tags: data.tags.split(",").map((tag: string) => tag.trim()).filter(Boolean),
        author: user ? `${user.firstName || ""} ${user.lastName || user.email || ""}`.trim() : undefined,
        slug: slugify(data.title, { lower: true, strict: true }),
      };
      await apiRequest("POST", "/api/admin/blog", postData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      toast({
        title: "Success",
        description: "Blog post created successfully",
      });
  setLocation("/toolx-adminUser-auth/blog");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create blog post",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (status: string) => {
    if (!formData.title || !formData.content) {
      toast({
        title: "Validation Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({
      ...formData,
      status,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 w-full">
          <Button variant="ghost" asChild className="self-start sm:self-auto">
            <Link href="/toolx-adminUser-auth/blog" className="flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="whitespace-nowrap">Back to Blog Management</span>
            </Link>
          </Button>
          <div className="mt-2 sm:mt-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Create New Blog Post
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Write and publish a new blog post
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => handleSubmit("draft")}
            disabled={createMutation.isPending}
            className="w-full sm:w-auto"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={() => handleSubmit("published")}
            disabled={createMutation.isPending}
            className="w-full sm:w-auto"
          >
            <Send className="w-4 h-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter post title..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => handleInputChange("excerpt", e.target.value)}
                  placeholder="Brief description of the post..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="content">Content *</Label>
                <TiptapEditor
                  value={formData.content}
                  onChange={(html) =>
                    setFormData((prev) => ({ ...prev, content: html }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar (unchanged) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="tutorials">Tutorials</option>
                  <option value="tools">Tools</option>
                  <option value="updates">Updates</option>
                  <option value="tips">Tips</option>
                </select>
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => handleInputChange("tags", e.target.value)}
                  placeholder="tag1, tag2, tag3..."
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Separate tags with commas
                </p>
              </div>

              <div>
                <Label htmlFor="coverImage">Featured Image URL</Label>
                <Input
                  id="coverImage"
                  value={formData.coverImage}
                  onChange={(e) => handleInputChange("coverImage", e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="mt-1"
                />
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-full">
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(e) => {
                        const f = e.target.files ? e.target.files[0] : null;
                        if (!f) return;
                        // validate
                        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(f.type)) {
                          toast({ title: 'Invalid file', description: 'Only PNG or JPEG allowed', variant: 'destructive' });
                          return;
                        }
                        if (f.size > 5 * 1024 * 1024) {
                          toast({ title: 'File too large', description: 'Max 5MB allowed', variant: 'destructive' });
                          return;
                        }
                        setSelectedFile(f);
                        setPreviewUrl(URL.createObjectURL(f));
                      }}
                    />
                    {previewUrl && (
                      <img src={previewUrl} alt="preview" className="mt-2 max-h-40 object-contain" />
                    )}
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        disabled={!selectedFile || uploading}
                        onClick={() => {
                          if (!selectedFile) return;
                          setUploading(true);
                          setUploadProgress(0);

                          const fd = new FormData();
                          fd.append('file', selectedFile);

                          const xhr = new XMLHttpRequest();
                          xhr.open('POST', '/api/admin/uploads');

                          xhr.upload.onprogress = (ev) => {
                            if (ev.lengthComputable) {
                              setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
                            }
                          };

                          xhr.onload = () => {
                            setUploading(false);
                            setUploadProgress(null);
                            try {
                              const data = JSON.parse(xhr.responseText);
                              if (xhr.status >= 200 && xhr.status < 300 && data.url) {
                                setFormData((prev) => ({ ...prev, coverImage: data.url }));
                                if (insertIntoContent) {
                                  try { window.dispatchEvent(new CustomEvent('insert-media', { detail: { url: data.url } })); } catch (e) {}
                                }
                                setSelectedFile(null);
                                if (previewUrl) { URL.revokeObjectURL(previewUrl); }
                                setPreviewUrl(null);
                                toast({ title: 'Uploaded', description: insertIntoContent ? 'Image uploaded and inserted into content' : 'Image uploaded and set as featured image' });
                              } else {
                                toast({ title: 'Upload failed', description: data.message || 'Upload failed', variant: 'destructive' });
                              }
                            } catch (err: any) {
                              toast({ title: 'Upload failed', description: 'Invalid server response', variant: 'destructive' });
                            }
                          };

                          xhr.onerror = () => {
                            setUploading(false);
                            setUploadProgress(null);
                            toast({ title: 'Upload error', description: 'Network error during upload', variant: 'destructive' });
                          };

                          xhr.send(fd);
                        }}
                      >
                        {uploading && uploadProgress ? `Uploading (${uploadProgress}%)` : 'Upload'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedFile(null); if (previewUrl) { URL.revokeObjectURL(previewUrl); } setPreviewUrl(null); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                  {/* <div className="mt-2 flex items-center gap-2">
                    <input id="insert-into-content" type="checkbox" checked={insertIntoContent} onChange={(e) => setInsertIntoContent(e.target.checked)} />
                    <label htmlFor="insert-into-content" className="text-sm text-gray-700 dark:text-gray-300">Insert uploaded media into content</label>
                  </div> */}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seoTitle">Meta Title</Label>
                <Input
                  id="seoTitle"
                  value={formData.seoTitle}
                  onChange={(e) => handleInputChange("seoTitle", e.target.value)}
                  placeholder="SEO title for search engines..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="seoDescription">Meta Description</Label>
                <Textarea
                  id="seoDescription"
                  value={formData.seoDescription}
                  onChange={(e) => handleInputChange("seoDescription", e.target.value)}
                  placeholder="SEO description for search engines..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
