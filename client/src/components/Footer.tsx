import { Link } from "wouter";
import { useLanguage } from "@/components/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";
import { Separator } from "@/components/ui/separator";
import { Github, Twitter, Facebook, Mail, Heart, Linkedin, Instagram } from "lucide-react";
import logo from '@/assets/Logo.jpeg';

export default function Footer() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  const footerLinks = {
    company: [
      { name: t("footer.about"), href: "/about" },
      { name: t("footer.contact"), href: "/contact" },
      { name: "Blog", href: "/blog" },
      { name: "Careers", href: "/careers" },
    ],
    support: [
      { name: t("footer.support"), href: "/support" },
      { name: "Help Center", href: "/help" },
      { name: "Status", href: "/status" },
      { name: "Community", href: "/community" },
    ],
    legal: [
      { name: t("footer.privacy"), href: "/privacy" },
      { name: t("footer.terms"), href: "/terms" },
      { name: "Cookie Policy", href: "/cookies" },
      { name: "Security", href: "/security" },
    ],
    tools: [
      { name: "Video Downloaders", href: "/#tools" },
      { name: "File Converters", href: "/#tools" },
      { name: "Utilities", href: "/#tools" },
      { name: "Premium Tools", href: "/pricing" },
    ],
  };

  const socialLinks = [
    { icon: Github, href: "https://github.com/toolx", label: "GitHub" },
    { icon: Linkedin, href: "https://www.linkedin.com/company/thetoolxcom/", label: "LinkedIn" },
    { icon: Instagram, href: "https://www.instagram.com/thetoolxcom/", label: "Instagram (@thetoolxcom)" },
    { icon: Twitter, href: "https://x.com/toolxcom", label: "Twitter" },
    { icon: Facebook, href: "https://www.facebook.com/thetoolxcom/", label: "Facebook" },
    { icon: Mail, href: "mailto:admin@thetoolx.com", label: "Email" },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <img
                src= {logo}
                alt="TheToolx Logo"
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-xl font-bold">TheToolx.com</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              {t("footer.tagline")}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-3 md:mt-0">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-gray-800" />

        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} TheToolx.com. All rights reserved.
          </p>
          <div className="flex items-center text-gray-400 text-sm space-x-4">
            <div className="flex items-center">
              <span>Made with</span>
              <Heart className="h-4 w-4 mx-1 text-red-500" />
              <span>by the TheToolx Team</span>
            </div>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Sitemap
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}