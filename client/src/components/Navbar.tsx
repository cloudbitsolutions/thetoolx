import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logo from '@/assets/Logo.jpeg';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Sun,
  Moon,
  Globe,
  Menu,
  ChevronDown,
  User,
  LogOut,
  Settings,
  Crown
} from "lucide-react";

export default function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: t("nav.tools"), href: isAuthenticated ? "/" : "/#tools" },
    { name: t("nav.pricing"), href: "/pricing" },
    { name: t("nav.about"), href: "/about" },
    { name: t("nav.contact"), href: "/contact" },
  ];

  const Logo = () => (
    <Link href="/" className="flex items-center space-x-3" onClick={() => setMobileMenuOpen(false)}>
      <img
        src={logo}
        alt="TheToolx Logo"
        className="w-8 h-8 object-contain"
      />
      <span className="text-xl font-bold text-gray-900 dark:text-white">TheToolx.com</span>
    </Link>
  );

  const NavLinks = ({ mobile = false }) => (
    <div className={`${mobile ? 'flex flex-col space-y-4' : 'hidden md:flex items-center space-x-8'}`}>
      {navigation.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          onClick={() => mobile && setMobileMenuOpen(false)}
        >
          {item.name}
        </Link>
      ))}
    </div>
  );

  const UserMenu = ({ mobile = false }) => {
    if (isLoading) {
      return <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />;
    }

    if (!isAuthenticated) {
      return (
        <div className={`flex ${mobile ? 'flex-col space-y-2' : 'items-center space-x-2'}`}>
          <Button variant="ghost" asChild>
            <Link href="/auth" onClick={() => mobile && setMobileMenuOpen(false)}>
              {t("nav.login")}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/auth" onClick={() => mobile && setMobileMenuOpen(false)}>
              {t("nav.signup")}
            </Link>
          </Button>
        </div>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center space-x-2">
          <div className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
            Welcome, {user?.firstName || user?.email}
          </div>
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.profileImageUrl} />
            <AvatarFallback>
              {user?.firstName?.[0] || user?.email?.[0] || <User className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
              <User className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </DropdownMenuItem>
          {user?.subscriptionType !== 'free' && (
            <DropdownMenuItem asChild>
              <Link href="/dashboard" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
                <Crown className="w-4 h-4 mr-2" />
                Premium Features
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={logout} className="flex items-center cursor-pointer">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Logo />

          <NavLinks />

          <div className="flex items-center space-x-4">
            {/* Desktop Language Switcher */}
            <div className="hidden md:flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                    <Globe className="w-4 h-4" />
                    <span>{language.toUpperCase()}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setLanguage("en")}>🇺🇸 English</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("hi")}>🇮🇳 हिंदी</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("zh")}>🇨🇳 简体中文</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("es")}>🇪🇸 Español</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("pt")}>🇧🇷 Português</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("bn")}>🇧🇩 বাংলা</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("ru")}>🇷🇺 Русский</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("ar")}>🇸🇦 العربية</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("ja")}>🇯🇵 日本語</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("ko")}>🇰🇷 한국어</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("fr")}>🇫🇷 Français</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="p-2"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
            </div>

            {/* Desktop User Menu */}
            <div className="hidden md:flex">
              <UserMenu />
            </div>

            {/* Mobile quick icons (just globe + theme) */}
            {/* Mobile quick icons (just globe + theme) */}
            <div className="flex md:hidden items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full p-0 flex items-center justify-center"
                  >
                    <Globe className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setLanguage("en")}>🇺🇸 English</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("hi")}>🇮🇳 हिंदी</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("zh")}>🇨🇳 简体中文</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("es")}>🇪🇸 Español</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("pt")}>🇧🇷 Português</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("bn")}>🇧🇩 বাংলা</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("ru")}>🇷🇺 Русский</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("ar")}>🇸🇦 العربية</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("ja")}>🇯🇵 日本語</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("ko")}>🇰🇷 한국어</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("fr")}>🇫🇷 Français</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 rounded-full p-0 flex items-center justify-center"
              >
                {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </Button>
            </div>


            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col space-y-6 mt-6">
                  <NavLinks mobile />

                  {/* Mobile controls inside menu */}
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center space-x-1 w-full">
                          <Globe className="w-4 h-4" />
                          <span>{language.toUpperCase()}</span>
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-40 z-50"
                      >
                        <DropdownMenuItem onClick={() => setLanguage("en")}>🇺🇸 English</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage("hi")}>🇮🇳 हिंदी</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage("zh")}>🇨🇳 简体中文</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage("es")}>🇪🇸 Español</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage("pt")}>🇧🇷 Português</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage("bn")}>🇧🇩 বাংলা</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage("ru")}>🇷🇺 Русский</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage("ar")}>🇸🇦 العربية</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage("ja")}>🇯🇵 日本語</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage("ko")}>🇰🇷 한국어</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage("fr")}>🇫🇷 Français</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-center"
                    >
                      {theme === "light" ? <Moon className="w-4 h-4 mr-2" /> : <Sun className="w-4 h-4 mr-2" />}
                      Toggle Theme
                    </Button>

                    <UserMenu mobile />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>


        </div>
      </div>
    </nav>
  );
}
