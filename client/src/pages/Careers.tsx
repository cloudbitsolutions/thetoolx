import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Globe, Zap, ShieldCheck } from "lucide-react";

const tools = [
  "Age Calculator", "Speed Test", "PDF to Word Converter", "Image Background Remover",
  "Facebook Video Downloader", "TikTok Video Downloader", "Twitter Video Downloader",
  "Instagram Video Downloader", "YouTube to MP3 Downloader", "YouTube Video Downloader",
  "URL Shortener", "Language Translator"
];

export default function Careers() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <Sparkles className="h-12 w-12 mx-auto text-blue-600 mb-4 animate-pulse" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Careers at TheToolx
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            At TheToolx, “Careers” isn’t about jobs — it’s about the journey of our tools. 
            We’re on a mission to make the web faster, simpler, and more productive 
            with 12+ powerful utilities.
          </p>
        </motion.div>

        {/* Our Tools */}
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
          Explore Our Tools
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 mb-16">
          {tools.map((tool, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ scale: 1.05 }}
              className="p-5 rounded-xl shadow-md bg-white dark:bg-gray-800 
                         hover:shadow-xl cursor-pointer transition"
            >
              <p className="text-center text-gray-800 dark:text-gray-200 font-medium">
                {tool}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Values */}
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
          Our Values
        </h2>
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="text-yellow-500"/> Speed</CardTitle></CardHeader>
            <CardContent>All our tools are optimized for quick results.</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="text-green-500"/> Reliability</CardTitle></CardHeader>
            <CardContent>Accurate, safe, and tested utilities you can trust.</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="text-blue-500"/> Accessibility</CardTitle></CardHeader>
            <CardContent>Free to use, anywhere in the world.</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="text-purple-500"/> Simplicity</CardTitle></CardHeader>
            <CardContent>Clean design, no clutter, just results.</CardContent>
          </Card>
        </div>

        {/* CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <a 
            href="/tools"
            className="inline-block px-8 py-3 rounded-2xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 transition-all hover:shadow-xl animate-bounce"
          >
            Explore All Tools
          </a>
        </motion.div>
      </div>
    </div>
  );
}
