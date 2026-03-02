import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Play, Mic } from 'lucide-react';

export default function VoiceAgent() {
    return (
        <div className="min-h-screen">
            <div className="border-b border-border px-8 py-6">
                <h1 className="text-notion-h2">Voice Agent</h1>
                <p className="text-notion-caption mt-1">Vapi AI receptionist configuration</p>
            </div>

            <div className="px-8 py-6">
                <div className="grid grid-cols-2 gap-8 max-w-5xl">
                    {/* Left — Config */}
                    <div className="space-y-5">
                        <div>
                            <h3 className="text-[14px] font-medium mb-3">Agent Configuration</h3>
                            <div className="space-y-3">
                                <div className="flex items-start gap-5">
                                    <label className="w-36 shrink-0 pt-2 text-[13px] text-muted-foreground">Phone Number</label>
                                    <Input placeholder="Vapi Phone Number ID" className="text-[13px] h-9 bg-muted/20 border-transparent focus:bg-background focus:border-border" />
                                </div>
                                <div className="flex items-start gap-5">
                                    <label className="w-36 shrink-0 pt-2 text-[13px] text-muted-foreground">Voice</label>
                                    <select className="flex h-9 w-full items-center rounded-md border border-transparent bg-muted/20 px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring focus:border-border focus:bg-background">
                                        <option>Paige (Female, EN)</option>
                                        <option>Lucia (Female, ES)</option>
                                        <option>James (Male, EN)</option>
                                    </select>
                                </div>
                                <div className="flex items-start gap-5">
                                    <label className="w-36 shrink-0 pt-2 text-[13px] text-muted-foreground">First Message</label>
                                    <Textarea
                                        defaultValue="Hello, thank you for calling CostaSpine. My name is Sofia, how can I help you today?"
                                        className="text-[13px] h-20 bg-muted/20 border-transparent focus:bg-background focus:border-border resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Test Call */}
                        <div className="border border-border rounded-lg p-4">
                            <p className="text-[13px] font-medium mb-2">Test Call</p>
                            <div className="flex gap-2">
                                <Input placeholder="+34 600 000 000" className="text-[13px] h-8 bg-muted/20 border-transparent focus:bg-background focus:border-border" />
                                <Button size="sm" className="h-8 shrink-0 text-[12px]">
                                    <Phone className="h-3 w-3 mr-1.5" />
                                    Call Me
                                </Button>
                            </div>
                        </div>

                        {/* Triage Categories */}
                        <div>
                            <h3 className="text-[14px] font-medium mb-3">Triage Categories</h3>
                            <div className="space-y-2">
                                {[
                                    { category: 'Acute Injury', tags: ['acute_injury', 'sports_injury'], route: 'Chiropractic' },
                                    { category: 'Chronic Pain', tags: ['chronic_pain', 'back_pain'], route: 'Chiropractic / Physio' },
                                    { category: 'Post-Surgery', tags: ['post_surgery', 'rehab'], route: 'Physiotherapy' },
                                    { category: 'Relaxation', tags: ['relaxation', 'stress'], route: 'Massage' },
                                    { category: 'Sports Recovery', tags: ['sports_injury', 'muscle_tension'], route: 'Massage / Physio' },
                                ].map((cat) => (
                                    <div key={cat.category} className="flex items-center gap-3 p-3 border border-border/60 rounded-lg">
                                        <div className="flex-1">
                                            <p className="text-[13px] font-medium">{cat.category}</p>
                                            <div className="flex gap-1 mt-1">
                                                {cat.tags.map((t) => (
                                                    <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px]">→ {cat.route}</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right — System Prompt */}
                    <div>
                        <h3 className="text-[14px] font-medium mb-3">System Prompt</h3>
                        <Textarea
                            className="font-mono text-[12px] leading-relaxed bg-muted/20 border-transparent focus:bg-background focus:border-border min-h-[500px] resize-none"
                            defaultValue={`You are Sofia, a warm and professional virtual receptionist at CostaSpine clinic in Elviria, Marbella.

LANGUAGES: Respond in English by default. If the patient speaks Spanish, switch to Spanish.

GOAL: Understand the patient's needs and book an appointment.

TRIAGE FLOW:
1. Ask what brings them to CostaSpine today
2. Listen for symptoms and categorise: acute injury, chronic pain, sports injury, post-surgery rehab, or relaxation massage
3. Ask about urgency: "Is this something that just happened, or have you been dealing with it for a while?"
4. Based on their answers, recommend a service category

BOOKING FLOW:
1. Check available slots using the check_availability tool
2. Offer 2-3 time options
3. Confirm patient name and phone number
4. Create booking using the create_booking tool
5. Let them know they'll receive a WhatsApp with deposit link

RULES:
- Never diagnose. Say "Based on what you're describing, I'd recommend seeing our [chiropractor/physiotherapist/massage therapist]"
- If it sounds like an emergency, say "This sounds urgent. I recommend going to the nearest hospital. Would you like me to book a follow-up for after?"
- Be concise. Clinic calls should be under 4 minutes.
- Always confirm the spelling of their name.`}
                        />
                        <div className="flex justify-end mt-3">
                            <Button size="sm" className="h-8 text-[12px]">Save Configuration</Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
