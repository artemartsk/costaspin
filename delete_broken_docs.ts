import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
    const { data, error } = await supabase
        .from('patient_documents')
        .delete()
        .like('pdf_url', 'http%');

    if (error) {
        console.error('Error deleting:', error);
    } else {
        console.log('Successfully deleted broken records.');
    }
}

main();
