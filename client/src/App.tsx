import { Switch, Route, useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
// import { queryClient } from "./lib/queryClient";
// import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import URLAnalytics from "@/pages/URLAnalytics";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Settings from "@/pages/Settings";
import Pricing from "@/pages/Pricing";
import Blog from "@/pages/Blog";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Support from "@/pages/Support";
import Help from "@/pages/Help";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth/AuthPage";

// Admin Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import BlogManagement from "@/pages/admin/BlogManagement";
import BlogCreate from "@/pages/admin/BlogCreate";
import UserFeedback from "@/pages/admin/UserFeedback";
import ToolsManagement from "@/pages/admin/ToolsManagement";
import UserMessages from "@/pages/admin/UserMessages";
import CreditsManagement from "@/pages/admin/CreditsManagement";
import PricingManagement from "@/pages/admin/PricingManagement";
import ToolCreate from "@/pages/admin/ToolCreate";
import ToolEdit from "@/pages/admin/ToolEdit";
import AdminLayout from "@/components/AdminLayout";
import AdminUsers from "@/pages/admin/Users";
import UsersAnalytics from "@/pages/admin/UsersAnalytics";

// Tool Pages
import YoutubeDownloader from "@/pages/tools/YoutubeDownloader";
import FacebookDownloader from "@/pages/tools/FacebookDownloader";
import InstagramDownloader from "@/pages/tools/InstagramDownloader";
import TiktokDownloader from "@/pages/tools/TiktokDownloader";
import TwitterDownloader from "@/pages/tools/TwitterDownloader";
import YoutubeToMp3 from "@/pages/tools/YoutubeToMp3";
import PdfToWord from "@/pages/tools/PdfToWord";
import BackgroundRemover from "@/pages/tools/BackgroundRemover";
import SpeedTest from "@/pages/tools/SpeedTest";
import AgeCalculator from "@/pages/tools/AgeCalculator";
import URLShortener from "@/pages/tools/URLShortener";
import Translator from "@/pages/tools/Translator";
import Tools from "@/pages/Tools";
import BlogPost from "./pages/BlogPost";
import EditBlogPost from "./pages/admin/BlogUpdate";
import AdminViewReviews from "./pages/admin/AdminViewReviews";
import AdminContactMessages from "./pages/admin/AdminContactMessages";
import Careers from "./pages/Careers";
import Status from "./pages/Status";
import Community from "./pages/Community";
import Cookies from "./pages/Cookies";
import Security from "./pages/Security";
import { ScrollToTop } from "./ScrollToTop";

function AppContent() {
  const [location] = useLocation();
  const ADMIN_BASE = '/toolx-adminUser-auth';
  const isAdminRoute = location.startsWith(ADMIN_BASE);
  const isSSR = typeof window === 'undefined';
  
  // Call authentication hook unconditionally so hooks order is stable
  const { isAuthenticated, isLoading } = useAuth();
  
  // Debug SSR rendering
  if (isSSR) {
    console.log('[SSR AppContent] location:', location, 'isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
  }

  // When auth state changes (for example after login) the router can briefly
  // render a NotFound route before redirecting — show a short spinner to
  // avoid that visual flash. We only show this short grace period when the
  // authentication status toggles.
  const [authTransitionDelay, setAuthTransitionDelay] = useState(false);
  const prevAuthRef = useRef<boolean | null>(null);
  // If a post-login redirect flag is present then immediately enter the
  // auth transition delay to avoid flashes during navigation after login.
  useEffect(() => {
    try {
      const v = sessionStorage.getItem("postLoginRedirect");
      if (v === "1") {
        setAuthTransitionDelay(true);
        sessionStorage.removeItem("postLoginRedirect");
        const t = setTimeout(() => setAuthTransitionDelay(false), 2000);
        return () => clearTimeout(t);
      }
    } catch (e) {
      // ignore sessionStorage errors
    }
  }, []);
  useEffect(() => {
    if (prevAuthRef.current === null) {
      prevAuthRef.current = isAuthenticated;
      return;
    }
    if (prevAuthRef.current !== isAuthenticated) {
      // Start short delay when auth changes (notably on login)
      setAuthTransitionDelay(true);
      const t = setTimeout(() => setAuthTransitionDelay(false), 2000);
      return () => clearTimeout(t);
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Separate routing for admin vs regular app
  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Switch>
          <Route path={`${ADMIN_BASE}`} component={() => (
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          )} />
          <Route path={`${ADMIN_BASE}/blog`} component={() => (
            <AdminLayout>
              <BlogManagement />
            </AdminLayout>
          )} />
          <Route path={`${ADMIN_BASE}/feedback`} component={() => (
            <AdminLayout>
              <UserFeedback />
            </AdminLayout>
          )} />
          <Route path={`${ADMIN_BASE}/tools`} component={() => (
            <AdminLayout>
              <ToolsManagement />
            </AdminLayout>
          )} />
          <Route path={`${ADMIN_BASE}/users`} component={() => (
            <AdminLayout>
              <AdminUsers />
            </AdminLayout>
          )} />
          <Route path={`${ADMIN_BASE}/users/analytics`} component={() => (
            <AdminLayout>
              <UsersAnalytics />
            </AdminLayout>
          )} />
          <Route path={`${ADMIN_BASE}/reviews`} component={() => (
            <AdminLayout>
              <AdminViewReviews />
            </AdminLayout>
          )} />
          <Route path={`${ADMIN_BASE}/contact-messages`} component={() => (
            <AdminLayout>
              <AdminContactMessages />
            </AdminLayout>
          )} />
          <Route path={`${ADMIN_BASE}/messages`} component={() => (
            <AdminLayout>
              <UserMessages />
            </AdminLayout>
          )} />
          <Route path={`${ADMIN_BASE}/blog/create`} component={() => (
            <AdminLayout>
              <BlogCreate />
            </AdminLayout>
          )} />
          <Route path={`${ADMIN_BASE}/blog/edit/:id`} component={() => (
            <AdminLayout>
              <EditBlogPost />
            </AdminLayout>
          )} />
          <Route path={`${ADMIN_BASE}/credits`} component={() => (
            <AdminLayout>
              <CreditsManagement />
            </AdminLayout>
          )} />
          <Route path={`${ADMIN_BASE}/pricing`} component={() => (
            <AdminLayout>
              <PricingManagement />
            </AdminLayout>
          )} />
          <Route path={`${ADMIN_BASE}/tools/create`} component={() => (
            <AdminLayout>
              <ToolCreate />
            </AdminLayout>
          )} />
          <Route path={`${ADMIN_BASE}/tools/edit/:id`} component={({ params }) => (
            <AdminLayout>
              <ToolEdit params={params} />
            </AdminLayout>
          )} />
          <Route component={NotFound} />
        </Switch>
      </div>
    );
  }

  // Regular app routing

  // While auth state is resolving, or during a short auth transition delay,
  // avoid rendering the route Switch which can temporarily treat the current
  // path as unmatched (causing a brief 404).
  // IMPORTANT: Skip loading screen during SSR to allow full page rendering
  if (!isSSR && (isLoading || authTransitionDelay)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center bg-background text-foreground">
          <div className="flex flex-col items-center gap-4">
            {/* Modern animated spinner */}
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>

            <p className="text-gray-600 dark:text-gray-400 text-sm animate-pulse">
              Loading, please wait...
            </p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <ScrollToTop /> 
      <Switch>
        <>
          {/* Landing page for both authenticated and non-authenticated users */}
          <Route path="/" component={Landing} />

          {/* Dashboard route: always declared, but during a short auth transition
              show the loading spinner to avoid a transient 404 when the app is
              navigating immediately after login. Once the grace period ends
              render Dashboard only if authenticated; otherwise show NotFound. */}
          <Route
            path="/dashboard"
            component={() => {
              if (!isSSR && (isLoading || authTransitionDelay)) {
                return (
                  <div className="min-h-screen flex flex-col">
                    <Navbar />
                    <div className="flex-1 flex items-center justify-center bg-background text-foreground">
                      <div className="flex flex-col items-center gap-4">
                        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm animate-pulse">Loading, please wait...</p>
                      </div>
                    </div>
                  </div>
                );
              }
              return isAuthenticated ? <Dashboard /> : <NotFound />;
            }}
          />

          {/* Settings only for authenticated users */}
          {isAuthenticated && (
            <Route path="/settings" component={Settings} />
          )}

          {/* URL Analytics only for authenticated users */}
          {isAuthenticated && (
            <Route path="/url-analytics" component={URLAnalytics} />
          )}

          {/* Auth page for non-authenticated users */}
          <Route path="/auth" component={AuthPage} />

          {/* Common pages for all users */}
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route path="/careers" component={Careers} />
          <Route path="/status" component={Status} />
          <Route path="/community" component={Community} />
          <Route path="/cookies" component={Cookies} />
          <Route path="/security" component={Security} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/blog" component={Blog} />
          <Route path="/blog/:slug" component={BlogPost} />
          <Route path="/blog-post/:id" component={BlogPost} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route path="/support" component={Support} />
          <Route path="/help" component={Help} />

          {/* Tool routes for all users */}
          <Route path="/tools" component={Tools} />
          <Route path="/tools/youtube-video-downloader" component={YoutubeDownloader} />
          <Route path="/tools/facebook-video-downloader" component={FacebookDownloader} />
          <Route path="/tools/instagram-video-downloader" component={InstagramDownloader} />
          <Route path="/tools/tiktok-video-downloader" component={TiktokDownloader} />
          <Route path="/tools/twitter-video-downloader" component={TwitterDownloader} />
          <Route path="/tools/youtube-to-mp3-converter" component={YoutubeToMp3} />
          <Route path="/tools/pdf-to-word-converter" component={PdfToWord} />
          <Route path="/tools/background-remover" component={BackgroundRemover} />
          <Route path="/tools/internet-speed-test" component={SpeedTest} />
          <Route path="/tools/age-calculator" component={AgeCalculator} />
          <Route path="/tools/url-shortener" component={URLShortener} />
          <Route path="/tools/language-translator" component={Translator} />
        </>
        <Route component={NotFound} />
      </Switch>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
