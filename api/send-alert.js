const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');

// Environment variables configuration (Vercel Dashboard se settings automatically load hongi)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const twilioClient = twilio(twilioSid, twilioAuthToken);

module.exports = async (req, res) => {
    // CORS headers handling for frontend requests (GitHub Pages connectivity)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        const { stickerId, alertType, mode, helperPhone } = req.body;

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

            // 2. 👥 TRUE 2-WAY MASKING CALL LOGIC
            if (mode === 'call' || mode === 'alternate') {
                
                // Twilio TwiML Voice Engine Initialization:
                // Ye helper ko pehle automated line bolega fir background me owner se connect kar dega
                const twimlResponse = `
                    <Response>
                        <Say voice="alice">Connecting you securely to the vehicle owner. Please wait.</Say>
                        <Dial callerId="+17816193111">
                            ${targetPhone}
                        </Dial>
                    </Response>
                `;

                // Pehle Twilio Helper ke phone par call lagayega 
                const call = await twilioClient.calls.create({
                    twiml: twimlResponse,
                    to: helperPhone || targetPhone, 
                    from: '+17816193111' // Aapka Twilio Number
                });

                return res.status(200).json({ success: true, mode: 'call', sid: call.sid });
            } 
            
            // 3. QUICK ALERT SMS LOGIC
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
