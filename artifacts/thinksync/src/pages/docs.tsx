import { useState } from "react";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Copy, 
  Check, 
  Terminal, 
  Code, 
  BookOpen, 
  Zap, 
  Key, 
  CreditCard,
  AlertCircle,
  Shield,
  Gauge,
  DollarSign,
  MessageSquare,
  FileJson,
  ChevronRight,
  ExternalLink
} from "lucide-react";

// API Base URL
const API_BASE = "https://api.thinksync.art/v1";

// Copy button component
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="absolute right-2 top-2 h-8 w-8 p-0"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}

// Code block with copy
function CodeBlock({ 
  code, 
  language = "bash",
  className = "" 
}: { 
  code: string; 
  language?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <CopyButton code={code} />
      <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100">
        <code>{code}</code>
      </pre>
      <div className="absolute right-2 top-2">
        <Badge variant="secondary" className="text-xs">{language}</Badge>
      </div>
    </div>
  );
}

// Quick Start Step
function QuickStartStep({ 
  number, 
  title, 
  description, 
  icon: Icon 
}: { 
  number: number; 
  title: string; 
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <span className="font-bold">{number}</span>
      </div>
      <div className="pt-1">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// Error code documentation
const errorDocs = [
  { code: 401, name: "unauthorized", description: "Invalid or missing API key", solution: "Check your API key format (thc_xxx)" },
  { code: 403, name: "forbidden", description: "Insufficient permissions", solution: "Your account may be inactive" },
  { code: 404, name: "not_found", description: "Endpoint or resource not found", solution: "Check the API endpoint URL" },
  { code: 429, name: "rate_limited", description: "Too many requests", solution: "Wait and retry, or upgrade your plan" },
  { code: 500, name: "server_error", description: "Internal server error", solution: "Contact support if persists" },
  { code: "provider_timeout", name: "provider_timeout", description: "AI provider request timed out", solution: "Try again with a different model" },
  { code: "insufficient_balance", name: "insufficient_balance", description: "Not enough balance", solution: "Add funds to your account" },
  { code: "invalid_api_key", name: "invalid_api_key", description: "API key format invalid", solution: "Generate a new API key" },
];

export default function DocsPage() {
  // cURL Examples
  const chatCurl = `curl -s ${API_BASE}/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "thinking-faster1",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'`;

  const modelsCurl = `curl -s ${API_BASE}/models`;

  const profileCurl = `curl -s ${API_BASE}/user/profile \\
  -H "Authorization: Bearer YOUR_API_KEY"`;

  // JS/TS Examples
  const chatJs = `// Using fetch
const response = await fetch('${API_BASE}/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'thinking-faster1',
    messages: [{ role: 'user', content: 'Hello!' }],
    stream: false
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`;

  // Python Example
  const chatPython = `import requests

response = requests.post(
    '${API_BASE}/chat/completions',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'model': 'thinking-faster1',
        'messages': [{'role': 'user', 'content': 'Hello!'}],
        'stream': False
    }
)

data = response.json()
print(data['choices'][0]['message']['content'])`;

  // OpenAI SDK Example
  const openaiPython = `from openai import OpenAI

client = OpenAI(
    api_key='YOUR_API_KEY',
    base_url='${API_BASE}'
)

completion = client.chat.completions.create(
    model='thinking-faster1',
    messages=[{'role': 'user', 'content': 'Hello!'}]
)

print(completion.choices[0].message.content)`;

  // Node.js SDK Example
  const openaiNode = `import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'YOUR_API_KEY',
  baseURL: '${API_BASE}'
});

const completion = await openai.chat.completions.create({
  model: 'thinking-faster1',
  messages: [{ role: 'user', content: 'Hello!' }]
});

console.log(completion.choices[0].message.content);`;

  return (
    <Container className="py-10">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight">API Documentation</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Integrate ThinkSync Models into your application in minutes. 
          OpenAI-compatible API makes migration easy.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button asChild size="lg">
            <a href="/docs">Read the Docs</a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="/dashboard/keys">Get API Key</a>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="quickstart" className="space-y-8">
        <TabsList className="flex flex-wrap justify-start gap-1 h-auto p-1 bg-muted/50">
          <TabsTrigger value="quickstart" className="gap-2">
            <Zap className="h-4 w-4" /> Quick Start
          </TabsTrigger>
          <TabsTrigger value="authentication" className="gap-2">
            <Key className="h-4 w-4" /> Authentication
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" /> Chat Completions
          </TabsTrigger>
          <TabsTrigger value="models" className="gap-2">
            <Code className="h-4 w-4" /> Models
          </TabsTrigger>
          <TabsTrigger value="errors" className="gap-2">
            <AlertCircle className="h-4 w-4" /> Errors
          </TabsTrigger>
          <TabsTrigger value="sdks" className="gap-2">
            <BookOpen className="h-4 w-4" /> SDKs
          </TabsTrigger>
        </TabsList>

        {/* Quick Start Tab */}
        <TabsContent value="quickstart" className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold">Get Started in 5 Minutes</h2>
            <p className="text-muted-foreground mt-2">
              Follow these steps to make your first API request.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Steps */}
            <div className="space-y-6">
              <QuickStartStep 
                number={1} 
                title="Create Account" 
                description="Sign up for a ThinkSync Models account"
                icon={Shield}
              />
              <QuickStartStep 
                number={2} 
                title="Add Balance" 
                description="Deposit funds to use AI models"
                icon={CreditCard}
              />
              <QuickStartStep 
                number={3} 
                title="Generate API Key" 
                description="Create an API key from your dashboard"
                icon={Key}
              />
              <QuickStartStep 
                number={4} 
                title="Make Request" 
                description="Send your first chat completion request"
                icon={Terminal}
              />
            </div>

            {/* Example */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Your First Request
                </CardTitle>
                <CardDescription>
                  Copy and run this cURL command
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock code={chatCurl} language="cURL" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Replace <code>YOUR_API_KEY</code> with your actual API key.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* What You'll Learn */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle>What You'll Learn</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-primary" />
                  Authentication with API keys
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-primary" />
                  Chat completion format (OpenAI-compatible)
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-primary" />
                  Streaming responses
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-primary" />
                  Error handling
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Authentication Tab */}
        <TabsContent value="authentication" className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold">Authentication</h2>
            <p className="text-muted-foreground mt-2">
              All API requests require authentication using a Bearer token.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Using Your API Key</CardTitle>
              <CardDescription>
                Include your API key in the Authorization header
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Format</p>
                <CodeBlock 
                  code="Authorization: Bearer thc_xxxxxxxxxxxx" 
                  language="http" 
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Example</p>
                <CodeBlock code={profileCurl} language="cURL" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Security Notice</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Never expose your API key in client-side code</li>
                <li>• Store keys in environment variables</li>
                <li>• Rotate keys regularly</li>
                <li>• Use different keys for different environments</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Completions Tab */}
        <TabsContent value="chat" className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold">Chat Completions</h2>
            <p className="text-muted-foreground mt-2">
              Send conversation-style requests and get AI responses.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Request Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CodeBlock code={chatCurl} language="cURL" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Response Format</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock 
                code={`{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "thinking-faster1",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}`} 
                language="json" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Streaming Response</CardTitle>
              <CardDescription>
                Set <code>stream: true</code> for real-time responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock 
                code={`curl -s ${API_BASE}/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "thinking-faster1",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'`} 
                language="cURL" 
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold">Available Models</h2>
            <p className="text-muted-foreground mt-2">
              Browse available models and their capabilities.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>List All Models</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code={modelsCurl} language="cURL" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rate Limits</CardTitle>
              <CardDescription>
                Each model has_request limits for requests and tokens per minute.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  <span>RPM - Requests Per Minute</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  <span>TPM - Tokens Per Minute</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold">Error Handling</h2>
            <p className="text-muted-foreground mt-2">
              Understand error codes and how to handle them.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {errorDocs.map((error) => (
              <Card key={error.code}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={error.code >= 400 && error.code < 500 ? "destructive" : "secondary"}>
                      {typeof error.code === 'number' ? error.code : error.code}
                    </Badge>
                    <span className="font-mono text-sm">{error.name}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{error.description}</p>
                  <p className="mt-2 text-sm">
                    <span className="font-medium">Solution: </span>
                    {error.solution}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SDKs Tab */}
        <TabsContent value="sdks" className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold">SDK Examples</h2>
            <p className="text-muted-foreground mt-2">
              Ready-to-use code examples for popular languages.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>JavaScript / TypeScript</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="fetch">
                <TabsList>
                  <TabsTrigger value="fetch">fetch</TabsTrigger>
                  <TabsTrigger value="openai-sdk">OpenAI SDK</TabsTrigger>
                </TabsList>
                <TabsContent value="fetch">
                  <CodeBlock code={chatJs} language="javascript" />
                </TabsContent>
                <TabsContent value="openai-sdk">
                  <CodeBlock code={openaiNode} language="typescript" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Python</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="requests">
                <TabsList>
                  <TabsTrigger value="requests">requests</TabsTrigger>
                  <TabsTrigger value="openai-sdk">OpenAI SDK</TabsTrigger>
                </TabsList>
                <TabsContent value="requests">
                  <CodeBlock code={chatPython} language="python" />
                </TabsContent>
                <TabsContent value="openai-sdk">
                  <CodeBlock code={openaiPython} language="python" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Check className="h-5 w-5" />
                OpenAI-Compatible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                ThinkSync Models API is fully compatible with OpenAI's API format. 
                Simply change the <code>base_url</code> to use our endpoint and you're ready to go!
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer CTA */}
      <div className="mt-12 text-center border-t pt-8">
        <h3 className="text-xl font-semibold">Need Help?</h3>
        <p className="mt-2 text-muted-foreground">
          Check out our API reference or contact support.
        </p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <Button asChild>
            <a href="/models">Browse Models</a>
          </Button>
          <Button asChild variant="outline">
            <a href="/dashboard/billing">Add Funds</a>
          </Button>
        </div>
      </div>
    </Container>
  );
}