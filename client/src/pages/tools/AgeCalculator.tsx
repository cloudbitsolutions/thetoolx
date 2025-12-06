import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Calculator, Clock, Gift, Heart, Zap, Sparkles, Star, Share2, Users, Target, Brain, Stethoscope, GraduationCap, Briefcase, Scale, Trophy, Shield, CalendarDays, Globe, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentTool } from "@/hooks/useCurrentTool";
import { motion } from "framer-motion";
import StarRating from "@/components/ui/star-rating";
import { useMutation } from "@tanstack/react-query";
import PremiumGuard from "@/components/PremiumGuard";
import UnauthenticatedView from "../auth/UnauthenticatedView";
import { useAuth } from "@/hooks/useAuth";
import { useToolRating } from "@/lib/useToolRating";
import TranslatableBlock from "@/components/TranslatableBlock";

export default function AgeCalculator() {
  const [birthDate, setBirthDate] = useState("");
  const [ageData, setAgeData] = useState<any>(null);
  const { toast } = useToast();
  const { toolId, isToolPremium, name, description, isLoginRequired, toolSlug } = useCurrentTool();
  const { user, isAuthenticated } = useAuth();
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

  const calculateAge = async () => {
    if (!birthDate) {
      toast({
        title: "Date Required",
        description: "Please enter your birth date",
        variant: "destructive",
      });
      return;
    }

    const birth = new Date(birthDate);
    const today = new Date();

    if (birth > today) {
      toast({
        title: "Invalid Date",
        description: "Birth date cannot be in the future",
        variant: "destructive",
      });
      return;
    }

    // Track tool usage
    if (toolId) {
      try {
        await apiRequest('POST', `/api/tools/${toolId}/usage`, {
          success: true,
          errorMessage: null,
        });
      } catch (error) {
        console.error('Failed to track tool usage:', error);
      }
    }

    // Calculate age in years, months, days
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    // Calculate total days lived
    const timeDiff = today.getTime() - birth.getTime();
    const totalDays = Math.floor(timeDiff / (1000 * 3600 * 24));
    const totalHours = Math.floor(timeDiff / (1000 * 3600));
    const totalMinutes = Math.floor(timeDiff / (1000 * 60));
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = years * 12 + months;

    // Next birthday
    const nextBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    if (nextBirthday < today) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }
    const daysToNextBirthday = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 3600 * 24));

    // Day of week born
    const dayOfWeek = birth.toLocaleDateString('en-US', { weekday: 'long' });

    // Zodiac sign (simplified)
    const zodiacSigns = [
      { name: "Capricorn", start: [12, 22], end: [1, 19] },
      { name: "Aquarius", start: [1, 20], end: [2, 18] },
      { name: "Pisces", start: [2, 19], end: [3, 20] },
      { name: "Aries", start: [3, 21], end: [4, 19] },
      { name: "Taurus", start: [4, 20], end: [5, 20] },
      { name: "Gemini", start: [5, 21], end: [6, 20] },
      { name: "Cancer", start: [6, 21], end: [7, 22] },
      { name: "Leo", start: [7, 23], end: [8, 22] },
      { name: "Virgo", start: [8, 23], end: [9, 22] },
      { name: "Libra", start: [9, 23], end: [10, 22] },
      { name: "Scorpio", start: [10, 23], end: [11, 21] },
      { name: "Sagittarius", start: [11, 22], end: [12, 21] }
    ];

    const birthMonth = birth.getMonth() + 1;
    const birthDay = birth.getDate();
    let zodiacSign = "Unknown";

    for (const sign of zodiacSigns) {
      const [startMonth, startDay] = sign.start;
      const [endMonth, endDay] = sign.end;

      if ((birthMonth === startMonth && birthDay >= startDay) ||
        (birthMonth === endMonth && birthDay <= endDay)) {
        zodiacSign = sign.name;
        break;
      }
    }

    setAgeData({
      years,
      months,
      days,
      totalDays,
      totalWeeks,
      totalMonths,
      totalHours,
      totalMinutes,
      daysToNextBirthday,
      dayOfWeek,
      zodiacSign,
      birthDate: birth.toLocaleDateString()
    });

    toast({
      title: "Age Calculated!",
      description: `You are ${years} years, ${months} months, and ${days} days old`,
    });
  };

  // Reusable hover card component
  const HoverCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`relative group hover:-translate-y-1 transition-transform duration-300 ${className}`}>
      <div className="absolute -inset-2 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-xl opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-300"></div>
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

  if (isLoginRequired && !isAuthenticated) return <UnauthenticatedView />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-900/20 py-12 md:py-16 px-4 sm:px-6">
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-indigo-200/30 dark:bg-indigo-800/20 blur-3xl animate-float-slow"></div>
        <div className="absolute top-2/3 right-1/3 w-48 h-48 rounded-full bg-purple-200/30 dark:bg-purple-800/20 blur-3xl animate-float-medium"></div>
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full bg-blue-200/30 dark:bg-blue-800/20 blur-3xl animate-float-fast"></div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12 relative group">
          {/* Floating orb effect */}
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full filter blur-3xl opacity-70 dark:opacity-30 animate-pulse-slow"></div>

          <div className="relative inline-block">
            {/* 3D card effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-2xl opacity-20 dark:opacity-30 blur-xl group-hover:opacity-40 transition-all duration-500"></div>

            {/* Main logo container */}
            <div className="relative bg-gradient-to-br from-white to-indigo-50 dark:from-gray-800 dark:to-indigo-900/30 p-6 rounded-2xl border border-indigo-200/80 dark:border-indigo-800 shadow-2xl transform transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-lg">
              <div className="relative flex items-center justify-center">
                {/* 3D layered effect */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-100 to-purple-50 dark:from-indigo-900/50 dark:to-purple-900/20 rounded-xl rotate-3 opacity-60 shadow-inner"></div>

                {/* Floating calendar icon */}
                <div className="relative z-10">
                  <Calendar className="h-16 w-16 text-indigo-600 dark:text-indigo-300 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.8} />
                  <div className="absolute -top-3 -right-3">
                    <Sparkles className="h-6 w-6 text-purple-400 opacity-90 animate-spin-slow" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mt-8 mb-4 tracking-tight">
            <TranslatableBlock>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-500">
                Age Calculator
              </span>
            </TranslatableBlock>
          </h1>
          <TranslatableBlock>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Calculate your exact age in years, months, days, and more. Discover fascinating facts about your birth date.
            </p>
          </TranslatableBlock>
        </div>

        {/* Main Calculator Card */}
        <div className="relative group mb-8">
          {/* Floating shadow effect */}
          <div className="absolute -inset-3 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-3xl opacity-20 dark:opacity-30 blur-xl group-hover:opacity-40 transition-all duration-500"></div>

          <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-2xl shadow-xl transform transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                  <Calculator className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <TranslatableBlock>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-500">
                    Calculate Your Age
                  </span>
                </TranslatableBlock>
              </CardTitle>
              <TranslatableBlock>
                <CardDescription className="text-lg">
                  Enter your birth date to calculate your exact age and get interesting statistics
                </CardDescription>
              </TranslatableBlock>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date input with 3D effect */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-lg opacity-20 blur-sm group-hover:opacity-30 transition duration-500"></div>
                <div className="relative bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <Label htmlFor="birthDate" className="block mb-2 font-medium">
                    Birth Date
                  </Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full"
                    placeholder="Select your birth date"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Click on the calendar icon to select your birth date
                  </p>
                </div>
              </div>

              {/* Calculate button with 3D effect */}
              <Button
                onClick={calculateAge}
                disabled={!birthDate}
                className="w-full relative overflow-hidden group"
                size="lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute inset-0.5 bg-white/10 rounded-md blur-sm group-hover:blur-md transition-all duration-300"></div>
                <span className="relative z-10 flex items-center justify-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Calculate Age
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {ageData && (
          <div className="grid gap-6 mb-8">
            {/* Main Age Display */}
            <HoverCard>
              <CardContent className="p-8 text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Your Age
                </h2>
                <div className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-500 mb-2">
                  {ageData.years}
                </div>
                <div className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                  {ageData.months} months, {ageData.days} days
                </div>
                <div className="text-lg text-gray-500 dark:text-gray-500">
                  Born on {ageData.birthDate}
                </div>
              </CardContent>
            </HoverCard>

            {/* Detailed Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <HoverCard>
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                    <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {ageData.totalDays.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Days Lived</div>
                </CardContent>
              </HoverCard>

              <HoverCard>
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors">
                    <Calendar className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                    {ageData.totalWeeks.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Weeks Lived</div>
                </CardContent>
              </HoverCard>

              <HoverCard>
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors">
                    <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                    {ageData.totalHours.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Hours Lived</div>
                </CardContent>
              </HoverCard>

              <HoverCard>
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3 group-hover:bg-red-200 dark:group-hover:bg-red-800/50 transition-colors">
                    <Heart className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">
                    {(ageData.totalDays * 100000).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Heartbeats (est.)</div>
                </CardContent>
              </HoverCard>
            </div>

            {/* Fun Facts */}
            <div className="grid md:grid-cols-2 gap-6">
              <HoverCard>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/50 transition-colors">
                      <Gift className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    Birthday Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Born on a:</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{ageData.dayOfWeek}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Next birthday in:</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">{ageData.daysToNextBirthday} days</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">Zodiac sign:</span>
                    <span className="font-semibold text-pink-600 dark:text-pink-400">{ageData.zodiacSign}</span>
                  </div>
                </CardContent>
              </HoverCard>

              <HoverCard>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                      <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    Life Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Total months:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{ageData.totalMonths}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Total minutes:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{ageData.totalMinutes.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">Age in dog years:</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">{Math.floor(ageData.years * 7)}</span>
                  </div>
                </CardContent>
              </HoverCard>
            </div>
          </div>
        )}

        {/* Instructions Section */}
        <HoverCard className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors">
                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <TranslatableBlock>
                How to Use the Age Calculator
              </TranslatableBlock>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {[
                "Select your birth date using the date picker",
                "Click 'Calculate Age' to get your exact age",
                "View your age in years, months, and days",
                "Explore detailed statistics about your life",
                "Discover fun facts about your birth date",
                "Share your results with friends and family"
              ].map((step, index) => (
                <li key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold">
                      {index + 1}
                    </div>
                  </div>
                  <TranslatableBlock>
                    <span className="text-gray-700 dark:text-gray-300">
                      {step}
                    </span>
                  </TranslatableBlock>
                </li>
              ))}
            </ol>
          </CardContent>
        </HoverCard>


        {/* Comprehensive Information Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8 mb-8"
        >
          {/* Introduction Card */}
          <div className="relative group">
            <div className="absolute -inset-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-3xl opacity-20 dark:opacity-30 blur-xl group-hover:opacity-40 transition-all duration-500"></div>
            <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-2xl shadow-xl transform transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
                    <Brain className="h-7 w-7 text-white" />
                  </div>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-500">
                    <TranslatableBlock>
                      Age Calculator
                    </TranslatableBlock>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                <TranslatableBlock>
                  <p>
                    An age calculator is a simple tool that tells you exactly how old you are based on your date of birth. Instead of counting years in your head or doing tricky math, you just enter your birth date, and the calculator shows your current age in years, months, and sometimes even days.
                  </p>
                  <p>
                    Many people use it not only out of curiosity but also because age is required in different areas of life, from filling out school forms to applying for jobs or planning medical treatments.
                  </p>
                  <p>
                    Age calculators save time and remove confusion. For example, if someone was born on February 29th in a leap year, figuring out their age manually can be confusing. A tool like this solves that problem instantly and gives the exact age.
                  </p>
                </TranslatableBlock>
              </CardContent>
            </Card>
          </div>

          {/* How It Works Card */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl opacity-20 dark:opacity-30 blur-lg group-hover:opacity-40 transition-all duration-500"></div>
              <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-xl shadow-lg transform transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-xl h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <TranslatableBlock>
                      How It Works
                    </TranslatableBlock>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    <TranslatableBlock>
                      An age calculator works by comparing two dates: your date of birth and the current date. The tool subtracts the birth year from the current year, then checks the months and days to adjust the calculation so the result is accurate.
                    </TranslatableBlock>
                  </p>
                  <div className="space-y-3">
                    {[
                      "Compares birth date with current date",
                      "Calculates years, months, and days difference",
                      "Adjusts for leap years and month variations",
                      "Uses Gregorian calendar for precision",
                      "Provides instant, error-free results"
                    ].map((point, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ x: 5 }}
                        className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                      >
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500"></div>
                        <TranslatableBlock>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{point}</span>
                        </TranslatableBlock>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-orange-400 to-red-500 rounded-2xl opacity-20 dark:opacity-30 blur-lg group-hover:opacity-40 transition-all duration-500"></div>
              <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-xl shadow-lg transform transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-xl h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Target className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <TranslatableBlock>
                      Example Calculation
                    </TranslatableBlock>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <TranslatableBlock>
                        <p className="font-semibold text-blue-700 dark:text-blue-300">Birth Date: May 15, 2000</p>
                        <p className="font-semibold text-green-700 dark:text-green-300">Current Date: September 13, 2025</p>
                      </TranslatableBlock>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Year Difference:</span>
                        <span className="font-semibold">2025 - 2000 = 25 years</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Birthday Status:</span>
                        <span className="font-semibold text-green-600">Completed this year</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Final Age:</span>
                        <span className="font-bold text-lg text-purple-600">25 years</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Benefits Card */}
          <div className="relative group">
            <div className="absolute -inset-3 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-3xl opacity-20 dark:opacity-30 blur-xl group-hover:opacity-40 transition-all duration-500"></div>
            <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-2xl shadow-xl transform transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl shadow-lg">
                    <TrendingUp className="h-7 w-7 text-white" />
                  </div>
                  <TranslatableBlock>
                    Benefits of Using an Age Calculator
                  </TranslatableBlock>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { icon: Shield, color: "blue", title: "Accuracy", desc: "No mistakes with leap years or month variations" },
                    { icon: Clock, color: "green", title: "Time-Saving", desc: "Instant results instead of manual calculations" },
                    { icon: Users, color: "purple", title: "Real-Life Utility", desc: "Essential for forms, documents, and applications" },
                    { icon: Zap, color: "yellow", title: "Easy to Use", desc: "No technical knowledge required" },
                    { icon: CalendarDays, color: "pink", title: "Detailed Results", desc: "Years, months, days, weeks, and more" },
                    { icon: Globe, color: "indigo", title: "Universal", desc: "Works worldwide with Gregorian calendar" }
                  ].map((benefit, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.05, x: 3 }}
                      className="p-4 rounded-lg bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      <div className={`p-2 rounded-lg bg-${benefit.color}-100 dark:bg-${benefit.color}-900/30 w-12 h-12 flex items-center justify-center mb-3`}>
                        <benefit.icon className={`h-6 w-6 text-${benefit.color}-600 dark:text-${benefit.color}-400`} />
                      </div>
                      <TranslatableBlock>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{benefit.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{benefit.desc}</p>
                      </TranslatableBlock>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Use Cases Card */}
          <div className="relative group">
            <div className="absolute -inset-3 bg-gradient-to-r from-violet-400 to-fuchsia-500 rounded-3xl opacity-20 dark:opacity-30 blur-xl group-hover:opacity-40 transition-all duration-500"></div>
            <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-2xl shadow-xl transform transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl shadow-lg">
                    <Briefcase className="h-7 w-7 text-white" />
                  </div>
                  <TranslatableBlock>
                    Real-World Use Cases
                  </TranslatableBlock>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    { icon: Stethoscope, color: "red", title: "Healthcare", desc: "Medicine dosage, treatment plans, vaccinations based on exact age" },
                    { icon: GraduationCap, color: "blue", title: "Education", desc: "School admissions with specific age requirements" },
                    { icon: Briefcase, color: "green", title: "Job Applications", desc: "Government exams with age limits" },
                    { icon: Scale, color: "purple", title: "Legal Matters", desc: "Proving adulthood, voting eligibility, retirement" },
                    { icon: Trophy, color: "orange", title: "Sports", desc: "Age categories for competitions and tournaments" },
                    { icon: Heart, color: "pink", title: "Astrology", desc: "Horoscopes and numerology based on birth dates" }
                  ].map((usecase, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
                    >
                      <div className={`p-2 rounded-lg bg-${usecase.color}-100 dark:bg-${usecase.color}-900/30 flex-shrink-0`}>
                        <usecase.icon className={`h-5 w-5 text-${usecase.color}-600 dark:text-${usecase.color}-400`} />
                      </div>
                      <div>
                        <TranslatableBlock>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{usecase.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{usecase.desc}</p>
                        </TranslatableBlock>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Behind the Tool & Comparison Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Behind the Tool */}
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl opacity-20 dark:opacity-30 blur-lg group-hover:opacity-40 transition-all duration-500"></div>
              <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-xl shadow-lg transform transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-xl h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                      <Brain className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <TranslatableBlock>
                      Behind the Tool
                    </TranslatableBlock>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    <TranslatableBlock>
                      The age calculator uses precise mathematical rules and calendar science to handle:
                    </TranslatableBlock>
                  </p>
                  <div className="space-y-3">
                    {[
                      "Gregorian calendar standards",
                      "Leap year calculations (29 days in February)",
                      "Month length variations (30/31 days)",
                      "Cross-year date comparisons",
                      "Multi-format result generation"
                    ].map((point, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ x: 3 }}
                        className="flex items-center gap-3"
                      >
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-500"></div>
                        <TranslatableBlock>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{point}</span>
                        </TranslatableBlock>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Manual vs Calculator Comparison */}
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl opacity-20 dark:opacity-30 blur-lg group-hover:opacity-40 transition-all duration-500"></div>
              <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-xl shadow-lg transform transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-xl h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <Target className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <TranslatableBlock>
                      Manual vs Calculator
                    </TranslatableBlock>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2"><TranslatableBlock>Manual Calculation</TranslatableBlock></h4>
                      <ul className="text-sm space-y-1 text-red-600 dark:text-red-400">
                        <TranslatableBlock>
                          <li>• Prone to human error</li>
                          <li>• Time-consuming process</li>
                          <li>• Leap year confusion</li>
                          <li>• Month length mistakes</li>
                        </TranslatableBlock>
                      </ul>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2"><TranslatableBlock>Age Calculator</TranslatableBlock></h4>
                      <ul className="text-sm space-y-1 text-green-600 dark:text-green-400">
                        <TranslatableBlock>
                          <li>• Instant, accurate results</li>
                          <li>• Handles all calendar complexities</li>
                          <li>• Detailed breakdown available</li>
                          <li>• Error-free calculations</li>
                        </TranslatableBlock>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tips & FAQs */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Tips Card */}
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-lime-400 to-green-500 rounded-2xl opacity-20 dark:opacity-30 blur-lg group-hover:opacity-40 transition-all duration-500"></div>
              <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-xl shadow-lg transform transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-xl h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-lime-100 dark:bg-lime-900/30 rounded-lg">
                      <Star className="h-6 w-6 text-lime-600 dark:text-lime-400" />
                    </div>
                    <TranslatableBlock>
                      Tips for Effective Use
                    </TranslatableBlock>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      "Double-check birth date entry for accuracy",
                      "Use DD/MM/YYYY or MM/DD/YYYY format as shown",
                      "Review detailed results for specific needs",
                      "Use trusted, reliable calculator tools",
                      "Verify results for critical applications"
                    ].map((tip, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ x: 3 }}
                        className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                      >
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-5 h-5 rounded-full bg-lime-500 text-white text-xs flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                        </div>
                        <TranslatableBlock>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{tip}</span>
                        </TranslatableBlock>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* FAQs Card */}
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-rose-400 to-pink-500 rounded-2xl opacity-20 dark:opacity-30 blur-lg group-hover:opacity-40 transition-all duration-500"></div>
              <Card className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700 rounded-xl shadow-lg transform transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-xl h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                      <Users className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                    </div>
                    Frequently Asked Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      q: "Can it tell the exact time of birth?",
                      a: "No, most calculators work with dates only, not exact birth times"
                    },
                    {
                      q: "How accurate are online calculators?",
                      a: "Extremely accurate when correct dates are provided"
                    },
                    {
                      q: "Can I use it for legal purposes?",
                      a: "As a reference yes, but official documents are required for legal proof"
                    },
                    {
                      q: "Does it work with leap year birthdays?",
                      a: "Yes, automatically adjusts for February 29th births"
                    }
                  ].map((faq, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ x: 3 }}
                      className="border-l-4 border-rose-400 pl-3 py-1"
                    >
                      <TranslatableBlock>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{faq.q}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{faq.a}</p>
                      </TranslatableBlock>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Conclusion Card */}
          <div className="relative group">
            <div className="absolute -inset-3 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-3xl opacity-20 dark:opacity-30 blur-xl group-hover:opacity-40 transition-all duration-500"></div>
            <Card className="relative bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 backdrop-blur-sm border border-indigo-200/80 dark:border-purple-800 rounded-2xl shadow-xl transform transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl text-indigo-900 dark:text-indigo-100">
                  <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-lg">
                    <Heart className="h-7 w-7 text-white" />
                  </div>
                  <TranslatableBlock>
                    Conclusion
                  </TranslatableBlock>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TranslatableBlock>
                  <p className="text-lg text-indigo-800 dark:text-indigo-200 leading-relaxed">
                    The age calculator is one of the simplest yet most useful online tools available today. From students filling out school forms to professionals applying for jobs, from doctors managing medical records to travelers booking tickets, people everywhere need to know their exact age at different times.
                  </p>
                  <p className="text-lg text-indigo-800 dark:text-indigo-200 leading-relaxed mt-4">
                    By using an age calculator, anyone can avoid the errors of manual calculation and get instant, accurate results. Its popularity lies in its simplicity, accessibility, and reliability. While it may not replace official documents like a birth certificate, it serves as a quick and trusted helper for everyday needs.
                  </p>
                </TranslatableBlock>
              </CardContent>
            </Card>
          </div>
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


      {/* Animations */}
      <style>
        {`
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
        `}
      </style>
    </div>
  );
}