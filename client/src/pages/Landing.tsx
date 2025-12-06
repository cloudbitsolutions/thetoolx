import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/LanguageProvider";
import ToolCard from "@/components/ToolCard";
//import { useAuth } from "@/hooks/useAuth";
//import { queryClient } from "@/lib/queryClient";
import PricingCard from "@/components/PricingCard";
import type { Tool } from "@shared/schema";

export default function Landing() {
  const { t, language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ["/api/tools", language],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (language && language !== 'en') params.set('lang', language);
      const res = await fetch(`/api/tools?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch tools');
      return res.json();
    }
  });

  const { data: dynamicPricing = [] } = useQuery({
    queryKey: ["/api/pricing", language],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (language && language !== 'en') params.set('lang', language);
      const res = await fetch(`/api/pricing?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch pricing');
      return res.json();
    }
  });

  const categories = [
    { id: "all", name: t("tools.all") },
    { id: "video", name: t("tools.video") },
    { id: "converter", name: t("tools.converter") },
    { id: "utility", name: t("tools.utility") },
  ];

  const filteredTools = selectedCategory === "all"
    ? tools
    : tools.filter((tool: Tool) => tool.category === selectedCategory);

  const monthlyPlan = dynamicPricing.find((plan: any) => plan.planType === 'monthly');
  const yearlyPlan = dynamicPricing.find((plan: any) => plan.planType === 'yearly');

  const formatPrice = (price: string | number, currency: string = 'USD') => {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${symbol}${price}`;
  };

  const pricingPlans = [
    {
      title: t("pricing.free"),
      price: "$0",
      period: "/month",
      features: [
        { name: "Access to basic tools", included: true },
        { name: "5 downloads per day", included: true },
        { name: "Standard quality", included: true },
        { name: "No URL shortener", included: false },
      ],
      buttonText: t("pricing.current"),
      buttonVariant: "secondary" as const,
    },
    ...(monthlyPlan ? [{
      title: monthlyPlan.planName || t("pricing.monthly"),
      price: formatPrice(monthlyPlan.price, monthlyPlan.currency),
      period: "/month",
      features: monthlyPlan.features?.slice(0, 4).map((feature: string) => ({ name: feature, included: true })) || [
        { name: "Access to all tools", included: true },
        { name: "Unlimited downloads", included: true },
        { name: "HD quality", included: true },
        { name: "URL shortener with analytics", included: true },
      ],
      popular: true,
      buttonText: t("pricing.getStarted"),
      onSelect: () => window.location.href = "/pricing",
    }] : [{
      title: t("pricing.monthly"),
      price: "$9.99",
      period: "/month",
      features: [
        { name: "Access to all tools", included: true },
        { name: "Unlimited downloads", included: true },
        { name: "HD quality", included: true },
        { name: "URL shortener with analytics", included: true },
      ],
      popular: true,
      buttonText: t("pricing.getStarted"),
      onSelect: () => window.location.href = "/pricing",
    }]),
    ...(yearlyPlan ? [{
      title: yearlyPlan.planName || t("pricing.yearly"),
      price: formatPrice(yearlyPlan.price, yearlyPlan.currency),
      period: "/year",
      features: yearlyPlan.features?.slice(0, 4).map((feature: string) => ({ name: feature, included: true })) || [
        { name: "Everything in Monthly", included: true },
        { name: "Priority support", included: true },
        { name: "Early access to new tools", included: true },
        { name: "No ads", included: true },
      ],
      buttonText: t("pricing.getStarted"),
      onSelect: () => window.location.href = "/pricing",
    }] : [{
      title: t("pricing.yearly"),
      price: "$99.99",
      period: "/year",
      features: [
        { name: "Everything in Monthly", included: true },
        { name: "Priority support", included: true },
        { name: "Early access to new tools", included: true },
        { name: "No ads", included: true },
      ],
      buttonText: t("pricing.getStarted"),
      onSelect: () => window.location.href = "/pricing",
    }]),
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            {t("hero.title").split(" ").map((word, index) =>
              word === "Online" ? (
                <span key={index} className="text-primary-600"> {word} </span>
              ) : (
                <span key={index}>{word} </span>
              )
            )}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button size="lg" className="text-lg px-8 py-3" asChild>
              <a href="/tools">{t("hero.explore")}</a>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-3" asChild>
              <a href="#pricing">{t("hero.pricing")}</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {t("tools.popular")}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {t("tools.subtitle")}
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                className="px-6 py-2 rounded-full"
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* ➡️ Navigate Button (Right aligned and responsive) */}
          {/* <div className="flex justify-center mt-4 mb-6">
            <Button
              size="lg"
              asChild
              className="text-lg px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-md hover:shadow-xl transition duration-300 transform hover:scale-105"
            >
              <a href="/tools" className="flex items-center space-x-2">
                <span>Navigate to more tools</span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </Button>
          </div> */}


          {/* Tools Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                    <div className="flex justify-between items-center">
                      <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTools.map((tool: Tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
          {/* ➡️ Navigate Button (Right aligned) */}
          {/* <div className="flex justify-end mt-8">
            <Button size="lg" variant="outline" className="text-lg px-8 py-3" asChild>
              <a href="/tools">Navigate to more tools</a>
            </Button>
          </div> */}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {t("pricing.title")}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {t("pricing.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <PricingCard key={index} {...plan} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}

    </div>
  );
}
