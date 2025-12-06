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
  Music,
  FileVideo,
  Zap,
  AlertCircle,
  CheckCircle2,
  Play,
  X,
  Star,
  Image,
  Share2,
  Info,
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
import ReusableSlider from "../SliderProps";
import { useToolRating } from "@/lib/useToolRating";
import TranslatableBlock from "@/components/TranslatableBlock";

interface FAQItemProps {
  question: string;
  answer: string;
  index: number;
}

export default function TiktokDownloader() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeSection, setActiveSection] = useState<"video" | "stories" | "photos">("video");
  const [mediaTypeDetected, setMediaTypeDetected] = useState<"video" | "image" | null>(null);
  const { toast } = useToast();
  const { toolId, toolSlug, isToolPremium, name, description, isLoginRequired, isActive, isLoading: isToolLoading } = useCurrentTool();
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

  const { user, isAuthenticated } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string>("video.mp4");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

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

  const isSSR = typeof window === 'undefined';
  if (!isSSR && isToolLoading) {
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
    setVideoPreviewUrl(null);

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

      // Create preview URL
      const previewUrl = URL.createObjectURL(blob);
      setVideoPreviewUrl(previewUrl);
      if (contentType.includes('video')) setMediaTypeDetected('video');
      else if (contentType.includes('image')) setMediaTypeDetected('image');

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
      <div className="h-full bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-8 md:py-16">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <div className="flex justify-center mb-4 md:mb-6">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-200 animate-pulse"></div>
                <div className="relative bg-white p-4 rounded-full flex items-center justify-center shadow-md">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-12 w-12 text-pink-500 transform group-hover:scale-110 transition-transform duration-300"
                  >
                    <path d="M21 8V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    <polygon points="18 6 12 12 6 6"></polygon>
                  </svg>
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

          {/* Main Tool */}
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="mb-6 md:mb-8 bg-white shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800">
                  <FileVideo className="h-5 w-5 text-pink-600" />
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
                        className={`px-3 py-1 rounded-md font-medium text-sm ${activeSection === 'video' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-pink-50'}`}
                        onClick={() => setActiveSection('video')}
                      >
                        Video
                      </button>
                      <button
                        className={`px-3 py-1 rounded-md font-medium text-sm ${activeSection === 'stories' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-pink-50'}`}
                        onClick={() => setActiveSection('stories')}
                      >
                        Stories
                      </button>
                      <button
                        className={`px-3 py-1 rounded-md font-medium text-sm ${activeSection === 'photos' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-pink-50'}`}
                        onClick={() => setActiveSection('photos')}
                      >
                        Photos
                      </button>
                    </div>

                    <div className="mt-2 sm:mt-0">
                      <Label htmlFor="url" className="text-gray-700">TikTok URL</Label>
                    </div>
                  </div>
                  <Input
                    id="url"
                    type="url"
                    placeholder={
                      activeSection === "stories"
                        ? "https://www.tiktok.com/stories/@username/1234567890"
                        : "https://www.tiktok.com/@username/video/1234567890"
                    }
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="mt-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>

                <Button
                  onClick={handleDownload}
                  disabled={isLoading || !url}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-lg transform hover:scale-[1.02] transition-all text-white"
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
                        Your TikTok content is ready!
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

                      {downloadFilename.endsWith('.mp4') && (
                        <Button
                          onClick={togglePreview}
                          variant="outline"
                          className="w-full sm:w-auto border-pink-500 text-pink-600 hover:bg-pink-50"
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
                          className="w-full sm:w-auto border-pink-500 text-pink-600 hover:bg-pink-50"
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
          </motion.div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <Card className="border-0 bg-white hover:bg-pink-50 transition-all transform hover:-translate-y-1 shadow-md">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-full bg-pink-100 text-pink-600">
                    <Zap className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-gray-800"><TranslatableBlock>No Watermark</TranslatableBlock></h3>
                </div>
                <p className="text-sm text-gray-600">
                  <TranslatableBlock>Download TikTok videos without the annoying watermark</TranslatableBlock>
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white hover:bg-blue-50 transition-all transform hover:-translate-y-1 shadow-md">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                    <FileVideo className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-gray-800"><TranslatableBlock>HD Quality</TranslatableBlock></h3>
                </div>
                <p className="text-sm text-gray-600">
                  <TranslatableBlock>Get videos in original HD quality without compression</TranslatableBlock>
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white hover:bg-purple-50 transition-all transform hover:-translate-y-1 shadow-md">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                    <Music className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-gray-800"><TranslatableBlock>Audio Extract</TranslatableBlock></h3>
                </div>
                <p className="text-sm text-gray-600">
                  <TranslatableBlock>Extract and download audio as high-quality MP3 files</TranslatableBlock>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* New Content Section */}
          <motion.div whileHover={{ y: -5 }}>
            <Card className="mb-6 border-0 bg-white shadow-md transform transition-all hover:scale-[1.005]">
              <CardHeader>
                <CardTitle className="text-gray-800 flex items-center gap-2">
                  <div className="p-2 rounded-full bg-pink-100 text-pink-600">
                    <Info className="h-5 w-5" />
                  </div>
                  <TranslatableBlock>About TikTok Video Downloader</TranslatableBlock>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-700">
                <p>
                  <TranslatableBlock>
                    TikTok has quickly grown into one of the most popular platforms for short-form videos,
                    trending challenges, dance routines, educational content, and viral clips. With millions
                    of videos uploaded every day, it's easy to find content that entertains, informs, or inspires you.
                    However, TikTok is primarily an online platform, and you may not always have an internet
                    connection to watch your favorite videos. This is where a TikTok Video Downloader becomes extremely useful.
                  </TranslatableBlock>
                </p>
                <p>
                  <TranslatableBlock>
                    A TikTok Video Downloader is a tool that allows you to save TikTok videos directly to your device.
                    It preserves the video quality and ensures you can watch, share, or reuse the content offline.
                    Unlike screen recording, which can reduce quality and take extra effort, a downloader provides
                    a clean, high-resolution file in just a few clicks.
                  </TranslatableBlock>
                </p>

                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                    <TranslatableBlock>How a TikTok Video Downloader Works</TranslatableBlock>
                  </h3>
                  <p className="mb-3">
                    <TranslatableBlock>
                      A TikTok Video Downloader works by extracting the video directly from TikTok's servers.
                      It does not require you to log in to TikTok or install any complicated software. The process is simple:
                    </TranslatableBlock>
                  </p>
                  <ol className="list-decimal list-inside space-y-2 marker:text-pink-500 pl-4">
                    <li className="pl-2">
                      <TranslatableBlock>
                        <span className="font-medium">Copy the Video Link</span> – Open the TikTok app or website and find the video you want to download.
                        Click the "Share" button and select "Copy Link."
                      </TranslatableBlock>
                    </li>
                    <li className="pl-2">
                      <TranslatableBlock>
                        <span className="font-medium">Paste the Link in the Downloader</span> – Go to a trusted TikTok Video Downloader tool,
                        such as TheToolx TikTok Video Downloader, and paste the copied link.
                      </TranslatableBlock>
                    </li>
                    <li className="pl-2">
                      <TranslatableBlock>
                        <span className="font-medium">Select Format and Quality</span> – Many downloaders allow you to choose MP4 for video or MP3 for audio,
                        as well as select HD or standard resolution.
                      </TranslatableBlock>
                    </li>
                    <li className="pl-2">
                      <TranslatableBlock>
                        <span className="font-medium">Download</span> – Click the "Download" button. The video is processed and saved to your device in seconds,
                        ready for offline use or sharing.
                      </TranslatableBlock>
                    </li>
                  </ol>
                  <p className="mt-3">
                    <TranslatableBlock>
                      This seamless workflow works on desktop computers, laptops, smartphones, and tablets, making it accessible to everyone.
                    </TranslatableBlock>
                  </p>
                </div>

                {/* <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Benefits of Using a TikTok Video Downloader
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-800">1. Watch Offline Anytime</h4>
                      <p>
                        
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800"></h4>
                      <p>
                        
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">3. Remove Watermarks</h4>
                      <p>
                        Many TikTok videos have a watermark with the TikTok logo and username. Certain downloaders allow you to save videos
                        without the watermark, making them look clean and professional for personal use or creative projects.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">4. Easy Sharing</h4>
                      <p>
                        Downloaded videos can be shared across social media platforms, messaging apps, or via email. You can also use them
                        in presentations, video edits, or compilations without restrictions.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">5. Save Time</h4>
                      <p>
                        Manual downloads or screen recordings can be tedious. TikTok downloaders automate the process, enabling you to
                        download videos instantly with minimal effort.
                      </p>
                    </div>
                  </div>
                </div> */}

                <ReusableSlider
                  heading="Benefits of Using a TikTok Video Downloader"
                  colorDot="bg-pink-500"
                  items={[
                    { title: "1. Watch Offline Anytime", description: "Downloading videos allows you to enjoy your favorite content without relying on an internet connection. Whether you're traveling, commuting, or in an area with limited coverage, your videos are always available." },
                    { title: "2. Preserve High Quality", description: "Screen recording apps often compress videos, reducing quality. A good TikTok downloader preserves the original video quality, so you get crisp visuals and clear audio." },
                    { title: "3. Remove Watermarks", description: "Many TikTok videos have a watermark with the TikTok logo and username. Certain downloaders allow you to save videos without the watermark, making them look clean and professional for personal use or creative projects." },
                    { title: "4. Easy Sharing", description: "Downloaded videos can be shared across social media platforms, messaging apps, or via email. You can also use them in presentations, video edits, or compilations without restrictions." },
                    { title: "5. Save Time", description: "Manual downloads or screen recordings can be tedious. TikTok downloaders automate the process, enabling you to download videos instantly with minimal effort." },
                  ]}
                  //slideStyle={{ width: "60%", height: "200px" }}
                  slideStyle="w-12/12 sm:w-3/4 md:w-1/2 h-84 md:h-62"
                />

                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <TranslatableBlock>
                      Advanced Features of Modern TikTok Video Downloaders
                    </TranslatableBlock>
                  </h3>
                  <p>
                    <TranslatableBlock>
                      Modern TikTok Video Downloaders offer more than just basic downloads:
                    </TranslatableBlock>
                  </p>
                  <ul className="list-disc list-inside space-y-2 pl-4 mt-2">
                    <li>
                      <TranslatableBlock>
                        <span className="font-medium">Batch Downloading</span> – Download multiple videos simultaneously, ideal for content creators, marketers, or collectors.
                      </TranslatableBlock>
                    </li>
                    <li>
                      <TranslatableBlock>
                        <span className="font-medium">Audio Extraction</span> – Convert TikTok videos to MP3 format to save music, speeches, or sound effects separately.
                      </TranslatableBlock>
                    </li>
                    <li>
                      <TranslatableBlock>
                        <span className="font-medium">Cross-Device Support</span> – Works on Android, iOS, Windows, macOS, and even Chromebooks.
                      </TranslatableBlock>
                    </li>
                    <li>
                      <TranslatableBlock>
                        <span className="font-medium">Browser-Based Convenience</span> – Most downloaders work directly in your web browser, eliminating the need for apps or plugins.
                      </TranslatableBlock>
                    </li>
                  </ul>
                  <p className="mt-3">
                    <TranslatableBlock>
                      These features make downloaders versatile tools for anyone who wants to manage TikTok content efficiently.
                    </TranslatableBlock>
                  </p>
                </div>

                {/* FAQ Card */}
                <motion.div
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700/80">
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
                          q: "Can I download TikTok videos for free?",
                          a: "Yes, many TikTok downloaders offer free downloads. Premium features like batch downloads or watermark removal may require a subscription in some tools."
                        },
                        {
                          q: "Do I need to install an app to download TikTok videos?",
                          a: "No. Many online downloaders are browser-based and work on any device without additional software."
                        },
                        {
                          q: "Can I download videos without a watermark?",
                          a: "Yes, some tools provide an option to remove the TikTok watermark for a cleaner file, especially useful for editing or presentations."
                        },
                        {
                          q: "Is it safe to download TikTok videos?",
                          a: "Yes, as long as you use trusted downloaders. Avoid suspicious websites to protect your device and personal information."
                        },
                        {
                          q: "Can I convert TikTok videos to MP3?",
                          a: "Yes, most TikTok downloaders allow you to extract audio from videos, saving it in MP3 format for music or voice clips."
                        },
                        {
                          q: "Can I download multiple TikTok videos at once?",
                          a: "Yes, advanced tools offer batch downloading to save time and effort, ideal for content creators and marketers."
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

                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <TranslatableBlock>
                      Tips for a Better TikTok Downloading Experience
                    </TranslatableBlock>
                  </h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <TranslatableBlock>
                      <li>Check Video Privacy – Only download videos that are publicly available. Private videos may not be accessible.</li>
                      <li>Keep Your Downloads Organized – Create folders for different categories like music, tutorials, or funny clips.</li>
                      <li>Verify Video Quality – Choose HD options when available for the best viewing experience.</li>
                      <li>Avoid Malicious Sites – Stick to reputable downloaders like TheToolx TikTok Video Downloader to ensure safety.</li>
                    </TranslatableBlock>
                  </ul>
                </div>

                <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
                  <p className="text-center font-semibold text-pink-700">
                    <TranslatableBlock>
                      ✅ TheToolx TikTok Video Downloader makes saving videos simple, fast, and reliable.
                      Whether for entertainment, educational use, or social media sharing, it provides a
                      seamless solution to enjoy TikTok content anytime, anywhere.
                    </TranslatableBlock>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Instructions */}
          {/* <Card className="border-0 bg-white shadow-md mb-6 transform transition-all hover:scale-[1.005]">
            <CardHeader>
              <CardTitle className="text-gray-800">
                How to Download TikTok Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 marker:text-pink-500 pl-4">
                <li className="hover:text-gray-900 transition-colors pl-2">
                  Open TikTok and find the video you want to download
                </li>
                <li className="hover:text-gray-900 transition-colors pl-2">
                  Tap the "Share" button (arrow pointing right)
                </li>
                <li className="hover:text-gray-900 transition-colors pl-2">
                  Select "Copy Link" from the share menu
                </li>
                <li className="hover:text-gray-900 transition-colors pl-2">
                  Paste the URL into the input field above
                </li>
                <li className="hover:text-gray-900 transition-colors pl-2">
                  Click "Download TikTok" and wait for processing
                </li>
                <li className="hover:text-gray-900 transition-colors pl-2">
                  Preview and download your file when ready
                </li>
              </ol>
            </CardContent>
          </Card> */}

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
          <Alert className="border-pink-200 bg-pink-50">
            <AlertCircle className="h-4 w-4 text-pink-500" />
            <AlertDescription className="text-pink-700">
              <TranslatableBlock>
                <strong className="font-semibold">Important:</strong> Only download
                content that you have permission to use. Respect copyright laws and
                TikTok's terms of service. Give credit to original creators.
              </TranslatableBlock>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </PremiumGuard>
  );
}