import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Crown,
  Calendar,
  Gauge,
  Twitter,
  Image,
  Languages,
  Link as LinkIcon,
  Facebook,
  FileText,
  Music,
  Instagram,
  Smartphone,
  Youtube,
  Clapperboard
} from "lucide-react";
import iconMap from '@/lib/toolIcons';
import { Link } from "wouter";
import type { Tool } from "@shared/schema";

interface ToolCardProps {
  tool: Tool;
}

// Keep a small mapping for legacy slugs (fallback)
const legacyToolIcons: Record<string, JSX.Element> = {
  "age-calculator": <Calendar className="w-6 h-6" />,
  "internet-speed-test": <Gauge className="w-6 h-6" />,
  "twitter-video-downloader": <Twitter className="w-6 h-6" />,
  "background-remover": <Image className="w-6 h-6" />,
  "language-translator": <Languages className="w-6 h-6" />,
  "url-shortener": <LinkIcon className="w-6 h-6" />,
  "facebook-video-downloader": <Facebook className="w-6 h-6" />,
  "pdf-to-word-converter": <FileText className="w-6 h-6" />,
  "youtube-to-mp3": <Music className="w-6 h-6" />,
  "instagram-video-downloader": <Instagram className="w-6 h-6" />,
  "tiktok-video-downloader": <Clapperboard className="w-6 h-6" />,
  "youtube-video-downloader": <Youtube className="w-6 h-6" />,
};

const toolColors: Record<string, string> = {
  "age-calculator": "bg-blue-100 dark:bg-blue-900",
  "internet-speed-test": "bg-purple-100 dark:bg-purple-900",
  "twitter-video-downloader": "bg-sky-100 dark:bg-sky-900",
  "background-remover": "bg-pink-100 dark:bg-pink-900",
  "language-translator": "bg-indigo-100 dark:bg-indigo-900",
  "url-shortener": "bg-green-100 dark:bg-green-900",
  "facebook-video-downloader": "bg-blue-100 dark:bg-blue-900",
  "pdf-to-word-converter": "bg-red-100 dark:bg-red-900",
  "youtube-to-mp3": "bg-yellow-100 dark:bg-yellow-900",
  "instagram-video-downloader": "bg-rose-100 dark:bg-rose-900",
  "tiktok-video-downloader": "bg-gray-100 dark:bg-gray-700", // Darker background for TikTok
  "youtube-video-downloader": "bg-red-100 dark:bg-red-900", // Brighter red for YouTube
};

const iconColors: Record<string, string> = {
  "tiktok-video-downloader": "text-black dark:text-white", // Special TikTok color
  // Others will use default from parent
};

export default function ToolCard({ tool }: ToolCardProps) {
  // tool.icon is expected to be a key from iconMap (string). Prefer that; fallback to legacy mapping or default.
  const IconComponent = (tool as any).icon && iconMap[(tool as any).icon]
    ? iconMap[(tool as any).icon]
    : legacyToolIcons[tool.slug] || <FileText className="w-6 h-6" />;
  const colorClass = toolColors[tool.slug] || "bg-gray-100 dark:bg-gray-700";
  const iconColorClass = iconColors[tool.slug] || "text-current";

  return (
    <Link href={`/tools/${tool.slug}`} className="block">
  <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group h-full min-h-[280px] hover:-translate-y-1">
        <CardContent className="p-6">
          <motion.div
            className={`w-14 h-14 ${colorClass} rounded-xl flex items-center justify-center mb-4`}
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <motion.div 
              className={iconColorClass}
              whileHover={{ scale: 1.1 }}
            >
              {IconComponent}
            </motion.div>
          </motion.div>
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {(tool as any).translatedName || tool.name}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 min-h-[40px]">
            {(tool as any).translatedDescription || tool.description}
          </p>
          
          <div className="flex items-center justify-between">
            <Badge variant={tool.isPremium ? "default" : "secondary"}>
              {tool.isPremium ? (
                <div className="flex items-center space-x-1">
                  <Crown className="w-3 h-3" />
                  <span>Premium</span>
                </div>
              ) : (
                "Free"
              )}
            </Badge>
            
            <Button
              variant="ghost"
              size="sm"
              className="group-hover:text-primary-600 dark:group-hover:text-primary-400"
              //onClick={(e) => e.preventDefault()}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}