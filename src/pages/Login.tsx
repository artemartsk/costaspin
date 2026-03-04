import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navigate } from 'react-router-dom';

export default function Login() {
    const { user, signIn, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await signIn(email, password);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[hsl(210_15%_98%)]">
            <div className="w-full max-w-[340px]">
                {/* Logo */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center shrink-0">
                        <img src="/logo.png" alt="CostaSpine" className="h-8 w-8 object-contain" />
                    </div>
                    <div>
                        <span className="text-[16px] font-semibold tracking-tight text-foreground block">CostaSpine</span>
                        <span className="text-[11px] text-muted-foreground">Clinic Management System</span>
                    </div>
                </div>

                <h1 className="text-[22px] font-semibold tracking-tight mb-1">Welcome back</h1>
                <p className="text-[13px] text-muted-foreground mb-6">Sign in to your clinic dashboard</p>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Email</label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="h-9 text-[13px] bg-background border-border"
                        />
                    </div>
                    <div>
                        <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Password</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="h-9 text-[13px] bg-background border-border"
                        />
                    </div>

                    {error && (
                        <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
                    )}

                    <Button type="submit" className="w-full h-9 text-[13px]" disabled={submitting}>
                        {submitting ? 'Signing in…' : 'Sign in'}
                    </Button>
                </form>

                <p className="text-[11px] text-muted-foreground mt-6">
                    CostaSpine · Marbella
                </p>
            </div>
        </div>
    );
}
