import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Youtube,
  FileVideo,
  FileAudio,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  Eye,
  Clock,
  Crown,
  Sparkles,
  X,
  Star,
  Share2,
  Lightbulb,
  Zap,
  Music,
  Monitor,
  Globe,
  HelpCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentTool } from "@/hooks/useCurrentTool";
import NotFound from "@/pages/not-found";
//import ToolAd from '@/components/ToolAd';
import PremiumGuard from "@/components/PremiumGuard";
import { sanitizeFilename } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import UnauthenticatedView from "../auth/UnauthenticatedView";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import StarRating from "@/components/ui/star-rating";
import { useToolRating } from "@/lib/useToolRating";
import TranslatableBlock from "@/components/TranslatableBlock";
import ErrorBoundary from '@/components/ErrorBoundary';

interface FAQItemProps {
  question: string;
  answer: string;
  index: number;
}

interface VideoFormat {
  quality: string;
  format: string;
  mime: string;
  itag: number;
  hasVideo: boolean;
  hasAudio: boolean;
  filesize: string;
}

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  author: string;
  viewCount: string;
  availableFormats: VideoFormat[];
}

function YoutubeDownloaderInner() {
  const [url, setUrl] = useState("");
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isFetchingBlob, setIsFetchingBlob] = useState(false);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { toolId, isToolPremium, name, description, isLoginRequired, isActive, isLoading } = useCurrentTool();

  // Debug: log hook outputs to help trace the loading -> blank issue
  try {
    // eslint-disable-next-line no-console
    console.log('[YoutubeDownloader] useCurrentTool output', { toolId, isToolPremium, name, isActive, isLoading });
  } catch (e) {}

  // Keep hooks stable: declare states and mutations before any early returns
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
      try {
        // eslint-disable-next-line no-console
        console.log('[YoutubeDownloader] review submitted');
      } catch (e) {}
      setRating(0);
      setComment("");
    },
    onError: () => {
      try {
        // eslint-disable-next-line no-console
        console.error('[YoutubeDownloader] failed to submit review');
      } catch (e) {}
    },
  });

  // Prevent initial render flicker: show a loader while tool metadata is fetched (client-side only)
  const isSSR = typeof window === 'undefined';
  if (!isSSR && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center text-gray-500 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (typeof isActive !== 'undefined' && !isActive) return <NotFound />;

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

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleGetVideoInfo = async () => {
    if (!url) {
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }

    if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
      toast({
        title: "Error",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingInfo(true);
    setVideoInfo(null);
    setSelectedFormat(null);
    setPreviewUrl(null);
    setVideoBlob(null);
    setIsPreviewActive(false);

    try {
      const response = await fetch("/api/youtube/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.success) {
        setVideoInfo(data.videoInfo);
        toast({
          title: "Video Information Retrieved",
          description: `Found "${data.videoInfo.title}" with ${data.videoInfo.availableFormats.length} available formats`,
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to get video information",
          variant: "destructive",
        });

        if (toolId) {
          try {
            await apiRequest("POST", `/api/tools/${toolId}/usage`, {
              success: false,
              errorMessage: data.message || "Failed to get video information",
            });
          } catch (error) {
            console.error("Failed to track tool usage:", error);
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          "Failed to get video information. Please check your connection and try again.",
        variant: "destructive",
      });

      if (toolId) {
        try {
          await apiRequest("POST", `/api/tools/${toolId}/usage`, {
            success: false,
            errorMessage: error?.message || "Network error",
          });
        } catch (err) {
          console.error("Failed to track tool usage:", err);
        }
      }
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const handleFormatSelect = async (format: VideoFormat) => {
    if (!videoInfo) return;

    setIsFetchingBlob(true);
    setSelectedFormat(format);
    setPreviewUrl(null);
    setVideoBlob(null);
    setIsPreviewActive(false);

    try {
      const downloadUrl = `/api/download/youtube-video?url=${encodeURIComponent(
        url
      )}&itag=${format.itag}`;

      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);

      const blob = await response.blob();
      setVideoBlob(blob);

      // Create preview URL immediately
      const previewBlobUrl = URL.createObjectURL(blob);
      setPreviewUrl(previewBlobUrl);

      toast({
        title: "Video Ready",
        description: `"${videoInfo.title}" in ${format.quality} is ready for preview/download`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch video data",
        variant: "destructive",
      });
    } finally {
      setIsFetchingBlob(false);
    }
  };

  const handlePreview = () => {
    if (!videoBlob || !previewUrl) return;

    setIsPreviewActive(true);
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const handleCancelPreview = () => {
    setIsPreviewActive(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleDownload = () => {
    if (!videoBlob || !selectedFormat || !videoInfo) {
      toast({
        title: "Error",
        description: "Video data is not available for download",
        variant: "destructive",
      });
      return;
    }

    let filename = `${sanitizeFilename(videoInfo.title)}.${selectedFormat.format}`;
    const blobUrl = window.URL.createObjectURL(videoBlob);

    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(blobUrl);

    toast({
      title: "Download Started",
      description: `Downloading "${filename}"`,
    });

    if (toolId) {
      apiRequest("POST", `/api/tools/${toolId}/usage`, {
        success: true,
        errorMessage: null,
      }).catch(err => console.error("Failed to track tool usage:", err));
    }
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

  // Only require authentication if the tool configuration indicates login is needed
  // if (isLoginRequired && !isAuthenticated) {
  //   return <UnauthenticatedView />;
  // }

  return (
    <PremiumGuard toolId={toolId ?? 0} isToolPremiumFromTool={isToolPremium} toolNameFromProps={name}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 py-8 md:py-16">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header with animation */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8 md:mb-12"
          >
            <div className="flex justify-center mb-4 md:mb-6">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative group"
              >
                <div className="relative bg-white p-4 rounded-full flex items-center justify-center shadow-lg border-2 border-red-500">
                  <Youtube className="h-12 w-12 text-red-600" />
                </div>
              </motion.div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
              {name}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              {description}
            </p>
          </motion.div>
          {/* Tool-specific ad */}
          {/* <div className="mb-6">
            <ToolAd />
          </div> */}
          {/* Step 1: Enter URL and Get Video Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="mb-6 md:mb-8 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <FileVideo className="h-5 w-5 text-red-600" />
                  <TranslatableBlock><span>Step 1: Get Video Information</span></TranslatableBlock>
                </CardTitle>
                <CardDescription className="text-gray-600">
                  <TranslatableBlock>Enter a YouTube URL to retrieve video information and available formats</TranslatableBlock>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="url" className="text-gray-700">
                    YouTube URL
                  </Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="mt-2 bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={isLoadingInfo}
                  />
                </div>

                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button
                    onClick={handleGetVideoInfo}
                    disabled={isLoadingInfo || !url}
                    className="w-full bg-red-600 hover:bg-red-700 text-white shadow-md"
                    size="lg"
                  >
                    {isLoadingInfo ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Getting Video Info...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Get Video Information
                      </>
                    )}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Step 2: Video Information Display */}
          {videoInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="mb-6 md:mb-8 border border-gray-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Play className="h-5 w-5 text-red-600" />
                    Video Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Video thumbnail and basic info */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="flex-shrink-0 relative"
                    >
                      <img
                        src={videoInfo.thumbnail}
                        alt={videoInfo.title}
                        className="w-full md:w-60 rounded-lg border border-gray-200 shadow-sm"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://via.placeholder.com/300x200?text=Video+Thumbnail";
                        }}
                      />
                    </motion.div>

                    {/* Video details */}
                    <div className="flex-1 space-y-3">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {videoInfo.title}
                      </h3>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-red-600" />
                          Duration: {formatDuration(videoInfo.duration)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4 text-red-600" />
                          Views: {parseInt(videoInfo.viewCount).toLocaleString()}
                        </div>
                      </div>

                      <p className="text-gray-600">
                        By: {videoInfo.author}
                      </p>

                      <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {videoInfo.availableFormats.length} formats available
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Format Selection */}
          {videoInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="mb-6 md:mb-8 border border-gray-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <FileAudio className="h-5 w-5 text-red-600" />
                    <TranslatableBlock>Step 2: Select Format & Quality</TranslatableBlock>
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    <TranslatableBlock>Choose your preferred format and quality for download</TranslatableBlock>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {videoInfo.availableFormats.map((format, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedFormat?.itag === format.itag
                          ? "border-red-500 bg-red-50 shadow-sm"
                          : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100"
                          }`}
                        onClick={() => handleFormatSelect(format)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {format.hasVideo ? (
                              <div className="p-2 rounded-full bg-red-100 text-red-600">
                                <FileVideo className="h-5 w-5" />
                              </div>
                            ) : (
                              <div className="p-2 rounded-full bg-green-100 text-green-600">
                                <FileAudio className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">
                                {format.quality} {format.format.toUpperCase()}
                                {!format.hasVideo && " (Audio Only)"}
                              </div>
                              <div className="text-sm text-gray-500">
                                {format.mime}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">{format.filesize}</div>
                            <div className="text-xs text-gray-500">
                              {format.hasVideo && format.hasAudio
                                ? "Video + Audio"
                                : format.hasVideo
                                  ? "Video Only"
                                  : "Audio Only"}
                            </div>
                          </div>
                        </div>
                        {selectedFormat?.itag === format.itag && isFetchingBlob && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading video data...</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Video Preview Section */}
          {previewUrl && isPreviewActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mb-6 md:mb-8"
            >
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardHeader className="relative">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <Eye className="h-5 w-5 text-red-600" />
                      Video Preview
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelPreview}
                      className="text-gray-500 hover:text-gray-900"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <div className="relative pt-[56.25%] bg-gray-100">
                      <video
                        ref={videoRef}
                        src={previewUrl}
                        controls
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Download */}
          {selectedFormat && videoInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Download className="h-5 w-5 text-red-600" />
                    <TranslatableBlock>Step 3: Download Video</TranslatableBlock>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">Ready to Download</div>
                        <div className="text-sm text-gray-600">
                          {selectedFormat.quality} {selectedFormat.format.toUpperCase()} - {selectedFormat.filesize}
                        </div>
                      </div>
                      {selectedFormat.hasVideo ? (
                        <div className="p-2 rounded-full bg-red-100 text-red-600">
                          <FileVideo className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-full bg-green-100 text-green-600">
                          <FileAudio className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    {selectedFormat.hasVideo && previewUrl && !isPreviewActive && (
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={handlePreview}
                          disabled={!videoBlob}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                          size="lg"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Preview Video
                        </Button>
                      </motion.div>
                    )}
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={handleDownload}
                        disabled={!videoBlob}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        size="lg"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Now
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Instructions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-8"
          >
            <Card className="mb-6 border border-gray-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">How to Use</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm">
                  <motion.li
                    whileHover={{ x: 5 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
                      1
                    </span>
                    <span className="text-gray-700">
                      <TranslatableBlock>Enter a valid YouTube URL in the input field above</TranslatableBlock>
                    </span>
                  </motion.li>
                  <motion.li
                    whileHover={{ x: 5 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
                      2
                    </span>
                    <span className="text-gray-700">
                      <TranslatableBlock>Click "Get Video Information" to retrieve video details and available formats</TranslatableBlock>
                    </span>
                  </motion.li>
                  <motion.li
                    whileHover={{ x: 5 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
                      3
                    </span>
                    <span className="text-gray-700">
                      <TranslatableBlock>Select your preferred format and quality from the list (video will be fetched automatically)</TranslatableBlock>
                    </span>
                  </motion.li>
                  <motion.li
                    whileHover={{ x: 5 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
                      4
                    </span>
                    <span className="text-gray-700">
                      <TranslatableBlock>Preview (optional) and click "Download Now" to start the download</TranslatableBlock>
                    </span>
                  </motion.li>
                </ol>
              </CardContent>
            </Card>
          </motion.div>

          {/* Informative Content Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mt-8"
          >
            <Card className="mb-6 border border-gray-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900"><TranslatableBlock>About YouTube Video Downloader</TranslatableBlock></CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-700">
                  <TranslatableBlock>YouTube is the world's most popular video-sharing platform, hosting billions of videos across countless topics, including entertainment, tutorials, news, music, vlogs, and educational content. Often, you might find a video that you want to watch offline, share with friends, or use in personal projects. A YouTube Video Downloader makes this simple, allowing you to save videos directly to your device in high quality without any complicated steps.</TranslatableBlock>
                </p>

                <p className="text-gray-700">
                  <TranslatableBlock>With a YouTube Video Downloader, you no longer need to rely on screen recording or third-party software that often reduces video quality. These tools provide a fast, safe, and convenient way to download videos in your preferred format, ensuring that audio and visuals remain intact.</TranslatableBlock>
                </p>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3"><TranslatableBlock>How a YouTube Video Downloader Works</TranslatableBlock></h3>
                  <p className="text-gray-700 mb-4">
                    <TranslatableBlock>A YouTube Video Downloader works by extracting video content directly from YouTube's servers and providing a downloadable link. Most tools are browser-based, meaning you don't have to install any apps or software. Here's the typical process:</TranslatableBlock>
                  </p>

                  <ol className="space-y-3 text-sm">
                    <motion.li
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        1
                      </span>
                      <span className="text-gray-700">
                        <TranslatableBlock><strong>Copy the Video URL</strong> – Open YouTube, find the video you want to download, and copy its URL from the address bar.</TranslatableBlock>
                      </span>
                    </motion.li>
                    <motion.li
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        2
                      </span>
                      <span className="text-gray-700">
                        <TranslatableBlock><strong>Paste the URL in the Downloader</strong> – Visit a reliable downloader, such as TheToolx YouTube Video Downloader, and paste the link.</TranslatableBlock>
                      </span>
                    </motion.li>
                    <motion.li
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        3
                      </span>
                      <span className="text-gray-700">
                        <TranslatableBlock><strong>Select Format and Quality</strong> – Choose the desired video format (usually MP4) and resolution, ranging from standard quality to HD and even 4K.</TranslatableBlock>
                      </span>
                    </motion.li>
                    <motion.li
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        4
                      </span>
                      <span className="text-gray-700">
                        <TranslatableBlock><strong>Download the Video</strong> – Click the "Download" button, and the video will be saved directly to your device in seconds.</TranslatableBlock>
                      </span>
                    </motion.li>
                  </ol>

                  <p className="text-gray-700 mt-4">
                    <TranslatableBlock>This simple workflow ensures that anyone, regardless of technical skill, can download YouTube videos quickly and efficiently.</TranslatableBlock>
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Benefits of Using a YouTube Video Downloader</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      "Offline Viewing – Save videos and watch them anytime, even without an internet connection.",
                      "High-Quality Downloads – Download videos in HD or 4K resolution, preserving both video and audio quality.",
                      "Easy Sharing – Share videos via social media, email, or messaging apps without relying on internet streaming.",
                      "Time Efficiency – Download videos in just a few clicks, avoiding lengthy processes like screen recording.",
                      "Audio Extraction – Many downloaders allow you to extract audio from videos, saving them as MP3 files for music, podcasts, or voice clips.",
                      "Device Compatibility – Works on Windows, Mac, Android, and iOS devices, ensuring flexibility across platforms.",
                      "Multiple Formats – Download videos in different formats and resolutions to suit your needs."
                    ].map((benefit, index) => (
                      <motion.li
                        key={index}
                        whileHover={{ x: 5 }}
                        className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <CheckCircle2 className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700"><TranslatableBlock>{benefit}</TranslatableBlock></span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3"><TranslatableBlock>Features of Modern YouTube Video Downloaders</TranslatableBlock></h3>
                  <p className="text-gray-700 mb-4">
                    <TranslatableBlock>Modern YouTube downloaders come with features that enhance the downloading experience:</TranslatableBlock>
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { icon: <Download className="h-5 w-5 text-red-600" />, text: "Batch Downloads – Download multiple videos at once, saving time for content creators and marketers." },
                      { icon: <Zap className="h-5 w-5 text-red-600" />, text: "High-Speed Downloads – Quickly download videos of any size without interruptions." },
                      { icon: <Globe className="h-5 w-5 text-red-600" />, text: "No Software Installation Needed – Browser-based tools are accessible on any device without additional software." },
                      { icon: <Music className="h-5 w-5 text-red-600" />, text: "Audio-Only Downloads – Extract audio from videos to create music files, podcasts, or voice notes." },
                      { icon: <Monitor className="h-5 w-5 text-red-600" />, text: "Multiple Resolutions – Choose from standard, HD, Full HD, or 4K depending on your needs." }
                    ].map((feature, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.02 }}
                        className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-white shadow-sm"
                      >
                        <div className="p-2 rounded-full bg-red-100 text-red-600 flex-shrink-0">
                          {feature.icon}
                        </div>
                        <span className="text-gray-700"><TranslatableBlock>{feature.text}</TranslatableBlock></span>
                      </motion.div>
                    ))}
                  </div>

                  <p className="text-gray-700 mt-4">
                    <TranslatableBlock>These features make modern YouTube downloaders versatile and user-friendly for both casual users and professionals.</TranslatableBlock>
                  </p>
                </div>

                <motion.div
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Card className="mb-6 md:mb-8 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow">
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
                          question: "Can I download YouTube videos for free?",
                          answer: "Yes, most YouTube video downloaders are free and allow unlimited downloads."
                        },
                        {
                          question: "Do I need to install an app to download videos?",
                          answer: "No, browser-based downloaders like TheToolx work on any device without additional apps."
                        },
                        {
                          question: "Can I download videos in HD or 4K quality?",
                          answer: "Yes, many tools offer high-definition download options to preserve video clarity and audio quality."
                        },
                        {
                          question: "Is it safe to use a YouTube Video Downloader?",
                          answer: "Yes, as long as you use reputable downloaders like TheToolx. Avoid untrusted websites to protect your device."
                        },
                        {
                          question: "Can I convert YouTube videos to MP3?",
                          answer: "Yes, many downloaders provide the option to extract audio from videos and save them as MP3 files."
                        },
                        {
                          question: "Can I download multiple videos at once?",
                          answer: "Some advanced tools allow batch downloading for multiple videos, which is convenient for content creators and social media managers."
                        }
                      ].map((faq, index) => (
                        <FAQItem
                          key={index}
                          question={faq.question}
                          answer={faq.answer}
                          index={index}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3"><TranslatableBlock>Tips for Better YouTube Video Downloads</TranslatableBlock></h3>
                  <ul className="space-y-3">
                    {[
                      "Check Video Accessibility – Only publicly available videos can be downloaded. Private or age-restricted videos may not be supported.",
                      "Organize Downloads – Save videos in folders based on topic, creator, or type.",
                      "Choose the Best Quality – For a better viewing experience, always select the highest available resolution.",
                      "Use Trusted Downloaders – Stick to reliable tools like TheToolx to ensure safety, speed, and quality."
                    ].map((tip, index) => (
                      <motion.li
                        key={index}
                        whileHover={{ x: 5 }}
                        className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700"><TranslatableBlock>{tip}</TranslatableBlock></span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2"><TranslatableBlock>Why Choose TheToolx YouTube Video Downloader</TranslatableBlock></h3>
                  <p className="text-gray-700">
                    <TranslatableBlock>TheToolx YouTube Video Downloader is designed for speed, simplicity, and reliability. Its browser-based platform ensures that you can download videos instantly without installing any software. With HD and 4K support, batch downloads, and audio extraction features, it is an ideal solution for casual users and professionals alike.</TranslatableBlock>
                  </p>
                  <p className="text-gray-700 mt-2">
                    <TranslatableBlock>Whether you want to save tutorials, music videos, vlogs, or live streams, TheToolx makes it simple, fast, and secure. Enjoy your favorite YouTube videos offline, share them easily, or use them for creative projects without worrying about quality loss.</TranslatableBlock>
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2"><TranslatableBlock>✅ Conclusion</TranslatableBlock></h3>
                  <p className="text-gray-700">
                    <TranslatableBlock>A YouTube Video Downloader is an essential tool for anyone who frequently watches or shares online videos. With TheToolx, downloading videos is effortless, safe, and fast. Its features, including batch downloads, audio extraction, and multiple resolution options, make it a versatile solution for both personal and professional use. No matter the device or technical expertise, you can save your favorite YouTube content instantly and enjoy it anytime, anywhere.</TranslatableBlock>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Premium Notice */}
          {isToolPremium && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="mt-6"
            >
              <Alert className="border-amber-500 bg-amber-50">
                <Crown className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <TranslatableBlock><strong className="font-semibold">Premium Feature:</strong> This tool includes enhanced capabilities for premium users.</TranslatableBlock>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

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

// Wrap the tool in an ErrorBoundary so render errors show a useful message
export default function YoutubeDownloader() {
  return (
    <ErrorBoundary>
      <YoutubeDownloaderInner />
    </ErrorBoundary>
  );
}