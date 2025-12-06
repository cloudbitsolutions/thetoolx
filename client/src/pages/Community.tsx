import { useLanguage } from "@/components/LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, BookOpen, Lightbulb } from "lucide-react";

export default function Community() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <MessageSquare className="h-12 w-12 mx-auto text-blue-600 mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">TheToolx Community</h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            A space for our users worldwide to share tips, ask questions, and help 
            make our 12+ tools better every day.
          </p>
        </div>

        {/* Cards Section */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="hover:shadow-xl transition">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="text-yellow-500" /> Tips & Tricks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">
                Discover smart ways to use our downloaders, converters, and translator. 
                Share your own hacks with the community!
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="text-green-500" /> Feedback & Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">
                Have an idea for a new tool or feature? Tell us what you’d love to see next 
                on TheToolx platform.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="text-blue-500" /> Guides & Tutorials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">
                Browse step-by-step guides to make the most of our tools, from video downloaders 
                to the background remover.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <a
            href="/tools"
            className="inline-block px-8 py-3 rounded-2xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 transition-all hover:shadow-xl"
          >
            Explore All Tools
          </a>
          <a
            href="/feedback"
            className="ml-4 inline-block px-8 py-3 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
          >
            Give Feedback
          </a>
        </div>
      </div>
    </div>
  );
}
