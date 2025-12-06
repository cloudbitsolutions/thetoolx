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
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Twitter,
  FileVideo,
  Image,
  AlertCircle,
  CheckCircle2,
  Play,
  X,
  Share2,
  Star,
  Lightbulb,
  HelpCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentTool } from "@/hooks/useCurrentTool";
import NotFound from "@/pages/not-found";
//import ToolAd from '@/components/ToolAd';
import PremiumGuard from "@/components/PremiumGuard";
import UnauthenticatedView from "../auth/UnauthenticatedView";
import { useAuth } from "@/hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import StarRating from "@/components/ui/star-rating";
import { useToolRating } from "@/lib/useToolRating";
import TranslatableBlock from "@/components/TranslatableBlock";

interface FAQItemProps {
  question: string;
  answer: string;
  index: number;
}

export default function TwitterDownloader() {
  const [url, setUrl] = useState("");
  const [mediaType, setMediaType] = useState("auto");
  const [activeSection, setActiveSection] = useState<"video" | "stories" | "photos">("video");
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const { toast } = useToast();
  const { toolId, toolSlug, isToolPremium, name, description, isLoginRequired, isActive, isLoading: isToolLoading } = useCurrentTool();

  // Move all hooks (refs, state, effects, mutations) here so they run in a stable order
  const { user, isAuthenticated } = useAuth();
  const mediaRef = useRef<HTMLVideoElement | HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string>("media.mp4");
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaTypeDetected, setMediaTypeDetected] = useState<"video" | "image" | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // declare mutations early to preserve hooks order
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
  // Skip loading state during SSR - render content immediately for SEO
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

  

  if (isToolLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center text-gray-500 animate-pulse">Loading...</div>
      </div>
    );
  }
  if (typeof isActive !== 'undefined' && !isActive) return <NotFound />;

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
    setMediaPreviewUrl(null);
    setMediaTypeDetected(null);

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
        mediaType,
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
      const contentType = res.headers.get("Content-Type");
      const filename =
        contentDisposition?.match(/filename="(.+?)"/)?.[1] ||
        (contentType?.includes("video") ? "video.mp4" : "image.jpg");

      setDownloadBlob(blob);
      setDownloadFilename(filename);

      const previewUrl = URL.createObjectURL(blob);
      setMediaPreviewUrl(previewUrl);

      if (contentType?.includes("video")) {
        setMediaTypeDetected("video");
      } else if (contentType?.includes("image")) {
        setMediaTypeDetected("image");
      }

      setDownloadReady(true);

      toast({
        title: "Success!",
        description: "Your content is ready to download.",
      });
    } catch (error: any) {
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50 py-8 md:py-16">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <div className="flex justify-center mb-4 md:mb-6">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-200 animate-pulse"></div>
                <div className="relative bg-white p-4 rounded-full flex items-center justify-center shadow-md">
                  <Twitter className="h-12 w-12 text-blue-500 transform group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3 md:mb-4">
              {name}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              {description}
            </p>
          </div>

          {/* Main Tool Card */}
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="mb-6 md:mb-8 bg-white shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800">
                  <FileVideo className="h-5 w-5 text-blue-600" />
                  {name}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        className={`px-3 py-1 rounded-md font-medium text-sm ${activeSection === 'video' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-blue-50'}`}
                        onClick={() => setActiveSection('video')}
                      >
                        Video
                      </button>
                      {/* <button
                        className={`px-3 py-1 rounded-md font-medium text-sm ${activeSection === 'stories' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-blue-50'}`}
                        onClick={() => setActiveSection('stories')}
                      >
                        Stories
                      </button> */}
                      <button
                        className={`px-3 py-1 rounded-md font-medium text-sm ${activeSection === 'photos' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-blue-50'}`}
                        onClick={() => setActiveSection('photos')}
                      >
                        Photos
                      </button>
                    </div>

                    <div className="mt-2 sm:mt-0">
                      <Label htmlFor="url" className="text-gray-700">Twitter URL</Label>
                    </div>
                  </div>
                  <Input
                    id="url"
                    type="url"
                    placeholder={
                      activeSection === "photos"
                        ? "https://twitter.com/username/status/1234567890/photo/1"
                        : "https://twitter.com/username/status/1234567890"
                    }

                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="mt-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <Button
                  onClick={handleDownload}
                  disabled={isLoading || !url}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg transform hover:scale-[1.02] transition-all text-white"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download Content
                    </>
                  )}
                </Button>

                {downloadReady && (
                  <div className="space-y-4">
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Your Twitter content is ready!
                      </AlertDescription>
                    </Alert>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        onClick={handleDownloadFile}
                        className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Now
                      </Button>

                      {mediaTypeDetected === "video" && (
                        <Button
                          onClick={togglePreview}
                          variant="outline"
                          className="w-full sm:w-auto border-blue-500 text-blue-600 hover:bg-blue-50"
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
                      {mediaTypeDetected === 'image' && (
                        <Button
                          onClick={() => setShowPreview(!showPreview)}
                          variant="outline"
                          className="w-full sm:w-auto border-blue-500 text-blue-600 hover:bg-blue-50"
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
                      <div className="rounded-lg overflow-hidden border border-gray-200 shadow-lg">
                        {mediaTypeDetected === "video" ? (
                          <video
                            ref={videoRef}
                            src={URL.createObjectURL(downloadBlob)}
                            controls
                            className="w-full h-auto max-h-[500px]"
                            onEnded={() => setShowPreview(false)}
                          />
                        ) : (
                          <img
                            src={URL.createObjectURL(downloadBlob)}
                            alt="Preview"
                            className="w-full h-auto max-h-[500px] object-contain"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <Card className="border-0 bg-white hover:bg-blue-50 transition-all transform hover:-translate-y-1 shadow-md">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                    <FileVideo className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-gray-800"><TranslatableBlock>Videos & GIFs</TranslatableBlock></h3>
                </div>
                <p className="text-sm text-gray-600">
                  <TranslatableBlock>Download Twitter videos and animated GIFs in high quality</TranslatableBlock>
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white hover:bg-green-50 transition-all transform hover:-translate-y-1 shadow-md">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-full bg-green-100 text-green-600">
                    <Image className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-gray-800"><TranslatableBlock>Images</TranslatableBlock></h3>
                </div>
                <p className="text-sm text-gray-600">
                  <TranslatableBlock>Save images from tweets in original resolution and quality</TranslatableBlock>
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white hover:bg-cyan-50 transition-all transform hover:-translate-y-1 shadow-md">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-full bg-cyan-100 text-cyan-600">
                    <Download className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-gray-800"><TranslatableBlock>Bulk Download</TranslatableBlock></h3>
                </div>
                <p className="text-sm text-gray-600">
                  <TranslatableBlock>Download all media from a tweet with a single click</TranslatableBlock>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <Card className="border-0 bg-white shadow-md mb-6 transform transition-all hover:scale-[1.005]">
            <CardHeader>
              <CardTitle className="text-gray-800">
                <TranslatableBlock>How to Download Twitter Media</TranslatableBlock>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 marker:text-blue-500 pl-4">
                <TranslatableBlock>
                  <li className="hover:text-gray-900 transition-colors pl-2">
                    Open Twitter/X and find the tweet with media you want to download
                  </li>
                  <li className="hover:text-gray-900 transition-colors pl-2">
                    Click on the tweet to open it in full view
                  </li>
                  <li className="hover:text-gray-900 transition-colors pl-2">
                    Copy the tweet URL from your browser's address bar
                  </li>
                  <li className="hover:text-gray-900 transition-colors pl-2">
                    Paste the URL into the input field above
                  </li>
                  <li className="hover:text-gray-900 transition-colors pl-2">
                    Select media type or use auto-detect
                  </li>
                  <li className="hover:text-gray-900 transition-colors pl-2">
                    Click "Download Media" and wait for processing
                  </li>
                  <li className="hover:text-gray-900 transition-colors pl-2">
                    Preview and download your files when ready
                  </li>
                </TranslatableBlock>
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
            <Card className="mb-6 border-0 bg-white shadow-md">
              <CardHeader>
                <CardTitle className="text-gray-800"><TranslatableBlock>About Twitter Video Downloader</TranslatableBlock></CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <TranslatableBlock>
                  <p className="text-gray-700">
                    Twitter is a platform where millions of users share videos daily, ranging from breaking news and tutorials to viral clips and personal updates. Sometimes, you may want to save these videos to watch offline, share with friends, or use in projects. That's where a Twitter Video Downloader comes in handy. This tool allows you to download videos directly from Twitter in high quality without any complicated steps.
                  </p>

                  <p className="text-gray-700">
                    With a Twitter Video Downloader, you don't need to rely on screen recording, which often reduces video quality. You can save videos instantly, preserving clarity and audio for offline viewing or sharing.
                  </p>
                </TranslatableBlock>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3"><TranslatableBlock>How Twitter Video Downloader Works</TranslatableBlock></h3>
                  <p className="text-gray-700 mb-4">
                    <TranslatableBlock>A Twitter Video Downloader extracts videos directly from Twitter's servers and provides a downloadable link. The process is simple and works across desktops, laptops, tablets, and mobile devices:</TranslatableBlock>
                  </p>

                  <ol className="space-y-3 text-sm">
                    <motion.li
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        1
                      </span>
                      <span className="text-gray-700">
                        <TranslatableBlock><strong>Copy the Tweet Link</strong> – Open Twitter, find the tweet with the video, and copy its URL.</TranslatableBlock>
                      </span>
                    </motion.li>
                    <motion.li
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        2
                      </span>
                      <span className="text-gray-700">
                        <TranslatableBlock><strong>Paste the Link in the Downloader</strong> – Visit a reliable Twitter Video Downloader like TheToolx Twitter Video Downloader and paste the link.</TranslatableBlock>
                      </span>
                    </motion.li>
                    <motion.li
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        3
                      </span>
                      <span className="text-gray-700">
                        <TranslatableBlock><strong>Choose Format and Quality</strong> – Select MP4 for video and choose from available quality options, including HD.</TranslatableBlock>
                      </span>
                    </motion.li>
                    <motion.li
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        4
                      </span>
                      <span className="text-gray-700">
                        <TranslatableBlock><strong>Download the Video</strong> – Click "Download" and the video is saved directly to your device.</TranslatableBlock>
                      </span>
                    </motion.li>
                  </ol>

                  <p className="text-gray-700 mt-4">
                    <TranslatableBlock>This workflow is user-friendly and doesn't require any software installation.</TranslatableBlock>
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3"><TranslatableBlock>Benefits of Using a Twitter Video Downloader</TranslatableBlock></h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      "Offline Access – Watch videos anytime, even without an internet connection.",
                      "High-Quality Downloads – Download videos in HD quality, preserving clarity and sound.",
                      "Easy Sharing – Share videos across social media platforms, messaging apps, or email.",
                      "Save Time – Download videos instantly with a few clicks instead of recording or using complicated methods.",
                      "Multiple Formats – Some tools allow downloading videos in MP4, or extracting audio in MP3 format."
                    ].map((benefit, index) => (
                      <motion.li
                        key={index}
                        whileHover={{ x: 5 }}
                        className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700"><TranslatableBlock>{benefit}</TranslatableBlock></span>
                      </motion.li>
                    ))}
                  </ul>
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
                          question: "Can I download Twitter videos for free?",
                          answer: "Yes, most Twitter video downloaders offer free downloads without any fees."
                        },
                        {
                          question: "Do I need to install an app to download videos?",
                          answer: "No, many downloaders are browser-based, so you can download videos without installing any apps."
                        },
                        {
                          question: "Can I download videos in HD?",
                          answer: "Yes, many tools provide high-definition download options to ensure videos maintain their original quality."
                        },
                        {
                          question: "Is it safe to use a Twitter Video Downloader?",
                          answer: "Yes, reputable downloaders like TheToolx are safe. Avoid untrusted sites to protect your device and personal information."
                        },
                        {
                          question: "Can I convert Twitter videos to MP3?",
                          answer: "Yes, some downloaders allow audio extraction from videos, saving it as an MP3 file for music, podcasts, or voice clips."
                        },
                        {
                          question: "Can I download multiple videos at once?",
                          answer: "Some advanced downloaders offer batch downloads to save multiple videos simultaneously, which is useful for content creators and social media managers."
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
                  <h3 className="text-lg font-semibold text-gray-800 mb-3"><TranslatableBlock>Tips for Better Downloads</TranslatableBlock></h3>
                  <ul className="space-y-3">
                    {[
                      "Check Video Privacy – Only publicly shared videos can be downloaded. Private or protected tweets may not work.",
                      "Organize Your Downloads – Keep videos in separate folders based on topic or type.",
                      "Verify Video Quality – Always select the highest available quality for the best viewing experience.",
                      "Use Trusted Downloaders – Stick to reliable tools like TheToolx Twitter Video Downloader to ensure safety and quality."
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

                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2"><TranslatableBlock>✅ TheToolx Twitter Video Downloader</TranslatableBlock></h3>
                  <p className="text-gray-700">
                    <TranslatableBlock>TheToolx Twitter Video Downloader allows you to save your favorite videos quickly, easily, and securely. Whether for personal use, sharing, or content creation, it offers a simple and effective solution to enjoy Twitter videos anytime, anywhere.
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

          {/* Important Note */}
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-700">
              <TranslatableBlock><strong className="font-semibold">Important:</strong> Only download
              content that you have permission to use. Respect copyright laws and
              Twitter's terms of service. Private account content cannot be downloaded.</TranslatableBlock>
          </AlertDescription>
        </Alert>
      </div>
    </div>
    </PremiumGuard >);
}