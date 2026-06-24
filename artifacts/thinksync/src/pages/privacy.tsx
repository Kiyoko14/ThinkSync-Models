import { Link } from "wouter";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Eye, Lock, Database, Globe } from "lucide-react";

export default function PrivacyPage() {
  return (
    <Container className="py-10 max-w-4xl">
      <Link 
        href="/" 
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>
      
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">
        How we collect, use, and protect your data
      </p>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Our Commitment
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              We are committed to protecting your privacy and personal data. 
              This policy outlines what data we collect, how we use it, and 
              your rights regarding your information.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              What Data We Store
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p className="mb-4">We store the following data to provide our service:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Email address, display name, password (hashed)</li>
              <li><strong>API Keys:</strong> Hashed key values, key names, creation dates</li>
              <li><strong>Billing Data:</strong> Balance, payment history, transactions</li>
              <li><strong>Usage Data:</strong> API requests, token usage, timestamps</li>
              <li><strong>Communication:</strong> Support tickets, Telegram interactions</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              What We Can See
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p className="mb-4">When you use our API, we can see:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>API Requests:</strong> Model selected, message content, timestamps</li>
              <li><strong>Usage Metrics:</strong> Token counts, request frequency, IP address</li>
              <li><strong>Account Activity:</strong> Login history, API key usage patterns</li>
            </ul>
            <p className="mt-4">
              <strong>Note:</strong> We do not store the content of your AI responses 
              beyond what's needed for usage tracking and billing.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Third-Party AI Providers
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p className="mb-4">
              To provide AI services, we forward your requests to third-party AI providers. 
              When you use our service:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your prompts are sent to the selected AI provider (e.g., SiliconFlow)</li>
              <li>AI provider's terms and privacy policy apply to their processing</li>
              <li>We do not control how AI providers store or use your data</li>
              <li>Message content may be retained by providers for model training (varies by provider)</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security Measures
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p className="mb-4">We implement industry-standard security:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Encryption:</strong> All data transmitted over HTTPS/TLS</li>
              <li><strong>Password Hashing:</strong> Passwords are hashed using bcrypt</li>
              <li><strong>API Key Security:</strong> Keys are hashed before storage</li>
              <li><strong>Access Controls:</strong> Role-based access to systems</li>
              <li><strong>Monitoring:</strong> Activity logging and anomaly detection</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Data Retention</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p className="mb-4">We retain data as follows:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Data:</strong> Retained while account is active</li>
              <li><strong>API Keys:</strong> Retired keys deleted after 90 days</li>
              <li><strong>Usage Logs:</strong> Retained for 12 months for billing purposes</li>
              <li><strong>Payment Records:</strong> Retained for 7 years for accounting</li>
              <li><strong>Deleted Accounts:</strong> Data purged within 30 days</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Your Rights</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Export:</strong> Request your data in a portable format</li>
              <li><strong>Opt-out:</strong> Request removal from marketing communications</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us through your dashboard or via Telegram.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Payment Data</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p className="mb-4">
              For manual payment processing, we store:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Payment amount and currency</li>
              <li>Payment method details (for reference only)</li>
              <li>Screenshot/images submitted for verification</li>
              <li>Transaction status and timestamps</li>
            </ul>
            <p className="mt-4">
              <strong>Note:</strong> We do not store credit card or bank account details. 
              All payments are processed through manual bank transfer or third-party 
              payment platforms.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Cookies and Analytics</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p className="mb-4">
              We use minimal tracking:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Essential Cookies:</strong> For authentication and session management</li>
              <li><strong>No Analytics:</strong> We do not use third-party analytics</li>
              <li><strong>No Advertising:</strong> We do not serve advertisements</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Changes to This Policy</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              We may update this privacy policy periodically. We will notify you 
              of material changes by posting the new policy here and updating 
              the "last updated" date.
            </p>
          </CardContent>
        </Card>
      </div>
      
      <p className="mt-8 text-sm text-muted-foreground">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </Container>
  );
}