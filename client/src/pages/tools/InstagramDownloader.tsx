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
  Instagram,
  FileVideo,
  Image,
  Music,
  AlertCircle,
  CheckCircle2,
  Play,
  X,
  Share2,
  Star,
  User,
  Eye,
  Grid,
  Film,
  Clapperboard,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentTool } from "@/hooks/useCurrentTool";
import NotFound from "@/pages/not-found";
//import ToolAd from '@/components/ToolAd';
import TranslatableBlock from '@/components/TranslatableBlock';
import PremiumGuard from "@/components/PremiumGuard";
import { useAuth } from "@/hooks/useAuth";
import UnauthenticatedView from "../auth/UnauthenticatedView";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import StarRating from "@/components/ui/star-rating";
import { useToolRating } from "@/lib/useToolRating";

interface FAQItemProps {
  question: React.ReactNode;
  answer: React.ReactNode;
  index: number;
}

export default function InstagramDownloader() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeSection, setActiveSection] = useState<"video" | "stories" | "photos">("video");
  const [mediaTypeDetected, setMediaTypeDetected] = useState<"video" | "image" | null>(null);
  const { toast } = useToast();
  const { toolId, isToolPremium, name, description, isLoginRequired, toolSlug, isActive, isLoading: isToolLoading } = useCurrentTool();

  // move all hooks and hook-using declarations here to avoid hooks-order issues
  const { user, isAuthenticated } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string>("video.mp4");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // keep mutations and hooks near the top to preserve hooks call order
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
      const params: Record<string, string> = {
        url,
        toolType: toolSlug,
      };

      // Video uses video endpoint, stories/photos use media endpoint
      const endpoint = activeSection === "video" ? "/api/download/video" : "/api/download/media";

      const query = new URLSearchParams(params);
      query.append("section", activeSection);

      const res = await fetch(`${endpoint}?${query.toString()}`);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to download content");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      const contentType = res.headers.get("Content-Type") || "application/octet-stream";
      const filename =
        contentDisposition?.match(/filename="(.+?)"/)?.[1] || (contentType.includes("image") ? "image.jpg" : "video.mp4");

      setDownloadBlob(blob);
      setDownloadFilename(filename);
      setDownloadReady(true);

      // set detected media type for preview
      if (contentType.includes("video")) setMediaTypeDetected("video");
      else if (contentType.includes("image")) setMediaTypeDetected("image");

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
    const text = "Check out this amazing Instagram Content Downloader!";
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
            {index + 1}. {question}
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
                <div className="text-gray-600 dark:text-gray-300 text-sm md:text-base leading-relaxed">
                  {answer}
                </div>
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-pink-50 dark:from-gray-900 dark:to-purple-900/20 py-8 md:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header with Animated Logo */}
          <div className="text-center mb-8 md:mb-12">
            <motion.div
              className="flex justify-center mb-4 md:mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 p-4 rounded-full shadow-xl"
                  animate={{
                    boxShadow: [
                      '0 0 0 0px rgba(225, 48, 108, 0.2)',
                      '0 0 0 10px rgba(225, 48, 108, 0)',
                      '0 0 0 20px rgba(225, 48, 108, 0)'
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
                    <Instagram className="h-8 w-8 md:h-12 md:w-12 text-white" />
                  </motion.div>
                </motion.div>
                <motion.div
                  className="absolute inset-0 rounded-full bg-pink-400 opacity-0 blur-md"
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
            </motion.div>

            <motion.h1
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4 bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600"
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

          {/* Main Tool Card */}
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="mb-6 md:mb-8 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <TranslatableBlock>
                <CardTitle className="flex items-center gap-2">
                  <FileVideo className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  Download Instagram Content
                </CardTitle>
                <CardDescription>
                  Enter an Instagram URL to download videos, stories or photos
                </CardDescription>
                </TranslatableBlock>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      className={`px-3 py-1 rounded-md font-medium text-sm ${activeSection === 'video' ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 border border-transparent hover:bg-pink-50'}`}
                      onClick={() => setActiveSection('video')}
                    >
                      Video
                    </button>
                    <button
                      className={`px-3 py-1 rounded-md font-medium text-sm ${activeSection === 'stories' ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-pink-50'}`}
                      onClick={() => setActiveSection('stories')}
                    >
                      Stories
                    </button>
                    <button
                      className={`px-3 py-1 rounded-md font-medium text-sm ${activeSection === 'photos' ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-pink-50'}`}
                      onClick={() => setActiveSection('photos')}
                    >
                      Photos
                    </button>
                  </div>

                  <div className="mt-2 sm:mt-0">
                    <Label htmlFor="url">Instagram URL</Label>
                  </div>
                </div>
                <Input
                  id="url"
                  type="url"
                  placeholder={
                    activeSection === "video"
                      ? "https://www.instagram.com/reel/..."
                      : activeSection === "stories"
                        ? "https://www.instagram.com/stories/@username/1234567890/"
                        : "https://www.instagram.com/p/..."
                  }

                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />

                <Button
                  onClick={handleDownload}
                  disabled={isLoading || !url}
                  className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 shadow-lg transform hover:scale-[1.02] transition-all"
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
                    <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        Your Instagram content is ready!
                      </AlertDescription>
                    </Alert>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        onClick={handleDownloadFile}
                        className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Now
                      </Button>

                      {(mediaTypeDetected === 'video' || downloadFilename.endsWith('.mp4')) && (
                        <Button
                          onClick={togglePreview}
                          variant="outline"
                          className="w-full sm:w-auto border-pink-500 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/30"
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
                          className="w-full sm:w-auto border-pink-500 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/30"
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
                        {mediaTypeDetected === 'image' ? (
                          <img
                            src={URL.createObjectURL(downloadBlob)}
                            alt="Preview"
                            className="w-full h-auto max-h-[500px] object-contain"
                          />
                        ) : (
                          <video
                            ref={videoRef}
                            src={URL.createObjectURL(downloadBlob)}
                            controls
                            className="w-full h-auto max-h-[500px]"
                            onEnded={() => setShowPreview(false)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Instructions Card */}
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="mb-6 md:mb-8 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle>How to Download Instagram Content</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400 marker:text-pink-500 marker:font-medium">
                  <li className="hover:text-pink-600 transition-colors">
                    Open Instagram and find the post, reel, or story
                  </li>
                  <li className="hover:text-pink-600 transition-colors">
                    Tap the three dots (...) and select "Copy Link"
                  </li>
                  <li className="hover:text-pink-600 transition-colors">
                    Paste the URL into the input field above
                  </li>
                  <li className="hover:text-pink-600 transition-colors">
                    Click "Download Content" and wait
                  </li>
                  <li className="hover:text-pink-600 transition-colors">
                    Preview or download your file when ready
                  </li>
                </ol>
              </CardContent>
            </Card>
          </motion.div>

          {/* TheToolx.com Introduction Card */}
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="mb-6 md:mb-8 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Instagram className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  About TheToolx.com Instagram Downloader
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TranslatableBlock>
                  <p className="text-gray-600 dark:text-gray-300">
                    TheToolx.com is a free and unlimited Instagram video downloader that lets users easily download videos, Reels, Stories, and IGTV content from any Instagram account. With this powerful tool, you can quickly save your favorite videos directly to your device without any hassle.
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    One of the standout features of TheToolx.com is its ability to download videos in high quality. Whether it's a short clip or a longer IGTV video, you can be confident that the original video quality will be preserved. The tool also supports multiple video resolutions, allowing you to choose the quality that best suits your needs.
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    What makes TheToolx.com even more appealing is that it is completely free to use. There are no limits on the number of videos you can download, making it an ideal choice for frequent Instagram users who want to create a personal library of their favorite content.
                  </p>
                </TranslatableBlock>
              </CardContent>
            </Card>
          </motion.div>

          {/* What is Instagram Card */}
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="mb-6 md:mb-8 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Instagram className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  What is Instagram?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TranslatableBlock>
                  <p className="text-gray-600 dark:text-gray-300">
                    Instagram is a social media platform where people share photos and videos. It is widely used to post Stories, Reels, and IGTV videos that can entertain, inform, or inspire others. Since Instagram doesn't provide a direct download option, tools like TheToolx.com Instagram Downloader help users save content to enjoy anytime without an internet connection.
                  </p>
                </TranslatableBlock>
              </CardContent>
            </Card>
          </motion.div>

          {/* Instagram Video Downloader Card */}
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="mb-6 md:mb-8 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Film className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  Instagram Video Downloader
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TranslatableBlock>
                  <h3 className="font-semibold text-lg">What is an Instagram Video Downloader?</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Instagram is not just about photos anymore. Videos have become one of the most popular ways for people to share moments, tutorials, entertainment, and product reviews. However, Instagram does not allow users to download videos directly. That's where an Instagram Video Downloader becomes useful. It's a simple online tool that lets you save videos from Instagram directly to your phone, tablet, or computer.
                  </p>

                  <h3 className="font-semibold text-lg">Why Do People Use an Instagram Video Downloader?</h3>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                    <li>Offline Viewing: Watch your favorite videos even without an internet connection.</li>
                    <li>Education & Tutorials: Save learning content like recipes, workouts, or study tips for later reference.</li>
                    <li>Entertainment: Keep music videos, funny clips, or inspirational stories in your gallery.</li>
                    <li>Marketing Inspiration: Businesses and creators often save videos to study trends and ideas.</li>
                  </ul>
                </TranslatableBlock>
              </CardContent>
            </Card>
          </motion.div>

          {/* Instagram Reels Downloader Card */}
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="mb-6 md:mb-8 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clapperboard className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  Instagram Reels Downloader
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TranslatableBlock>
                  <h3 className="font-semibold text-lg">What is an Instagram Reels Downloader?</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Reels are one of the most popular features on Instagram, designed to share short, engaging videos similar to TikTok. From dance challenges and tutorials to motivational clips and funny content, Reels have become a daily dose of entertainment for millions of users. But Instagram does not provide a direct option to save them offline. An Instagram Reels Downloader solves this problem by letting you download Reels directly to your device.
                  </p>

                  <h3 className="font-semibold text-lg">Why Do People Use an Instagram Reels Downloader?</h3>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                    <li>Offline Entertainment: Watch your favorite Reels anytime, even without an internet connection.</li>
                    <li>Learning: Save cooking recipes, fitness routines, DIY hacks, or language tips to follow later.</li>
                    <li>Inspiration: Creators and marketers often download trending Reels to study editing styles, music use, and ideas for their own content.</li>
                    <li>Sharing: Sometimes you want to keep a video to share with friends or use on other platforms.</li>
                  </ul>
                </TranslatableBlock>
              </CardContent>
            </Card>
          </motion.div>

          {/* Instagram Stories Downloader Card */}
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="mb-6 md:mb-8 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  Instagram Stories Downloader
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TranslatableBlock>
                  <h3 className="font-semibold text-lg">What is an Instagram Stories Downloader?</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Instagram Stories are short photo or video posts that disappear after 24 hours. They are one of the most used features on Instagram, often used to share daily updates, behind-the-scenes moments, polls, or promotions. However, since Stories vanish after a day, many people look for ways to save them. An Instagram Stories Downloader is a tool that allows you to download and keep these Stories permanently on your device.
                  </p>

                  <h3 className="font-semibold text-lg">Why Use an Instagram Stories Downloader?</h3>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                    <li>Save Memories: Keep personal or favorite Stories before they disappear.</li>
                    <li>Offline Access: View Stories later without needing the internet.</li>
                    <li>Content Inspiration: Creators often save Stories for design or marketing ideas.</li>
                    <li>Sharing with Friends: Download Stories you find interesting to share outside Instagram.</li>
                    <li>Business Use: Brands can archive their own Stories for future promotions or reports.</li>
                  </ul>
                </TranslatableBlock>
              </CardContent>
            </Card>
          </motion.div>

          {/* Instagram IGTV Downloader Card */}
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="mb-6 md:mb-8 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileVideo className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  Instagram IGTV Downloader
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TranslatableBlock>
                  <h3 className="font-semibold text-lg">What is Instagram IGTV?</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    IGTV (Instagram TV) was launched by Instagram as a way for users to share long-form videos that go beyond the 60-second limit of regular posts. Creators, influencers, educators, and businesses use IGTV to publish tutorials, interviews, music videos, and other detailed content. Unlike short Reels or Stories, IGTV videos can last several minutes, making them more suitable for in-depth content.
                  </p>

                  <h3 className="font-semibold text-lg">What is an Instagram IGTV Downloader?</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Since Instagram doesn't provide an official option to download IGTV videos, many users turn to an Instagram IGTV Downloader. This tool allows you to save IGTV videos directly to your device in their original quality. Whether you want to watch them offline, study their content, or keep a backup, an IGTV downloader makes it simple.
                  </p>
                </TranslatableBlock>
              </CardContent>
            </Card>
          </motion.div>

          {/* Instagram Photo Downloader Card */}
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="mb-6 md:mb-8 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  Instagram Photo Downloader
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TranslatableBlock>
                  <h3 className="font-semibold text-lg">What is an Instagram Photo Downloader?</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    An Instagram Photo Downloader is an online tool that allows you to save photos from Instagram directly to your device. Normally, Instagram does not give users a direct option to download pictures. You can only like, share, or bookmark them within the app. However, with this tool, you can quickly download any public Instagram photo in its original quality and store it on your phone, tablet, or computer.
                  </p>

                  <h3 className="font-semibold text-lg">Why Use an Instagram Photo Downloader?</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    There are many reasons why people want to download Instagram photos. Maybe you came across a travel picture that inspires you, a food recipe you want to try later, or a motivational quote that you'd like to keep. An Instagram Photo Downloader makes it possible to save these moments permanently, instead of losing them if the post gets deleted or the account goes private.
                  </p>
                </TranslatableBlock>
              </CardContent>
            </Card>
          </motion.div>

          {/* Instagram Carousel Downloader Card */}
          {/* <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="mb-6 md:mb-8 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Grid className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  Instagram Carousel Downloader
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold text-lg">What is an Instagram Carousel Downloader?</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Instagram allows users to upload multiple photos or videos in a single post, also known as a carousel post. While this feature is great for sharing stories, tutorials, or collections, it can be tricky if you want to save all the media files at once. That's where an Instagram Carousel Downloader comes in handy. It helps you download every photo and video from a carousel post in just one click.
                </p>
                
                <h3 className="font-semibold text-lg">Why Use an Instagram Carousel Downloader?</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Sometimes, a carousel post contains valuable content, such as step-by-step tutorials, travel albums, product showcases, or event highlights. Manually saving each picture by screenshotting or recording the screen reduces quality and takes extra time. With a carousel downloader, you can download the entire set in high resolution and keep them safely on your device.
                </p>
              </CardContent>
            </Card>
          </motion.div>
 */}
          {/* Instagram Profile Picture Downloader Card */}
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="mb-6 md:mb-8 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  Instagram Profile Picture Downloader
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TranslatableBlock>
                  <h3 className="font-semibold text-lg">What is an Instagram Profile Picture Downloader?</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Instagram allows users to set profile pictures, but it does not provide an option to view or download them in full size. Normally, you can only see a small circular version of the profile picture, which isn't clear or detailed. The Instagram Profile Picture Downloader solves this problem by letting you view and download profile images in their original, high resolution.
                  </p>

                  <h3 className="font-semibold text-lg">Why Do People Use a Profile Picture Downloader?</h3>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                    <li>Clarity: The default profile picture on Instagram is too small and blurry when zoomed in.</li>
                    <li>Identification: Sometimes you want to confirm if a profile really belongs to a friend, celebrity, or business.</li>
                    <li>Personal Use: You may want to save your own profile picture or that of a loved one.</li>
                    <li>Content Creation: Bloggers or researchers often need full-size profile images for articles, case studies, or social media posts.</li>
                    <li>Business Branding: Companies can use their own Instagram profile picture downloads for marketing and advertising materials.</li>
                  </ul>
                </TranslatableBlock>
              </CardContent>
            </Card>
          </motion.div>

          {/* Instagram Stories Viewer Card */}
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="mb-6 md:mb-8 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  Instagram Stories Viewer (Anonymous Viewer)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TranslatableBlock>
                  <h3 className="font-semibold text-lg">What is an Instagram Stories Viewer?</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Instagram Stories are short photo and video updates that disappear after 24 hours. Normally, when you view someone's story, your username appears in their viewers' list. But with the Instagram Stories Viewer tool, you can watch stories anonymously without leaving a trace. This tool also lets you save or download stories for later viewing.
                  </p>

                  <h3 className="font-semibold text-lg">Why Use an Instagram Stories Viewer?</h3>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                    <li>Privacy: Sometimes you want to view a story without letting the user know.</li>
                    <li>Research & Monitoring: Businesses, marketers, or even parents may want to check stories without exposing their identity.</li>
                    <li>Save Memories: Download and save your favorite stories before they disappear.</li>
                    <li>No Instagram Account Required: Even if you don't have an Instagram account, you can still view stories from public profiles.</li>
                  </ul>
                </TranslatableBlock>
              </CardContent>
            </Card>
          </motion.div>

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
                  Frequently Asked Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    question: "Is the Instagram Video Downloader free to use?",
                    answer: "Yes, TheToolx.com Instagram Downloader is 100% free. You can download unlimited videos without any hidden charges."
                  },
                  {
                    question: "Can I download Instagram videos on my smartphone?",
                    answer: "Yes, the downloader works perfectly on both Android and iOS devices. You can save videos directly to your phone gallery."
                  },
                  {
                    question: "How to download Instagram videos and photos on Android?",
                    answer: "Open Instagram, copy the video or photo link, paste it into TheToolx.com, and tap the download button. The file will be saved to your Android phone."
                  },
                  {
                    question: "Are there any limitations on the number of videos I can download from Instagram?",
                    answer: "No, there are no limits. You can download as many videos, Reels, Stories, and IGTV clips as you want, completely free."
                  },
                  {
                    question: "What is an Instagram Video Downloader?",
                    answer: "An Instagram Video Downloader is a tool that allows you to save videos, Reels, Stories, and IGTV content from Instagram directly to your device. With TheToolx.com, you can download this content quickly without installing any app or logging into Instagram."
                  }
                ].map((faq, index) => (
                  <FAQItem
                    key={index}
                    question={<TranslatableBlock as="span">{faq.question}</TranslatableBlock> as unknown as string}
                    answer={<TranslatableBlock as="span">{faq.answer}</TranslatableBlock> as unknown as string}
                    index={index}
                  />
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <motion.div
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Card className="h-full transform transition-all hover:shadow-lg">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-full">
                      <FileVideo className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                    </div>
                    <h3 className="font-semibold">Videos & Reels</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Download Instagram videos and reels in original quality
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Card className="h-full transform transition-all hover:shadow-lg">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                      <Image className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="font-semibold">Photos & Stories</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Save Instagram photos and stories to your device
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Card className="h-full transform transition-all hover:shadow-lg">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <Music className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold">Original Audio</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Download with original audio and sound effects
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

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

          {/* Rating Card */}
          <motion.div whileHover={{ y: -5 }}>
            <Card className="mb-6 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/70 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800 dark:text-white">
                  <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg shadow">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <span>Rate this tool</span>
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
                      <Label className="text-lg dark:text-gray-300">Your Rating</Label>
                      <div className="mt-3 flex justify-center">
                        <StarRating
                          rating={rating}
                          onRatingChange={setRating}
                          size="lg"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-lg dark:text-gray-300">Comment</Label>
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
          <Alert className="mt-6 md:mt-8 border-pink-500 bg-pink-50 dark:bg-pink-900/20 dark:border-pink-800">
            <AlertCircle className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            <AlertDescription className="text-pink-800 dark:text-pink-200">
              <strong>Important:</strong> Only download content you have permission to use.
              Respect copyright laws and Instagram's terms of service.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </PremiumGuard>
  );
}