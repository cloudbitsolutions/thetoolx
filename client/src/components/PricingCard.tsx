import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PricingCardProps {
  title: string;
  price: string;
  period: string;
  features: { name: string; included: boolean }[];
  popular?: boolean;
  buttonText: string;
  buttonVariant?: "default" | "outline" | "secondary";
  onSelect?: () => void;
  disabled?: boolean;
  badge?: string;
}

export default function PricingCard({
  title,
  price,
  period,
  features,
  popular,
  buttonText,
  buttonVariant = "default",
  onSelect,
  disabled = false,
  badge
}: PricingCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "relative rounded-lg shadow-md transition-all duration-300",
        popular ? "border-2 border-primary-500" : ""
      )}
    >
      <Card className="h-full flex flex-col">
        {(popular || badge) && (
          <div className="absolute -top-3 sm:-top-4 md:-top-6 left-1/2 transform -translate-x-1/2 z-10">
            <div
              className={cn(
                "inline-flex items-center gap-3 rounded-full border-2 px-3 py-1 sm:px-4 sm:py-1.5 backdrop-blur-md",
                // light / dark backgrounds
                "bg-white/90 dark:bg-gray-900/80",
                // border and subtle shadow for emphasis
                "border-yellow-400 dark:border-yellow-300 shadow-sm",
                // responsive elevation
                "sm:shadow-md"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full",
                  "w-6 h-6 sm:w-7 sm:h-7",
                  // small circular star background to make the icon pop
                  "bg-yellow-100 dark:bg-yellow-900/30"
                )}
                aria-hidden
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 dark:text-yellow-300"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 .587l3.668 7.431L24 9.748l-6 5.848 1.417 8.266L12 18.896l-7.417 4.966L6 15.596 0 9.748l8.332-1.73z" />
                </svg>
              </span>

              <span
                className={cn(
                  "font-semibold tracking-tight",
                  "text-xs sm:text-sm md:text-base",
                  // text color adapts to light/dark
                  "text-gray-800 dark:text-white"
                )}
              >
                {badge || "Most Popular"}
              </span>
            </div>
          </div>
        )}

        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </CardTitle>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {price}
            <span className="text-sm text-gray-600 dark:text-gray-300 font-normal">
              {period}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 flex flex-col flex-grow">
          <ul className="space-y-3 flex-grow">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center">
                {feature.included ? (
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                ) : (
                  <X className="w-5 h-5 text-red-500 mr-3" />
                )}
                <span className={cn(
                  "text-sm",
                  feature.included
                    ? "text-gray-600 dark:text-gray-300"
                    : "text-gray-400 dark:text-gray-600"
                )}>
                  {feature.name}
                </span>
              </li>
            ))}
          </ul>

          <Button
            onClick={onSelect}
            disabled={disabled}
            className={cn(
              "w-full text-white bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-md hover:shadow-xl transition-transform duration-300 transform hover:scale-105",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {buttonText}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
