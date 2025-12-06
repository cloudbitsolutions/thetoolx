import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Video, 
  FileText, 
  Download,
  Search,
  PlayCircle,
  Users,
  Lightbulb,
  ArrowRight,
  Star,
  Clock
} from "lucide-react";

export default function Help() {
  const helpCategories = [
    {
      title: "Getting Started",
      icon: PlayCircle,
      color: "bg-blue-500",
      articles: [
        "How to create your first account",
        "Understanding our tool categories",
        "Basic navigation guide",
        "Setting up your profile"
      ]
    },
    {
      title: "Video Tools",
      icon: Video,
      color: "bg-red-500",
      articles: [
        "Downloading YouTube videos",
        "Facebook video downloader guide",
        "TikTok video extraction",
        "Instagram video download",
        "Twitter video saving"
      ]
    },
    {
      title: "File Converters",
      icon: FileText,
      color: "bg-green-500",
      articles: [
        "PDF to Word conversion",
        "YouTube to MP3 converter",
        "Image format conversion",
        "Audio file conversion",
        "Batch file processing"
      ]
    },
    {
      title: "Premium Features",
      icon: Star,
      color: "bg-purple-500",
      articles: [
        "URL shortener usage",
        "Advanced conversion options",
        "Priority processing",
        "Bulk operations",
        "API access"
      ]
    }
  ];

  const popularArticles = [
    {
      title: "How to Download YouTube Videos",
      views: "15.2k views",
      readTime: "3 min read",
      category: "Video Tools",
      featured: true
    },
    {
      title: "Converting PDF to Word Documents",
      views: "12.8k views",
      readTime: "2 min read",
      category: "Converters",
      featured: true
    },
    {
      title: "Using the Age Calculator Tool",
      views: "8.4k views",
      readTime: "1 min read",
      category: "Utilities",
      featured: false
    },
    {
      title: "Internet Speed Test Guide",
      views: "6.9k views",
      readTime: "2 min read",
      category: "Utilities",
      featured: false
    },
    {
      title: "Premium Account Benefits",
      views: "5.2k views",
      readTime: "4 min read",
      category: "Premium",
      featured: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Help Center
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Find answers to your questions and learn how to make the most of our tools.
          </p>
        </div>

        {/* Search */}
        {/* <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
            <Input 
              placeholder="Search help articles, guides, and FAQs..."
              className="pl-12 h-12 text-lg"
            />
          </div>
        </div> */}

        {/* Popular Articles */}
        {/* <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Popular Articles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularArticles.map((article, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="outline">{article.category}</Badge>
                    {article.featured && (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2">
                    {article.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {article.views}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {article.readTime}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div> */}

        {/* Help Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Browse by Category
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {helpCategories.map((category, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <div className={`w-8 h-8 ${category.color} rounded-lg flex items-center justify-center mr-3`}>
                      <category.icon className="w-4 h-4 text-white" />
                    </div>
                    {category.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {category.articles.map((article, articleIndex) => (
                      <li key={articleIndex} className="flex items-center text-gray-600 dark:text-gray-300 hover:text-blue-500 cursor-pointer">
                        <ArrowRight className="w-4 h-4 mr-2 flex-shrink-0" />
                        {article}
                      </li>
                    ))}
                  </ul>
                  {/* <Button variant="outline" className="w-full mt-4">
                    View All Articles
                  </Button> */}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Start Guide */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lightbulb className="w-5 h-5 mr-2" />
              Quick Start Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">1</span>
                </div>
                <h3 className="font-semibold mb-2">Choose Your Tool</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Browse our collection of tools and select the one that fits your needs.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">2</span>
                </div>
                <h3 className="font-semibold mb-2">Input Your Data</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Paste URLs, upload files, or enter the information required by the tool.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400">3</span>
                </div>
                <h3 className="font-semibold mb-2">Get Results</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Process your request and download or view the results instantly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Video Tutorials */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Video className="w-5 h-5 mr-2" />
              Video Tutorials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
                <PlayCircle className="w-8 h-8 mb-3" />
                <h3 className="font-semibold mb-2">Getting Started</h3>
                <p className="text-sm opacity-90 mb-3">Learn the basics of using our platform</p>
                <Button variant="secondary" size="sm">
                  Watch Video
                </Button>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-lg p-6 text-white">
                <Download className="w-8 h-8 mb-3" />
                <h3 className="font-semibold mb-2">Video Downloading</h3>
                <p className="text-sm opacity-90 mb-3">Step-by-step video download guide</p>
                <Button variant="secondary" size="sm">
                  Watch Video
                </Button>
              </div>
              <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-lg p-6 text-white">
                <FileText className="w-8 h-8 mb-3" />
                <h3 className="font-semibold mb-2">File Conversion</h3>
                <p className="text-sm opacity-90 mb-3">Convert files like a pro</p>
                <Button variant="secondary" size="sm">
                  Watch Video
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Still Need Help */}
        <Card className="text-center">
          <CardContent className="p-8">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Still Need Help?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Can't find what you're looking for? Our support team is ready to help you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button>Contact Support</Button>
              <Button variant="outline">Join Community</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}