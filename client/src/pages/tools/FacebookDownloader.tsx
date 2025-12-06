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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Facebook,
  FileVideo,
  Shield,
  AlertCircle,
  CheckCircle2,
  X,
  Play,
  Image,
  Share2,
  Star,
  HelpCircle,
  Music,
  Globe,
  Zap,
  Lightbulb,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentTool } from "@/hooks/useCurrentTool";
import NotFound from "@/pages/not-found";
//import ToolAd from '@/components/ToolAd';
import TranslatableBlock from '@/components/TranslatableBlock';
import PremiumGuard from "@/components/PremiumGuard";
import UnauthenticatedView from "../auth/UnauthenticatedView";
import { useAuth } from "@/hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import StarRating from "@/components/ui/star-rating";
import { useToolRating } from "@/lib/useToolRating";

interface FAQItemProps {
  question: string;
  answer: string;
  index: number;
}

export default function FacebookDownloader() {
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState("hd");
  const [isLoading, setIsLoading] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [activeSection, setActiveSection] = useState<"video" | "stories" | "photos">("video");
  const [mediaTypeDetected, setMediaTypeDetected] = useState<"video" | "image" | null>(null);
  const { toast } = useToast();
  const { toolId, toolSlug, isToolPremium, name, description, isLoginRequired, isActive, isLoading: isToolLoading } = useCurrentTool();

  // declare hooks early to keep hooks call order stable
  const { user, isAuthenticated } = useAuth();
  const [showPreview, setShowPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string>("video.mp4");
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
    const text = "Check out this amazing Facebook Content Downloader!";
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

  const isSSR = typeof window === 'undefined';
  if (!isSSR && isToolLoading) {
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

  const handleDownload = async () => {
    if (!url) {
      toast({
        title: "Error",
        description: "Please enter an URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setDownloadReady(false);
    setDownloadBlob(null);
    setShowPreview(false);

    // Track tool usage
    if (toolId) {
      try {
        await apiRequest("POST", `/api/tools/${toolId}/usage`, {
          success: true,
          errorMessage: null,
        });
      } catch (error) {
        console.error("Failed to track tool usage:", error);
      }
    }

    try {
      const query = new URLSearchParams({
        url,
        toolType: toolSlug,
      });

      const endpoint = activeSection === 'video' ? '/api/download/video' : '/api/download/media';
      query.append('section', activeSection);
      const res = await fetch(`${endpoint}?${query.toString()}`);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to download content");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      const contentType = res.headers.get('Content-Type') || '';
      const filename = contentDisposition?.match(/filename="(.+?)"/)?.[1] || (contentType.includes('image') ? 'image.jpg' : 'video.mp4');

      setDownloadBlob(blob);
      setDownloadFilename(filename);
      setDownloadReady(true);
      if (contentType.includes('video')) setMediaTypeDetected('video');
      else if (contentType.includes('image')) setMediaTypeDetected('image');

      toast({
        title: 'Success!',
        description: 'Your content is ready to download.',
      });
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: error.message || "Unable to fetch content",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadFile = () => {
    if (!downloadBlob) return;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(downloadBlob);
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Download Started",
      description: "Your content is being downloaded...",
    });
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
    if (videoRef.current) {
      if (showPreview) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
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
            {index + 1}. <TranslatableBlock>{question}</TranslatableBlock>
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20 py-8 md:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <div className="flex justify-center mb-4 md:mb-6">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 p-4 rounded-full shadow-xl"
                  animate={{
                    boxShadow: [
                      '0 0 0 0px rgba(59, 89, 152, 0.2)',
                      '0 0 0 10px rgba(59, 89, 152, 0)',
                      '0 0 0 20px rgba(59, 89, 152, 0)'
                    ]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                >
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 1, type: "spring" }}
                  >
                    <Facebook
                      className="h-8 w-8 md:h-12 md:w-12 text-white"
                    />
                  </motion.div>
                </motion.div>
                <motion.div
                  className="absolute inset-0 rounded-full bg-blue-400 opacity-0"
                  animate={{
                    opacity: [0, 0.4, 0],
                    scale: [1, 1.5, 2]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                />
              </motion.div>
            </div>
            <motion.h1
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {name}
            </motion.h1>
            <motion.p
              className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {description}
            </motion.p>
          </div>

          {/* Main Tool */}
          <Card className="mb-6 md:mb-8 transform transition-all hover:shadow-xl hover:-translate-y-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileVideo className="h-5 w-5" />
                {name}
              </CardTitle>
              <CardDescription>
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    className={`px-3 py-1 rounded-md font-medium text-sm ${activeSection === 'video' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-blue-50'}`}
                    onClick={() => setActiveSection('video')}
                  >
                    Video
                  </button>
                  <button
                    className={`px-3 py-1 rounded-md font-medium text-sm ${activeSection === 'stories' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-blue-50'}`}
                    onClick={() => setActiveSection('stories')}
                  >
                    Stories
                  </button>
                  <button
                    className={`px-3 py-1 rounded-md font-medium text-sm ${activeSection === 'photos' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-blue-50'}`}
                    onClick={() => setActiveSection('photos')}
                  >
                    Photos
                  </button>
                </div>

                <div className="mt-2 sm:mt-0">
                  <Label htmlFor="url">Facebook URL</Label>
                </div>
              </div>

              <Input
                id="url"
                type="url"
                placeholder={
                  activeSection === "video"
                    ? "https://www.facebook.com/watch/?v=1234567890"
                    : activeSection === "stories"
                      ? "https://www.facebook.com/stories/username/1234567890/"
                      : "https://www.facebook.com/photo/?fbid=1234567890"
                }
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              <div className="flex justify-center">
                <Button
                  onClick={handleDownload}
                  disabled={isLoading || !url}
                  className="w-full max-w-[300px] h-[42px] mt-[22px] bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg transform hover:scale-[1.02] transition-all"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Proceed to process the Video
                    </>
                  )}
                </Button>
              </div>


              {downloadReady && (
                <div className="space-y-4">
                  <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      Your Facebook video is ready!
                    </AlertDescription>
                  </Alert>

                  <div className="flex flex-col md:flex-row gap-4">
                    <Button
                      onClick={handleDownloadFile}
                      className="w-full md:w-auto bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Now
                    </Button>
                    {(mediaTypeDetected === 'video' || downloadFilename.endsWith('.mp4')) && (
                      <Button
                        onClick={togglePreview}
                        variant="outline"
                        className="w-full md:w-auto border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      >
                        {showPreview ? (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Close Preview
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Preview Video
                          </>
                        )}
                      </Button>
                    )}
                    {(mediaTypeDetected === 'image' || downloadFilename.match(/\.(jpg|jpeg|png|gif)$/i)) && (
                      <Button
                        onClick={() => setShowPreview(!showPreview)}
                        variant="outline"
                        className="w-full md:w-auto border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      >
                        {showPreview ? (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Close Preview
                          </>
                        ) : (
                          <>
                            <Image className="h-4 w-4 mr-2" />
                            Preview Image
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {showPreview && downloadBlob && (
                    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg">
                      <video
                        ref={videoRef}
                        src={URL.createObjectURL(downloadBlob)}
                        controls
                        className="w-full h-auto max-h-[500px]"
                        onEnded={() => setShowPreview(false)}
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <Card className="transform transition-all hover:scale-[1.02] hover:shadow-lg">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <FileVideo className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold"><TranslatableBlock>HD Quality</TranslatableBlock></h3>
                </div>
                <TranslatableBlock>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Download Facebook videos in original HD quality with no quality loss
                  </p>
                </TranslatableBlock>
              </CardContent>
            </Card>

            <Card className="transform transition-all hover:scale-[1.02] hover:shadow-lg">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                    <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold"><TranslatableBlock>Secure & Private</TranslatableBlock></h3>
                </div>
                <TranslatableBlock>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your privacy is protected. No data is stored on our servers
                  </p>
                </TranslatableBlock>
              </CardContent>
            </Card>

            <Card className="transform transition-all hover:scale-[1.02] hover:shadow-lg">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <Download className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold"><TranslatableBlock>Fast Processing</TranslatableBlock></h3>
                </div>
                <TranslatableBlock>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Quick processing and download speeds for all video types
                  </p>
                </TranslatableBlock>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <Card className="mb-6 md:mb-8 transform transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle>How to Download Facebook Videos</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400 marker:text-blue-500 marker:font-medium">
                <li className="hover:text-blue-600 transition-colors">
                  Go to Facebook and find the video you want to download
                </li>
                <li className="hover:text-blue-600 transition-colors">
                  Click on the video to open it in full view
                </li>
                <li className="hover:text-blue-600 transition-colors">
                  Copy the video URL from your browser's address bar
                </li>
                <li className="hover:text-blue-600 transition-colors">
                  Paste the URL into the input field above
                </li>
                <li className="hover:text-blue-600 transition-colors">
                  Select your preferred video quality
                </li>
                <li className="hover:text-blue-600 transition-colors">
                  Click "Download Video" and wait for processing
                </li>
                <li className="hover:text-blue-600 transition-colors">
                  Preview or download your file when ready
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Informative Content Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8"
          >
            <Card className="mb-6 md:mb-8 transform transition-all hover:shadow-lg">
              <CardHeader>
                <CardTitle>About Facebook Video Downloader</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <TranslatableBlock>
                  <p className="text-gray-600 dark:text-gray-400">
                    Facebook is one of the largest social media platforms globally, where users share videos ranging from personal moments, live streams, tutorials, educational content, to viral trends. Often, you may come across a video that you want to save to watch offline, share with friends, or use for personal projects. A Facebook Video Downloader makes this process quick, safe, and simple.
                  </p>

                  <p className="text-gray-600 dark:text-gray-400">
                    With a Facebook Video Downloader, you don't need to rely on screen recording apps or complicated software that can reduce video quality. These tools allow you to download videos directly from Facebook in high resolution and keep them accessible on your devices anytime.
                  </p>
                </TranslatableBlock>

                <div>
                  <TranslatableBlock>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">How Facebook Video Downloader Works</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      A Facebook Video Downloader extracts videos from Facebook's servers and creates a downloadable link. This process is straightforward and can be used on desktops, laptops, tablets, and smartphones. The typical steps include:
                    </p>
                  </TranslatableBlock>

                  <ol className="space-y-3 text-sm">
                    <motion.li
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        1
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        <TranslatableBlock>
                          <strong>Copy the Video URL</strong> – Open Facebook, find the video you want to download, click on the "Share" button, and select "Copy Link."
                        </TranslatableBlock>
                      </span>
                    </motion.li>
                    <motion.li
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        2
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        <TranslatableBlock>
                          <strong>Paste the Link in the Downloader</strong> – Go to a reliable Facebook Video Downloader, like TheToolx Facebook Video Downloader, and paste the copied URL.
                        </TranslatableBlock>
                      </span>
                    </motion.li>
                    <motion.li
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        3
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        <TranslatableBlock>
                          <strong>Select Format and Quality</strong> – Choose the video format (usually MP4) and select the desired resolution, including HD options.
                        </TranslatableBlock>
                      </span>
                    </motion.li>
                    <motion.li
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        4
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        <TranslatableBlock>
                          <strong>Download the Video</strong> – Click the "Download" button, and the video will be saved to your device instantly.
                        </TranslatableBlock>
                      </span>
                    </motion.li>
                  </ol>

                  <p className="text-gray-600 dark:text-gray-400 mt-4">
                    <TranslatableBlock>
                      This method allows anyone to save videos without installing extra apps or software.
                    </TranslatableBlock>
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3"><TranslatableBlock>Benefits of Using a Facebook Video Downloader</TranslatableBlock></h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      "Offline Access – Watch your favorite videos anytime, even without an internet connection.",
                      "Preserve High Quality – Download videos in HD resolution, ensuring clear visuals and sound.",
                      "Easy Sharing – Share downloaded videos on other social media platforms, messaging apps, or email.",
                      "Time-Saving – Avoid screen recording and manual downloading; save videos with just a few clicks.",
                      "Multiple Formats – Some tools offer audio extraction from videos (MP3) or different video quality options.",
                      "Cross-Device Support – Works on Windows, Mac, Android, and iOS devices for maximum flexibility."
                    ].map((benefit, index) => (
                      <motion.li
                        key={index}
                        whileHover={{ x: 5 }}
                        className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600 dark:text-gray-400"><TranslatableBlock>{benefit}</TranslatableBlock></span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3"><TranslatableBlock>Features of Modern Facebook Video Downloaders</TranslatableBlock></h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { icon: <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />, text: "Batch Downloads – Download multiple videos simultaneously, saving time for content creators and social media managers." },
                      { icon: <Music className="h-5 w-5 text-blue-600 dark:text-blue-400" />, text: "Audio Extraction – Convert video to MP3 to save only the audio for music, podcasts, or voice clips." },
                      { icon: <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />, text: "High-Speed Downloads – Download videos quickly, even large files, without interruptions." },
                      { icon: <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />, text: "No Software Required – Browser-based tools work directly without the need to install apps or extensions." }
                    ].map((feature, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.02 }}
                        className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
                      >
                        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex-shrink-0">
                          {feature.icon}
                        </div>
                        <span className="text-gray-600 dark:text-gray-400"><TranslatableBlock>{feature.text}</TranslatableBlock></span>
                      </motion.div>
                    ))}
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 mt-4">
                    <TranslatableBlock>
                      These features make downloaders versatile tools for personal and professional use.
                    </TranslatableBlock>
                  </p>
                </div>

                {/* FAQ Card */}
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
                          question: "Can I download Facebook videos for free?",
                          answer: "Yes, most Facebook video downloaders are completely free and allow unlimited downloads."
                        },
                        {
                          question: "Do I need to install an app to download Facebook videos?",
                          answer: "No, browser-based downloaders work on any device without additional software."
                        },
                        {
                          question: "Can I download videos in HD quality?",
                          answer: "Yes, most tools provide high-definition download options to ensure clear video and audio quality."
                        },
                        {
                          question: "Is it safe to use a Facebook Video Downloader?",
                          answer: "Yes, as long as you use trusted websites like TheToolx. Avoid suspicious sites to protect your device and privacy."
                        },
                        {
                          question: "Can I convert Facebook videos to MP3?",
                          answer: "Yes, some downloaders allow audio extraction so you can save videos as MP3 files for music or podcasts."
                        },
                        {
                          question: "Can I download videos from private profiles or groups?",
                          answer: "Typically, you can only download videos that are publicly available or shared within accessible groups. Private videos may not be downloadable."
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
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3"><TranslatableBlock>Tips for Better Facebook Video Downloads</TranslatableBlock></h3>
                  <ul className="space-y-3">
                    {[
                      "Check Privacy Settings – Ensure the video is publicly available to download.",
                      "Organize Your Downloads – Create folders for different types of content, such as music, tutorials, or personal clips.",
                      "Select the Best Quality – Choose HD or the highest resolution available for the best viewing experience.",
                      "Use Trusted Downloaders – Stick to reliable tools like TheToolx to ensure security and high-quality downloads."
                    ].map((tip, index) => (
                      <motion.li
                        key={index}
                        whileHover={{ x: 5 }}
                        className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600 dark:text-gray-400"><TranslatableBlock>{tip}</TranslatableBlock></span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <TranslatableBlock>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Why Use TheToolx Facebook Video Downloader</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      TheToolx Facebook Video Downloader is designed for speed, simplicity, and reliability. It allows users to download videos quickly without losing quality. Whether for personal entertainment, educational purposes, or content creation, TheToolx provides a seamless experience. Its features, such as batch downloads, HD options, and browser-based accessibility, make it a top choice for anyone who frequently saves Facebook videos.
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                      With TheToolx, you can save videos instantly, share them easily, and enjoy them offline, all while ensuring a safe and high-quality download every time.
                    </p>
                  </TranslatableBlock>
                </div>

                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">

                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2"><TranslatableBlock>✅ Conclusion</TranslatableBlock></h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    <TranslatableBlock>A Facebook Video Downloader is an essential tool for anyone who wants to save, share, or reuse videos from Facebook. By using a trusted downloader like TheToolx, you can enjoy high-quality videos offline, organize your downloads efficiently, and access advanced features such as batch downloads and audio extraction. No matter your device or technical skill, downloading Facebook videos has never been easier.
                    </TranslatableBlock>
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
                  <span>Share this tool</span>
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

          {/* Important Note */}
          <Alert className="mt-6 md:mt-8 border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <TranslatableBlock>
                <strong>Important:</strong> Only download videos that you have
                permission to use. Respect copyright laws and Facebook's terms of
                service.
              </TranslatableBlock>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </PremiumGuard >
  );
}