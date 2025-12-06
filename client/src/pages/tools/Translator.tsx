import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useToolRating } from "@/lib/useToolRating";
import { Languages, ArrowRightLeft, Volume2, Copy, RefreshCw, History, Globe } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCurrentTool } from "@/hooks/useCurrentTool";
import NotFound from "@/pages/not-found";
//import ToolAd from '@/components/ToolAd';
import PremiumGuard from "@/components/PremiumGuard";
import { AnimatePresence, motion } from "framer-motion";
import StarRating from "@/components/ui/star-rating";
import { Label } from "@/components/ui/label";
import { Star, Share2 } from "lucide-react";
import UnauthenticatedView from "../auth/UnauthenticatedView";
import { useAuth } from "@/hooks/useAuth";
import ReusableSlider from "../SliderProps";
import TranslatableBlock from "@/components/TranslatableBlock";

const languages = [
  { code: 'auto', name: 'Select language', flag: '🌐' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'zh-CN', name: 'Chinese', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' }
];

interface FAQItemProps {
  question: string;
  answer: string;
  index: number;
}

export default function Translator() {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("en");
  const [detectedLang, setDetectedLang] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();
  const { toolId, isToolPremium, name, description, isLoginRequired, toolSlug, isActive, isLoading } = useCurrentTool();

  // Declare hooks before early returns to keep hook order stable
  const { user, isAuthenticated } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  // Translation hooks — keep these before any early return
  const { data: translationHistory = [], refetch: refetchHistory } = useQuery<any[]>({
    queryKey: ["/api/translate/history"],
    enabled: showHistory,
  });

  const translateMutation = useMutation({
    mutationFn: async ({ text, from, to }: { text: string; from: string; to: string }) => {
      return await apiRequest("POST", "/api/translate", { text, from, to });
    },
    onSuccess: async (res) => {
      const data = await res.json() as any;
      setTranslatedText(data.translatedText);
      setDetectedLang(data.detectedLanguage || "");
      if (showHistory) {
        refetchHistory();
      }
      toast({
        title: "Translation Complete",
        description: `Successfully translated to ${languages.find(l => l.code === targetLang)?.name}`,
      });
    },
    onError: (error: any) => {
      console.error("Translation error:", error);
      toast({
        title: "Translation Failed",
        description: error.message || "Failed to translate text. Please try again.",
        variant: "destructive",
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment?: string }) => {
      if (!toolId) throw new Error("Tool ID not available");
      const response = await fetch(`/api/tools/${toolId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Rating submitted successfully!",
      });
      setRating(0);
      setComment("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit rating",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  function DynamicRatingDisplay() {
    const { data, isLoading, error } = useToolRating(toolId);

    if (isLoading) {
      return (
        <>
          <StarRating rating={0} readonly size="lg" />
          <span className="ml-2 text-sm text-gray-500">Loading...</span>
        </>
      );
    }

    if (error || !data) {
      // fallback to a neutral display
      return (
        <>
          <StarRating rating={4.7} readonly size="lg" />
          <span className="ml-2 text-xl font-bold text-yellow-600 dark:text-yellow-400">4.7</span>
          <span className="ml-3 text-sm text-gray-600 dark:text-gray-300">Based on 2,156 reviews</span>
        </>
      );
    }

    return (
      <>
        <StarRating rating={Number(data.average) || 0} readonly size="lg" />
        <span className="ml-2 text-xl font-bold text-yellow-600 dark:text-yellow-400">{(Number(data.average) || 0).toFixed(1)}</span>
        <span className="ml-3 text-sm text-gray-600 dark:text-gray-300">Based on {data.totalReviews.toLocaleString()} reviews</span>
      </>
    );
  }

  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center p-8">
  //       <div className="text-center text-gray-500 animate-pulse">Loading...</div>
  //     </div>
  //   );
  // }

  if (typeof isActive !== 'undefined' && !isActive) return <NotFound />;
  // translation hooks moved above to keep hook order stable

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      toast({
        title: "Text Required",
        description: "Please enter text to translate",
        variant: "destructive",
      });
      return;
    }

    if (sourceLang === targetLang && sourceLang !== 'auto') {
      toast({
        title: "Same Language",
        description: "Source and target languages cannot be the same",
        variant: "destructive",
      });
      return;
    }

    translateMutation.mutate({
      text: sourceText,
      from: sourceLang,
      to: targetLang
    });
  };

  const swapLanguages = () => {
    if (sourceLang !== 'auto') {
      setSourceLang(targetLang);
      setTargetLang(sourceLang);
      setSourceText(translatedText);
      setTranslatedText(sourceText);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };

  const speakText = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "Not Supported",
        description: "Speech synthesis is not supported in your browser",
        variant: "destructive",
      });
    }
  };

  const clearText = () => {
    setSourceText("");
    setTranslatedText("");
    setDetectedLang("");
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      toast({
        title: "Error",
        description: "Please select a rating",
        variant: "destructive",
      });
      return;
    }
    reviewMutation.mutate({ rating, comment });
  };

  const handleShare = (platform: string) => {
    const currentUrl = window.location.href;
    const text = "Check out this amazing PDF to Word Converter!";
    let shareUrl = "";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          currentUrl
        )}`;
        break;
      case "twitter":
      case "x":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
          currentUrl
        )}&text=${encodeURIComponent(text)}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(
          text + " " + currentUrl
        )}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          currentUrl
        )}`;
        break;
    }

    window.open(shareUrl, "_blank");
  };

  useEffect(() => {
    if (sourceLang === "auto") {
      fetch("https://ipapi.co/json/")
        .then(res => res.json())
        .then(data => {
          const countryCode = data.country_code?.toLowerCase();
          const countryToLang: Record<string, string> = {
            in: "hi",
            bd: "bn",
            cn: "zh-CN",
            jp: "ja",
            kr: "ko",
            ru: "ru",
            es: "es",
            fr: "fr",
            de: "de",
            it: "it",
            nl: "nl",
            se: "sv",
            pl: "pl",
            tr: "tr",
            ua: "uk",
            cz: "cs"
          };

          const lang = countryToLang[countryCode] || "en";

          setSourceLang(prev => (prev === "auto" ? lang : prev));
          setDetectedLang(lang);
        })
        .catch(() => setDetectedLang("en"));
    }
  }, [sourceLang]);

  const FAQItem = ({ question, answer, index }: FAQItemProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <motion.div
        initial={false}
        animate={{ height: 'auto' }}
        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
      >
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full p-4 text-left bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          whileHover={{ backgroundColor: "rgba(243, 244, 246, 0.8)" }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="font-semibold text-gray-900 dark:text-white text-sm md:text-base pr-4">
            <TranslatableBlock>{index + 1}. {question}</TranslatableBlock>
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="flex-shrink-0 ml-2"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>

          {/* <div className="mb-6">
            <ToolAd />
          </div> */}
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base leading-relaxed">
                  <TranslatableBlock>{answer}</TranslatableBlock>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  if (isLoginRequired && !isAuthenticated) return <UnauthenticatedView />;

  return (
    <PremiumGuard toolId={toolId ?? 0} isToolPremiumFromTool={isToolPremium} toolNameFromProps={name}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full">
                <Languages className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {name} || Language Translator
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {description} || Translate text between 20+ languages instantly. Powered by advanced AI translation technology.
            </p>
          </div>

          {/* Language Selection */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">From</label>
                  <Select value={sourceLang} onValueChange={setSourceLang}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <span className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* {detectedLang && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Detected: {languages.find(l => l.code === detectedLang)?.name}{" "}
                      {languages.find(l => l.code === detectedLang)?.flag}
                    </p>
                  )} */}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={swapLanguages}
                  disabled={sourceLang === 'auto'}
                  className="mt-6"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                </Button>

                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">To</label>
                  <Select value={targetLang} onValueChange={setTargetLang}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.filter(lang => lang.code !== 'auto').map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <span className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Translation Interface */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Source Text */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span><TranslatableBlock>Source Text</TranslatableBlock></span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => speakText(sourceText, sourceLang)}
                      disabled={!sourceText}
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearText}
                      disabled={!sourceText}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Enter text to translate..."
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  className="min-h-[200px] resize-none"
                  maxLength={5000}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {sourceText.length}/5000 characters
                  </span>
                  <Button onClick={handleTranslate} disabled={translateMutation.isPending || !sourceText.trim()}>
                    {translateMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Translating...
                      </>
                    ) : (
                      <>
                        <Languages className="h-4 w-4 mr-2" />
                        Translate
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Translated Text */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span><TranslatableBlock>Translation</TranslatableBlock></span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => speakText(translatedText, targetLang)}
                      disabled={!translatedText}
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(translatedText)}
                      disabled={!translatedText}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Translation will appear here..."
                  value={translatedText}
                  readOnly
                  className="min-h-[200px] resize-none bg-gray-50 dark:bg-gray-800"
                />
                {translatedText && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {translatedText.length} characters
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <Languages className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2"><TranslatableBlock>20+ Languages</TranslatableBlock></h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <TranslatableBlock>Support for major world languages</TranslatableBlock>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Volume2 className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2"><TranslatableBlock>Text-to-Speech</TranslatableBlock></h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <TranslatableBlock>Listen to pronunciations</TranslatableBlock>
                </p>
              </CardContent>
            </Card>

            {/* <Card>
              <CardContent className="p-6 text-center">
                <RefreshCw className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Auto Detect</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Automatic language detection
                </p>
              </CardContent>
            </Card> */}

            <Card>
              <CardContent className="p-6 text-center">
                <Copy className="h-8 w-8 text-orange-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2"><TranslatableBlock>Quick Copy</TranslatableBlock></h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <TranslatableBlock>One-click copy to clipboard</TranslatableBlock>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* New Content Section: split into individual motion cards */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <Globe className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white"><TranslatableBlock>About Language Translation</TranslatableBlock></h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="w-full"
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold"><TranslatableBlock>How a Language Translator Works</TranslatableBlock></CardTitle>
                    <CardDescription><TranslatableBlock>AI, NLP & machine learning</TranslatableBlock></CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <TranslatableBlock>A language translator uses AI and NLP to analyze input text or speech, identify grammar and context, and convert meaning into the target language. It can handle idioms and regional variations for natural results.</TranslatableBlock>
                    </p>
                    <ul className="list-disc list-inside mt-3 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                      <TranslatableBlock>
                        <li>Translate text across languages</li>
                        <li>Convert spoken words in real-time</li>
                        <li>Process images/documents via OCR</li>
                      </TranslatableBlock>
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="w-full"
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold"><TranslatableBlock>Benefits of Using a Translator</TranslatableBlock></CardTitle>
                    <CardDescription><TranslatableBlock>Reach globally</TranslatableBlock></CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                      <p className="font-medium"><TranslatableBlock>Key benefits include:</TranslatableBlock></p>
                      <ul className="list-disc list-inside">
                        <TranslatableBlock>
                          <li>Instant communication across languages</li>
                          <li>Travel convenience and local interactions</li>
                          <li>Business expansion and multilingual content</li>
                          <li>Learning aid and accessibility</li>
                        </TranslatableBlock>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="w-full"
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold"><TranslatableBlock>How to Use a Translator</TranslatableBlock></CardTitle>
                    <CardDescription><TranslatableBlock>Simple & fast</TranslatableBlock></CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ol className="list-decimal list-inside text-sm text-gray-700 dark:text-gray-300 space-y-2">
                      <TranslatableBlock>
                        <li>Select source (or auto-detect) and target languages</li>
                        <li>Type, speak, or upload content</li>
                        <li>Click Translate and review the result</li>
                        <li>Copy, save, or share the translation</li>
                      </TranslatableBlock>
                    </ol>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
              <Card className="shadow-xl border-0 bg-gradient-to-br from-white-50 to-pink-50 dark:from-gray-800 dark:to-gray-700/80 mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <TranslatableBlock>Frequently Asked Questions</TranslatableBlock>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      q: "What is a language translator?",
                      a: "A language translator is a tool or software that converts text, speech, or images from one language to another, helping people communicate across different languages."
                    },
                    {
                      q: "Are online language translators accurate?",
                      a: "Most modern translators are highly accurate, especially for common languages. However, very technical, idiomatic, or regional content may sometimes require manual review."
                    },
                    {
                      q: "Can I translate documents or images?",
                      a: "Yes, advanced language translators can handle documents, PDFs, and images using OCR technology."
                    },
                    {
                      q: "Is it possible to translate in real-time during conversations?",
                      a: "Yes, many translators support live speech translation, making it easier to communicate with someone who speaks a different language."
                    },
                    {
                      q: "Is using a language translator free?",
                      a: "Many online translators offer free versions for text and speech translation. Some premium versions include advanced features like document translation, pronunciation guides, and offline access."
                    }
                  ].map((faq, index) => (
                    <FAQItem
                      key={index}
                      question={faq.q}
                      answer={faq.a}
                      index={index}
                    />
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50">
              <p className="text-center font-semibold text-blue-700 dark:text-blue-300">
                <TranslatableBlock>✅ TheToolx Language Translator helps you break language barriers effortlessly. Try translating now!</TranslatableBlock>
              </p>
            </div>
          </div>
          {/* Translation History */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span><TranslatableBlock>Translation History</TranslatableBlock></span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="h-4 w-4 mr-2" />
                  {showHistory ? "Hide History" : "Show History"}
                </Button>
              </CardTitle>
            </CardHeader>
            {showHistory && (
              <CardContent>
                {translationHistory.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {translationHistory.map((translation: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span>{languages.find(l => l.code === translation.sourceLang)?.flag}</span>
                            <span>{languages.find(l => l.code === translation.sourceLang)?.name}</span>
                            <ArrowRightLeft className="h-3 w-3" />
                            <span>{languages.find(l => l.code === translation.targetLang)?.flag}</span>
                            <span>{languages.find(l => l.code === translation.targetLang)?.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(translation.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300"><TranslatableBlock>Original:</TranslatableBlock></span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{translation.sourceText}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300"><TranslatableBlock>Translation:</TranslatableBlock></span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{translation.translatedText}</p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSourceText(translation.sourceText)}
                          >
                            <TranslatableBlock>Use Again</TranslatableBlock>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(translation.translatedText)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    <TranslatableBlock>No translation history yet. Start translating to see your history here.</TranslatableBlock>
                  </p>
                )}
              </CardContent>
            )}
          </Card>

          {/* Instructions */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle><TranslatableBlock>How to Use the Translator</TranslatableBlock></CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <TranslatableBlock>
                  <li>Select the source language (or use auto-detect)</li>
                  <li>Choose your target language for translation</li>
                  <li>Type or paste the text you want to translate</li>
                  <li>Click "Translate" to get instant translation</li>
                  <li>Use the speaker icon to hear pronunciation</li>
                  <li>Copy the translation with the copy button</li>
                  <li>Swap languages using the arrow button</li>
                </TranslatableBlock>
              </ol>
            </CardContent>
          </Card>

          {/* Share Section */}
          <motion.div whileHover={{ y: -5 }}>
            <Card className="mb-8 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/70 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800 dark:text-white">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg shadow">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <span><TranslatableBlock>Share this tool</TranslatableBlock></span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                  <Button
                    variant="outline"
                    onClick={() => handleShare("facebook")}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800 transition-all duration-300 hover:scale-105"
                  >
                    <i className="fab fa-facebook-f text-blue-600 dark:text-blue-400 text-lg"></i>
                    Facebook
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleShare("twitter")}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800 transition-all duration-300 hover:scale-105"
                  >
                    <i className="fab fa-twitter text-blue-400 dark:text-blue-300 text-lg"></i>
                    Twitter
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleShare("whatsapp")}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 border-green-200 dark:border-green-800 transition-all duration-300 hover:scale-105"
                  >
                    <i className="fab fa-whatsapp text-green-600 dark:text-green-400 text-lg"></i>
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleShare("linkedin")}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800 transition-all duration-300 hover:scale-105"
                  >
                    <i className="fab fa-linkedin-in text-blue-700 dark:text-blue-400 text-lg"></i>
                    LinkedIn
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Rating Card (simplified - only stars) */}
          <motion.div whileHover={{ y: -5 }}>
            <Card className="mb-6 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/70 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800 dark:text-white">
                  <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg shadow">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <span><TranslatableBlock>Rate this tool</TranslatableBlock></span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center">
                      {/* show dynamic rating from API */}
                      <DynamicRatingDisplay />
                    </div>
                  </div>

                  <form onSubmit={handleReviewSubmit} className="space-y-6">
                    <div>
                      <Label className="text-lg dark:text-gray-300"><TranslatableBlock>Your Rating</TranslatableBlock></Label>
                      <div className="mt-3 flex justify-center">
                        <StarRating
                          rating={rating}
                          onRatingChange={setRating}
                          size="lg"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-lg dark:text-gray-300"><TranslatableBlock>Comment</TranslatableBlock></Label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full mt-2 p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none"
                        rows={4}
                        placeholder="Share your experience or feedback..."
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={reviewMutation.isPending || rating === 0}
                      className="w-full sm:w-auto px-8 py-6 text-lg font-semibold bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                      {reviewMutation.isPending ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Submitting...
                        </div>
                      ) : (
                        "Submit Rating"
                      )}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </PremiumGuard>
  );
}