// api/send-alert.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { stickerId, alertType, mode, helperNumber } = req.body;

    try {
        // 1. Owner ka data fetch karo
        const { data: owner, error } = await supabase
            .from('registrations')
            .select('full_name, phone_number, family_number')
            .eq('sticker_id', stickerId.toUpperCase())
            .single();

        if (error || !owner) return res.status(404).json({ success: false, error: 'Owner not found' });

        // 2. SOS Feature Logic
        if (alertType === 'EMERGENCY_SOS') {
            // Yahan hum Exotel/Twilio API call karenge siren aur family alert ke liye
            console.log(`SOS Triggered for: ${owner.full_name}`);
            // Logic: Call Owner + Call Family + Trigger Siren Event
            return res.status(200).json({ success: true, message: "SOS Alert Dispatched!" });
        }

        // 3. Direct Bridge Call Logic (Bina Helper ka number maange)
        if (mode === 'call') {
            // SMSCountry Voice API ko command bhejo ki Owner aur Helper ko bridge kare
            // Hum yahan hardcoded "Helper" ko bridge kar rahe hain ya API call kar rahe hain
            console.log(`Bridging call for ${stickerId} to ${owner.phone_number}`);
            return res.status(200).json({ success: true, message: "Bridge Initiated" });
        }

        // 4. Normal SMS Alerts
        return res.status(200).json({ success: true, message: "Alert sent" });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}
