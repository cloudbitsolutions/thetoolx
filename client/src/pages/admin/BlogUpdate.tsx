import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Eye, Image as ImageIcon, Star, User, Clock } from "lucide-react";

// 📝 Tiptap imports
import { EditorContent, useEditor } from "@tiptap/react";
import { TextSelection } from "prosemirror-state";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Youtube from "@tiptap/extension-youtube";
import Image from '@tiptap/extension-image';
import { Node } from '@tiptap/core';
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Blockquote from "@tiptap/extension-blockquote";
import Heading from "@tiptap/extension-heading";

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

function TiptapEditor({ value, onChange }: TiptapEditorProps) {
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [gridSize, setGridSize] = useState({ rows: 0, cols: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkDialogProps, setLinkDialogProps] = useState<{ text?: string, href?: string }>({});
  const [, setEditorState] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline hover:text-blue-800 cursor-pointer",
        },
      }),
      Highlight.configure({ multicolor: true }),
      Youtube,
      Image,
      // Custom embed node for responsive iframes and video tags (Instagram, Facebook, Reddit, raw mp4)
      Node.create({
        name: 'embed',
        group: 'block',
        atom: true,
        selectable: true,
        addAttributes() {
          return {
            src: { default: null },
            kind: { default: 'iframe' },
          };
        },
        parseHTML() {
          return [
            { tag: 'div[data-embed]' },
            { tag: 'iframe' },
            { tag: 'video' },
          ];
        },
        renderHTML({ HTMLAttributes }) {
          const { src, kind } = HTMLAttributes as any;
          if (kind === 'video') {
            return [
              'div',
              { 'data-embed': src, class: 'video-embed-wrapper' },
              ['video', { src, controls: 'controls', class: 'video-embed-element' }],
            ];
          }

          return [
            'div',
            { 'data-embed': src, class: 'video-embed-wrapper' },
            [
              'iframe',
              {
                src,
                frameborder: '0',
                allow: 'autoplay; encrypted-media; fullscreen; picture-in-picture',
                allowfullscreen: 'true',
              },
            ],
          ];
        },
      }),
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

  // Paste handler: convert bare URLs to embeds or images
  useEffect(() => {
    if (!editor) return;

    const dom = editor.view.dom as HTMLElement;
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text')?.trim();
      if (!text) return;

      // simple URL check
      try {
        const url = new URL(text.startsWith('http') ? text : `https://${text}`);
        const href = url.href;

        // helpers (duplicate of above) - keep local to avoid reorder issues
        const isImage = /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(href);
        const asEmbedLocal = (u: string) => {
          try {
            const uu = new URL(u);
            const host = uu.hostname.replace('www.', '');
            if (host.includes('youtube.com') || host.includes('youtu.be')) {
              if (host.includes('youtu.be')) return `https://www.youtube.com/embed/${uu.pathname.slice(1)}`;
              const v = uu.searchParams.get('v');
              if (v) return `https://www.youtube.com/embed/${v}`;
            }
            if (host.includes('instagram.com')) {
              const parts = uu.pathname.split('/').filter(Boolean);
              if (parts.length >= 2) return `https://www.instagram.com/${parts[0]}/${parts[1]}/embed`;
            }
            if (host.includes('facebook.com') || host.includes('fb.watch')) {
              return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u)}`;
            }
            if (host.includes('reddit.com') || host.includes('v.redd.it')) {
              if (host.includes('v.redd.it')) return u;
              return `https://www.redditmedia.com${uu.pathname}?ref_source=embed&ref=share&embed=true`;
            }
            return null;
          } catch (er) { return null; }
        };

        const embedSrc = asEmbedLocal(href);

        if (isImage) {
          e.preventDefault();
          editor.chain().focus().setImage({ src: href, alt: '' }).run();
          return;
        }

        if (embedSrc) {
          e.preventDefault();
          const isVideoFile = /\.(mp4|webm|ogg)(\?.*)?$/i.test(href) || href.includes('v.redd.it');
          editor.chain().focus().insertContent({ type: 'embed', attrs: { src: embedSrc, kind: isVideoFile ? 'video' : 'iframe' } }).run();
          return;
        }
      } catch (err) {
        // not a URL — ignore
      }
    };

    dom.addEventListener('paste', onPaste as any);

    return () => dom.removeEventListener('paste', onPaste as any);
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
      /* Responsive embed wrapper */
      .video-embed-wrapper {
        position: relative;
        padding-bottom: 56.25%;
        height: 0;
        overflow: hidden;
        margin: 1rem 0;
      }

      .video-embed-wrapper iframe,
      .video-embed-wrapper .video-embed-element {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 0;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Update editor content if value changes (for pre-filled post)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "<p></p>");
    }
  }, [value, editor]);

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

    // Helper: detect image URL
    const isImageUrl = (u: string) => /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(u);

    // Helper: detect known video providers and convert to embeddable src
    const asEmbed = (u: string) => {
      try {
        const url = new URL(u);
        const host = url.hostname.replace('www.', '');

        // YouTube handled by youtube extension; if a full youtube url, insert iframe src
        if (host.includes('youtube.com') || host.includes('youtu.be')) {
          // let the Youtube extension handle via paste or use youtube embed src
          if (host.includes('youtu.be')) {
            const id = url.pathname.slice(1);
            return `https://www.youtube.com/embed/${id}`;
          }
          const params = url.searchParams;
          const v = params.get('v');
          if (v) return `https://www.youtube.com/embed/${v}`;
        }

        // Instagram video/embed
        if (host.includes('instagram.com')) {
          // Instagram embeds use https://www.instagram.com/p/{shortcode}/embed
          const parts = url.pathname.split('/').filter(Boolean);
          if (parts.length >= 2) {
            return `https://www.instagram.com/${parts[0]}/${parts[1]}/embed`;
          }
        }

        // Facebook video/embed
        if (host.includes('facebook.com') || host.includes('fb.watch')) {
          // For watch or direct video links, use the plugin video.php?href=... approach
          return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u)}`;
        }

        // Reddit hosted videos or reddit posts
        if (host.includes('reddit.com') || host.includes('v.redd.it')) {
          // Reddit post embed URL
          if (host.includes('v.redd.it')) {
            return u; // reddit video source can be used directly in video tag
          }
          return `https://www.redditmedia.com${url.pathname}?ref_source=embed&ref=share&embed=true`;
        }

        return null;
      } catch (e) {
        return null;
      }
    };

    const embedSrc = asEmbed(formattedHref);

    if (isImageUrl(formattedHref)) {
      // Insert image node
      editor.chain().focus().setImage({ src: formattedHref, alt: text || formattedHref }).run();
      return;
    }

    if (embedSrc) {
      // If reddit hosted mp4, or host suggests video, insert embed node
      const isVideoFile = /\.(mp4|webm|ogg)(\?.*)?$/i.test(formattedHref) || formattedHref.includes('v.redd.it');
      editor.chain().focus().insertContent({ type: 'embed', attrs: { src: embedSrc, kind: isVideoFile ? 'video' : 'iframe' } }).run();
      return;
    }

    // Default: insert a normal link (either replacing selection or inserting text link)
    if (editor.state.selection.empty) {
      editor
        .chain()
        .insertContent({
          type: 'text',
          text: text || formattedHref,
          marks: [
            {
              type: 'link',
              attrs: { href: formattedHref }
            }
          ]
        })
        .run();
    } else {
      editor
        .chain()
        .extendMarkRange('link')
        .setLink({ href: formattedHref })
        .run();

      if (text && text !== editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)) {
        editor.chain().insertContentAt(editor.state.selection, text).run();
      }
    }
  };

  // Insert Image button handler
  const handleInsertImage = async () => {
    const url = window.prompt('Image URL');
    if (!url) return;
    const formatted = url.startsWith('http') ? url : `https://${url}`;
    editor.chain().focus().setImage({ src: formatted, alt: '' }).run();
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
          type="button"
          size="sm"
          variant={editor.isActive("bold") ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </Button>

        {/* Italic */}
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("italic") ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </Button>

        {/* Highlight */}
        <Button
          type="button"
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
                type="button"
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
          type="button"
          size="sm"
          variant={editor.isActive("blockquote") ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          Quote
        </Button>

        {/* Link */}
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("link") ? "default" : "outline"}
          onClick={handleLinkButtonClick}
        >
          Link
        </Button>

        {/* Insert Image */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleInsertImage}
        >
          Image
        </Button>

        {/* Insert Embed URL manually */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const u = window.prompt('Embed URL (Instagram/Facebook/Reddit/MP4)');
            if (!u) return;
            const formatted = u.startsWith('http') ? u : `https://${u}`;
            // reuse the same logic as link apply
            handleLinkApply('', formatted);
          }}
        >
          Embed
        </Button>

        {/* Unlink */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive('link')}
        >
          Unlink
        </Button>

        {/* Table */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowTableGrid((prev) => !prev)}
        >
          Insert Table
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
    </div>
  );
}

