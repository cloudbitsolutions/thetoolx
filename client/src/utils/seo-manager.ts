export interface SEOData {
  title: string;
  description: string;
  keywords: string;
  image: string;
  url: string;
  canonical: string;
  type?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  siteName?: string;
  locale?: string;
}

export interface StructuredData {
  "@context": string;
  "@type": string;
  [key: string]: any;
}

export class SEOManager {
  private baseUrl: string;
  private defaultImage: string;
  private siteName: string;

  constructor(baseUrl: string = process.env.CLIENT_URL || "https://thetoolx.com") {
    this.baseUrl = baseUrl;
    this.defaultImage = `${baseUrl}/og-image.png`;
    this.siteName = "TheToolX";
  }

  // Generate SEO data for different pages
  generateSEOData(pathname: string, customData?: Partial<SEOData>): SEOData {
    const url = `${this.baseUrl}${pathname}`;
    
    const defaultSEO: SEOData = {
      title: "TheToolX - Free Online Tools & Utilities",
      description: "Access powerful free online tools including video downloaders, converters, utilities and more. Fast, secure, and easy to use.",
      keywords: "online tools, free tools, video downloader, converter, utilities, web tools",
      image: this.defaultImage,
      url,
      canonical: url,
      type: "website",
      author: "TheToolX Team",
      siteName: this.siteName,
      locale: "en_US"
    };

    // Route-specific SEO configurations
    const routeConfigs: Record<string, Partial<SEOData>> = {
      "/": {
        title: "TheToolX - Free Online Tools & Utilities for Everyone",
        description: "Discover a comprehensive collection of free online tools including video downloaders (YouTube, Facebook, Instagram, TikTok), converters (PDF to Word, YouTube to MP3), utilities (URL shortener, translator, background remover), and more. Fast, secure, and no registration required.",
        keywords: "online tools, free tools, video downloader, youtube downloader, facebook downloader, instagram downloader, tiktok downloader, pdf converter, url shortener, translator, background remover, speed test, age calculator",
        type: "website"
      },
      "/tools": {
        title: "Browse All Tools - TheToolX Online Tool Collection",
        description: "Explore our complete collection of free online tools. Filter by category and find the perfect tool for your needs. Video downloaders, converters, and utilities all in one place.",
        keywords: "all tools, online tools collection, video tools, converter tools, utility tools, free online tools",
        type: "website"
      },
      "/auth": {
        title: "Sign In - TheToolX",
        description: "Sign in to TheToolX to unlock premium features, save your preferences, and get unlimited access to all tools.",
        keywords: "sign in, login, authentication, premium access",
        type: "website"
      },
      "/pricing": {
        title: "Pricing Plans - TheToolX Premium",
        description: "Affordable pricing plans for TheToolX premium membership. Get unlimited access, no ads, faster processing, and priority support. Start with a free trial.",
        keywords: "pricing, premium plans, subscription, free trial, unlimited access",
        type: "website"
      },
      "/about": {
        title: "About Us - TheToolX Story & Mission",
        description: "Learn about TheToolX, our mission to provide free and accessible online tools for everyone, and meet the team behind the platform.",
        keywords: "about us, company info, mission, team, story",
        type: "website"
      },
      "/blog": {
        title: "Blog - TheToolX Tips, Tutorials & Updates",
        description: "Read the latest tips, tutorials, and updates from TheToolX. Learn how to use our tools effectively and stay updated with new features.",
        keywords: "blog, tutorials, tips, guides, updates, how to",
        type: "website"
      },
      "/contact": {
        title: "Contact Us - TheToolX Support",
        description: "Get in touch with TheToolX support team. We're here to help with any questions, feedback, or suggestions.",
        keywords: "contact, support, help, feedback, customer service",
        type: "website"
      },
      "/privacy": {
        title: "Privacy Policy - TheToolX",
        description: "Read TheToolX privacy policy. Learn how we protect your data and respect your privacy.",
        keywords: "privacy policy, data protection, privacy, security",
        type: "article"
      },
      "/terms": {
        title: "Terms of Service - TheToolX",
        description: "Read TheToolX terms of service. Understand your rights and responsibilities when using our platform.",
        keywords: "terms of service, terms and conditions, legal, usage policy",
        type: "article"
      },
      
      // Tool-specific pages
      "/tools/youtube-video-downloader": {
        title: "YouTube Video Downloader - Download YouTube Videos Free | TheToolX",
        description: "Download YouTube videos in HD quality for free. Fast, secure, and easy to use. Supports multiple formats (MP4, WEBM) and resolutions (1080p, 720p, 480p, 360p). No registration required.",
        keywords: "youtube downloader, download youtube videos, youtube video downloader free, youtube mp4, save youtube videos, youtube download online",
        type: "article"
      },
      "/tools/facebook-video-downloader": {
        title: "Facebook Video Downloader - Download FB Videos Free | TheToolX",
        description: "Download Facebook videos in high quality for free. Fast and easy Facebook video downloader. Save videos from Facebook to your device. No software installation needed.",
        keywords: "facebook downloader, download facebook videos, facebook video downloader free, save facebook videos, fb video download",
        type: "article"
      },
      "/tools/instagram-video-downloader": {
        title: "Instagram Video Downloader - Download IG Videos & Reels | TheToolX",
        description: "Download Instagram videos, reels, IGTV, and stories for free. High-quality Instagram video downloader with no watermark. Save Instagram content easily.",
        keywords: "instagram downloader, download instagram videos, instagram reels downloader, save instagram videos, ig video download",
        type: "article"
      },
      "/tools/tiktok-video-downloader": {
        title: "TikTok Video Downloader - Download TikTok Without Watermark | TheToolX",
        description: "Download TikTok videos without watermark for free. Fast TikTok video downloader in HD quality. Save TikTok videos to your device easily.",
        keywords: "tiktok downloader, download tiktok videos, tiktok video downloader no watermark, save tiktok videos, tiktok download free",
        type: "article"
      },
      "/tools/twitter-video-downloader": {
        title: "Twitter Video Downloader - Download Twitter Videos & GIFs | TheToolX",
        description: "Download Twitter videos and GIFs for free. Fast and secure Twitter video downloader. Save tweets with videos easily to your device.",
        keywords: "twitter downloader, download twitter videos, twitter video downloader free, save twitter videos, twitter gif download",
        type: "article"
      },
      "/tools/youtube-to-mp3-converter": {
        title: "YouTube to MP3 Converter - Convert YouTube Videos to MP3 | TheToolX",
        description: "Convert YouTube videos to MP3 audio files for free. High-quality YouTube to MP3 converter. Extract audio from YouTube videos in seconds.",
        keywords: "youtube to mp3, youtube mp3 converter, convert youtube to mp3, youtube audio download, extract audio from youtube",
        type: "article"
      },
      "/tools/pdf-to-word-converter": {
        title: "PDF to Word Converter - Convert PDF to DOCX Online Free | TheToolX",
        description: "Convert PDF to Word (DOCX) for free. Fast and accurate PDF to Word converter. Maintain formatting and edit your documents easily.",
        keywords: "pdf to word, pdf to docx, convert pdf to word, pdf converter, pdf to doc online free",
        type: "article"
      },
      "/tools/background-remover": {
        title: "Background Remover - Remove Image Background Free AI | TheToolX",
        description: "Remove background from images using AI for free. Automatic background remover tool. Get transparent backgrounds or replace with custom colors instantly.",
        keywords: "background remover, remove background, background eraser, transparent background, ai background remover free",
        type: "article"
      },
      "/tools/internet-speed-test": {
        title: "Internet Speed Test - Check Your Internet Speed | TheToolX",
        description: "Test your internet speed for free. Accurate internet speed test to measure download speed, upload speed, and ping. Check your connection quality now.",
        keywords: "speed test, internet speed test, test internet speed, check internet speed, network speed test",
        type: "article"
      },
      "/tools/age-calculator": {
        title: "Age Calculator - Calculate Your Age Accurately | TheToolX",
        description: "Calculate your exact age in years, months, and days. Free age calculator tool with detailed age breakdown. Find out how old you are precisely.",
        keywords: "age calculator, calculate age, how old am i, age counter, date of birth calculator",
        type: "article"
      },
      "/tools/url-shortener": {
        title: "URL Shortener - Shorten URLs & Create Short Links Free | TheToolX",
        description: "Shorten long URLs for free. Create custom short links with analytics tracking. Fast URL shortener with QR code generation and link management.",
        keywords: "url shortener, shorten url, link shortener, short link generator, free url shortener",
        type: "article"
      },
      "/tools/language-translator": {
        title: "Language Translator - Free Online Translation Tool | TheToolX",
        description: "Translate text between multiple languages for free. Accurate online language translator supporting 100+ languages. Fast and easy translation tool.",
        keywords: "translator, language translator, translate online, free translation, multilingual translator",
        type: "article"
      }
    };

    const routeConfig = routeConfigs[pathname] || {};
    
    return {
      ...defaultSEO,
      ...routeConfig,
      ...customData,
      url,
      canonical: customData?.canonical || url
    };
  }

