import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useLocation as useClinicLocation, useServices } from '@/hooks/useData';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function SettingsPage() {
    const { data: location, isLoading: locLoading } = useClinicLocation();
    const { data: services, isLoading: svcLoading } = useServices();

    const [clinicName, setClinicName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [mapsUrl, setMapsUrl] = useState('');
    const [reviewUrl, setReviewUrl] = useState('');

    useEffect(() => {
        if (location) {
            setClinicName(location.name || '');
            setAddress(location.address || '');
            setPhone(location.phone || '');
            setEmail(location.email || '');
            setMapsUrl(location.google_maps_url || '');
            setReviewUrl(location.google_review_url || '');
        }
    }, [location]);

    const handleSave = () => {
        toast.success('Settings saved (persistence coming soon)');
    };

    return (
        <div className="min-h-screen">
            <div className="border-b border-border px-8 py-6">
                <h1 className="text-notion-h2">Settings</h1>
                <p className="text-notion-caption mt-1">Clinic configuration</p>
            </div>

            <div className="px-8 py-6">
                <Tabs defaultValue="clinic">
                    <TabsList className="mb-6">
                        <TabsTrigger value="clinic">Clinic</TabsTrigger>
                        <TabsTrigger value="services">Services</TabsTrigger>
                        <TabsTrigger value="integrations">Integrations</TabsTrigger>
                    </TabsList>

                    <TabsContent value="clinic">
                        <div className="max-w-lg space-y-6">
                            {locLoading ? (
                                <div className="flex items-center justify-center h-40">
                                    <div className="h-5 w-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <h3 className="text-[14px] font-medium mb-4">Location</h3>
                                        <div className="space-y-3">
                                            {[
                                                { label: 'Clinic Name', value: clinicName, onChange: setClinicName },
                                                { label: 'Address', value: address, onChange: setAddress },
                                                { label: 'Phone', value: phone, onChange: setPhone },
                                                { label: 'Email', value: email, onChange: setEmail },
                                                { label: 'Google Maps URL', value: mapsUrl, onChange: setMapsUrl },
                                                { label: 'Google Review Link', value: reviewUrl, onChange: setReviewUrl },
                                            ].map((field) => (
                                                <div key={field.label} className="flex items-start gap-6">
                                                    <label className="w-40 shrink-0 pt-2 text-[13px] text-muted-foreground">{field.label}</label>
                                                    <Input
                                                        value={field.value}
                                                        onChange={(e) => field.onChange(e.target.value)}
                                                        className="text-[13px] h-9 bg-muted/20 border-transparent focus:bg-background focus:border-border"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-end">
                                        <Button size="sm" className="h-8 text-[12px]" onClick={handleSave}>Save Changes</Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="services">
                        <div className="max-w-lg">
                            <h3 className="text-[14px] font-medium mb-4">Services & Pricing</h3>
                            <div className="border border-border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Service</th>
                                            <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Duration</th>
                                            <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Price</th>
                                            <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Deposit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[13px]">
                                        {svcLoading ? (
                                            <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
                                        ) : !services?.length ? (
                                            <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No services configured</td></tr>
                                        ) : (
                                            services.map((svc) => (
                                                <tr key={svc.id} className="border-b border-border/50 last:border-b-0">
                                                    <td className="px-4 py-2.5 font-medium">{svc.name}</td>
                                                    <td className="px-4 py-2.5 text-muted-foreground">{svc.duration_minutes} min</td>
                                                    <td className="px-4 py-2.5">{formatCurrency(svc.price)}</td>
                                                    <td className="px-4 py-2.5 text-muted-foreground">{formatCurrency(svc.deposit_amount)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="integrations">
                        <div className="max-w-lg space-y-5">
                            <h3 className="text-[14px] font-medium mb-4">API Integrations</h3>
                            {[
                                { name: 'Vapi.ai', description: 'AI Voice Agent', status: 'Not configured', fields: ['API Key', 'Phone Number ID'] },
                                { name: 'Twilio', description: 'WhatsApp Business API', status: 'Not configured', fields: ['Account SID', 'Auth Token', 'From Number'] },
                                { name: 'Stripe', description: 'Payment Deposits', status: 'Not configured', fields: ['Secret Key', 'Webhook Secret'] },
                            ].map((int) => (
                                <div key={int.name} className="border border-border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="text-[14px] font-medium">{int.name}</p>
                                            <p className="text-notion-caption">{int.description}</p>
                                        </div>
                                        <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{int.status}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {int.fields.map((f) => (
                                            <div key={f} className="flex items-center gap-4">
                                                <label className="w-32 shrink-0 text-[12px] text-muted-foreground">{f}</label>
                                                <Input type="password" placeholder="•••••••••" className="text-[12px] h-8 bg-muted/20 border-transparent focus:bg-background focus:border-border" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