interface BlogPostType {
  id?: number | string;
  slug?: string;
  title?: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  createdAt?: string;
  author?: string;
  tags?: string[];
  featured?: boolean;
  viewCount?: number;
  status?: string;
  category?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export default function EditBlogPost() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const postId = id;

  const { data: post, isLoading } = useQuery<BlogPostType | null>({
    queryKey: [`/api/admin/blog/${postId}`],
    enabled: !!postId,
  });

  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    status: "draft",
    featured: false,
    category: "general",
    tags: "",
    coverImage: "",
    author: "",
    seoTitle: "",
    seoDescription: "",
  });

  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title || "",
        excerpt: post.excerpt || "",
        content: post.content || "",
        status: post.status || "draft",
        featured: post.featured || false,
        category: post.category || "general",
        tags: post.tags ? post.tags.join(", ") : "",
        coverImage: post.coverImage || "",
        author: post.author || "",
        seoTitle: post.seoTitle || "",
        seoDescription: post.seoDescription || "",
      });
    }
  }, [post]);

  const handleInputChange = (name: string, value: string) => setFormData((prev) => ({ ...prev, [name]: value }));
  const handleSwitchChange = (name: string, checked: boolean) => setFormData((prev) => ({ ...prev, [name]: checked }));
  const handleSelectChange = (name: string, value: string) => setFormData((prev) => ({ ...prev, [name]: value }));

  const updateMutation = useMutation({
    mutationFn: async (updatedPost: any) => apiRequest("PUT", `/api/admin/blog/${postId}`, updatedPost),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/blog/${postId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      toast({ title: "Success", description: "Blog post updated successfully" });
  setLocation("/toolx-adminUser-auth/blog");
    },
    onError: () => toast({ title: "Error", description: "Failed to update blog post", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const postData = { ...formData, tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean) };
    updateMutation.mutate(postData);
  };

  if (isLoading) return <p className="text-center mt-20">Loading...</p>;

  const slugify = (s: string) => s.toString().toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "").replace(/-+/g, "-");
  const previewSlug = post?.slug || slugify(formData.title);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Button asChild variant="ghost">
            <Link href="/toolx-adminUser-auth/blog">
              <ArrowLeft className="w-4 h-4 mr-2" />Back to Blog Management
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Blog Post</h1>
          <div className="w-24" />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader><CardTitle>Post Title</CardTitle></CardHeader>
                <CardContent>
                  <Input value={formData.title} onChange={(e) => handleInputChange("title", e.target.value)} placeholder="Enter post title" required />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Excerpt</CardTitle></CardHeader>
                <CardContent>
                  <Input value={formData.excerpt} onChange={(e) => handleInputChange("excerpt", e.target.value)} placeholder="Enter excerpt" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Content</CardTitle></CardHeader>
                <CardContent>
                  <TiptapEditor value={formData.content} onChange={(html) => handleInputChange("content", html)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>SEO Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Input value={formData.seoTitle} onChange={(e) => handleInputChange("seoTitle", e.target.value)} placeholder="Meta title" />
                  <Input value={formData.seoDescription} onChange={(e) => handleInputChange("seoDescription", e.target.value)} placeholder="Meta description" />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Status & Featured</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Select value={formData.status} onValueChange={(v) => handleSelectChange("status", v)}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center justify-between">
                    <Label className="flex items-center"><Star className="mr-2" />Featured Post</Label>
                    <Switch checked={formData.featured} onCheckedChange={(v) => handleSwitchChange("featured", v)} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center"><ImageIcon className="mr-2" />Featured Image</CardTitle></CardHeader>
                <CardContent>
                  {formData.coverImage && <img src={formData.coverImage} alt="Featured" className="w-full mb-2" />}
                  <Input value={formData.coverImage} onChange={(e) => handleInputChange("coverImage", e.target.value)} placeholder="Image URL" />
                  {/* <Button type="button" variant="outline" className="w-full">Upload Image</Button> */}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Categories & Tags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleSelectChange("category", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="tutorials">Tutorials</SelectItem>
                        <SelectItem value="tools">Tools</SelectItem>
                        <SelectItem value="updates">Updates</SelectItem>
                        <SelectItem value="tips">Tips</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <Input
                      name="tags"
                      value={formData.tags}
                      onChange={(e) => handleInputChange("tags", e.target.value)}
                      placeholder="Comma separated tags"
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Separate tags with commas
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center"><User className="mr-2" />Author</CardTitle></CardHeader>
                <CardContent>
                  <Input value={formData.author} onChange={(e) => handleInputChange("author", e.target.value)} placeholder="Author name" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center"><Clock className="mr-2" />Reading Time</CardTitle></CardHeader>
                <CardContent>
                  {post && post.content ? Math.ceil(post.content.length / 1000) : "N/A"} min
                  <p className="text-sm text-gray-500">Created: {post?.createdAt ? new Date(post.createdAt).toLocaleDateString() : "N/A"}</p>
                  {/* <p className="text-sm text-gray-500">Views: {post?.views || 0}</p> */}
                </CardContent>
              </Card>

              <div className="space-y-2 sticky top-4">
                <Button type="submit" className="w-full">
                  <Save className="mr-2" />Save Changes
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/blog/${previewSlug}`} target="_blank">
                    <Eye className="mr-2" />Preview
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}