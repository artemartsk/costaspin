import { useState } from 'react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import { FileText, Download, CheckCircle2, Clock } from 'lucide-react';
import type { Patient } from '@/types';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export function DocumentsTab({ patient }: { patient: Patient }) {
    const [isGenerating, setIsGenerating] = useState(false);

    const generateGdprPdf = () => {
        setIsGenerating(true);
        try {
            const doc = new jsPDF();
            const marginX = 20;
            let currentY = 20;

            // Brand Header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text('CostaSpine Clinics', marginX, currentY);
            
            // Subtitle
            currentY += 10;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(14);
            doc.text('Patient Master Consent Record', marginX, currentY);
            
            // Line separator
            currentY += 5;
            doc.setDrawColor(200, 200, 200);
            doc.line(marginX, currentY, 190, currentY);

            // Patient Info
            currentY += 15;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('Patient Information', marginX, currentY);
            
            currentY += 8;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`Name: ${patient.first_name} ${patient.last_name}`, marginX, currentY);
            doc.text(`Phone: ${patient.phone}`, 100, currentY);
            currentY += 6;
            doc.text(`Email: ${patient.email || 'N/A'}`, marginX, currentY);
            doc.text(`Patient ID: ${patient.id}`, 100, currentY);
            
            currentY += 10;
            doc.line(marginX, currentY, 190, currentY);

            // Consents Section
            currentY += 15;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('AEPD / RGPD Consent Declarations', marginX, currentY);
            
            // Item 1: Medical Treatment
            currentY += 10;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('1. Medical Information & Treatment Consent (Ley 41/2002)', marginX, currentY);
            
            currentY += 6;
            doc.setFont('helvetica', 'normal');
            const medicalStatus = patient.medical_data_consent ? 'SIGNED / AGREED' : 'NOT SIGNED';
            const medicalDate = patient.medical_consent_date ? format(new Date(patient.medical_consent_date), 'PPP at p') : 'N/A';
            doc.text(`Status: ${medicalStatus}`, marginX + 5, currentY);
            currentY += 5;
            doc.text(`Timestamp: ${medicalDate}`, marginX + 5, currentY);

            // Item 2: Data Processing
            currentY += 10;
            doc.setFont('helvetica', 'bold');
            doc.text('2. Personal Data Processing (RGPD / LOPDGDD)', marginX, currentY);
            
            currentY += 6;
            doc.setFont('helvetica', 'normal');
            const dataStatus = patient.data_processing_consent ? 'SIGNED / AGREED' : 'NOT SIGNED';
            const dataDate = patient.data_processing_consent_date ? format(new Date(patient.data_processing_consent_date), 'PPP at p') : 'N/A';
            doc.text(`Status: ${dataStatus}`, marginX + 5, currentY);
            currentY += 5;
            doc.text(`Timestamp: ${dataDate}`, marginX + 5, currentY);
            if(patient.privacy_policy_version) {
                currentY += 5;
                doc.text(`Privacy Policy Version: ${patient.privacy_policy_version}`, marginX + 5, currentY);
            }

            // Item 3: Marketing
            currentY += 10;
            doc.setFont('helvetica', 'bold');
            doc.text('3. Marketing & Commercial Communications', marginX, currentY);
            
            currentY += 6;
            doc.setFont('helvetica', 'normal');
            const marketingStatus = patient.marketing_consent ? 'AGREED' : 'DECLINED';
            doc.text(`Status: ${marketingStatus}`, marginX + 5, currentY);

            // Footer / Metadata
            currentY += 30;
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            const generationDate = format(new Date(), 'PPP at p');
            doc.text(`This document is electronically generated from the CostaSpine Clinic OS.`, marginX, currentY);
            currentY += 5;
            doc.text(`Generated on: ${generationDate}`, marginX, currentY);
            
            // Save
            doc.save(`CostaSpine_Consent_${patient.first_name}_${patient.last_name}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setTimeout(() => setIsGenerating(false), 500); // small delay for UX
        }
    };

    const isSigned = patient.data_processing_consent || patient.medical_data_consent;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-[14px] font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4" /> 
                        Legal Documents & Consents
                    </h3>
                    <p className="text-[12px] text-muted-foreground mt-1">
                        RGPD compliance records and patient agreements
                    </p>
                </div>
                
                {isSigned && (
                    <Button 
                        size="sm" 
                        className="h-8 text-[12px]" 
                        onClick={generateGdprPdf}
                        disabled={isGenerating}
                    >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        {isGenerating ? 'Generating...' : 'Master Consent Record (PDF)'}
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {/* Data Processing Document Card */}
                <Card className="shadow-none border-border">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <h4 className="text-[13px] font-medium flex items-center gap-2">
                                Data Processing Agreement (RGPD)
                                {patient.data_processing_consent ? (
                                    <Badge variant="success" className="text-[10px] uppercase font-semibold h-5">Signed</Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-[10px] uppercase font-semibold h-5 bg-muted/80 text-muted-foreground"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>
                                )}
                            </h4>
                            <p className="text-[11px] text-muted-foreground w-3/4">
                                Consent for the clinic to store and process standard personal data for administrative and scheduling purposes as required by LOPDGDD.
                            </p>
                        </div>
                        <div className="text-right">
                            {patient.data_processing_consent_date ? (
                                <div className="text-[11px] text-muted-foreground flex flex-col items-end">
                                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Authorized on:</span>
                                    <span className="font-medium text-foreground">{format(new Date(patient.data_processing_consent_date), 'MMM d, yyyy HH:mm')}</span>
                                    {patient.privacy_policy_version && <span className="opacity-50 mt-0.5">Policy v{patient.privacy_policy_version}</span>}
                                </div>
                            ) : (
                                <span className="text-[11px] text-muted-foreground">No signature recorded</span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Medical Consent Card */}
                <Card className="shadow-none border-border">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <h4 className="text-[13px] font-medium flex items-center gap-2">
                                Medical Storage Consent
                                {patient.medical_data_consent ? (
                                    <Badge variant="success" className="text-[10px] uppercase font-semibold h-5">Signed</Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-[10px] uppercase font-semibold h-5 bg-muted/80 text-muted-foreground"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>
                                )}
                            </h4>
                            <p className="text-[11px] text-muted-foreground w-3/4">
                                Explicit consent for the clinic to digitize, store, and process sensitive health information and clinical SOAP records (Ley 41/2002).
                            </p>
                        </div>
                        <div className="text-right">
                            {patient.medical_consent_date ? (
                                <div className="text-[11px] text-muted-foreground flex flex-col items-end">
                                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Authorized on:</span>
                                    <span className="font-medium text-foreground">{format(new Date(patient.medical_consent_date), 'MMM d, yyyy HH:mm')}</span>
                                </div>
                            ) : (
                                <span className="text-[11px] text-muted-foreground">No signature recorded</span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
