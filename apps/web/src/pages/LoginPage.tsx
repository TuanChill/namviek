import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { login } from '@/lib/auth-store';


export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600)); // fake delay
    const user = login(email);
    setLoading(false);
    // Redirect to test page
    navigate(`/test`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">N</span>
            </div>
            <span className="text-xl font-bold tracking-tight">Namviek</span>
          </div>
          <p className="text-sm text-muted-foreground">Sign in to your workspace</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <CardDescription>Enter any email and password to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">Password</label>
                  <a href="#" className="text-sm text-primary hover:underline">Forgot password?</a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Any password works"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <div className="relative my-4">
              <Separator />
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                or continue with
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full" type="button" onClick={() => {
                setEmail('alice@acme.com');
                setPassword('demo');
              }}>
                <svg viewBox="0 0 24 24" className="mr-2 size-4" data-icon="inline-start">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>
              <Button variant="outline" className="w-full" type="button">
                <svg viewBox="0 0 24 24" className="mr-2 size-4" fill="currentColor" data-icon="inline-start">
                  <path d="M11.5 2C6.81 2 3 5.81 3 10.5c0 4.17 2.75 7.7 6.55 8.88-.09-.78-.17-2.04.03-2.94.18-.82 1.24-5.27 1.24-5.27s-.31-.63-.31-1.56c0-1.46.85-2.55 1.91-2.55.9 0 1.33.67 1.33 1.49 0 .9-.58 2.26-.88 3.51-.25 1.05.52 1.9 1.55 1.9 1.86 0 3.12-2.4 3.12-5.25 0-2.16-1.46-3.78-4.09-3.78-2.98 0-4.83 2.23-4.83 4.73 0 .86.25 1.46.64 1.93.18.22.21.3.14.55-.05.18-.15.6-.2.77-.07.25-.28.34-.51.24-1.44-.59-2.11-2.18-2.11-3.97 0-2.95 2.49-6.49 7.44-6.49 3.97 0 6.59 2.88 6.59 5.97 0 4.09-2.27 7.14-5.63 7.14-1.13 0-2.19-.61-2.55-1.3l-.7 2.69c-.25.97-.93 2.19-1.41 2.97.92.29 1.92.44 2.94.44 4.69 0 8.5-3.81 8.5-8.5S16.19 2 11.5 2z"/>
                </svg>
                Continue with Microsoft
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Tip: Use <code className="bg-muted px-1 py-0.5 rounded text-xs">alice@acme.com</code> or any email
        </p>
      </div>
    </div>
  );
}
