const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');

// Vercel Settings me se automatic environment variables uthayega
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const twilioClient = twilio(twilioSid, twilioAuthToken);

module.exports = async (req, res) => {
    // Cross-Origin Resource Sharing (CORS) handles for GitHub Pages/Frontend requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        const { stickerId, alertType, mode } = req.body;

        try {
            // 1. Supabase ke 'registrations' table se data fetch karna
            const { data, error } = await supabase
                .from('registrations')
                .select('*')
                .eq('sticker_id', stickerId.trim().toUpperCase())
                .single();

            if (error || !data) {
                return res.status(404).json({ success: false, error: 'Sticker ID not found in database.' });
            }

            const targetPhone = (mode === 'alternate') ? data.alternate_number : data.mobile_number;

            if (!targetPhone) {
                return res.status(400).json({ success: false, error: 'Requested phone number is not registered.' });
            }

            // 2. Agar user ne 'Call' click kiya hai toh Twilio Voice Call trigger hoga (Masked Call)
            if (mode === 'call' || mode === 'alternate') {
                const call = await twilioClient.calls.create({
                    twiml: `<Response><Say voice="alice">Hello, someone is trying to reach you regarding your vehicle ${data.vehicle_number || 'Registered Vehicle'}. Please check your vehicle.</Say></Response>`,
                    to: targetPhone,
                    from: '+17816193111' // Aapka Twilio number
                });
                return res.status(200).json({ success: true, mode: 'call', sid: call.sid });
            } 
            
            // 3. Agar 'Quick Alert' click kiya hai toh SMS jayega
            else {
                const message = await twilioClient.messages.create({
                    body: `[AlertoQR] Alert! Aapki gaadi (${data.vehicle_number || 'Vehicle'}) par ek alert aaya hai: "${alertType}". Kripya turant check karein.`,
                    from: '+17816193111', // Aapka Twilio number
                    to: targetPhone
                });
                return res.status(200).json({ success: true, mode: 'sms', sid: message.sid });
            }

        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};
