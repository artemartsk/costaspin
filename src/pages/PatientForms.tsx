import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { createClient } from '@supabase/supabase-js';
import { Check, FileText, ShieldCheck, Mail } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

interface PatientInfo {
    id: string;
    first_name: string;
    last_name: string;
    form_token: string;
}

const FORMS = [
    {
        id: 'indemnity',
        title: 'Indemnity Waiver',
        icon: ShieldCheck,
        description: 'I acknowledge that chiropractic, physiotherapy, and massage treatments carry inherent risks. I consent to treatment and release CostaSpine from liability for any adverse effects that may occur during standard care.',
        legal: 'By checking this box, I confirm I have read and understood the indemnity waiver and voluntarily consent to proceed with treatment at CostaSpine.',
    },
    {
        id: 'cancellation_policy',
        title: 'Cancellation Policy',
        icon: FileText,
        description: 'CostaSpine requires at least 24 hours notice for appointment cancellations. Late cancellations or no-shows may result in a charge of up to 50% of the service fee. Deposits are non-refundable for cancellations within 24 hours.',
        legal: 'By checking this box, I confirm I have read and agree to the cancellation policy.',
    },
    {
        id: 'medical_data_consent',
        title: 'Medical Data Consent (GDPR Art. 9)',
        icon: ShieldCheck,
        description: 'CostaSpine needs to collect and process your health data (diagnosis, treatment plans, clinical notes) to provide healthcare services. Your data is stored securely in the EU with encryption and strict access controls. You can withdraw consent at any time by contacting privacy@costaspine.com.',
        legal: 'I explicitly consent to the processing of my health data by CostaSpine for the purpose of receiving treatment, in accordance with GDPR Article 9(2)(a) and the LOPDGDD. I have read the Privacy Policy (costaspine.com/privacy).',
    },
    {
        id: 'data_processing',
        title: 'Data Processing Agreement',
        icon: FileText,
        description: 'CostaSpine processes your personal data (name, contact details, appointment history) to manage your care. Data may be shared with our processors (Supabase, Stripe, Twilio) under strict Data Processing Agreements. Full details in our Privacy Policy.',
        legal: 'I consent to the processing of my personal data as described in the CostaSpine Privacy Policy (costaspine.com/privacy).',
    },
    {
        id: 'newsletter_consent',
        title: 'Marketing & Newsletter Consent',
        icon: Mail,
        description: 'We would like to occasionally send you health tips, special offers, and updates about CostaSpine services via WhatsApp or email. You can unsubscribe at any time.',
        legal: 'I consent to receive marketing communications from CostaSpine (optional — GDPR compliant).',
        optional: true,
    },
];

