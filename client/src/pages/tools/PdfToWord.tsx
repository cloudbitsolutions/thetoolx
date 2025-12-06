import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import StarRating from "@/components/ui/star-rating";
import { Upload, Share2, Star, FileText } from "lucide-react";
import { useCurrentTool } from "@/hooks/useCurrentTool";
//import ToolAd from '@/components/ToolAd';
import PremiumGuard from "@/components/PremiumGuard";
import { useAuth } from "@/hooks/useAuth";
import UnauthenticatedView from "../auth/UnauthenticatedView";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import ReusableSlider from "../SliderProps";
import { useToolRating } from "@/lib/useToolRating";
import TranslatableBlock from "@/components/TranslatableBlock";
import NotFound from "../not-found";

interface FAQItemProps {
  question: string;
  answer: string;
  index: number;
}

export default function PdfToWord() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [conversionResult, setConversionResult] = useState<{
    filename: string;
    size: string;
  } | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { toolId, toolSlug, isToolPremium, name, description, isLoginRequired, isActive, isLoading } = useCurrentTool();
  const convertMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/convert/pdf-to-word", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Conversion failed");

      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || "converted.docx";

      const blob = await response.blob();

      return { blob, filename };
    },
    onSuccess: ({ blob, filename }) => {
      const fileSize = (blob.size / 1024 / 1024).toFixed(2) + " MB";
      setConversionResult({ filename, size: fileSize });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);

      toast({
        title: "Success",
        description: "PDF converted to Word and downloaded!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to convert PDF",
        variant: "destructive",
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment?: string }) => {
      if (!toolId) throw new Error("Tool ID not available");
      const response = await fetch(`/api/tools/${toolId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Rating submitted successfully!",
      });
      setRating(0);
      setComment("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit rating",
        variant: "destructive",
      });
    },
  });
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const isSSR = typeof window === 'undefined';
  if (!isSSR && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center text-gray-500 animate-pulse">Loading...</div>
      </div>
    );
  }


  if (typeof isActive !== 'undefined' && !isActive) return <NotFound />;

  function DynamicRatingDisplay() {
    const { data, isLoading, error } = useToolRating(toolId);

    if (isLoading) {
      return (
        <>
          <StarRating rating={0} readonly size="lg" />
          <span className="ml-2 text-sm text-gray-500">Loading...</span>
        </>
      );
    }

    if (error || !data) {
      return (
        <>
          <StarRating rating={4.7} readonly size="lg" />
          <span className="ml-2 text-xl font-bold text-yellow-600 dark:text-yellow-400">4.7</span>
          <span className="ml-3 text-sm text-gray-600 dark:text-gray-300">Based on 2,156 reviews</span>
        </>
      );
    }

    return (
      <>
        <StarRating rating={Number(data.average) || 0} readonly size="lg" />
        <span className="ml-2 text-xl font-bold text-yellow-600 dark:text-yellow-400">{(Number(data.average) || 0).toFixed(1)}</span>
        <span className="ml-3 text-sm text-gray-600 dark:text-gray-300">Based on {data.totalReviews.toLocaleString()} reviews</span>
      </>
    );
  }

  

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      toast({
        title: "Error",
        description: "Please select a valid PDF file",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "No file selected",
        variant: "destructive",
      });
      return;
    }
    setConversionResult(null);
    convertMutation.mutate(selectedFile);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      toast({
        title: "Error",
        description: "Please select a rating",
        variant: "destructive",
      });
      return;
    }
    reviewMutation.mutate({ rating, comment });
  };

  const handleShare = (platform: string) => {
    const currentUrl = window.location.href;
    const text = "Check out this amazing PDF to Word Converter!";
    let shareUrl = "";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          currentUrl
        )}`;
        break;
      case "twitter":
      case "x":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
          currentUrl
        )}&text=${encodeURIComponent(text)}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(
          text + " " + currentUrl
        )}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          currentUrl
        )}`;
        break;
    }

    window.open(shareUrl, "_blank");
  };

  const FAQItem = ({ question, answer, index }: FAQItemProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <motion.div
        initial={false}
        animate={{ height: 'auto' }}
        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
      >
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full p-4 text-left bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          whileHover={{ backgroundColor: "rgba(243, 244, 246, 0.8)" }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="font-semibold text-gray-900 dark:text-white text-sm md:text-base pr-4">
            {index + 1}. <TranslatableBlock>{question}</TranslatableBlock>
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="flex-shrink-0 ml-2"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>

          {/* <div className="mb-6">
            <ToolAd />
          </div> */}
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base leading-relaxed">
                  <TranslatableBlock>{answer}</TranslatableBlock>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  if (isLoginRequired && !isAuthenticated) {
    return <UnauthenticatedView />;
  }

  return (
    <PremiumGuard toolId={toolId ?? 0} isToolPremiumFromTool={isToolPremium} toolNameFromProps={name}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header with 3D effect */}
          <div className="text-center mb-8 transform transition-all duration-500 hover:scale-105">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl shadow-lg transform rotate-6 transition-all duration-300 hover:rotate-3 hover:shadow-xl"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-xl shadow-md transform -rotate-3 transition-all duration-300 hover:rotate-0 hover:shadow-lg flex items-center justify-center">
                <FileText className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 mb-3">
              {name}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {description}
            </p>
          </div>

          {/* Upload Card */}
          <Card className="mb-8 border-0 shadow-xl transform transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/70">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-800 dark:text-white">
                <TranslatableBlock>Upload PDF File</TranslatableBlock>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="mt-3 flex justify-center px-6 pt-8 pb-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl bg-white/50 dark:bg-gray-700/30 hover:bg-white/70 dark:hover:bg-gray-700/50 transition-colors duration-300">
                  <div className="space-y-3 text-center">
                    <div className="mx-auto w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                      <Upload className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex flex-col sm:flex-row text-sm text-gray-600 dark:text-gray-300 items-center justify-center gap-1">
                      <label
                        htmlFor="file"
                        className="relative cursor-pointer font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 underline underline-offset-4"
                      >
                        <span>Click to upload</span>
                        <input
                          id="file"
                          name="file"
                          type="file"
                          accept=".pdf"
                          className="sr-only"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p>or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      PDF files only (max 10MB)
                    </p>
                  </div>
                </div>
                {selectedFile && (
                  <div className="mt-3 p-4 bg-white/70 dark:bg-gray-800/70 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:bg-white dark:hover:bg-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={convertMutation.isPending || !selectedFile}
                  className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  {convertMutation.isPending ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Converting...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-5 h-5" />
                      <TranslatableBlock>Convert to Word</TranslatableBlock>
                    </div>
                  )}
                </Button>
              </form>

              {conversionResult && (
                <div className="mt-6 p-5 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200 dark:border-green-800/50 animate-fade-in-up">
                  <h3 className="text-lg font-bold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Conversion Complete!
                  </h3>
                  <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
                    <p>
                      <span className="font-medium">File:</span> {conversionResult.filename}
                    </p>
                    <p>
                      <span className="font-medium">Size:</span> {conversionResult.size}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* New Content Section */}
          <Card className="mb-8 border-0 shadow-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/70 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg shadow">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span><TranslatableBlock>About PDF to Word Conversion</TranslatableBlock></span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-gray-700 dark:text-gray-300">
              <p>
                <TranslatableBlock>
                  Converting Word documents to PDF has become an essential task for students, professionals, and businesses alike.
                  PDFs are universally compatible, preserve the formatting of your document, and can be easily shared, printed, or stored.
                  With TheToolx Word to PDF Converter, you can effortlessly turn any .doc or .docx file into a high-quality PDF in just a few clicks,
                  all without installing additional software.
                </TranslatableBlock>
              </p>
              <p>
                <TranslatableBlock>
                  Whether it's a multi-page business proposal, a school essay, a product catalog, or a personal report with images,
                  our tool ensures your document remains visually consistent and professional.
                </TranslatableBlock>
              </p>

              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <TranslatableBlock>
                    Why Convert Word to PDF?
                  </TranslatableBlock>
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white"><TranslatableBlock>Preserve Formatting and Layout</TranslatableBlock></h4>
                    <p>
                      <TranslatableBlock>
                        One of the biggest challenges with Word files is that they can look different on other devices or Word versions.
                        Converting to PDF fixes this problem. PDFs maintain your fonts, spacing, headers, footers, page numbers, tables,
                        and images exactly as intended. No more worrying about text shifting or formatting issues when sharing documents.
                      </TranslatableBlock>
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white"><TranslatableBlock>Easier Sharing Across Platforms</TranslatableBlock></h4>
                    <p>
                      <TranslatableBlock>
                        PDFs are compatible with virtually every device, operating system, and email platform. Whether you're sending your
                        document to a colleague, submitting an assignment to your teacher, or uploading it online, PDFs ensure your content
                        looks the same for everyone.
                      </TranslatableBlock>
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white"><TranslatableBlock>Secure and Professional</TranslatableBlock></h4>
                    <p>
                      <TranslatableBlock>
                        PDFs are not only easy to share but also more secure. Many tools allow you to password-protect PDFs or restrict
                        copying and editing, making them ideal for confidential business documents.
                      </TranslatableBlock>
                    </p>
                  </div>
                </div>
              </div>

              {/* <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Step-by-Step Guide to Convert Word to PDF
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white">Step 1: Upload Your Word Document</h4>
                    <p>
                      Start by selecting the "Upload Your File" button or dragging and dropping your Word file into TheToolx converter.
                      Our platform supports both .doc and .docx formats, making it flexible for any Word version.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white">Step 2: Edit Your Document (Optional)</h4>
                    <p>
                      Before converting, you can make quick edits directly in the platform. Fix typos, adjust fonts, add images, tables,
                      or charts, and make sure your content is exactly how you want it to appear in PDF form. TheToolx editor is intuitive
                      and beginner-friendly, so no design experience is required.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white">Step 3: Convert Your File</h4>
                    <p>
                      Once you're satisfied with your edits, click the convert button. In seconds, your Word document will transform into
                      a high-quality PDF, retaining all formatting, images, and page layouts.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white">Step 4: Download and Share</h4>
                    <p>
                      After conversion, download your PDF instantly. Now, your document is ready to be shared via email, uploaded to a website,
                      printed, or archived for future use.
                    </p>
                  </div>
                </div>
              </div> */}

              <ReusableSlider
                heading="Step-by-Step Guide to Convert Word to PDF"
                colorDot="bg-pink-500"
                items={[
                  { title: "Step 1: Upload Your Word Document", description: "Start by selecting the Upload Your File button or dragging and dropping your Word file into TheToolx converter. Our platform supports both .doc and .docx formats, making it flexible for any Word version." },
                  { title: "Step 2: Edit Your Document (Optional)", description: "Before converting, you can make quick edits directly in the platform. Fix typos, adjust fonts, add images, tables, or charts, and make sure your content is exactly how you want it to appear in PDF form. TheToolx editor is intuitiveand beginner-friendly, so no design experience is required." },
                  { title: "Step 3: Convert Your File", description: "Once you're satisfied with your edits, click the convert button. In seconds, your Word document will transform into a high-quality PDF, retaining all formatting, images, and page layouts." },
                  { title: "Step 4: Download and Share", description: "After conversion, download your PDF instantly. Now, your document is ready to be shared via email, uploaded to a website, printed, or archived for future use." },
                ]}
                //slideStyle={{ width: "60%", height: "200px" }}
                slideStyle="w-12/12 sm:w-3/4 md:w-1/2 h-84 md:h-62"
              />

              <ReusableSlider
                heading="Additional Features of TheToolx Word to PDF Converter"
                colorDot="bg-pink-500"
                items={[
                  { title: "High-Quality Output", description: "Preserves fonts, graphics, tables, perfect for professional reports." },
                  { title: "Quick Last-Minute Edits", description: "Update text, images, tables before converting your PDF." },
                  { title: "No Software Installation Required", description: "Browser-based. Works on any device quickly and securely." },
                  { title: "Supports All Word Versions", description: "Works with DOC and DOCX without compatibility issues." },
                ]}
                //slideStyle={{ width: "40%", height: "150px" }}
                slideStyle="w-11/12 sm:w-3/4 md:w-1/2 h-44 md:h-32"
              />


              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <TranslatableBlock>Tips for Converting Word to PDF</TranslatableBlock>
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <TranslatableBlock>
                    <li>Check Formatting Before Conversion: Ensure that headings, fonts, and spacing are correct. PDFs will preserve everything exactly as it appears.</li>
                    <li>Include Images and Graphics Properly: High-resolution images in Word will be preserved in the PDF, keeping your document professional-looking.</li>
                    <li>Use Tables and Charts Carefully: Make sure tables fit within the page margins; otherwise, content might be cut off in the PDF.</li>
                    <li>Compress if Necessary: For large documents, you may want to compress the PDF after conversion for easier sharing.</li>
                  </TranslatableBlock>
                </ul>
              </div>

              {/* FAQ Card */}
              <motion.div
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="shadow-xl border-0 bg-gradient-to-br from-white-50 to-pink-50 dark:from-gray-800 dark:to-gray-700/80">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <TranslatableBlock>
                        Frequently Asked Questions
                      </TranslatableBlock>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        q: "What is a PDF?",
                        a: "PDF stands for Portable Document Format. It is a universal file type that retains the formatting, fonts, images, and layout of your original document, ensuring consistent appearance across all devices."
                      },
                      {
                        q: "How do I convert Word files to PDF?",
                        a: "Upload your .doc or .docx file to TheToolx converter, make any optional edits, click Convert, and download your PDF instantly."
                      },
                      {
                        q: "Can I edit my Word file before converting it?",
                        a: "Yes. TheToolx allows you to make quick edits, such as updating text, adding images, or modifying tables before converting to PDF."
                      },
                      {
                        q: "What is the difference between DOC and DOCX?",
                        a: "DOC is the older Word format, while DOCX is the newer version with better compression and enhanced features. Our converter supports both seamlessly."
                      },
                      {
                        q: "Is TheToolx free and safe to use?",
                        a: "Yes. TheToolx is completely free for basic conversions and uses secure HTTPS connections to protect your files during the conversion process."
                      }
                    ].map((faq, index) => (
                      <FAQItem
                        key={index}
                        question={faq.q}
                        answer={faq.a}
                        index={index}
                      />
                    ))}
                  </CardContent>
                </Card>
              </motion.div>

              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50">
                <p className="text-center font-semibold text-blue-700 dark:text-blue-300">
                  <TranslatableBlock>
                    ✅ Convert Word to PDF effortlessly with TheToolx. Preserve formatting, share documents across platforms,
                    and create professional, ready-to-use PDFs in seconds. It's fast, secure, and designed to make your workflow easier,
                    whether for school, work, or personal projects.
                  </TranslatableBlock>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Share Card */}
          <Card className="mb-8 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/70 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800 dark:text-whit">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg shadow">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
                <span><TranslatableBlock>Share this tool</TranslatableBlock></span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                <Button
                  variant="outline"
                  onClick={() => handleShare("facebook")}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800 transition-all duration-300 hover:scale-105"
                >
                  <i className="fab fa-facebook-f text-blue-600 dark:text-blue-400 text-lg"></i>
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShare("twitter")}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800 transition-all duration-300 hover:scale-105"
                >
                  <i className="fab fa-twitter text-blue-400 dark:text-blue-300 text-lg"></i>
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShare("whatsapp")}
                  className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 border-green-200 dark:border-green-800 transition-all duration-300 hover:scale-105"
                >
                  <i className="fab fa-whatsapp text-green-600 dark:text-green-400 text-lg"></i>
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShare("linkedin")}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800 transition-all duration-300 hover:scale-105"
                >
                  <i className="fab fa-linkedin-in text-blue-700 dark:text-blue-400 text-lg"></i>
                  LinkedIn
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rating Card (simplified - only stars) */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/70 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800 dark:text-white">
                <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg shadow">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <span><TranslatableBlock>Rate this tool</TranslatableBlock></span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex items-center">
                    <DynamicRatingDisplay />
                  </div>
                </div>

                <form onSubmit={handleReviewSubmit} className="space-y-6">
                  <div>
                    <Label className="text-lg dark:text-gray-300"><TranslatableBlock>Your Rating</TranslatableBlock></Label>
                    <div className="mt-3 flex justify-center">
                      <StarRating
                        rating={rating}
                        onRatingChange={setRating}
                        size="lg"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-lg dark:text-gray-300"><TranslatableBlock>Comment</TranslatableBlock></Label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full mt-2 p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none"
                      rows={4}
                      placeholder="Share your experience or feedback..."
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={reviewMutation.isPending || rating === 0}
                    className="w-full sm:w-auto px-8 py-6 text-lg font-semibold bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                  >
                    {reviewMutation.isPending ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Submitting...
                      </div>
                    ) : (
                      "Submit Rating"
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        <style>
          {`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
        }
        @media (max-width: 640px) {
          .text-4xl {
            font-size: 2rem;
          }
          .text-xl {
            font-size: 1.125rem;
          }
        }
      `}
        </style>
      </div>
    </PremiumGuard>
  );
}