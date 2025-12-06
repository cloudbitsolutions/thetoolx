import { useLanguage } from "@/components/LanguageProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Target, Award, Shield } from "lucide-react";

export default function About() {
  const { t } = useLanguage();

  const stats = [
    { icon: Users, label: "Active Users", value: "50K+" },
    { icon: Target, label: "Tools Available", value: "12+" },
    { icon: Award, label: "Success Rate", value: "99.9%" },
    { icon: Shield, label: "Secure Downloads", value: "100%" }
  ];

  const features = [
    {
      title: "Fast & Reliable",
      description: "Lightning-fast processing with 99.9% uptime guarantee"
    },
    {
      title: "Multiple Formats",
      description: "Support for various video formats and quality options"
    },
    {
      title: "No Registration Required",
      description: "Use basic tools without creating an account"
    },
    {
      title: "Secure & Private",
      description: "Your data is encrypted and never stored permanently"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            About TheToolx
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            We provide powerful, easy-to-use online tools for downloading videos, converting files, 
            and enhancing your digital experience. Our mission is to make online tools accessible to everyone.
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center">
              <CardContent className="p-6">
                <stat.icon className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Why Choose TheToolx?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Mission Section */}
        <Card className="mb-16">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Our Mission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-gray-600 dark:text-gray-300 text-center max-w-4xl mx-auto">
              At TheToolx, we believe in empowering users with simple, efficient, and secure online tools. 
              Our platform brings together the most essential digital utilities in one place, making your 
              online experience smoother and more productive. We're committed to providing free access to 
              basic tools while offering premium features for power users.
            </p>
          </CardContent>
        </Card>

        {/* Team Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Built by Developers, for Everyone
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Our team of experienced developers and designers work tirelessly to create tools that are 
            not only powerful but also intuitive and user-friendly. We're passionate about making 
            technology accessible to everyone.
          </p>
        </div>
      </div>
    </div>
  );
}