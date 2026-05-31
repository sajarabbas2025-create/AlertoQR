const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');

// Environment variables configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const twilioClient = twilio(twilioSid, twilioAuthToken);

module.exports = async (req, res) => {
    // CORS headers handling for frontend requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        const { stickerId, alertType, mode } = req.body;

        try {
            // 1. Supabase se details nikalna
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

            // 2. 📞 REVERSE OUTBOUND CALL PROTOCOL (Owner ke phone par direct ring bajegi)
            if (mode === 'call' || mode === 'alternate') {
                
                // Twilio TwiML Voice configuration: Owner call uthate hi ye sunege
                const twimlResponse = `
                    <Response>
                        <Say voice="polly.Aditi">Alerto Q R Alert! Kisi helper ne aapki gadi ke paas se aapko contact karne ki koshish ki hai. Agar aap unse baat karna chahte hain, toh kripya apna phone katne ke baad gadi ke paas check karein.</Say>
                    </Response>
                `;

                // Seedhe Vehicle Owner ko call trigger karna (Helper ke number ki zaroorat nahi hai)
                const call = await twilioClient.calls.create({
                    twiml: twimlResponse,
                    to: targetPhone, // Owner ka registered Indian Mobile number
                    from: '+17816193111' // Aapka active Twilio US number
                });

                return res.status(200).json({ success: true, mode: 'call', sid: call.sid });
            } 
            
            // 3. QUICK ALERT SMS LOGIC (If fallback/buttons are used)
            else {
                const message = await twilioClient.messages.create({
                    body: `[AlertoQR] Emergency Alert! Aapki vehicle (${data.vehicle_number || 'Vehicle'}) par ek notification aaya hai: "${alertType}". Kripya turant check karein!`,
                    from: '+17816193111',
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
