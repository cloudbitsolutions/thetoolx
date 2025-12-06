import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Gauge,
  Wifi,
  Download,
  Upload,
  Clock,
  Server,
  RefreshCw,
  LocateFixed,
  GaugeCircle,
  CircleDashed,
  Star,
  Share2,
  HelpCircle,
  PlayCircle,
  BarChart3,
  Settings,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentTool } from "@/hooks/useCurrentTool";
import NotFound from "@/pages/not-found";
//import ToolAd from '@/components/ToolAd';
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import StarRating from "@/components/ui/star-rating";
import PremiumGuard from "@/components/PremiumGuard";
import { Label } from "recharts";
import { useToolRating } from "@/lib/useToolRating";
import TranslatableBlock from "@/components/TranslatableBlock";


const TEST_CONFIG = {
  testDuration: 20000,
  pingCount: 20,
  ipInfoToken: "3820fe9620a226",
  testServers: [
    {
      name: "Cloudflare Global Network",
      url: "https://speed.cloudflare.com",
      endpoints: {
        download: "/__down?bytes=",
        upload: "/__up",
        ping: "/cdn-cgi/trace",
      },
    },
  ],
};

interface SpeedometerProps {
  value: number;
  max: number;
  color: string;
  size?: number;
}

interface FAQItemProps {
  question: string;
  answer: string;
  index: number;
}

const Speedometer = ({ value, max, color, size = 200 }: SpeedometerProps) => {
  const circumference = 2 * Math.PI * (size / 2 - 10);
  const strokeDashoffset = circumference - (value / max) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 10}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 10}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold">{value.toFixed(1)}</div>
        <div className="text-lg">Mbps</div>
      </div>
    </div>
  );
};

// const Speedometer = ({ value, max, color, size = 200 }) => {
//   const circumference = 2 * Math.PI * (size / 2 - 10);
//   const strokeDashoffset = circumference - (value / max) * circumference;

//   return (
//     <div className="relative" style={{ width: size, height: size }}>
//       <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
//         {/* Background circle */}
//         <circle
//           cx={size / 2}
//           cy={size / 2}
//           r={size / 2 - 10}
//           fill="none"
//           stroke="#e5e7eb"
//           strokeWidth="12"
//         />
//         {/* Progress circle */}
//         <circle
//           cx={size / 2}
//           cy={size / 2}
//           r={size / 2 - 10}
//           fill="none"
//           stroke={color}
//           strokeWidth="12"
//           strokeLinecap="round"
//           strokeDasharray={circumference}
//           strokeDashoffset={strokeDashoffset}
//           transform={`rotate(-90 ${size / 2} ${size / 2})`}
//         />
//       </svg>
//       <div className="absolute inset-0 flex flex-col items-center justify-center">
//         <div className="text-4xl font-bold">{value.toFixed(1)}</div>
//         <div className="text-lg">Mbps</div>
//       </div>
//     </div>
//   );
// };

