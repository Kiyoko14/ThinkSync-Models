import { Link } from "wouter";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <Container className="py-10 max-w-4xl">
      <Link 
        href="/" 
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>
      
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              By accessing and using ThinkSync Models, you accept and agree to be bound 
              by the terms and provision of this agreement. If you do not agree to 
              these terms, you should not use our service.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>2. Service Description</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p className="mb-4">
              ThinkSync Models provides an API gateway for accessing various AI models 
              from third-party providers. We act as an intermediary between you and 
              the AI model providers.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access to AI models via our API</li>
              <li>Usage tracking and billing services</li>
              <li>API key management</li>
              <li>Account management via web dashboard and Telegram</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>3. Billing and Payments</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p className="mb-4">
              Our service operates on a pre-paid, usage-based model:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Users must maintain a positive balance to make API requests</li>
              <li>Pricing is per-token based on the selected model</li>
              <li>All prices are displayed per million tokens</li>
              <li>Payments must be submitted and approved before balance is credited</li>
              <li>No refunds are provided for usage</li>
              <li>Unpaid balance may result in service suspension</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>4. API Usage Policies</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p className="mb-4">
              You agree to use the service responsibly:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Do not attempt to circumvent rate limits</li>
              <li>Do not resell or redistribute API access</li>
              <li>Do not use the service for illegal purposes</li>
              <li>Do not attempt to access provider systems directly</li>
              <li>Do not share your API key publicly</li>
              <li>Rate limits are enforced per API key</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>5. AccountSecurity</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p className="mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintaining the security of your account credentials</li>
              <li>Keeping your API keys confidential</li>
              <li>All activities that occur under your account</li>
              <li>Immediately reporting any security breaches</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>6. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              ThinkSync Models is provided "as is" without warranty of any kind. 
              We do not guarantee uptime or availability. We are not responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Third-party AI provider outages or errors</li>
              <li>Data loss or corruption</li>
              <li>Indirect, incidental, or consequential damages</li>
              <li>Actions of third parties</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>7. Account Suspension and Termination</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p className="mb-4">
              We reserve the right to suspend or terminate accounts that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate these terms of service</li>
              <li>Fail to pay for services used</li>
              <li>Engage in abusive or harmful behavior</li>
              <li>Attempt to compromise system security</li>
              <li>Use the service for illegal activities</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>8. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              We reserve the right to modify these terms at any time. Continued 
              use of the service after changes constitutes acceptance of the 
              new terms. We will notify users of material changes.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>9. Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              For questions about these terms, please contact us through your 
              dashboard or via Telegram support.
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