import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, 
  Mail, 
  Phone, 
  Clock, 
  Search,
  BookOpen,
  Users,
  Zap,
  CheckCircle,
  AlertCircle
} from "lucide-react";

export default function Support() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    priority: "Low",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const faqs = [
    {
      question: "How do I download videos from social media?",
      answer: "Simply paste the video URL into our video downloader tool, select your preferred quality, and click download. We support Facebook, YouTube, TikTok, Instagram, and Twitter videos.",
      category: "Tools"
    },
    {
      question: "What file formats do you support for conversion?",
      answer: "We support a wide range of formats including PDF to Word, various video formats, audio formats, and image formats. Check each tool's specific supported formats.",
      category: "Conversion"
    },
    {
      question: "Is there a limit to file size?",
      answer: "Free users have a 50MB limit per file. Premium users enjoy unlimited file sizes and faster processing speeds.",
      category: "Limits"
    },
    {
      question: "How can I upgrade to premium?",
      answer: "Visit our pricing page and choose between monthly or yearly plans. Premium includes unlimited usage, priority support, and exclusive tools.",
      category: "Premium"
    },
    {
      question: "Are my files secure?",
      answer: "Yes, we use SSL encryption and automatically delete processed files after 24 hours. We never store or share your personal files.",
      category: "Security"
    },
    {
      question: "Can I use the tools offline?",
      answer: "Our tools are web-based and require an internet connection. However, once you download processed files, you can access them offline.",
      category: "General"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Support Center
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Get help with our tools and services. We're here to assist you 24/7.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <MessageSquare className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Live Chat</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Chat with our support team in real-time
              </p>
              <Button className="w-full">Start Chat</Button>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <Mail className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Email Support</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Send us an email and we'll respond within 24 hours
              </p>
              <Button variant="outline" className="w-full" asChild>
                <a href="mailto:contact.themoviesz@gmail.com">Send Email</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <BookOpen className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Documentation</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Browse our comprehensive guides and tutorials
              </p>
              <Button variant="outline" className="w-full">View Docs</Button>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
          <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Contact Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!form.email || form.email.trim() === "") {
                toast({ title: "Email is required", description: "Please enter your email address.", variant: "destructive" });
                return;
              }
              setIsSubmitting(true);
              try {
                const res = await fetch("/api/contact", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    subject: form.subject,
                    category: form.priority,
                    message: form.message
                  })
                });
                const data = await res.json();
                if (data.success) {
                  toast({ title: "Message Sent!", description: "Thank you for contacting us. We'll get back to you within 24 hours." });
                  setForm({ name: "", email: "", subject: "", priority: "Low", message: "" });
                } else {
                  toast({ title: "Submission Failed", description: data.message || "Unable to send your message.", variant: "destructive" });
                }
              } catch (err) {
                toast({ title: "Submission Failed", description: "Unable to send your message.", variant: "destructive" });
              } finally {
                setIsSubmitting(false);
              }
            }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <Input placeholder="Your full name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input placeholder="your@email.com" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subject</label>
                  <Input placeholder="How can we help you?" value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <Textarea placeholder="Describe your issue or question in detail..." rows={5} value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} />
                </div>
              </div>
              <Button type="submit" className="mt-6" disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send Message'}</Button>
            </form>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex-1">
                      {faq.question}
                    </h3>
                    <Badge variant="outline" className="ml-2">
                      {faq.category}
                    </Badge>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status & Response Times */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2 text-green-500" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>API Services</span>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-green-500">Operational</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Video Downloaders</span>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-green-500">Operational</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>File Converters</span>
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-yellow-500 mr-1" />
                    <span className="text-yellow-500">Minor Issues</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Premium Features</span>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-green-500">Operational</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Response Times
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Live Chat</span>
                  <span className="text-green-500 font-medium">~2 minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Email Support</span>
                  <span className="text-blue-500 font-medium">~4 hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Premium Support</span>
                  <span className="text-purple-500 font-medium">~1 hour</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Bug Reports</span>
                  <span className="text-orange-500 font-medium">~24 hours</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}