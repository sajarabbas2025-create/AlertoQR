const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const twilioClient = twilio(twilioSid, twilioAuthToken);

module.exports = async (req, res) => {
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

            let rawPhone = (mode === 'alternate') ? data.alternate_number : data.mobile_number;

            if (!rawPhone) {
                return res.status(400).json({ success: false, error: 'Requested phone number is not registered.' });
            }

            // 🔥 PHONE FORMATTER: Agar number me +91 nahi laga hai, toh automatic jod dega
            let targetPhone = rawPhone.toString().trim();
            if (!targetPhone.startsWith('+')) {
                if (targetPhone.startsWith('91') && targetPhone.length > 10) {
                    targetPhone = '+' + targetPhone;
                } else {
                    targetPhone = '+91' + targetPhone;
                }
            }

            // 2. 📞 CALL PROTOCOL
            if (mode === 'call' || mode === 'alternate') {
                const twimlResponse = `
                    <Response>
                        <Say voice="polly.Aditi">Alerto Q R Alert! Kisi helper ne aapki gadi ke paas se aapko contact karne ki koshish ki hai. Kripya turant check karein.</Say>
                    </Response>
                `;

                const call = await twilioClient.calls.create({
                    twiml: twimlResponse,
                    to: targetPhone, // Formatted Indian Number (+91XXXX...)
                    from: '+17816193111' 
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
