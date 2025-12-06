import { useState, useEffect } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import {
  Link,
  Copy,
  Crown,
  BarChart3,
  Eye,
  Calendar,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Share2,
  Star,
  Info,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentTool } from "@/hooks/useCurrentTool";
import NotFound from "@/pages/not-found";
//import ToolAd from '@/components/ToolAd';
import PremiumGuard from "@/components/PremiumGuard";
import UnauthenticatedView from "../auth/UnauthenticatedView";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link as RouterLink } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import StarRating from "@/components/ui/star-rating";
import { useToolRating } from "@/lib/useToolRating";
import TranslatableBlock from "@/components/TranslatableBlock";

interface FAQItemProps {
  question: string;
  answer: string;
  index: number;
}

export default function URLShortener() {
  const [url, setUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [title, setTitle] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { toolId, isToolPremium, name, description, isLoginRequired, isActive, isLoading } = useCurrentTool();

  const queryClient = useQueryClient();

  const isPremiumUser = user?.subscriptionType !== "free";
  const isLockedForUser = isToolPremium && !isPremiumUser;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  // Fetch user's URLs
  const { data: userUrls = [], refetch: refetchUrls } = useQuery<any[]>({
    queryKey: ["/api/my-urls"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Keep mutations and hooks near the top to preserve React hooks order
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

  // Shorten URL mutation
  const shortenMutation = useMutation({
    mutationFn: async ({
      originalUrl,
      customSlug,
      title,
    }: {
      originalUrl: string;
      customSlug?: string;
      title?: string;
    }) => {
      return await apiRequest("POST", "/api/shorten", {
        originalUrl,
        customSlug,
        title,
      });
    },
    onSuccess: async (data) => {
      const result = await data.json();
      setShortUrl(result.shortenedUrl);
      setUrl("");
      setCustomSlug("");
      setTitle("");
      refetchUrls();
      toast({
        title: "URL Shortened Successfully!",
        description: "Your shortened URL is ready to use.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Shorten URL",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Delete URL mutation
  const deleteMutation = useMutation({
    mutationFn: async (urlId: number) => {
      return await apiRequest("DELETE", `/api/urls/${urlId}`);
    },
    onSuccess: () => {
      refetchUrls();
      toast({
        title: "URL Deleted",
        description: "The shortened URL has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Delete URL",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "URL copied to clipboard",
    });
  };

  const handleShortenUrl = async () => {
    if (!url) {
      toast({
        title: "URL Required",
        description: "Please enter a URL to shorten",
        variant: "destructive",
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to use the URL shortener",
        variant: "destructive",
      });
      return;
    }

    if (isToolPremium && !isPremiumUser) {
      toast({
        title: "Premium Required",
        description:
          "URL shortener is a premium feature. Please upgrade your plan.",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(url);
    } catch {
      toast({
        title: "Invalid URL",
        description:
          "Please enter a valid URL starting with http:// or https://",
        variant: "destructive",
      });
      return;
    }

    shortenMutation.mutate({
      originalUrl: url,
      customSlug: customSlug || undefined,
      title: title || undefined,
    });
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

  if (isLoginRequired && !isAuthenticated) {
    return <UnauthenticatedView />;
  }

  return (
    <PremiumGuard toolId={toolId ?? 0} isToolPremiumFromTool={isToolPremium} toolNameFromProps={name}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 sm:py-16 px-4 sm:px-0">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="bg-yellow-100 dark:bg-yellow-900 p-3 sm:p-4 rounded-full">
                <Link className="h-8 w-8 sm:h-12 sm:w-12 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4">
              <TranslatableBlock>URL Shortener</TranslatableBlock>
              {isToolPremium && (
                <Badge className="ml-2 sm:ml-3 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  <Crown className="h-3 w-3 mr-1" />
                  <TranslatableBlock>Premium</TranslatableBlock>
                </Badge>
              )}
            </h1>
            <p className="text-base sm:text-xl text-gray-600 dark:text-gray-300 mx-auto max-w-xs sm:max-w-2xl">
              <TranslatableBlock>Create short, memorable links with advanced analytics and custom
                domains.</TranslatableBlock>
            </p>
          </div>

          {isLockedForUser && (
            <Alert className="mb-6 sm:mb-8 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
              <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
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
                <strong>Premium Required:</strong> URL shortener is a premium
                feature.
                <a href="/pricing" className="underline ml-1">
                  Upgrade your plan
                </a>{" "}
                to access this tool.
              </AlertDescription>
            </Alert>
          )}

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Link className="h-4 w-4 sm:h-5 sm:w-5" />
                <TranslatableBlock>Shorten URL</TranslatableBlock>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                <TranslatableBlock>Create a short URL with optional custom slug and track analytics</TranslatableBlock>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div>
                <Label htmlFor="url"><TranslatableBlock>Long URL</TranslatableBlock></Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com/very-long-url..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-1 sm:mt-2"
                  disabled={isLockedForUser}
                />
              </div>

              <div>
                <Label htmlFor="title"><TranslatableBlock>Title (Optional)</TranslatableBlock></Label>
                <Input
                  id="title"
                  placeholder="Add a title for your link"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 sm:mt-2"
                  disabled={isLockedForUser}
                />
              </div>

              <div>
                <Label htmlFor="customSlug"><TranslatableBlock>Custom Slug (Optional)</TranslatableBlock></Label>
                <div className="flex mt-1 sm:mt-2">
                  <span className="inline-flex items-center px-3 text-xs sm:text-sm text-gray-500 bg-gray-50 dark:bg-gray-700 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-md">
                    toolx.com/s/
                  </span>
                  <Input
                    id="customSlug"
                    placeholder="my-link"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    className="rounded-l-none"
                    disabled={isLockedForUser}
                  />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  <TranslatableBlock>Leave empty for auto-generated slug</TranslatableBlock>
                </p>
              </div>

              <Button
                onClick={handleShortenUrl}
                disabled={shortenMutation.isPending || isLockedForUser || !url}
                className="w-full py-4 sm:py-2"
              >
                {shortenMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Shortening...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Shorten URL
                  </>
                )}
              </Button>

              {shortUrl && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <div className="space-y-2">
                      <div>
                        <strong><TranslatableBlock>Short URL created:</TranslatableBlock></strong>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border">
                        <code className="flex-1 text-xs sm:text-sm break-all">
                          {shortUrl}
                        </code>
                        <Button
                          onClick={() => copyToClipboard(shortUrl)}
                          variant="outline"
                          size="sm"
                        >
                          <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {userUrls.length > 0 && (
            <Card className="mb-6 sm:mb-8">
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-lg sm:text-xl"><TranslatableBlock>Your Short URLs</TranslatableBlock></span>
                  </div>
                  <RouterLink href="/url-analytics">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      <TranslatableBlock>View Analytics</TranslatableBlock>
                    </Button>
                  </RouterLink>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {userUrls.map((item: any) => (
                    <div key={item.id} className="border rounded-lg p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-2">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <code className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 break-all">
                            {item.shortenedUrl}
                          </code>
                          <div className="flex">
                            <Button
                              onClick={() => copyToClipboard(item.shortenedUrl)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() =>
                                window.open(item.shortenedUrl, "_blank")
                              }
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => deleteMutation.mutate(item.id)}
                              variant="ghost"
                              size="sm"
                              disabled={deleteMutation.isPending}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          {isPremiumUser && (
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {item.clickCount || 0} clicks
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {item.title && (
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
                            {item.title}
                          </div>
                        )}
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-all line-clamp-1">
                          {item.originalUrl}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Information Card */}
          <motion.div whileHover={{ y: -5 }}>
            <Card className="mb-6 sm:mb-8 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/70 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg shadow">
                    <Info className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <span><TranslatableBlock>About URL Shorteners</TranslatableBlock></span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm sm:text-base text-gray-700 dark:text-gray-300">
                <TranslatableBlock>
                  <p>
                    In today's fast-paced digital world, sharing long and complicated URLs can be inconvenient and messy. That's where a URL shortener comes in. A URL shortener is an online tool that converts long web addresses into compact, easy-to-share links. These shortened links are perfect for social media posts, emails, marketing campaigns, and text messages, making it easier for people to click and remember your links.
                  </p>
                </TranslatableBlock>

                <h3 className="font-semibold text-gray-900 dark:text-white mt-4"><TranslatableBlock>How a URL Shortener Works</TranslatableBlock></h3>
                <p>
                  <TranslatableBlock>A URL shortener takes a long link and generates a short, unique version that redirects users to the original webpage. For example, a link like:</TranslatableBlock>
                </p>
                <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs sm:text-sm my-2 break-all">
                  https://www.example.com/blog/2025/how-to-use-a-url-shortener-effectively
                </code>
                <p><TranslatableBlock>can be shortened to:</TranslatableBlock></p>
                <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs sm:text-sm my-2">
                  https://thetoolx.com/abcd123
                </code>
                <p>
                  <TranslatableBlock>When someone clicks on the shortened link, they are automatically redirected to the original URL. This process happens instantly, making sharing quick and efficient.</TranslatableBlock>
                </p>

                <h3 className="font-semibold text-gray-900 dark:text-white mt-4"><TranslatableBlock>Benefits of Using a URL Shortener</TranslatableBlock></h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <TranslatableBlock>
                    <li><span className="font-medium">Clean and Shareable Links</span> - Long URLs with tracking codes, parameters, or special characters can look cluttered. Shortened links are tidy and look professional, especially on platforms with character limits like Twitter or LinkedIn.</li>
                    <li><span className="font-medium">Track Link Performance</span> - Many URL shorteners provide analytics, allowing you to track the number of clicks, geographic location of users, and devices used. This is invaluable for marketers and content creators who want to measure engagement and optimize campaigns.</li>
                    <li><span className="font-medium">Customizable Links</span> - Some tools allow you to create custom short links that include keywords or brand names, making them easier to recognize and trust. For example, https://thetoolx.com/summer-sale is more appealing than a random string of letters and numbers.</li>
                    <li><span className="font-medium">Easy to Share Across Platforms</span> - Short links are perfect for social media, SMS, printed materials, and emails. They are easy to copy, paste, and remember.</li>
                  </TranslatableBlock>
                </ol>

                <h3 className="font-semibold text-gray-900 dark:text-white mt-4"><TranslatableBlock>How to Use a URL Shortener</TranslatableBlock></h3>
                <p><TranslatableBlock>Using a URL shortener is simple and requires no technical knowledge:</TranslatableBlock></p>
                <ol className="list-decimal pl-5 space-y-2">
                  <TranslatableBlock>
                    <li><span className="font-medium">Paste Your URL</span> – Copy the long web address you want to shorten and paste it into the URL shortener tool.</li>
                    <li><span className="font-medium">Generate the Short Link</span> – Click the "Shorten" button. The tool will create a unique shortened link.</li>
                    <li><span className="font-medium">Share Your Link</span> – Copy the shortened URL and share it anywhere—on social media, in emails, or even in printed materials.</li>
                    <li><span className="font-medium">Track Performance (Optional)</span> – If the tool provides analytics, monitor clicks, locations, and devices for better insights.</li>
                  </TranslatableBlock>
                </ol>

                <h3 className="font-semibold text-gray-900 dark:text-white mt-4"><TranslatableBlock>Types of URL Shorteners</TranslatableBlock></h3>
                <ul className="list-disc pl-5 space-y-2">
                  <TranslatableBlock>
                    <li><span className="font-medium">Free URL Shorteners</span> – Quick and easy for personal use, offering basic shortening and limited tracking.</li>
                    <li><span className="font-medium">Paid or Premium Services</span> – Offer advanced features like branded links, detailed analytics, and link expiration settings.</li>
                    <li><span className="font-medium">Self-Hosted URL Shorteners</span> – Allow businesses to host their own shortening service for full control over links and data.</li>
                  </TranslatableBlock>
                </ul>

                <h3 className="font-semibold text-gray-900 dark:text-white mt-4"><TranslatableBlock>Tips for Using Short Links Effectively</TranslatableBlock></h3>
                <ul className="list-disc pl-5 space-y-2">
                  <TranslatableBlock>
                    <li>Use Custom Aliases – Make links memorable by adding relevant keywords.</li>
                    <li>Avoid Spammy Links – People are less likely to click links that look suspicious or random.</li>
                    <li>Track Performance – Use analytics to see which links perform best.</li>
                    <li>Keep Links Active – Avoid deleting original links if your shortened links are in use.</li>
                  </TranslatableBlock>
                </ul>

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
                          question: "What is a URL shortener?",
                          answer: "A URL shortener is a tool that converts a long web address into a shorter, easier-to-share link."
                        },
                        {
                          question: "Why should I use a URL shortener?",
                          answer: "Short links are cleaner, easier to share, and often include tracking features to monitor performance."
                        },
                        {
                          question: "Can I customize my short link?",
                          answer: "Yes, many URL shorteners allow you to create custom links with keywords or brand names."
                        },
                        {
                          question: "Is a shortened URL safe to click?",
                          answer: "Reputable URL shorteners are safe, but always ensure the source of the link is trusted to avoid phishing or malicious sites."
                        },
                        {
                          question: "Can I track how many people clicked my link?",
                          answer: "Yes, most URL shorteners offer analytics to track clicks, location, and devices."
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

                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="font-semibold text-blue-800 dark:text-blue-200"><TranslatableBlock>✅ TheToolx URL Shortener helps you create short, shareable, and trackable links instantly. Simplify your links, enhance click-through rates, and make your online sharing professional and effective.</TranslatableBlock></p>
                </div>
              </CardContent>
            </Card>
          </motion.div >

          {/* Share Section */}
          < motion.div whileHover={{ y: -5 }
          }>
            <Card className="mb-6 sm:mb-8 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/70 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg shadow">
                    <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <span><TranslatableBlock>Share this tool</TranslatableBlock></span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center sm:justify-start">
                  <Button
                    variant="outline"
                    onClick={() => handleShare("facebook")}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800 transition-all duration-300 hover:scale-105"
                  >
                    <i className="fab fa-facebook-f text-blue-600 dark:text-blue-400 text-sm sm:text-lg"></i>
                    <span>Facebook</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleShare("twitter")}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800 transition-all duration-300 hover:scale-105"
                  >
                    <i className="fab fa-twitter text-blue-400 dark:text-blue-300 text-sm sm:text-lg"></i>
                    <span>Twitter</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleShare("whatsapp")}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 border-green-200 dark:border-green-800 transition-all duration-300 hover:scale-105"
                  >
                    <i className="fab fa-whatsapp text-green-600 dark:text-green-400 text-sm sm:text-lg"></i>
                    <span>WhatsApp</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleShare("linkedin")}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800 transition-all duration-300 hover:scale-105"
                  >
                    <i className="fab fa-linkedin-in text-blue-700 dark:text-blue-400 text-sm sm:text-lg"></i>
                    <span>LinkedIn</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div >

          {/* Rating Card */}
          < motion.div whileHover={{ y: -5 }}>
            <Card className="mb-6 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/70 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                  <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg shadow">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <TranslatableBlock><span>Rate this tool</span></TranslatableBlock>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                    <div className="flex items-center">
                      <DynamicRatingDisplay />
                    </div>
                  </div>

                  <form onSubmit={handleReviewSubmit} className="space-y-4 sm:space-y-6">
                    <div>
                      <Label className="text-sm sm:text-lg dark:text-gray-300"><TranslatableBlock>Your Rating</TranslatableBlock></Label>
                      <div className="mt-2 sm:mt-3 flex justify-center">
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
                      className="w-full sm:w-auto px-4 sm:px-8 py-4 sm:py-6 text-sm sm:text-lg font-semibold bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                      {reviewMutation.isPending ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
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
          </motion.div >
        </div >
      </div >
    </PremiumGuard >
  );
}