import { createClient } from '@supabase/supabase-js';

// Supabase Setup
const supabaseUrl = 'https://cefzsgchfdvtyfmcrsda.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Backend ke liye service role key use karein
const supabase = createClient(supabaseUrl, supabaseKey);

// SMSCountry Credentials (Inhe Vercel Environment Variables me dalein)
const SMSCOUNTRY_AUTH_KEY = process.env.SMSCOUNTRY_AUTH_KEY;
const SMSCOUNTRY_AUTH_TOKEN = process.env.SMSCOUNTRY_AUTH_TOKEN;
const VIRTUAL_NUMBER = "918634512424"; 

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { stickerId, alertType } = req.body;

    try {
        // 1. Supabase se Owner ka number nikaalein
        const { data: registration, error: dbError } = await supabase
            .from('registrations')
            .select('phone_number, full_name') // Aapki table me jo bhi phone column ka naam ho
            .eq('sticker_id', stickerId.toUpperCase())
            .single();

        if (dbError || !registration) {
            return res.status(404).json({ error: 'Vehicle owner not found' });
        }

        const ownerPhone = registration.phone_number;

        // 2. Agar EMERGENCY SOS hai, toh Automated Voice Call karein
        if (alertType === 'EMERGENCY_SOS' || alertType === 'EMERGENCY SOS') {
            
            // SMSCountry Voice API Call
            const voiceResponse = await fetch('https://api.smscountry.com/v1/Accounts/' + SMSCOUNTRY_AUTH_KEY + '/Calls', {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(SMSCOUNTRY_AUTH_KEY + ':' + SMSCOUNTRY_AUTH_TOKEN).toString('base64'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    From: VIRTUAL_NUMBER,
                    To: ownerPhone,
                    Play: "https://alerto-qr.vercel.app/audio/emergency_siren.mp3", // Aapka siren sound link
                    Text: `Emergency Alert! Your vehicle has an urgent issue. Please check immediately.`,
                    TextToSpeech: true
                })
            });

            const voiceResult = await voiceResponse.json();
            return res.status(200).json({ success: true, message: 'Voice call triggered', details: voiceResult });
        } 
        
        // 3. Baaki normal alerts ke liye SMS ya WhatsApp bhejlein
        else {
            const smsResponse = await fetch('https://api.smscountry.com/v1/Accounts/' + SMSCOUNTRY_AUTH_KEY + '/SMS/Messages', {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(SMSCOUNTRY_AUTH_KEY + ':' + SMSCOUNTRY_AUTH_TOKEN).toString('base64'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    From: VIRTUAL_NUMBER,
                    To: ownerPhone,
                    Body: `AlertoQR: ${registration.full_name}, your vehicle has a ${alertType} alert. Check portal: alertoqr.in`
                })
            });

            const smsResult = await smsResponse.json();
            return res.status(200).json({ success: true, message: 'SMS notification sent', details: smsResult });
        }

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