  // Generate structured data for different content types
  generateStructuredData(pathname: string, seoData: SEOData): StructuredData {
    const baseStructuredData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": this.siteName,
      "url": this.baseUrl,
      "logo": `${this.baseUrl}/logo.png`,
      "description": "Free online tools and utilities platform",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "Customer Support",
        "url": `${this.baseUrl}/contact`
      }
    };

    // Homepage
    if (pathname === "/") {
      return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": this.siteName,
        "url": this.baseUrl,
        "description": seoData.description,
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${this.baseUrl}/tools?search={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        },
        "publisher": baseStructuredData
      };
    }

    // Tool pages
    if (pathname.startsWith("/tools/")) {
      const toolName = pathname.split("/").pop()?.replace(/-/g, " ") || "Tool";
      
      return {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": seoData.title.split(" - ")[0],
        "applicationCategory": "Utility",
        "operatingSystem": "Web Browser",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "description": seoData.description,
        "url": seoData.url,
        "publisher": baseStructuredData,
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "ratingCount": "1250",
          "bestRating": "5",
          "worstRating": "1"
        }
      };
    }

    // Blog posts
    if (pathname.startsWith("/blog/") && pathname !== "/blog") {
      return {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": seoData.title,
        "description": seoData.description,
        "author": baseStructuredData,
        "publisher": baseStructuredData,
        "url": seoData.url,
        "image": seoData.image,
        "datePublished": seoData.publishedTime || new Date().toISOString(),
        "dateModified": seoData.modifiedTime || new Date().toISOString(),
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": seoData.url
        }
      };
    }

    // Default WebPage
    return {
      ...baseStructuredData,
      "@type": "WebPage",
      "name": seoData.title,
      "description": seoData.description,
      "url": seoData.url
    };
  }

  // Generate breadcrumb structured data
  generateBreadcrumbStructuredData(pathname: string): StructuredData | null {
    const paths = pathname.split("/").filter(Boolean);
    
    if (paths.length === 0) return null;

    const breadcrumbList: any[] = [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": this.baseUrl
      }
    ];

    let currentPath = "";
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      const name = path.split("-").map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(" ");

      breadcrumbList.push({
        "@type": "ListItem",
        "position": index + 2,
        "name": name,
        "item": `${this.baseUrl}${currentPath}`
      });
    });

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbList
    };
  }

  // Generate FAQ structured data for tool pages
  generateFAQStructuredData(pathname: string): StructuredData | null {
    const faqData: Record<string, Array<{question: string, answer: string}>> = {
      "/tools/youtube-video-downloader": [
        {
          question: "Is it free to download YouTube videos?",
          answer: "Yes, our YouTube video downloader is completely free to use with no hidden charges or registration required."
        },
        {
          question: "What video quality can I download?",
          answer: "You can download YouTube videos in various qualities including 1080p, 720p, 480p, and 360p depending on the video's available formats."
        },
        {
          question: "Is it legal to download YouTube videos?",
          answer: "You should only download videos that you have the right to download or that are in the public domain. Always respect copyright laws and YouTube's terms of service."
        }
      ],
      "/tools/pdf-to-word-converter": [
        {
          question: "Is the PDF to Word conversion accurate?",
          answer: "Yes, our converter uses advanced algorithms to maintain formatting, images, and text layout as accurately as possible."
        },
        {
          question: "Is my document safe?",
          answer: "Absolutely. We prioritize your privacy and security. Your documents are processed securely and deleted after conversion."
        },
        {
          question: "What file size limit is there?",
          answer: "Free users can convert PDFs up to 10MB. Premium members enjoy unlimited file sizes."
        }
      ],
      "/tools/url-shortener": [
        {
          question: "Are shortened URLs permanent?",
          answer: "Yes, your shortened URLs are permanent and will continue to work indefinitely unless you delete them."
        },
        {
          question: "Can I track link analytics?",
          answer: "Yes, registered users can access detailed analytics including clicks, geographic data, and referral sources."
        },
        {
          question: "Can I customize my short URL?",
          answer: "Premium members can create custom short URLs with their preferred keywords or brand names."
        }
      ]
    };

    const faqs = faqData[pathname];
    if (!faqs) return null;

    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
  }
}
