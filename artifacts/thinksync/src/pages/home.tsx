import { Link } from "wouter";
import { 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  WalletCards, 
  Code2, 
  CreditCard,
  MessageSquare,
  FileText,
  ChevronDown,
  ExternalLink,
  Check,
  Zap,
  Users,
  Building2,
  Globe,
  HandCoins
} from "lucide-react";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";

// FAQ Item Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="font-medium">{question}</span>
        <ChevronDown className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground">{answer}</p>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <Container className="py-12 sm:py-20">
        <section className="space-y-6 text-center max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-4">AI API Platform</Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Production AI Gateway with
            <span className="text-primary"> Usage-Based Billing</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            OpenAI-compatible API gateway with transparent pricing, usage tracking, 
            and API key management. Access multiple AI models from a single platform.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Button asChild size="lg">
              <Link href="/models" className="gap-2">
                Explore Models
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">Open Dashboard</Link>
            </Button>
          </div>
          
          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 pt-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" /> OpenAI-Compatible
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" /> Usage-Based Pricing
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" /> Multiple Models
            </div>
          </div>
        </section>
      </Container>

      {/* Why ThinkSync Section */}
      <section className="py-16 bg-muted/30">
        <Container>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Why ThinkSync Models?
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            Everything you need to integrate AI into your applications
          </p>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" /> OpenAI Compatible
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Use existing SDKs and integrations without code changes. 
                Works with OpenAI, Anthropic, and other AI libraries.
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <WalletCards className="h-5 w-5 text-green-500" /> Transparent Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Pay only for what you use. No subscriptions, no hidden fees. 
                Per-token pricing visible for each model.
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="h-5 w-5 text-blue-500" /> Multiple Models
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Access curated AI models from one platform. 
                Reasoning, chat, coding, and creative models available.
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Code2 className="h-5 w-5 text-purple-500" /> Developer Friendly
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Simple API key management, comprehensive documentation, 
                and ready-to-use code examples in multiple languages.
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-orange-500" /> Usage Visibility
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Real-time dashboard showing requests, tokens, 
                and spending. Know exactly what you're paying for.
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-cyan-500" /> Telegram Support
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Fast account management via Telegram bot. 
                Check balance, manage API keys, get support.
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      {/* Pricing Preview */}
      <Container className="py-16">
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Simple, Usage-Based Pricing
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            No subscriptions required. Pay only for the tokens you use.
          </p>
          
          <Card className="max-w-lg mx-auto bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <HandCoins className="h-6 w-6" />
                Pay As You Go
              </CardTitle>
              <CardDescription>
                Pricing depends on selected model
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500 shrink-0" />
                <span className="text-sm">No subscription fees</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500 shrink-0" />
                <span className="text-sm">No minimum balance</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500 shrink-0" />
                <span className="text-sm">Starting from affordable models</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500 shrink-0" />
                <span className="text-sm">Scale as you grow</span>
              </div>
              <Button asChild className="w-full mt-4">
                <Link href="/models">
                  View Models & Pricing
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </Container>

      {/* How It Works */}
      <section className="py-16 bg-muted/30">
        <Container>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            How It Works
          </h2>
          <p className="text-center text-muted-foreground mb-10">
            Get started in minutes
          </p>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">1. Create Account</h3>
              <p className="text-sm text-muted-foreground">
                Sign up with your email and password in seconds
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Code2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">2. Generate API Key</h3>
              <p className="text-sm text-muted-foreground">
                Create an API key from your dashboard
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">3. Choose Model</h3>
              <p className="text-sm text-muted-foreground">
                Browse available models and select one
              </p>
            </div>
            
            {/* Step 4 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">4. Send Request</h3>
              <p className="text-sm text-muted-foreground">
                Make API requests and get AI responses
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ Section */}
      <Container className="py-16">
        <section className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Frequently Asked Questions
          </h2>
          
          <div className="mt-8">
            <FAQItem 
              question="What is ThinkSync Models?"
              answer="ThinkSync Models is an AI API gateway that provides access to multiple AI models through a single, OpenAI-compatible API. It includes usage tracking, billing, and API key management."
            />
            <FAQItem 
              question="How does pricing work?"
              answer="Pricing is usage-based. You pay per token (input and output) based on the model you choose. Each model has its own pricing per million tokens. There are no subscriptions or hidden fees."
            />
            <FAQItem 
              question="Do I need a subscription?"
              answer="No subscription required. You can add funds as needed and only pay for what you use. There's no minimum balance or monthly fee."
            />
            <FAQItem 
              question="Is it OpenAI compatible?"
              answer="Yes! Our API is fully OpenAI-compatible. You can use existing OpenAI SDKs and code with minimal changes - just update the base URL and API key."
            />
            <FAQItem 
              question="How do I add balance?"
              answer="Add funds from your dashboard using our payment request system. Transfer funds and submit your payment confirmation for manual approval."
            />
            <FAQItem 
              question="Can I use my existing SDK?"
              answer="Yes. Our API works with OpenAI, Anthropic, and other AI SDKs. Simply set the base URL to our endpoint and use your ThinkSync API key."
            />
          </div>
        </section>
      </Container>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/20">
        <Container>
          <div className="grid gap-8 sm:grid-cols-4">
            {/* Brand */}
            <div className="sm:col-span-2">
              <h3 className="font-bold text-lg mb-4">ThinkSync Models</h3>
              <p className="text-sm text-muted-foreground mb-4">
                OpenAI-compatible AI API gateway with transparent pricing, 
                usage tracking, and API key management.
              </p>
              <div className="flex gap-4">
                <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
                  Docs
                </Link>
                <Link href="/models" className="text-sm text-muted-foreground hover:text-foreground">
                  Models
                </Link>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
                  Terms
                </Link>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                  Privacy
                </Link>
              </div>
            </div>
            
            {/* Links */}
            <div>
              <h4 className="font-semibold mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/models" className="hover:text-foreground">Models</Link></li>
                <li><Link href="/docs" className="hover:text-foreground">Documentation</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Account</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/login" className="hover:text-foreground">Login</Link></li>
                <li><Link href="/register" className="hover:text-foreground">Sign Up</Link></li>
                <li><Link href="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} ThinkSync Models. All rights reserved.
          </div>
        </Container>
      </footer>
    </div>
  );
}