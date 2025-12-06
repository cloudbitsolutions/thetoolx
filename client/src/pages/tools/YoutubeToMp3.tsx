import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import StarRating from "@/components/ui/star-rating";
import PremiumGuard from "@/components/PremiumGuard";
import { Download, Share2, Star, Music, Youtube, Info, CheckCircle, Smartphone, PlayCircle, AlertTriangle, Zap, Shield, Film, Settings, Cpu, Volume2, Monitor, FileText } from "lucide-react";
import { useCurrentTool } from "@/hooks/useCurrentTool";
import NotFound from "@/pages/not-found";
//import ToolAd from '@/components/ToolAd';
import { sanitizeFilename } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import UnauthenticatedView from "../auth/UnauthenticatedView";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToolRating } from "@/lib/useToolRating";
import TranslatableBlock from "@/components/TranslatableBlock";

export default function YoutubeToMp3() {
  const [url, setUrl] = useState("");
  const [audioInfo, setAudioInfo] = useState<any>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isHovering, setIsHovering] = useState(false);
  const [isPulsing, setIsPulsing] = useState(true);

  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { toolId, isToolPremium, name, description, isLoginRequired, isActive, isLoading } = useCurrentTool();
  // Ensure all hooks are declared before any early returns so React's hooks order is stable
  useEffect(() => {
    window.scrollTo(0, 0);
    return () => {
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
      }
    };
  }, [audioBlobUrl]);

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

  const { mutate: fetchAudioInfo, isPending: isFetching } = useMutation({
    mutationFn: async (videoUrl: string) => {
      const response = await apiRequest("POST", "/api/process/youtube-to-mp3-full", {
        url: videoUrl,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setAudioInfo(data.audioInfo);

        const byteCharacters = atob(data.audioInfo.audioData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(blob);
        setAudioBlobUrl(blobUrl);

        toast({
          title: "Success",
          description: "Audio loaded and ready",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to fetch audio",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch audio info",
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

  const isSSR = typeof window === 'undefined';
  if (!isSSR && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center text-gray-500 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (typeof isActive !== 'undefined' && !isActive) return <NotFound />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }
    fetchAudioInfo(url);
  };

  const handleDownload = () => {
    if (!audioBlobUrl) {
      toast({
        title: "Error",
        description: "No audio available to download",
        variant: "destructive",
      });
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = audioBlobUrl;
    anchor.download = `${sanitizeFilename(audioInfo.title)}.mp3`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    toast({
      title: "Download Started",
      description: `Downloading "${audioInfo.title}.mp3"`,
    });

    if (toolId) {
      apiRequest("POST", `/api/tools/${toolId}/usage`, {
        success: true,
        errorMessage: null,
      }).catch(console.error);
    }
  };

  const togglePreview = () => {
    setIsPreviewing(!isPreviewing);
  };

  const handleShare = (platform: string) => {
    const currentUrl = window.location.href;
    const text = "Check out this YouTube to MP3 converter!";
    let shareUrl = "";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          currentUrl
        )}`;
        break;
      case "twitter":
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
  if (isLoginRequired && !isAuthenticated) {
    return <UnauthenticatedView />;
  }

  return (
    <PremiumGuard toolId={toolId ?? 0} isToolPremiumFromTool={isToolPremium} toolNameFromProps={name}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center mb-12"
          >
            <motion.div
              className="relative w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-gradient-to-br from-red-500 to-pink-500 shadow-lg"
              style={{
                boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.4), inset 0 4px 6px -1px rgba(255, 255, 255, 0.2)'
              }}
              animate={{
                rotate: isHovering ? [0, -5, 5, -5, 0] : 0,
                scale: isHovering ? 1.1 : 1
              }}
              transition={{
                rotate: { duration: 0.8, ease: "easeInOut" },
                scale: { duration: 0.3 }
              }}
              onHoverStart={() => setIsHovering(true)}
              onHoverEnd={() => setIsHovering(false)}
            >
              <motion.div
                animate={{
                  scale: isHovering ? [1, 1.3, 1] : 1,
                  y: isPulsing ? [0, -5, 0] : 0
                }}
                transition={{
                  scale: { duration: 0.6 },
                  y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
                className="flex items-center justify-center w-16 h-16 bg-white rounded-xl"
              >
                <div className="flex items-center gap-1">
                  <Youtube className="w-6 h-6 text-red-600" fill="currentColor" />
                  <Music className="w-4 h-4 text-blue-600" />
                </div>
              </motion.div>
            </motion.div>

            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500 dark:from-red-400 dark:to-pink-400 mb-3">
              <TranslatableBlock>YouTube to MP3 Converter</TranslatableBlock>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              <TranslatableBlock>Transform YouTube videos into crystal clear MP3 audio files instantly</TranslatableBlock>
            </p>
          </motion.div>

          {/* Tool-specific ad */}
          {/* <div className="mb-6">
            <ToolAd />
          </div> */}

          {/* Converter Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          >
            <Card className="mb-8">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-400 via-purple-400 to-blue-400" />
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  <span className="bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
                    <TranslatableBlock>Paste Your YouTube Link</TranslatableBlock>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="url" className="text-gray-700 dark:text-gray-300 mb-2 block">
                      <TranslatableBlock>YouTube Video URL</TranslatableBlock>
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Input
                        id="url"
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="flex-1 border-2 border-gray-200 dark:border-gray-600 focus:border-red-400 dark:focus:border-red-400 focus:ring-0 rounded-xl py-3 px-4 text-lg shadow-sm transition-all"
                        required
                      />
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full sm:w-auto"
                      >
                        <Button
                          type="submit"
                          disabled={isFetching}
                          size="lg"
                          className={cn(
                            "w-full sm:w-auto bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600",
                            "text-white shadow-md hover:shadow-lg transition-all duration-300 text-lg py-3 px-6 rounded-xl",
                            "flex items-center gap-2"
                          )}
                        >
                          {isFetching ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </>
                          ) : (
                            <>
                              <Music className="w-5 h-5" />
                              Convert Now
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {audioInfo && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mt-6"
                      >
                        <div className="p-6 rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 shadow-md border border-gray-100 dark:border-gray-600">
                          <div className="flex flex-col md:flex-row gap-6">
                            <div className="w-full md:w-40 h-40 rounded-xl overflow-hidden shadow-md bg-gradient-to-br from-red-400 to-pink-400 flex items-center justify-center">
                              <Music className="w-12 h-12 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                                {audioInfo.title}
                              </h3>
                              <div className="flex flex-wrap gap-4 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {audioInfo.duration}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                  </svg>
                                  {audioInfo.format} • {audioInfo.quality}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                  </svg>
                                  {audioInfo.size}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-3">
                                <motion.div
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                >
                                  <Button
                                    size="lg"
                                    onClick={handleDownload}
                                    className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-md hover:shadow-lg"
                                  >
                                    <Download className="w-5 h-5 mr-2" />
                                    Download MP3
                                  </Button>
                                </motion.div>

                                <motion.div
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                >
                                  <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={togglePreview}
                                    className="border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
                                  >
                                    {isPreviewing ? (
                                      <>
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Close Preview
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Preview Audio
                                      </>
                                    )}
                                  </Button>
                                </motion.div>
                              </div>

                              <AnimatePresence>
                                {isPreviewing && audioBlobUrl && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="mt-6"
                                  >
                                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                                      <audio
                                        controls
                                        src={audioBlobUrl}
                                        className="w-full rounded-lg"
                                      >
                                        <TranslatableBlock>Your browser does not support the audio element.</TranslatableBlock>
                                      </audio>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Introduction Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/70">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-400 to-blue-400" />
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg shadow">
                    <Info className="w-6 h-6 text-white" />
                  </div>
                  <TranslatableBlock>About Our YouTube Converter</TranslatableBlock>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                  <TranslatableBlock>Our YouTube to MP3 Converter lets you convert your favorite YouTube videos into MP3 (audio) or MP4 (video) files, which you can download for free. The service works directly from your desktop, tablet, or mobile device, without needing to install any software. Using this tool is completely free, safe, and simple.</TranslatableBlock>
                </p>

                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-100 dark:border-green-800/30"
                  >
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <TranslatableBlock>Free & Easy to Use</TranslatableBlock>
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      <TranslatableBlock>No hidden fees or subscription requirements. Start converting instantly without any installation.</TranslatableBlock>
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-100 dark:border-purple-800/30"
                  >
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-purple-500" />
                      <TranslatableBlock>Cross-Platform</TranslatableBlock>
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      <TranslatableBlock>Works seamlessly on Windows, MacOS, iOS, Android, and all modern browsers.</TranslatableBlock>
                    </p>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* How-to Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-8"
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/70">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 to-red-400" />
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
                  <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow">
                    <PlayCircle className="w-6 h-6 text-white" />
                  </div>
                  <TranslatableBlock>How to Download YouTube Videos</TranslatableBlock>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Step 1 */}
                  <motion.div
                    whileHover={{ y: -5 }}
                    className="text-center p-6 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-100 dark:border-orange-800/30"
                  >
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                      1
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-3">
                      <TranslatableBlock>Find the Video</TranslatableBlock>
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      <TranslatableBlock>Open YouTube and search for the video you want to download. Copy the video URL from the browser address bar.</TranslatableBlock>
                    </p>
                  </motion.div>

                  {/* Step 2 */}
                  <motion.div
                    whileHover={{ y: -5 }}
                    className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-100 dark:border-blue-800/30"
                  >
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                      2
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-3">
                      <TranslatableBlock>Paste the URL</TranslatableBlock>
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      <TranslatableBlock>Go to our YouTube Converter and paste the video link. Choose MP3 for audio or MP4 for video, then click "Convert".</TranslatableBlock>
                    </p>
                  </motion.div>

                  {/* Step 3 */}
                  <motion.div
                    whileHover={{ y: -5 }}
                    className="text-center p-6 rounded-xl bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-100 dark:border-green-800/30"
                  >
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                      3
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-3">
                      <TranslatableBlock>Download Your File</TranslatableBlock>
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      <TranslatableBlock>The conversion will begin. Once complete (usually within moments), download your file instantly.</TranslatableBlock>
                    </p>
                  </motion.div>
                </div>

                <div className="mt-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/30">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <TranslatableBlock><span>Note: The maximum supported video length is 90 minutes. By using this service, you agree to our Terms of Use.</span></TranslatableBlock>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-8"
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/70">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-400 to-pink-400" />
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <TranslatableBlock>Why Choose Our YouTube Converter</TranslatableBlock>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Feature 1 */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/30"
                  >
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-blue-500" />
                      <TranslatableBlock>Fast Conversion</TranslatableBlock>
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      <TranslatableBlock>Quickly turn videos into MP3 or MP4 files with efficient processing that saves you time.</TranslatableBlock>
                    </p>
                  </motion.div>

                  {/* Feature 2 */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-100 dark:border-green-800/30"
                  >
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-green-500" />
                      <TranslatableBlock>Safe & Secure</TranslatableBlock>
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      <TranslatableBlock>All conversions are handled securely with HTTPS connections. Files are automatically deleted after download.</TranslatableBlock>
                    </p>
                  </motion.div>

                  {/* Feature 3 */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-100 dark:border-purple-800/30"
                  >
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-purple-500" />
                      <TranslatableBlock>Quality Options</TranslatableBlock>
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      <TranslatableBlock>Choose from 64 kbps to 320 kbps audio quality to match your storage and listening preferences.</TranslatableBlock>
                    </p>
                  </motion.div>

                  {/* Feature 4 */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-100 dark:border-red-800/30"
                  >
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <Film className="w-5 h-5 text-red-500" />
                      <TranslatableBlock>YouTube Shorts Support</TranslatableBlock>
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      <TranslatableBlock>Extract audio from YouTube Shorts (videos up to 60 seconds) for quick music clips and viral videos.</TranslatableBlock>
                    </p>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Technical Details Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-8"
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/70">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-400 to-blue-400" />
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
                  <div className="p-2 bg-gradient-to-r from-teal-500 to-blue-500 rounded-lg shadow">
                    <Cpu className="w-6 h-6 text-white" />
                  </div>
                  <TranslatableBlock>Technical Specifications</TranslatableBlock>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Audio Quality Options */}
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-teal-500" />
                      <TranslatableBlock>Audio Quality Options</TranslatableBlock>
                    </h3>
                    <div className="space-y-3">
                      {[
                        { quality: "64 kbps", desc: "Small file size, ideal for voice recordings" },
                        { quality: "128 kbps", desc: "Standard quality, good for casual listening" },
                        { quality: "192 kbps", desc: "Balanced quality and file size" },
                        { quality: "320 kbps", desc: "High-quality sound for music and detailed audio" }
                      ].map((item, index) => (
                        <motion.div
                          key={index}
                          whileHover={{ x: 5 }}
                          className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                        >
                          <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">{item.quality}</span>
                            <p className="text-sm text-gray-600 dark:text-gray-300"><TranslatableBlock>{item.desc}</TranslatableBlock></p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Compatibility */}
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-blue-500" />
                      <TranslatableBlock>Device & Browser Support</TranslatableBlock>
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2"><TranslatableBlock>Operating Systems</TranslatableBlock></h4>
                        <div className="flex flex-wrap gap-2">
                          {["Windows", "MacOS", "iOS", "Android", "Chrome OS"].map((os, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                              {os}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2"><TranslatableBlock>Web Browsers</TranslatableBlock></h4>
                        <div className="flex flex-wrap gap-2">
                          {["Chrome", "Safari", "Firefox", "Edge", "Opera"].map((browser, index) => (
                            <span key={index} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm">
                              {browser}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legal Notice */}
                <div className="mt-6 p-4 rounded-lg bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    <TranslatableBlock>Legal Compliance</TranslatableBlock>
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <TranslatableBlock>Our YouTube to MP3 converter is intended for personal use only. Users must follow copyright laws and avoid sharing or distributing copyrighted content without permission. It is not designed for commercial use.</TranslatableBlock>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

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

          {/* Rating Card */}
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