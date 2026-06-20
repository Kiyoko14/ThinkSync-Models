import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_BASE = "https://api.thinksync.art/v1";

const modelsCurl = `curl -s ${API_BASE}/models`;
const profileCurl = [
  `curl -s ${API_BASE}/user/profile`,
  '-H "Authorization: Bearer thc_xxxxx"',
].join(" \\\n");
const chatCurl = [
  `curl -s ${API_BASE}/chat/completions`,
  '-H "Authorization: Bearer thc_xxxxx"',
  '-H "Content-Type: application/json"',
  `-d '{\n  "model": "thinking-faster1",\n  "messages": [{"role": "user", "content": "Hello"}],\n  "stream": false\n}'`,
].join(" \\\n");

export default function DocsPage() {
  return (
    <Container className="py-10">
      <h1 className="text-3xl font-semibold">Documentation</h1>
      <p className="mt-2 text-muted-foreground">
        Quick-start guide for the ThinkSync Models API.
      </p>

      <div className="mt-6 rounded-md border border-primary/20 bg-primary/5 p-4 text-sm">
        <p className="font-semibold">Base URL</p>
        <code className="mt-1 block text-sm">https://api.thinksync.art/v1</code>
      </div>

      <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-4 text-sm">
        <p className="font-semibold">Authentication</p>
        <p className="mt-1 text-muted-foreground">
          All protected endpoints require a <code>Bearer</code> token in the{" "}
          <code>Authorization</code> header.
        </p>
        <code className="mt-1 block text-sm">Authorization: Bearer thc_xxxxx</code>
      </div>

      <div className="mt-6 grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>List models</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">{modelsCurl}</pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Get current profile</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">{profileCurl}</pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chat completion (OpenAI-compatible)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">{chatCurl}</pre>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 rounded-md border p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Tip</p>
        <p className="mt-1">
          Generate an API key from your{" "}
          <a href="/dashboard/keys" className="underline">
            Dashboard &gt; API Keys
          </a>{" "}
          to use with the API examples above.
        </p>
      </div>
    </Container>
  );
}