export default function PatientFormsPage() {
    const { token } = useParams<{ token: string }>();
    const [patient, setPatient] = useState<PatientInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [agreed, setAgreed] = useState<Record<string, boolean>>({});
    const [completedForms, setCompletedForms] = useState<string[]>([]);
    const [fullName, setFullName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!supabase || !token) {
            setError('Invalid form link');
            setLoading(false);
            return;
        }
        supabase
            .from('patients')
            .select('id, first_name, last_name, form_token')
            .eq('form_token', token)
            .single()
            .then(({ data, error: fetchError }) => {
                if (fetchError || !data) {
                    setError('Invalid or expired form link');
                } else {
                    setPatient(data as PatientInfo);
                    setFullName(`${data.first_name} ${data.last_name}`);
                    // Check which forms are already completed
                    supabase
                        .from('patient_forms')
                        .select('form_type')
                        .eq('patient_id', data.id)
                        .then(({ data: forms }) => {
                            setCompletedForms((forms || []).map((f: { form_type: string }) => f.form_type));
                        });
                }
                setLoading(false);
            });
    }, [token]);

    const handleSubmit = async () => {
        if (!supabase || !patient) return;

        const requiredForms = FORMS.filter(f => !f.optional);
        const allRequired = requiredForms.every(f => agreed[f.id] || completedForms.includes(f.id));
        if (!allRequired) {
            setError('Please agree to all required forms before submitting');
            return;
        }

        if (!fullName.trim()) {
            setError('Please enter your full name as electronic signature');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            // 1. Fetch IP Address
            let ipAddress = 'Unknown';
            try {
                const ipRes = await fetch('https://api64.ipify.org?format=json');
                const ipData = await ipRes.json();
                ipAddress = ipData.ip;
            } catch (e) {
                console.warn('Could not fetch IP', e);
            }

            const userAgent = navigator.userAgent;
            const signatureTimestamp = new Date();

            const formsToSubmit = FORMS.filter(f => agreed[f.id] && !completedForms.includes(f.id));

            for (const form of formsToSubmit) {
                await supabase.from('patient_forms').insert({
                    patient_id: patient.id,
                    form_type: form.id,
                    signature_data: fullName,
                    form_data: { agreed: true, signed_name: fullName, ip_address: ipAddress },
                });
            }

            // Update patient forms_completed flag and consent fields
            await supabase.from('patients').update({
                forms_completed: true,
                marketing_consent: agreed['newsletter_consent'] || false,
                medical_data_consent: agreed['medical_data_consent'] || false,
                medical_consent_date: agreed['medical_data_consent'] ? signatureTimestamp.toISOString() : null,
                data_processing_consent: agreed['data_processing'] || false,
                data_processing_consent_date: agreed['data_processing'] ? signatureTimestamp.toISOString() : null,
                privacy_policy_version: '1.0',
                updated_at: new Date().toISOString(),
            }).eq('id', patient.id);

            // 2. Generate PDF Document
            const doc = new jsPDF();
            const marginX = 20;
            let currentY = 20;

            doc.setFillColor(30, 41, 59);
            doc.rect(0, 0, 210, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(24);
            doc.text('COSTASPINE', marginX, 22);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.text('PATIENT MASTER CONSENT RECORD', marginX, 30);

            doc.setFontSize(10);
            doc.text(`Ref: CS-${patient.id.substring(0,8).toUpperCase()}`, 190, 22, { align: 'right' });
            doc.text(`Date: ${format(signatureTimestamp, 'dd MMM yyyy')}`, 190, 30, { align: 'right' });

            doc.setTextColor(30, 41, 59);
            currentY = 55;

            // Patient Info
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('I. PATIENT IDENTIFICATION', marginX, currentY);
            currentY += 5;
            
            doc.setDrawColor(226, 232, 240);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(marginX, currentY, 170, 25, 2, 2, 'FD');

            currentY += 8;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Full Name:', marginX + 5, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(patient.first_name + ' ' + patient.last_name, marginX + 35, currentY);

            doc.setFont('helvetica', 'bold');
            doc.text('Patient ID:', 110, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${patient.id.substring(0,20)}...`, 135, currentY);

            currentY += 10;
            doc.setFont('helvetica', 'bold');
            doc.text('Signed By:', marginX + 5, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(fullName, marginX + 35, currentY);

            // Consents
            currentY += 25;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('II. LEGAL CONSENT & DECLARATIONS', marginX, currentY);
            currentY += 5;

            const addConsentBlock = (title: string, lawRef: string, statusText: string, dateText: string, yPos: number) => {
                doc.setDrawColor(226, 232, 240);
                doc.rect(marginX, yPos, 170, 22);
                doc.setFillColor(241, 245, 249);
                doc.rect(marginX, yPos, 170, 8, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text(title, marginX + 3, yPos + 6);
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(8);
                doc.text(lawRef, marginX + 167, yPos + 6, { align: 'right' });
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text('Status:', marginX + 3, yPos + 16);
                doc.setTextColor(22, 163, 74);
                doc.text(statusText, marginX + 18, yPos + 16);
                doc.setTextColor(30, 41, 59);
                doc.setFont('helvetica', 'normal');
                doc.text(`Recorded: ${dateText}`, marginX + 167, yPos + 16, { align: 'right' });
            };

            const tStamp = format(signatureTimestamp, 'dd/MM/yyyy HH:mm');
            addConsentBlock('Medical Information & Clinical Treatment', 'Ley 41/2002', 'SIGNED (INTAKE)', tStamp, currentY);
            currentY += 28;
            addConsentBlock('Personal Data Processing & Storage', 'RGPD / LOPDGDD', 'SIGNED (DIGITAL)', tStamp, currentY);
            currentY += 28;
            const mktStatus = agreed['newsletter_consent'] ? 'AGREED' : 'NOT AGREED';
            addConsentBlock('Commercial & Marketing Communications', 'LSSI-CE', mktStatus, tStamp, currentY);

            // Audit Trail
            currentY += 40;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('III. DIGITAL AUDIT TRAIL', marginX, currentY);
            currentY += 5;

            doc.setDrawColor(226, 232, 240);
            doc.line(marginX, currentY, 190, currentY);
            currentY += 8;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`This document serves as an immutable PDF extract from the CostaSpine DB.`, marginX, currentY);
            currentY += 5;
            doc.setFont('helvetica', 'bold');
            doc.text(`Digitally signed by: `, marginX, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${fullName} on ${signatureTimestamp.toISOString()}`, marginX + 30, currentY);
            currentY += 5;
            doc.setFont('helvetica', 'bold');
            doc.text(`Action logged from IP: `, marginX, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${ipAddress}`, marginX + 32, currentY);
            currentY += 5;
            doc.setFont('helvetica', 'bold');
            doc.text(`User Agent: `, marginX, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${userAgent.substring(0, 80)}...`, marginX + 18, currentY);

            doc.setTextColor(150, 150, 150);
            doc.text(`CostaSpine Clinics • Urb. Elviria, Marbella 29604, Spain • +34 952 123 456`, 105, 285, { align: 'center' });

            // 3. Upload to Supabase Storage
            const pdfBlob = doc.output('blob');
            const fileName = `${patient.id}/master_consent_${signatureTimestamp.getTime()}.pdf`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('patient_documents')
                .upload(fileName, pdfBlob, {
                    contentType: 'application/pdf',
                    cacheControl: '31536000',
                    upsert: false
                });

            if (uploadError) {
                console.error("Failed to upload PDF:", uploadError);
            } else if (uploadData) {
                // 4. Save reference in DB
                const filePath = uploadData.path;
                
                await supabase.from('patient_documents').insert({
                    patient_id: patient.id,
                    type: 'consent',
                    signed_at: signatureTimestamp.toISOString(),
                    pdf_url: filePath,
                    ip_address: ipAddress,
                    data: { userAgent, agreed_forms: Object.keys(agreed).filter(k => agreed[k]), signed_name: fullName }
                });
            }

            setDone(true);
        } catch (err: any) {
            setError(err.message || 'Failed to submit forms. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
            </div>
        );
    }

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md text-center">
                    <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-900 mb-2">All Done!</h1>
                    <p className="text-gray-600">Thank you, {patient?.first_name}. Your forms have been submitted successfully.</p>
                    <p className="text-gray-500 text-sm mt-4">You can close this page now. See you at CostaSpine! 🏥</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-5">
                <div className="max-w-lg mx-auto">
                    <h1 className="text-xl font-semibold text-gray-900">CostaSpine</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Patient Intake Forms</p>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                        {error}
                    </div>
                )}

                {patient && (
                    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                        <p className="text-sm text-gray-500">Patient</p>
                        <p className="font-medium text-gray-900">{patient.first_name} {patient.last_name}</p>
                    </div>
                )}

                {/* Forms */}
                {FORMS.map((form) => {
                    const alreadyDone = completedForms.includes(form.id);
                    const Icon = form.icon;
                    return (
                        <div key={form.id} className={`bg-white rounded-lg border ${alreadyDone ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'} p-4`}>
                            <div className="flex items-start gap-3 mb-3">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${alreadyDone ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                                    {alreadyDone ? <Check className="h-4 w-4 text-emerald-600" /> : <Icon className="h-4 w-4 text-gray-600" />}
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900 text-sm">
                                        {form.title}
                                        {form.optional && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{form.description}</p>
                                </div>
                            </div>

                            {alreadyDone ? (
                                <p className="text-xs text-emerald-600 font-medium ml-11">✓ Already signed</p>
                            ) : (
                                <label className="flex items-start gap-2 ml-11 cursor-pointer">
                                    <Checkbox
                                        checked={agreed[form.id] || false}
                                        onCheckedChange={(val: boolean | 'indeterminate') => setAgreed({ ...agreed, [form.id]: !!val })}
                                        className="mt-0.5"
                                    />
                                    <span className="text-xs text-gray-600 leading-relaxed">{form.legal}</span>
                                </label>
                            )}
                        </div>
                    );
                })}

                {/* Signature */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">Electronic Signature</p>
                    <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Type your full name"
                        className="text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">By typing your name, you confirm your identity and intent to sign.</p>
                </div>

                {/* Submit */}
                <Button
                    className="w-full h-11"
                    onClick={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? 'Submitting…' : 'Submit All Forms'}
                </Button>

                <p className="text-xs text-gray-400 text-center">
                    CostaSpine · Urb. Elviria, Marbella · <a href="/privacy" target="_blank" className="underline hover:text-gray-600">Privacy Policy</a> · GDPR Compliant
                </p>
            </div>
        </div>
    );
}
