import { useState } from 'react';
import { useParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import AppSidebar from '@/components/AppSidebar';
import { integrations as defaultIntegrations, type Integration } from '@/lib/dummy-data';
import { toast } from 'sonner';
import { MessageSquare, Send, Plus, ExternalLink, Bot, Key, Copy, CheckCheck } from 'lucide-react';

function IntegrationIcon({ type }: { type: 'DISCORD' | 'TELEGRAM' }) {
  if (type === 'DISCORD') {
    return (
      <div className="size-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#5865F2' }}>
        <MessageSquare className="size-5 text-white" />
      </div>
    );
  }
  return (
    <div className="size-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#26A5E4' }}>
      <Send className="size-5 text-white" />
    </div>
  );
}

const DUMMY_API_KEY = 'nmvk_sk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
const MCP_ENDPOINT = `${window.location.origin}/mcp/v1`;

export default function IntegrationsPage() {
  const { slug } = useParams();
  const [ints, setInts] = useState<Integration[]>(defaultIntegrations);
  const [dialog, setDialog] = useState<'DISCORD' | 'TELEGRAM' | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [copied, setCopied] = useState<'key' | 'endpoint' | null>(null);

  const toggleActive = (id: string) => {
    setInts(prev => prev.map(i => i.id === id ? { ...i, isActive: !i.isActive } : i));
    toast.success('Integration updated');
  };

  const handleConnect = () => {
    toast.success(`${dialog} integration connected`);
    setDialog(null);
    setWebhookUrl('');
    setBotToken('');
    setChatId('');
  };

  const copyToClipboard = async (text: string, kind: 'key' | 'endpoint') => {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  const availableTypes: { type: 'DISCORD' | 'TELEGRAM'; name: string; description: string }[] = [
    { type: 'DISCORD', name: 'Discord', description: 'Send notifications to a Discord channel via webhook.' },
    { type: 'TELEGRAM', name: 'Telegram', description: 'Send notifications to a Telegram chat via bot.' },
  ];

  return (
    <AppSidebar>
      <div className="flex flex-col flex-1 overflow-auto">
        <div className="p-6 max-w-3xl flex flex-col gap-8">

          {/* Header */}
          <div>
            <h1 className="text-xl font-bold">Integrations</h1>
            <p className="text-sm text-muted-foreground mt-1">Connect external services to receive project notifications.</p>
          </div>

          {/* ── Messaging Integrations ─────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold">Messaging</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Send task and project events to chat platforms.</p>
            </div>

            {/* Active integrations */}
            {ints.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Connected</p>
                {ints.map(int => (
                  <Card key={int.id}>
                    <CardContent className="flex items-center gap-4 py-4">
                      <IntegrationIcon type={int.type} />
                      <div className="flex flex-col gap-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{int.name}</span>
                          <Badge variant={int.isActive ? 'default' : 'secondary'} className="text-xs">
                            {int.isActive ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{int.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">Configure</Button>
                        <Switch checked={int.isActive} onCheckedChange={() => toggleActive(int.id)} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Available to add */}
            <div className="grid grid-cols-2 gap-3">
              {availableTypes.map(({ type, name, description }) => (
                <Card key={type} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <IntegrationIcon type={type} />
                      <CardTitle className="text-base">{name}</CardTitle>
                    </div>
                    <CardDescription className="text-xs">{description}</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button variant="outline" size="sm" onClick={() => setDialog(type)}>
                      <Plus className="size-3 mr-1.5" />
                      Connect
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* ── MCP Section ────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold">MCP — AI Agent Access</h2>
                  <Badge variant="outline" className="text-xs">Beta</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Connect AI agents (Claude, GPT, etc.) to your workspace via the Model Context Protocol.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Endpoint */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                      <Bot className="size-5 text-violet-500" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">MCP Endpoint</CardTitle>
                      <CardDescription className="text-xs mt-0.5">Use this URL to register Namviek as an MCP server.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                    <code className="text-xs flex-1 truncate">{MCP_ENDPOINT}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={() => copyToClipboard(MCP_ENDPOINT, 'endpoint')}
                    >
                      {copied === 'endpoint' ? <CheckCheck className="size-3 text-green-500" /> : <Copy className="size-3" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add this to your AI assistant's MCP config and authenticate with an API key below.
                  </p>
                </CardContent>
              </Card>

              {/* API Keys */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Key className="size-5 text-amber-500" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">API Key</CardTitle>
                      <CardDescription className="text-xs mt-0.5">Use this key to authenticate AI agent requests.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                    <code className="text-xs flex-1 truncate text-muted-foreground">
                      {DUMMY_API_KEY.slice(0, 16)}{'•'.repeat(16)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={() => copyToClipboard(DUMMY_API_KEY, 'key')}
                    >
                      {copied === 'key' ? <CheckCheck className="size-3 text-green-500" /> : <Copy className="size-3" />}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.success('New API key generated (demo)')}>
                      Regenerate Key
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href="https://modelcontextprotocol.io" target="_blank" rel="noreferrer">
                        <ExternalLink className="size-3 mr-1.5" />
                        MCP Docs
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sample config */}
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Example MCP Config</CardTitle>
                  <CardDescription className="text-xs">Paste into your Claude Desktop or Cursor config file.</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-[11px] bg-muted rounded-md p-3 overflow-auto leading-relaxed text-muted-foreground">
{`{
  "mcpServers": {
    "namviek": {
      "url": "${MCP_ENDPOINT}",
      "apiKey": "${DUMMY_API_KEY.slice(0, 12)}..."
    }
  }
}`}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </div>

      {/* Discord Dialog */}
      <Dialog open={dialog === 'DISCORD'} onOpenChange={v => !v && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Discord</DialogTitle>
            <DialogDescription>Paste your Discord channel webhook URL to receive notifications.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Webhook URL</label>
              <Input
                placeholder="https://discord.com/api/webhooks/..."
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button onClick={handleConnect}>Connect</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Telegram Dialog */}
      <Dialog open={dialog === 'TELEGRAM'} onOpenChange={v => !v && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Telegram</DialogTitle>
            <DialogDescription>Provide your Telegram bot token and chat ID.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Bot Token</label>
              <Input
                placeholder="123456:ABC-xyz..."
                value={botToken}
                onChange={e => setBotToken(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Chat ID</label>
              <Input
                placeholder="-100123456789"
                value={chatId}
                onChange={e => setChatId(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button onClick={handleConnect}>Connect</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppSidebar>
  );
}
