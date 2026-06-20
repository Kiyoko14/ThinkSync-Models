import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettingsStore } from "@/store/settings-store";

export default function DocsPage() {
  const apiBaseUrl = useSettingsStore((state) => state.apiBaseUrl);

  const modelsCurl = `curl -s ${apiBaseUrl}/v1/models`;
  const profileCurl = [`curl -s ${apiBaseUrl}/v1/user/profile`, '-H "Authorization: <API_TOKEN>"'].join(" \\\n");
  const chatCurl = [
    `curl -s ${apiBaseUrl}/v1/chat/completions`,
    '-H "Authorization: <API_TOKEN>"',
    '-H "Content-Type: application/json"',
    `-d '{\n  "model": "thinking-faster1",\n  "messages": [{"role": "user", "content": "Hello"}],\n  "stream": false\n}'`,
  ].join(" \\\n");

  return (
    <Container className="py-10">
      <h1 className="text-3xl font-semibold">Documentation</h1>
      <p className="mt-2 text-muted-foreground">FastAPI endpoint quick-start for existing backend integration.</p>

      <div className="mt-6 grid gap-4">
        <Card>
          <CardHeader><CardTitle>List models</CardTitle></CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">{modelsCurl}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Get current profile</CardTitle></CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">{profileCurl}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Chat completion (OpenAI-compatible)</CardTitle></CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">{chatCurl}</pre>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
