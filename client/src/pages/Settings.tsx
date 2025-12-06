import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useTheme } from "@/components/ThemeProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User, Globe, Palette, Bell, Shield, CreditCard } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    profileImageUrl: user?.profileImageUrl || "",
  });
  
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    marketing: false
  });

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
    { code: "zh", name: "简体中文", flag: "🇨🇳" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "pt", name: "Português", flag: "🇧🇷" },
    { code: "bn", name: "বাংলা", flag: "🇧🇩" },
    { code: "ru", name: "Русский", flag: "🇷🇺" },
    { code: "ar", name: "العربية", flag: "🇸🇦" },
    { code: "ja", name: "日本語", flag: "🇯🇵" },
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "fr", name: "Français", flag: "🇫🇷" }
  ];

  const handleSaveProfile = () => {
    // Send update to server
    setSaving(true);
    fetch("/api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileForm),
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((updatedUser) => {
        // Invalidate the user cache so other parts refresh
        try {
          const { queryClient } = require("@/lib/queryClient");
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        } catch (err) {
          // ignore
        }

        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
      })
      .catch((err) => {
        console.error("Failed to update profile", err);
        toast({
          title: "Error",
          description: "Failed to update profile",
          variant: "destructive",
        });
      })
      .finally(() => setSaving(false));
  };

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    const form = new FormData();
    form.append('file', file);

    try {
      setSaving(true);
      const res = await fetch('/api/uploads/profile', { method: 'POST', body: form, credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      // update local profile url
      setProfileForm((p) => ({ ...p, profileImageUrl: data.url }));

      // Invalidate user cache if queryClient available
      try {
        const { queryClient } = require('@/lib/queryClient');
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      } catch (err) {
        // ignore
      }

      toast({ title: 'Profile Photo Updated', description: 'Your profile photo has been uploaded.' });
    } catch (err) {
      console.error('Upload failed', err);
      toast({ title: 'Upload Failed', description: 'Failed to upload profile photo', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateProfileField = (key: string, value: string) =>
    setProfileForm((p) => ({ ...p, [key]: value }));

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as any);
    toast({
      title: "Language Changed",
      description: `Language changed to ${languages.find(l => l.code === newLanguage)?.name}`,
    });
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme as "light" | "dark");
    toast({
      title: "Theme Changed",
      description: `Theme changed to ${newTheme}`,
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Please log in to access settings.
            </p>
            <Button className="mt-4" onClick={() => window.location.href = "/api/login"}>
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t("settings.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences.
          </p>
        </div>

        <div className="grid gap-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your profile information and personal details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profileForm.profileImageUrl || user.profileImageUrl} alt={user.firstName || "User"} />
                    <AvatarFallback>
                      {user.firstName?.[0] || user.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleProfileImageChange}
                          className="hidden"
                        />
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Change Photo</Button>
                        {profileForm.profileImageUrl && (
                          <Button variant="ghost" size="sm" onClick={() => setProfileForm((p) => ({ ...p, profileImageUrl: '' }))}>
                            Remove
                          </Button>
                        )}
                      </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      JPG, PNG or GIF. Max size of 2MB.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profileForm.firstName}
                      onChange={(e) => updateProfileField("firstName", e.target.value)}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileForm.lastName}
                      onChange={(e) => updateProfileField("lastName", e.target.value)}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => updateProfileField("email", e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="ghost" onClick={() => setProfileForm({
                    firstName: user?.firstName || "",
                    lastName: user?.lastName || "",
                    email: user?.email || "",
                    profileImageUrl: user?.profileImageUrl || "",
                  })}>
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Language & Theme */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Language & Appearance
              </CardTitle>
              <CardDescription>
                Customize your language and theme preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <div className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={theme} onValueChange={handleThemeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Manage your notification preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive notifications about your account activity
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, email: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive push notifications in your browser
                    </p>
                  </div>
                  <Switch
                    checked={notifications.push}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, push: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Marketing Emails</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive emails about new features and updates
                    </p>
                  </div>
                  <Switch
                    checked={notifications.marketing}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, marketing: checked})
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium">Current Plan</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {user.subscriptionType === 'free' ? 'Free Plan' : 
                       user.subscriptionType === 'monthly' ? 'Monthly Premium' : 
                       'Yearly Premium'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    {user.subscriptionType === 'free' ? 'Upgrade' : 'Manage'}
                  </Button>
                </div>

                {user.subscriptionType !== 'free' && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Next billing date: {user.subscriptionEndsAt ? new Date(user.subscriptionEndsAt).toLocaleDateString() : 'N/A'}</p>
                    <p>Status: {user.subscriptionStatus}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}