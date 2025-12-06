import { useQuery } from "@tanstack/react-query";
import ToolCard from "@/components/ToolCard";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/LanguageProvider";
import { Card } from "@/components/ui/card";
import type { Tool } from "@shared/schema";
import { useState } from "react";

export default function Tools() {
    const { t, language } = useLanguage();

    const { data: tools = [], isLoading } = useQuery({
        queryKey: ["/api/tools", language],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (language && language !== 'en') params.set('lang', language);
            const res = await fetch(`/api/tools?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch tools');
            return res.json();
        },
    });

    const [selectedCategory, setSelectedCategory] = useState("all");

    const filteredTools = selectedCategory === "all" 
        ? tools 
        : tools.filter((tool: Tool) => tool.category === selectedCategory);

    const categories = [
        { id: "all", name: t("tools.all") },
        { id: "video", name: t("tools.video") },
        { id: "converter", name: t("tools.converter") },
        { id: "utility", name: t("tools.utility") },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                        {t('tools.popular') || 'All Tools'}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        {t('tools.subtitle') || 'Browse all available tools. Filter, try and upgrade to premium for exclusive features.'}
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

                {/* Tools Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <div className="p-6">
                                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                                </div>
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

            </div>
        </div>
    );
}
