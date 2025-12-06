import { useLanguage } from "@/components/LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Cookies() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Cookie Policy</h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">This page explains how TheToolx uses cookies and similar technologies.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>What are cookies?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300">Cookies are small pieces of data stored on your device by your web browser. We use cookies to improve site functionality, remember preferences, and analyze usage.</p>
            <h3 className="mt-4 font-semibold">Types of cookies we use</h3>
            <ul className="list-disc pl-5 mt-2 text-gray-700 dark:text-gray-300 space-y-1">
              <li>Essential cookies: required for basic site operations.</li>
              <li>Performance cookies: help us understand usage and improve the site.</li>
              <li>Functional cookies: remember your preferences.</li>
            </ul>

            <h3 className="mt-4 font-semibold">Managing cookies</h3>
            <p className="text-gray-700 dark:text-gray-300">You can change cookie settings in your browser. Disabling certain cookies may affect site functionality.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
