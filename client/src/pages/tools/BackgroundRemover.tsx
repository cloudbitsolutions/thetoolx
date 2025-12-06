import { useEffect, useState, useRef } from "react";
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
import { useToolRating } from "@/lib/useToolRating";
import {
  Download,
  Image as ImageIcon,
  Scissors,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Sparkle,
  Wand2,
  Zap,
  Share2,
  Star,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Maximize2,
  Calendar,
  Calculator,
  Heart,
  Gift,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentTool } from "@/hooks/useCurrentTool";
import { useLanguage } from "@/components/LanguageProvider";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import StarRating from "@/components/ui/star-rating";
import PremiumGuard from "@/components/PremiumGuard";
import TranslatableBlock from '@/components/TranslatableBlock';
import UnauthenticatedView from "../auth/UnauthenticatedView";
import { useAuth } from "@/hooks/useAuth";
import removerVideo from "@/assets/remover-video.mp4";

export default function BackgroundRemover() {
  const [file, setFile] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0); // 0 - 100
  const [duration, setDuration] = useState(0); // seconds
  const [isLoading, setIsLoading] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const { toolId, toolSlug, isToolPremium, name, description, isLoginRequired } = useCurrentTool();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();


  const MAX_FILE_SIZE_MB = 15; // 15MB limit
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // If a non-default language is selected, request translated name/description for this tool
  useEffect(() => {
    if (!toolId || !language || language === 'en') return;
    (async () => {
      try {
        const res = await fetch(`/api/translate/tool/${toolId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: language })
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.translated) {
            // replace displayed name/description where appropriate
            // using DOM updates or state — here update document title as example
            document.title = data.translated.name || document.title;
          }
        }
      } catch (err) {
        console.error('Failed to fetch translated tool', err);
      }
    })();
  }, [toolId, language]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file (JPG, PNG, WebP)",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "File Too Large",
        description: `Please select an image smaller than ${MAX_FILE_SIZE_MB}MB`,
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleRemoveBackground = async () => {
    if (!file) {
      toast({
        title: "No Image Selected",
        description: "Please select an image to remove background",
        variant: "destructive",
      });
      return;
    }

    // Double check file size (in case someone bypasses the input)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "File Too Large",
        description: `Please select an image smaller than ${MAX_FILE_SIZE_MB}MB`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

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
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/remove-background/info", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to remove background");
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setProcessedImage(imageUrl);

      toast({
        title: "Background Removed!",
        description: "Your image with transparent background is ready",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Something went wrong while processing your image",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!processedImage) return;

    const a = document.createElement("a");
    a.href = processedImage;
    a.download = "background_removed.png";
    a.click();

    toast({
      title: "Download Started",
      description: "Your processed image is being downloaded...",
    });
  };

  // Enhanced hover effect component
  const HoverCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`relative group hover:-translate-y-1 transition-transform duration-300 ${className}`}>
      <div className="absolute -inset-2 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-300"></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md group-hover:shadow-lg transition-all duration-300 h-full">
        {children}
      </div>
    </div>
  );

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

  // Video player handlers
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const onTimeUpdate = () => {
    if (!videoRef.current || !videoRef.current.duration) return;
    setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
  };

  const onLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current || !videoRef.current.duration) return;
    const pct = Number(e.target.value);
    const time = (pct / 100) * videoRef.current.duration;
    videoRef.current.currentTime = time;
    setProgress(pct);
  };

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, []);

  if (isLoginRequired && !isAuthenticated) return <UnauthenticatedView />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-purple-900/20 py-12 md:py-16 px-4 sm:px-6">
      {/* Floating 3D elements in background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-purple-200/30 dark:bg-purple-800/20 blur-3xl animate-float-slow"></div>
        <div className="absolute top-2/3 right-1/3 w-48 h-48 rounded-full bg-pink-200/30 dark:bg-pink-800/20 blur-3xl animate-float-medium"></div>
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full bg-indigo-200/30 dark:bg-indigo-800/20 blur-3xl animate-float-fast"></div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Hero Section with 3D effect */}
        <div className="text-center mb-12 relative group">
          {/* Floating orb effect */}
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-purple-500/10 rounded-full filter blur-3xl opacity-70 dark:opacity-30 animate-pulse-slow"></div>

          <div className="relative inline-block">
            {/* 3D card effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl opacity-20 dark:opacity-30 blur-xl group-hover:opacity-40 transition-all duration-500"></div>

            {/* Main logo container */}
            <div className="relative bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/30 p-6 rounded-2xl border border-purple-200/80 dark:border-purple-800 shadow-2xl transform transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-lg">
              <div className="relative flex items-center justify-center">
                {/* 3D layered effect */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-purple-100 to-pink-50 dark:from-purple-900/50 dark:to-pink-900/20 rounded-xl rotate-3 opacity-60 shadow-inner"></div>

                {/* Floating scissors with magic effect */}
                <div className="relative z-10">
                  <Scissors className="h-16 w-16 text-purple-600 dark:text-purple-300 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.8} />
                  <div className="absolute -top-3 -right-3">
                    <Wand2 className="h-6 w-6 text-pink-400 opacity-90 animate-spin-slow" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mt-8 mb-4 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500">
              
                {name || "Background Remover"}
              
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            <TranslatableBlock>
              Remove backgrounds from images automatically using AI. Get transparent PNG files instantly.
            </TranslatableBlock>
          </p>
        </div>

        {/* Main Tool Card with 3D effect */}
        <div className="relative group mb-12">
          {/* Floating shadow effect */}
          <div className="absolute -inset-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-3xl opacity-20 dark:opacity-30 blur-xl group-hover:opacity-40 transition-all duration-500"></div>

          <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-2xl shadow-xl transform transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                  <Scissors className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500">
                  <TranslatableBlock>
                    Remove Background
                  </TranslatableBlock>
                </span>
              </CardTitle>
              <CardDescription className="text-lg">
                <TranslatableBlock>
                  Upload your image and let AI work its magic
                </TranslatableBlock>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TranslatableBlock>
                <p className="text-gray-600 dark:text-gray-300">
                  BackgroundRemover allows you to quickly remove the background from images automatically using AI-powered processing. Upload a photo and get a transparent PNG in seconds.
                </p>
              </TranslatableBlock>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1">
                  <Label htmlFor="file" className="block mb-2 font-medium">
                    Select Image
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="file"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                    {file && (
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    )}
                  </div>
                  {file && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>

              {/* Preview section */}
              {preview && (
                <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-md">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/10 opacity-80"></div>
                  <div className="relative p-4">
                    <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">
                      Preview:
                    </h3>
                    <div className="flex justify-center">
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-w-full h-auto max-h-80 mx-auto rounded-lg shadow-lg border-4 border-white dark:border-gray-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Process button with 3D effect */}
              <Button
                onClick={handleRemoveBackground}
                disabled={isLoading || !file}
                className="w-full relative overflow-hidden group"
                size="lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute inset-0.5 bg-white/10 rounded-md blur-sm group-hover:blur-md transition-all duration-300"></div>
                <span className="relative z-10 flex items-center justify-center">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing with AI...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      <TranslatableBlock>
                        Remove Background Instantly
                      </TranslatableBlock>
                    </>
                  )}
                </span>
              </Button>

              {/* Result section */}
              {processedImage && (
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-purple-50 dark:from-green-900/20 dark:to-purple-900/20 border border-green-200 dark:border-green-800/50 shadow-lg">
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                      <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                        Background removal complete!
                      </h3>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-1 flex justify-center">
                        <img
                          src={processedImage}
                          alt="Processed result"
                          className="max-w-full h-auto max-h-64 rounded-lg shadow-md border-4 border-white dark:border-gray-800"
                        />
                      </div>
                      <div className="flex-1">
                        <Button
                          onClick={handleDownload}
                          variant="default"
                          size="lg"
                          className="w-full md:w-auto"
                        >
                          <Download className="h-5 w-5 mr-2" />
                          Download PNG
                        </Button>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                          Right-click and "Save image as" for best results
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <HoverCard>
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg shadow-sm group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors">
                  <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  <TranslatableBlock>
                    AI-Powered
                  </TranslatableBlock>
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mt-auto">
                <TranslatableBlock>
                  Advanced AI technology for precise background removal
                </TranslatableBlock>
              </p>
            </CardContent>
          </HoverCard>

          <HoverCard>
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg shadow-sm group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors">
                  <ImageIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  <TranslatableBlock>
                    High Quality
                  </TranslatableBlock>
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mt-auto">
                <TranslatableBlock>
                  Maintain image quality with clean, sharp edges
                </TranslatableBlock>
              </p>
            </CardContent>
          </HoverCard>

          <HoverCard>
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg shadow-sm group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                  <Download className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  <TranslatableBlock>
                    PNG Output
                  </TranslatableBlock>
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mt-auto">
                <TranslatableBlock>
                  Get transparent PNG files ready for any use
                </TranslatableBlock>
              </p>
            </CardContent>
          </HoverCard>
        </div>

        {/* Short demo video for Background Remover */}
        <motion.div whileHover={{ y: -4 }} className="mb-12">
          <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <TranslatableBlock>
                  Background Remover - Quick Demo
                </TranslatableBlock>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="w-full md:w-2/3">
                  <div className="relative rounded-lg overflow-hidden bg-black">
                    <video
                      ref={videoRef}
                      src={removerVideo}
                      className="w-full h-auto max-h-80 bg-black"
                      onTimeUpdate={onTimeUpdate}
                      onLoadedMetadata={onLoadedMetadata}
                      muted={isMuted}
                      playsInline
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-end justify-center p-3 pointer-events-none">
                      <div className="w-full pointer-events-auto bg-black/40 rounded-md p-2 flex items-center gap-3">
                        <button
                          onClick={togglePlay}
                          className="p-2 rounded-md bg-white/10 hover:bg-white/20 text-white"
                          aria-label={isPlaying ? "Pause" : "Play"}
                        >
                          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={progress}
                          onChange={handleSeek}
                          className="flex-1 accent-purple-500"
                          aria-label="Seek"
                        />
                        <div className="flex items-center gap-2 text-sm text-white">
                          <button onClick={toggleMute} className="p-2 rounded-md bg-white/10 hover:bg-white/20">
                            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          </button>
                          <span className="min-w-[64px] tabular-nums">
                            {new Date((progress / 100) * duration * 1000).toISOString().substr(14, 5)} /{" "}
                            {new Date(duration * 1000).toISOString().substr(14, 5)}
                          </span>
                          <button
                            onClick={() => {
                              if (!videoRef.current) return;
                              if (document.fullscreenElement) {
                                document.exitFullscreen();
                                return;
                              }
                              videoRef.current.requestFullscreen?.();
                            }}
                            className="p-2 rounded-md bg-white/10 hover:bg-white/20"
                            aria-label="Fullscreen"
                          >
                            <Maximize2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-1/3">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <TranslatableBlock>
                      Watch a short demo showing how the Background Remover detects subjects and produces transparent PNGs. Use the controls to play/pause, seek, mute, or view fullscreen.
                    </TranslatableBlock>
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" onClick={togglePlay}>
                      {isPlaying ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" /> Play
                        </>
                      )}
                    </Button>
                    {/* <Button size="sm" variant="outline" onClick={toggleMute}>
                      {isMuted ? (
                        <>
                          <VolumeX className="h-4 w-4 mr-2" /> Unmute
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-4 w-4 mr-2" /> Mute
                        </>
                      )}
                    </Button> */}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* New Content Section */}
        <div className="space-y-8">
          <motion.div whileHover={{ y: -5 }}>
            <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500">
                    <TranslatableBlock>
                      About TheToolx Background Remover
                    </TranslatableBlock>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-gray-700 dark:text-gray-300">
                <p>
                  <TranslatableBlock>
                    Removing backgrounds from images has never been easier. TheToolx Background Remover automatically
                    erases backgrounds in seconds, giving you a clean and professional result without any manual editing.
                    Powered by advanced AI technology, TheToolx allows you to remove backgrounds from HEIC, PNG, or JPG
                    images instantly. Whether you're a professional photographer or just getting started, TheToolx delivers
                    top-quality cutouts every time, even in HD.
                  </TranslatableBlock>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Effortless Background Removal */}
          <motion.div whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}>
            <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500">
                    <TranslatableBlock>
                      Effortless Background Removal for Any Image
                    </TranslatableBlock>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-gray-700 dark:text-gray-300">
                <p>
                  <TranslatableBlock>
                    With TheToolx, you can remove the background from product images, portraits, or any photo in just a few clicks.
                    Simply upload your image, and the AI detects the subject to automatically separate it from the background.
                    It handles even intricate details, such as hair, jewelry, thin frames, or accessories, with precision.
                    Once the background is removed, you can repurpose your images for product listings, social media posts,
                    catalogs, ads, or landing pages. TheToolx works directly from any browser, making it accessible on both
                    desktop and mobile devices.
                  </TranslatableBlock>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Change or Add Backgrounds */}
          <motion.div whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}>
            <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-gradient-to-r from-pink-500 to-yellow-500 rounded-lg shadow">
                    <Calculator className="h-6 w-6 text-white" />
                  </div>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-yellow-500">
                    <TranslatableBlock>
                      Change or Add Backgrounds in Seconds
                    </TranslatableBlock>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-gray-700 dark:text-gray-300">
                <p>
                  <TranslatableBlock>
                    After removing the background, you can leave it transparent, change it to white, or select from thousands
                    of curated backgrounds. Want something specific, like a marble tabletop or a scenic outdoor backdrop?
                    Simply search for it, and TheToolx provides hundreds of AI-generated options in seconds. The process is simple:
                  </TranslatableBlock>
                </p>
                <ol className="list-decimal list-inside space-y-2 pl-4 mt-2">
                  <TranslatableBlock>
                    <li>Upload your image.</li>
                    <li>Remove the background automatically.</li>
                    <li>Replace it with a new color, image, or keep it transparent.</li>
                  </TranslatableBlock>
                </ol>
                <p className="mt-3">
                  <TranslatableBlock>
                    It's that easy to create professional-looking visuals in just a few steps.
                  </TranslatableBlock>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Batch Background Removal */}
          <motion.div whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}>
            <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg shadow">
                    <Heart className="h-6 w-6 text-white" />
                  </div>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-green-500">
                    <TranslatableBlock>
                      Batch Background Removal for Efficiency
                    </TranslatableBlock>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-gray-700 dark:text-gray-300">
                <p>
                  <TranslatableBlock>
                    For users working with multiple images, TheToolx offers a batch background removal tool. Upload several
                    images at once, and the AI removes backgrounds simultaneously, saving you time and effort. This feature
                    is ideal for e-commerce businesses, photographers, or graphic designers handling large volumes of images.
                    Once processed, these images are ready for product listings, marketing campaigns, or creative projects
                    without additional editing.
                  </TranslatableBlock>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Background Generator */}
          <motion.div whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}>
            <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg shadow">
                    <Gift className="h-6 w-6 text-white" />
                  </div>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-500">
                    <TranslatableBlock>
                      AI Background Generator – Create Stunning Scenes
                    </TranslatableBlock>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-gray-700 dark:text-gray-300">
                <p>
                  <TranslatableBlock>
                    TheToolx goes beyond background removal. With our AI Background Generator, you can place your subject
                    in a completely new environment. Choose from photorealistic backgrounds or create imaginative settings,
                    whether for professional product photography or personal projects. You can even place people in iconic
                    locations, like in front of the Eiffel Tower or on a mountain peak, all without visiting the location physically.
                  </TranslatableBlock>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Design with Templates */}
          <motion.div whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}>
            <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-gradient-to-r from-yellow-500 to-red-500 rounded-lg shadow">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-600 to-red-500">
                    <TranslatableBlock>
                      Design with Templates and Creative Tools
                    </TranslatableBlock>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-gray-700 dark:text-gray-300">
                <p>
                  <TranslatableBlock>
                    After removing backgrounds, TheToolx allows you to design eye-catching graphics with ready-to-use templates.
                    Access hundreds of backgrounds, stickers, fonts, and other elements to enhance your images. Whether you want
                    to create social media posts, advertisements, or collages, TheToolx provides the tools you need without
                    complicated software.
                  </TranslatableBlock>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Transparent Cutouts */}
          <motion.div whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}>
            <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-gradient-to-r from-teal-500 to-indigo-500 rounded-lg shadow">
                    <Share2 className="h-6 w-6 text-white" />
                  </div>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-indigo-500">
                    <TranslatableBlock>
                      Transparent Cutouts for Maximum Flexibility
                    </TranslatableBlock>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-gray-700 dark:text-gray-300">
                <p>
                  <TranslatableBlock>
                    Once the background is removed, your subject can be placed on any new background or used as a transparent PNG.
                    This flexibility allows you to repurpose images for different projects, from marketing materials to digital designs.
                  </TranslatableBlock>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Final Section */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800/50">
            <p className="text-center font-semibold text-purple-700 dark:text-purple-300">
              ✅<TranslatableBlock> TheToolx Background Remover makes professional image editing simple, fast, and accessible.
                From single images to batch editing, AI-generated backgrounds, and design templates, TheToolx
                is your all-in-one tool to create standout visuals quickly and efficiently.
              </TranslatableBlock>
            </p>
          </div>
        </div>


        {/* Use Cases Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <HoverCard className="h-full">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <TranslatableBlock>
                  Professional Use
                </TranslatableBlock>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {[
                  "Product photography for e-commerce",
                  "Profile pictures and headshots",
                  "Marketing materials and presentations",
                  "Real estate and architectural photos"
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="mt-1.5 flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-purple-500 group-hover:bg-pink-500 transition-colors"></div>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      <TranslatableBlock>
                        {item}
                      </TranslatableBlock>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </HoverCard>

          <HoverCard className="h-full">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg group-hover:bg-pink-200 dark:group-hover:bg-pink-800/50 transition-colors">
                  <Wand2 className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                </div>
                <TranslatableBlock>
                  Creative Projects
                </TranslatableBlock>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {[
                  "Social media graphics and posts",
                  "Digital art and design projects",
                  "Photo editing and compositing",
                  "Memes and fun content creation"
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="mt-1.5 flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-pink-500 group-hover:bg-purple-500 transition-colors"></div>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      <TranslatableBlock>
                        {item}
                      </TranslatableBlock>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </HoverCard>
        </div>

        {/* Instructions Section */}
        {/* <div className="relative group mb-12">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl opacity-20 blur-sm group-hover:opacity-30 transition duration-500"></div>
          <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-xl shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <Wand2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {[
                  "Upload your image (JPG, PNG, or WebP)",
                  "Preview the image to ensure it's correct",
                  "Click 'Remove Background' to start AI processing",
                  "Wait a few seconds for the magic to happen",
                  "Download your transparent PNG instantly",
                  "Use it anywhere - no watermarks, no limits"
                ].map((step, index) => (
                  <li key={index} className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold">
                        {index + 1}
                      </div>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div> */}

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

        {/* File Support Info */}
        <Alert className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-xl shadow-md">
          <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <AlertDescription className="text-gray-700 dark:text-gray-300">
            <TranslatableBlock>
              <strong className="text-purple-600 dark:text-purple-400">Supported formats:</strong> JPG, PNG, WebP up to 15MB.
              For best results, use images with clear subjects and good contrast with the background.
            </TranslatableBlock>
          </AlertDescription>
        </Alert>
      </div>

      {/* Add these animations to your global CSS */}
      <style>{`
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-20px); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .animate-float-slow { animation: float 8s ease-in-out infinite; }
    .animate-float-medium { animation: float 6s ease-in-out infinite; }
    .animate-float-fast { animation: float 4s ease-in-out infinite; }
    .animate-pulse-slow { animation: pulse 3s ease-in-out infinite; }
    .animate-spin-slow { animation: spin 8s linear infinite; }
  `}</style>
    </div>);
}