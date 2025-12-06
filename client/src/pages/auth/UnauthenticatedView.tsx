import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { useCurrentTool } from "@/hooks/useCurrentTool";

export default function UnauthenticatedView() {
  const { name, description } = useCurrentTool();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {name}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
            {description}
          </p>

          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <Crown className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Please login to use this feature.
              </p>
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <a href="/auth">Log In to Continue</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
