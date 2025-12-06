import { useLanguage } from "@/components/LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, Server, AlertCircle } from "lucide-react";

export default function Security() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Shield className="h-12 w-12 mx-auto text-blue-600 mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Security</h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            At ToolX, keeping your data safe and private is our top priority.  
            We follow industry best practices to maintain a secure and reliable platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Infrastructure */}
          <Card>
            <CardHeader>
              <CardTitle>Infrastructure & Data Protection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">
                ToolX runs on trusted cloud providers with redundant infrastructure, DDoS protection, and
                automated backups. All sensitive data is encrypted both in transit (TLS 1.3) and at rest (AES-256).
              </p>
            </CardContent>
          </Card>

          {/* Access Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Access Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">
                We enforce strict role-based access, multi-factor authentication (MFA) for admins, and principle
                of least privilege. Internal access to user data is logged and monitored.
              </p>
            </CardContent>
          </Card>

          {/* Monitoring & Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Monitoring & Incident Response</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">
                Our systems are continuously monitored for unusual activity. In case of incidents, our
                security team is alerted immediately and follows a defined incident response plan.
              </p>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card>
            <CardHeader>
              <CardTitle>User Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">
                We never sell or share user data. ToolX complies with GDPR and other international data protection
                standards. You always control your data and can request deletion at any time.
              </p>
            </CardContent>
          </Card>

          {/* Updates & Patching */}
          <Card>
            <CardHeader>
              <CardTitle>Regular Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">
                We keep our software and dependencies up to date with the latest security patches. Vulnerability
                scans and penetration tests are conducted regularly to identify and fix risks.
              </p>
            </CardContent>
          </Card>

          {/* Reporting Issues */}
          <Card>
            <CardHeader>
              <CardTitle>Reporting Security Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">
                If you discover a security concern, please report it to{" "}
                <a className="text-blue-600" href="mailto:security@toolx.com">
                  security@toolx.com
                </a>. We take reports seriously and respond promptly.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
