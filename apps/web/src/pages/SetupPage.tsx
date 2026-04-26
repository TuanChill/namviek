import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckIcon } from 'lucide-react';
import { login } from '@/lib/auth-store';
import { tenants } from '@/lib/dummy-data';

const steps = ['Admin Account', 'Instance Setup', 'First Tenant'];

export default function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    instanceName: 'Namviek', url: 'http://localhost:2001',
    tenantName: 'My Company', tenantSlug: 'my-company',
  });

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const next = () => {
    if (step < 2) setStep(s => s + 1);
    else {
      login(form.email || 'admin@namviek.io');
      navigate(`/t/${form.tenantSlug || tenants[0].slug}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg flex flex-col gap-8">
        {/* Header */}
        <div className="text-center flex flex-col gap-1">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">N</span>
            </div>
            <span className="text-xl font-bold">Namviek</span>
          </div>
          <h1 className="text-2xl font-bold">Setup your instance</h1>
          <p className="text-muted-foreground text-sm">This wizard runs only once. Let's get you started.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center justify-center size-7 rounded-full text-xs font-medium transition-colors ${
                i < step ? 'bg-primary text-primary-foreground' :
                i === step ? 'border-2 border-primary text-primary' :
                'border-2 border-muted text-muted-foreground'
              }`}>
                {i < step ? <CheckIcon className="size-3" /> : i + 1}
              </div>
              <span className={`text-sm truncate ${i === step ? 'font-medium' : 'text-muted-foreground'}`}>{s}</span>
              {i < steps.length - 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Step cards */}
        <Card>
          {step === 0 && (
            <>
              <CardHeader>
                <CardTitle>Create Super Admin</CardTitle>
                <CardDescription>This account has full control over the instance.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input placeholder="Alice Johnson" value={form.name} onChange={e => update('name', e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" placeholder="admin@example.com" value={form.email} onChange={e => update('email', e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input type="password" placeholder="Min 8 characters" value={form.password} onChange={e => update('password', e.target.value)} />
                </div>
              </CardContent>
            </>
          )}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Instance Configuration</CardTitle>
                <CardDescription>Basic settings for your Namviek deployment.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Instance Name</label>
                  <Input value={form.instanceName} onChange={e => update('instanceName', e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Public URL</label>
                  <Input value={form.url} onChange={e => update('url', e.target.value)} />
                </div>
                <div className="p-3 rounded-lg border bg-muted/50 flex flex-col gap-1">
                  <p className="text-sm font-medium">Authentication</p>
                  <p className="text-xs text-muted-foreground">Local auth is always enabled. SSO providers can be configured per tenant after setup.</p>
                </div>
              </CardContent>
            </>
          )}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Create First Tenant</CardTitle>
                <CardDescription>Your organisation's workspace. You can add more tenants later.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Organisation Name</label>
                  <Input placeholder="Acme Corp" value={form.tenantName}
                    onChange={e => {
                      update('tenantName', e.target.value);
                      update('tenantSlug', e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                    }} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Slug</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/t/</span>
                    <Input value={form.tenantSlug} onChange={e => update('tenantSlug', e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Plan</label>
                  <div className="flex gap-2">
                    <Badge variant="secondary">FREE</Badge>
                    <span className="text-xs text-muted-foreground mt-0.5">Upgrade anytime</span>
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}>Back</Button>
          <Button onClick={next}>{step < 2 ? 'Continue →' : '🚀 Finish Setup'}</Button>
        </div>
      </div>
    </div>
  );
}