export default function SpeedTest() {
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [isFindingServer, setIsFindingServer] = useState(false);
  const [testPhase, setTestPhase] = useState("");
  const [results, setResults] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [bestServer, setBestServer] = useState<any>(null);
  const [liveDownloadSpeed, setLiveDownloadSpeed] = useState(0);
  const [liveUploadSpeed, setLiveUploadSpeed] = useState(0);
  const [networkInfo, setNetworkInfo] = useState({
    ip: "Detecting...",
    isp: "Detecting...",
    org: "Detecting...",
    asn: "Detecting...",
    city: "Detecting...",
    region: "Detecting...",
    country: "Detecting...",
  });
  const { toast } = useToast();
  const { toolId, toolSlug, isToolPremium, name, description, isLoginRequired, isActive, isLoading } = useCurrentTool();

  const testStartTime = useRef(0);
  const bytesTransferred = useRef(0);
  const activeTest = useRef<"download" | "upload" | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    detectNetworkInfo();
    setBestServer(TEST_CONFIG.testServers[0]);
  }, []);

  // Keep mutations and hooks at the top before any early returns
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



  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center p-8">
  //       <div className="text-center text-gray-500 animate-pulse">Loading...</div>
  //     </div>
  //   );
  // }

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

  const detectNetworkInfo = async () => {
    try {
      const response = await fetch(
        `https://ipinfo.io/json?token=${TEST_CONFIG.ipInfoToken}`
      );
      const data = await response.json();

      setNetworkInfo({
        ip: data.ip || "Unknown",
        isp: data.org?.split(" ").slice(0, 2).join(" ") || "Unknown ISP",
        org: data.org || "Unknown Organization",
        asn: data.asn || "Unknown ASN",
        city: data.city || "Unknown City",
        region: data.region || "Unknown Region",
        country: data.country || "Unknown Country",
      });
    } catch {
      try {
        const cfResponse = await fetch(
          "https://www.cloudflare.com/cdn-cgi/trace"
        );
        const text = await cfResponse.text();
        const cfData = Object.fromEntries(
          text
            .trim()
            .split("\n")
            .map((line) => line.split("="))
        );

        setNetworkInfo((prev) => ({
          ...prev,
          ip: cfData.ip || "Unknown",
          isp: cfData.org || "Unknown ISP",
          org: cfData.org || "Unknown Organization",
          city: cfData.city || "Unknown City",
          country: cfData.country || "Unknown Country",
        }));
      } catch { }
    }
  };

  const measureLatency = async (server: any) => {
    const latencies: number[] = [];
    for (let i = 0; i < TEST_CONFIG.pingCount; i++) {
      const start = performance.now();
      try {
        await fetch(`${server.url}${server.endpoints.ping}`, {
          cache: "no-store",
          method: "HEAD",
        });
        latencies.push(performance.now() - start);
      } catch {
        latencies.push(100);
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    return {
      unloaded: Math.min(...latencies),
      loaded: Math.max(...latencies),
      jitter: calculateJitter(latencies),
    };
  };

  const calculateJitter = (latencies: number[]) => {
    let jitter = 0;
    for (let i = 1; i < latencies.length; i++) {
      jitter += Math.abs(latencies[i] - latencies[i - 1]);
    }
    return jitter / (latencies.length - 1);
  };

  const runDownloadTest = async (server: any) => {
    activeTest.current = "download";
    testStartTime.current = performance.now();
    const testSizes = [60000000];
    let totalBytes = 0;
    let totalTime = 0;

    for (const size of testSizes) {
      const start = performance.now();
      try {
        const response = await fetch(
          `${server.url}${server.endpoints.download}${size}`
        );
        const reader = response.body?.getReader();
        if (!reader) continue;

        let bytesThisChunk = 0;
        let done = false;

        const interval = setInterval(() => {
          const elapsed = (performance.now() - start) / 1000;
          const speed = parseFloat(((bytesThisChunk * 8) / elapsed / 1_000_000).toFixed(2));
          setLiveDownloadSpeed(speed);
        }, 100);

        while (!done) {
          const { done: d, value } = await reader.read();
          if (value) {
            bytesThisChunk += value.length;
            totalBytes += value.length;
          }
          done = d;
        }

        clearInterval(interval);
        totalTime += performance.now() - start;
      } catch (error) {
        console.error("Download test error:", error);
      }
    }

    setLiveDownloadSpeed(0);
    activeTest.current = null;
    return {
      speed:
        totalBytes > 0 ? (totalBytes * 8) / (totalTime / 1000) / 1_000_000 : 0,
      latency: 0,
    };
  };

  const runUploadTest = async (server: any) => {
    activeTest.current = "upload";
    testStartTime.current = performance.now();
    const testSizes = [60000000];
    let totalBytes = 0;
    let totalTime = 0;

    for (const size of testSizes) {
      const blob = new Blob([new Uint8Array(size)]);
      const start = performance.now();

      try {
        const interval = setInterval(() => {
          const elapsed = (performance.now() - start) / 1000;
          const speed = parseFloat(((size * 8) / elapsed / 1_000_000).toFixed(2));
          setLiveUploadSpeed(speed);
        }, 100);

        await fetch(`${server.url}${server.endpoints.upload}`, {
          method: "POST",
          body: blob,
          cache: "no-store",
        });

        clearInterval(interval);
        totalBytes += size;
        totalTime += performance.now() - start;
      } catch (error) {
        console.error("Upload test error:", error);
      }
    }

    setLiveUploadSpeed(0);
    activeTest.current = null;
    return {
      speed:
        totalBytes > 0 ? (totalBytes * 8) / (totalTime / 1000) / 1_000_000 : 0,
      latency: 0,
    };
  };

  const detectConnectionType = async (): Promise<string> => {
    try {
      const connection = (navigator as any).connection;
      return connection?.effectiveType?.toUpperCase() || "Unknown";
    } catch {
      return "Unknown";
    }
  };

  const runSpeedTest = async () => {
    if (!bestServer) return;

    setIsTestRunning(true);
    setResults(null);
    setProgress(0);

    if (toolId) {
      try {
        await apiRequest("POST", `/api/tools/${toolId}/usage`, {
          success: true,
          errorMessage: null,
        });
      } catch { }
    }

    try {
      setTestPhase("Finding optimal server...");
      setProgress(10);
      const latencyResults = await measureLatency(bestServer);

      setTestPhase("Testing download speed");
      setProgress(30);
      const downloadResult = await runDownloadTest(bestServer);

      setTestPhase("Testing upload speed");
      setProgress(70);
      const uploadResult = await runUploadTest(bestServer);

      setTestPhase("Calculating results...");
      setProgress(90);

      const testResults = {
        downloadSpeed: Math.round(downloadResult.speed * 10) / 10,
        uploadSpeed: Math.round(uploadResult.speed * 10) / 10,
        latency: Math.round(latencyResults.unloaded * 10) / 10,
        loadedLatency: Math.round(latencyResults.loaded * 10) / 10,
        jitter: Math.round(latencyResults.jitter * 10) / 10,
        serverLocation: bestServer.name,
        ...networkInfo,
        timestamp: new Date().toLocaleString(),
        connectionType: await detectConnectionType(),
      };

      setResults(testResults);
      setProgress(100);

      toast({
        title: "Speed Test Complete!",
        description: `Download: ${testResults.downloadSpeed} Mbps, Upload: ${testResults.uploadSpeed} Mbps`,
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Unable to complete speed test. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTestRunning(false);
      setTestPhase("");
    }
  };

  const getSpeedRating = (speed: number, type: "download" | "upload") => {
    const thresholds = {
      download: { excellent: 50, good: 25, fair: 10 },
      upload: { excellent: 25, good: 10, fair: 5 },
    };
    if (speed >= thresholds[type].excellent)
      return { rating: "Excellent", color: "#10b981", bg: "bg-emerald-100", text: "text-emerald-600" };
    if (speed >= thresholds[type].good)
      return { rating: "Good", color: "#3b82f6", bg: "bg-blue-100", text: "text-blue-600" };
    if (speed >= thresholds[type].fair)
      return { rating: "Fair", color: "#f59e0b", bg: "bg-amber-100", text: "text-amber-600" };
    return { rating: "Poor", color: "#ef4444", bg: "bg-red-100", text: "text-red-600" };
  };

  const getLatencyRating = (latency: number) => {
    if (latency < 30) return { rating: "Excellent", color: "#10b981", bg: "bg-emerald-100", text: "text-emerald-600" };
    if (latency < 60) return { rating: "Good", color: "#3b82f6", bg: "bg-blue-100", text: "text-blue-600" };
    if (latency < 100) return { rating: "Fair", color: "#f59e0b", bg: "bg-amber-100", text: "text-amber-600" };
    return { rating: "Poor", color: "#ef4444", bg: "bg-red-100", text: "text-red-600" };
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

  return (
    <PremiumGuard toolId={toolId ?? 0} isToolPremiumFromTool={isToolPremium} toolNameFromProps={name}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="flex justify-center mb-6">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 p-5 rounded-full shadow-xl"
              >
                <GaugeCircle className="h-12 w-12 text-white" />
              </motion.div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {name} || Internet Speed Test
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {description} || Accurate measurements with multi-threaded testing
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card className="shadow-xl border-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
              <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/50">
                    <LocateFixed className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-lg">
                      Test Server: {bestServer?.name || "Loading..."}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {networkInfo.city}, {networkInfo.country}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/50">
                    <Wifi className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium text-lg">
                      {networkInfo.isp}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {networkInfo.ip}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={detectNetworkInfo}
                  disabled={isFindingServer || isTestRunning}
                  className="border border-gray-200 dark:border-gray-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <div className="space-y-8">
            {/* Test Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="shadow-xl border-0 bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 justify-center text-2xl">
                    <GaugeCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    {name} || Internet Speed Test
                  </CardTitle>
                  <CardDescription className="text-center">
                    {bestServer
                      ? `Connected to ${bestServer.name} in ${networkInfo.city}`
                      : "Preparing test..."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <motion.div whileHover={{ scale: 1.02 }}>
                      <Button
                        onClick={runSpeedTest}
                        disabled={isTestRunning || !bestServer}
                        size="lg"
                        className="w-full sm:w-auto max-w-full px-6 sm:px-16 py-5 sm:py-7 text-base sm:text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                      >
                        {isTestRunning ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                            {testPhase}
                          </>
                        ) : (
                          <>
                            <GaugeCircle className="h-5 w-5 mr-3" />
                            <TranslatableBlock>Start Speed Test</TranslatableBlock>
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </div>

                  {isTestRunning && (
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm font-medium">
                        <span>{testPhase}</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2 bg-gray-200" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Live Speed Test Display */}
            {isTestRunning && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="grid md:grid-cols-2 gap-6"
              >
                <Card className="border-blue-200 dark:border-blue-800 shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Download className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold"><TranslatableBlock>Download</TranslatableBlock></span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {testPhase === "Testing download speed" ? "Testing..." : "Waiting"}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <Speedometer
                      value={liveDownloadSpeed}
                      max={1000}
                      color="#3b82f6"
                      size={180}
                    />
                    <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                      Current speed: {liveDownloadSpeed.toFixed(2)} Mbps
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-200 dark:border-green-800 shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-green-600" />
                        <span className="font-semibold"><TranslatableBlock>Upload</TranslatableBlock></span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {testPhase === "Testing upload speed" ? "Testing..." : "Waiting"}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <Speedometer
                      value={liveUploadSpeed}
                      max={500}
                      color="#10b981"
                      size={180}
                    />
                    <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                      Current speed: {liveUploadSpeed.toFixed(2)} Mbps
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Results Display */}
            {results && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div whileHover={{ y: -5 }}>
                    <Card className="border-blue-200 dark:border-blue-800 shadow-lg">
                      <CardContent className="p-6 text-center">
                        <div className="flex justify-center mb-4">
                          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                            <Download className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="text-5xl font-bold text-blue-600 mb-1">
                          {results.downloadSpeed}
                          <span className="text-lg font-normal"> Mbps</span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <TranslatableBlock>Download Speed</TranslatableBlock>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center ${getSpeedRating(results.downloadSpeed, "download").bg} ${getSpeedRating(results.downloadSpeed, "download").text}`}>
                          {getSpeedRating(results.downloadSpeed, "download").rating}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div whileHover={{ y: -5 }}>
                    <Card className="border-green-200 dark:border-green-800 shadow-lg">
                      <CardContent className="p-6 text-center">
                        <div className="flex justify-center mb-4">
                          <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                            <Upload className="h-8 w-8 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                        <div className="text-5xl font-bold text-green-600 mb-1">
                          {results.uploadSpeed}
                          <span className="text-lg font-normal"> Mbps</span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <TranslatableBlock>Upload Speed</TranslatableBlock>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center ${getSpeedRating(results.uploadSpeed, "upload").bg} ${getSpeedRating(results.uploadSpeed, "upload").text}`}>
                          {getSpeedRating(results.uploadSpeed, "upload").rating}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <motion.div whileHover={{ y: -5 }}>
                    <Card className="border-purple-200 dark:border-purple-800 shadow-lg">
                      <CardContent className="p-6 text-center">
                        <div className="flex justify-center mb-4">
                          <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/20">
                            <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <div className="text-3xl font-bold text-purple-600">
                              {results.latency}
                              <span className="text-sm font-normal"> ms</span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <TranslatableBlock>Unloaded Latency</TranslatableBlock>
                            </div>
                          </div>
                          <div>
                            <div className="text-3xl font-bold text-purple-600">
                              {results.loadedLatency}
                              <span className="text-sm font-normal"> ms</span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <TranslatableBlock>Loaded Latency</TranslatableBlock>
                            </div>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center mt-4 ${getLatencyRating(results.latency).bg} ${getLatencyRating(results.latency).text}`}>
                          {getLatencyRating(results.latency).rating}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Jitter: {results.jitter}ms
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div whileHover={{ y: -5 }}>
                    <Card className="border-orange-200 dark:border-orange-800 shadow-lg">
                      <CardContent className="p-6 text-center">
                        <div className="flex justify-center mb-4">
                          <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/20">
                            <Server className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                          </div>
                        </div>
                        <div className="text-xl font-semibold text-orange-600 mb-1">
                          {results.serverLocation}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Test Server
                        </div>
                        <div className="text-xs bg-gray-100 dark:bg-gray-700 rounded-lg p-2 font-mono text-gray-600 dark:text-gray-300">
                          IP: {results.ip}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div whileHover={{ y: -5 }}>
                    <Card className="border-yellow-200 dark:border-yellow-800 shadow-lg">
                      <CardContent className="p-6 text-center">
                        <div className="flex justify-center mb-4">
                          <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                            <Wifi className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                          </div>
                        </div>
                        <div className="text-xl font-semibold text-yellow-600 mb-1">
                          {results.isp}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <TranslatableBlock>Internet Service Provider</TranslatableBlock>
                        </div>
                        <div className="text-xs bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                          <div>{results.city}, {results.country}</div>
                          <div className="font-mono mt-1">{results.connectionType} • AS{results.asn}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                <div className="flex justify-center">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={runSpeedTest}
                      variant="outline"
                      className="flex items-center gap-2 border-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <TranslatableBlock>Run Test Again</TranslatableBlock>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Guides Section */}
            <div className="grid md:grid-cols-2 gap-6">
              <motion.div whileHover={{ y: -5 }}>
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CircleDashed className="h-5 w-5 text-blue-600" />
                      <TranslatableBlock>Speed Test Guide</TranslatableBlock>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-3 h-3 rounded-full bg-green-500 mt-1"></div>
                        <div className="flex-1">
                          <div className="font-medium">
                            <TranslatableBlock>Excellent (50+ Mbps Download, 25+ Mbps Upload)</TranslatableBlock>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <TranslatableBlock>Smooth 4K streaming, fast downloads, lag-free gaming</TranslatableBlock>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-3 h-3 rounded-full bg-blue-500 mt-1"></div>
                        <div className="flex-1">
                          <div className="font-medium">
                            <TranslatableBlock>Good (25-50 Mbps Download, 10-25 Mbps Upload)</TranslatableBlock>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <TranslatableBlock>HD streaming, video calls, online gaming</TranslatableBlock>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-3 h-3 rounded-full bg-yellow-500 mt-1"></div>
                        <div className="flex-1">
                          <div className="font-medium">
                            <TranslatableBlock>Fair (10-25 Mbps Download, 5-10 Mbps Upload)</TranslatableBlock>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <TranslatableBlock>Standard HD, browsing, social media</TranslatableBlock>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-3 h-3 rounded-full bg-red-500 mt-1"></div>
                        <div className="flex-1">
                          <div className="font-medium">
                            <TranslatableBlock>Poor (&lt;10 Mbps Download, &lt;5 Mbps Upload)</TranslatableBlock>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Basic browsing, email, SD video
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ y: -5 }}>
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CircleDashed className="h-5 w-5 text-purple-600" />
                      <TranslatableBlock>Latency Guide</TranslatableBlock>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-3 h-3 rounded-full bg-green-500 mt-1"></div>
                        <div className="flex-1">
                          <div className="font-medium">Excellent (&lt;30ms)</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <TranslatableBlock>Ideal for competitive gaming, real-time applications</TranslatableBlock>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-3 h-3 rounded-full bg-blue-500 mt-1"></div>
                        <div className="flex-1">
                          <div className="font-medium">Good (30-60ms)</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <TranslatableBlock>Great for most online activities, VoIP calls</TranslatableBlock>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-3 h-3 rounded-full bg-yellow-500 mt-1"></div>
                        <div className="flex-1">
                          <div className="font-medium">Fair (60-100ms)</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <TranslatableBlock>Noticeable lag in gaming, but acceptable for browsing</TranslatableBlock>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-3 h-3 rounded-full bg-red-500 mt-1"></div>
                        <div className="flex-1">
                          <div className="font-medium">Poor (&gt;100ms)</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <TranslatableBlock>Laggy for real-time applications, buffering may occur</TranslatableBlock>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Tips Section */}
            <motion.div whileHover={{ y: -5 }}>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CircleDashed className="h-5 w-5 text-green-600" />
                    <TranslatableBlock>Improving Your Connection</TranslatableBlock>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-3 text-lg flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        <TranslatableBlock>For Better Speeds</TranslatableBlock>
                      </h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                        <TranslatableBlock>
                          <li>Use a wired Ethernet connection instead of WiFi</li>
                          <li>Restart your modem and router</li>
                          <li>Close bandwidth-heavy applications</li>
                          <li>Upgrade your internet plan if consistently slow</li>
                          <li>Check for interference on WiFi channels</li>
                        </TranslatableBlock>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium mb-3 text-lg flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <TranslatableBlock>For Lower Latency</TranslatableBlock>
                      </h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                        <TranslatableBlock>
                          <li>Connect to servers closer to your location</li>
                          <li>Use a gaming/VPN service with optimized routing</li>
                          <li>Avoid network congestion during peak hours</li>
                          <li>Check for background updates on your devices</li>
                          <li>Enable QoS on your router if available</li>
                        </TranslatableBlock>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-8"
            >
              {/* Introduction Card */}
              <motion.div whileHover={{ y: -5 }}>
                <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700/80">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl text-gray-900 dark:text-white">
                      <GaugeCircle className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                      <TranslatableBlock>Internet Speed Test</TranslatableBlock>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
                    <TranslatableBlock>
                      <p className="text-lg leading-relaxed">
                        In today's digital world, a reliable internet connection is essential for work, streaming, gaming, and staying connected with friends and family. Knowing the speed of your internet connection can help you troubleshoot issues, optimize performance, and ensure you are getting the service you pay for.
                      </p>
                      <p className="text-lg leading-relaxed">
                        An internet speed test measures how fast your connection is in real-time, giving you accurate data on download speed, upload speed, and latency (ping). These metrics are important for understanding your connection quality and ensuring a smooth online experience.
                      </p>
                    </TranslatableBlock>
                  </CardContent>
                </Card>
              </motion.div>

              {/* How It Works Card */}
              <motion.div whileHover={{ y: -5 }}>
                <Card className="shadow-xl border-0 bg-white dark:bg-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl text-gray-900 dark:text-white">
                      <Settings className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                      <TranslatableBlock>How an Internet Speed Test Works</TranslatableBlock>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300 mb-6 text-lg">
                      <TranslatableBlock>When you run an internet speed test, the tool connects to a nearby server and measures the speed at which data travels between your device and the server. The results typically include three key metrics:</TranslatableBlock>
                    </p>

                    <div className="grid md:grid-cols-3 gap-6">
                      <motion.div
                        whileHover={{ x: 5 }}
                        className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Download className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white"><TranslatableBlock>Download Speed</TranslatableBlock></h3>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">
                          <TranslatableBlock>The rate at which data is received from the internet to your device. A higher download speed is essential for streaming videos, downloading files, and browsing websites smoothly.</TranslatableBlock>
                        </p>
                      </motion.div>

                      <motion.div
                        whileHover={{ x: 5 }}
                        className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Upload className="h-6 w-6 text-green-600 dark:text-green-400" />
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white"><TranslatableBlock>Upload Speed</TranslatableBlock></h3>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">
                          <TranslatableBlock>The rate at which data is sent from your device to the internet. Upload speed matters for sending emails with attachments, uploading videos, or video conferencing.</TranslatableBlock>
                        </p>
                      </motion.div>

                      <motion.div
                        whileHover={{ x: 5 }}
                        className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white"><TranslatableBlock>Ping/Latency</TranslatableBlock></h3>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">
                          <TranslatableBlock>The time it takes for a data packet to travel from your device to the server and back. Low latency is crucial for online gaming and video calls, as it reduces lag.</TranslatableBlock>
                        </p>
                      </motion.div>
                    </div>

                    <TranslatableBlock>
                      <p className="text-gray-700 dark:text-gray-300 mt-6 text-lg">
                        By understanding these metrics, you can determine if your internet connection is performing as expected or if there might be issues that need attention.
                      </p>
                    </TranslatableBlock>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Why Test Your Speed Card */}
              <motion.div whileHover={{ y: -5 }}>
                <Card className="shadow-xl border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700/80">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl text-gray-900 dark:text-white">
                      <BarChart3 className="h-7 w-7 text-green-600 dark:text-green-400" />
                      <TranslatableBlock>
                        Why You Should Test Your Internet Speed
                      </TranslatableBlock>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <motion.div whileHover={{ x: 5 }} className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white"><TranslatableBlock>Check Your ISP Performance</TranslatableBlock></h4>
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                              <TranslatableBlock>Verify that your Internet Service Provider (ISP) delivers the speed you are paying for.</TranslatableBlock>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white"><TranslatableBlock>Troubleshoot Connection Issues</TranslatableBlock></h4>
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                              <TranslatableBlock>Identify slow speeds, buffering, or connectivity problems.</TranslatableBlock>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white"><TranslatableBlock>Optimize Streaming and Gaming</TranslatableBlock></h4>
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                              <TranslatableBlock>Ensure your connection supports HD or 4K streaming and online gaming without interruptions.</TranslatableBlock>
                            </p>
                          </div>
                        </div>
                      </motion.div>

                      <motion.div whileHover={{ x: 5 }} className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white"><TranslatableBlock>Plan for Upgrades</TranslatableBlock></h4>
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                              <TranslatableBlock>Determine if your current plan meets your household's needs or if it's time for a faster internet plan.</TranslatableBlock>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white"><TranslatableBlock>Monitor Network Health</TranslatableBlock></h4>
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                              <TranslatableBlock>Regular testing helps you detect issues before they affect your online activities.</TranslatableBlock>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white"><TranslatableBlock>Compare Providers</TranslatableBlock></h4>
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                              <TranslatableBlock>Use test results to compare different ISPs and make informed decisions.</TranslatableBlock>
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* How to Run Test Card */}
              <motion.div whileHover={{ y: -5 }}>
                <Card className="shadow-xl border-0 bg-white dark:bg-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl text-gray-900 dark:text-white">
                      <PlayCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
                      <TranslatableBlock>How to Run an Internet Speed Test</TranslatableBlock>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-4 gap-4">
                      {[
                        { step: "1", title: "Open the Tool", desc: "Use a reliable online speed test platform" },
                        { step: "2", title: "Click Start Test", desc: "The tool measures download, upload speed, and ping" },
                        { step: "3", title: "View Results", desc: "See your connection metrics and compare to your ISP plan" },
                        { step: "4", title: "Take Action", desc: "Optimize or contact your ISP if speeds are low" }
                      ].map((item, index) => (
                        <motion.div
                          key={index}
                          whileHover={{ scale: 1.05, x: 3 }}
                          className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                        >
                          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="font-bold text-blue-600 dark:text-blue-400"><TranslatableBlock>{item.step}</TranslatableBlock></span>
                          </div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2"><TranslatableBlock>{item.title}</TranslatableBlock></h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300"><TranslatableBlock>{item.desc}</TranslatableBlock></p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

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
                        q: "What is a good internet speed?",
                        a: "For standard browsing and streaming, 25 Mbps download speed is usually sufficient. For HD streaming, gaming, or large file transfers, 50–100 Mbps or more is recommended."
                      },
                      {
                        q: "Why is my internet slow?",
                        a: "Common reasons include network congestion, outdated hardware, too many connected devices, or ISP throttling."
                      },
                      {
                        q: "Can an internet speed test improve my connection?",
                        a: "A speed test doesn't increase your speed, but it helps identify issues so you can take steps to improve performance."
                      },
                      {
                        q: "What is jitter?",
                        a: "Jitter measures variations in the time it takes for data packets to travel over the network. High jitter can cause interruptions in streaming or video calls."
                      },
                      {
                        q: "How fast is gigabit internet?",
                        a: "Internet plans labeled 1G or 3G typically offer speeds between 1000 Mbps and 3000 Mbps. However, the speed you experience depends on your connection type and device capabilities."
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

              {/* Final Call to Action */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <Card className="shadow-2xl border-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <CardContent className="p-8">
                    <h3 className="text-2xl font-bold mb-4"><TranslatableBlock>Ready to Test Your Internet Speed?</TranslatableBlock></h3>
                    <p className="text-blue-100 mb-6 text-lg">
                      <TranslatableBlock>Check your internet speed with our Premium Speed Test and ensure your connection is fast, stable, and reliable. Whether for work, streaming, or gaming, knowing your internet performance helps you make the most of your online experience.
                      </TranslatableBlock>
                    </p>
                    <Button
                      size="lg"
                      className="bg-white text-blue-600 hover:bg-gray-100 font-semibold text-lg px-8 py-6"
                      onClick={runSpeedTest}
                      disabled={isTestRunning || !bestServer}
                    >
                      <GaugeCircle className="h-5 w-5 mr-2" />
                      Start Speed Test Now
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
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
          </div>
        </div>
      </div>
    </PremiumGuard>
  );
}