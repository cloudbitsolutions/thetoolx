import { useLanguage } from "@/components/LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, Cloud } from "lucide-react";

export default function Status() {
  const { t } = useLanguage();

  // Fake API data (could later come from backend)
  const tools = [
    { id: 1, name: "YouTube Video Downloader", status: "operational" },
    { id: 2, name: "YouTube to MP3", status: "operational" },
    { id: 3, name: "Facebook Downloader", status: "operational" },
    { id: 4, name: "TikTok Downloader", status: "operational" },
    { id: 5, name: "Twitter Downloader", status: "operational" },
    { id: 6, name: "Instagram Downloader", status: "operational" },
    { id: 7, name: "Speed Test", status: "operational" },
    { id: 8, name: "Age Calculator", status: "operational" },
    { id: 9, name: "PDF to Word Converter", status: "operational" },
    { id: 10, name: "Image Background Remover", status: "operational" },
    { id: 11, name: "URL Shortener", status: "operational" },
    { id: 12, name: "Language Translator", status: "operational" },
  ];

  const incidents: any[] = []
    // { id: 1, title: "TikTok Downloader downtime", status: "Resolved", time: "2025-09-20" },
  //];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <Cloud className="h-12 w-12 mx-auto text-blue-600 mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">System Status</h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            TheToolx platform powers <span className="font-semibold">12 tools</span>. 
            Check real-time availability and recent incidents here.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    All systems operational
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    No ongoing incidents
                  </div>
                </div>
              </div>

              <ul className="space-y-2">
                {tools.map(tool => (
                  <li key={tool.id} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    {tool.status === "operational" ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span>{(tool as any).translatedName || tool.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Recent Incidents */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              {incidents.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No incidents reported recently.</p>
              ) : (
                <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
                  {incidents.map(i => (
                    <li key={i.id}>
                      <span className="font-medium">{i.title}</span> —{" "}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {i.status} on {i.time}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
