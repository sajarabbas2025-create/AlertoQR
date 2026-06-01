const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const API_ID = process.env.BULK_SMS_API_ID;
const API_PASSWORD = process.env.BULK_SMS_API_PASSWORD;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 📞 BULK SMS PLANS / HENCE DIGITAL IVR HANDSHAKE PROTOCOL
    // Jab unka server call aage badhane ke liye hamare URL ko hit karega
    if (req.method === 'GET' || (req.method === 'POST' && !req.body.alertType)) {
        // Unka system jo bhi query bhej raha ho, hum hamesha registered phone number plain text me denge
        const incomingStickerId = req.query.stickerId || req.body.stickerId || req.query.did || req.query.caller || "ALQR1005";
        
        try {
            const { data, error } = await supabase
                .from('registrations')
                .select('mobile_number')
                .eq('sticker_id', incomingStickerId.trim().toUpperCase())
                .single();

            if (!error && data && data.mobile_number) {
                let cleanPhone = data.mobile_number.toString().replace(/[^0-9]/g, '');
                if (cleanPhone.startsWith('91') && cleanPhone.length > 10) {
                    cleanPhone = cleanPhone.substring(2);
                }
                
                // 🌟 CHANGER ROADBLOCK REMOVAL: DIRECT PLAIN TEXT RESPONSE
                // Unhe koi json formatting nahi chahiye, direct text output chahiye
                res.setHeader('Content-Type', 'text/plain');
                return res.status(200).send(cleanPhone);
            }
        } catch (e) {
            console.log("IVR plain parsing catch active");
        }

        // Backup fallback agar number na mile toh default plain number return karega
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send("9254021578");
    }

    // 💬 FRONTEND APP PROTOCOL (POST) - For SMS and Dialer Instant Trigger
    if (req.method === 'POST') {
        const { stickerId, alertType, mode } = req.body;

        try {
            const { data, error } = await supabase
                .from('registrations')
                .select('*')
                .eq('sticker_id', stickerId.trim().toUpperCase())
                .single();

            if (error || !data) {
                return res.status(200).json({ success: false, error: 'Sticker ID vacant.' });
            }

            let targetPhone = (mode === 'alternate') ? data.alternate_number : data.mobile_number;
            if (!targetPhone) {
                return res.status(200).json({ success: false, error: 'Phone missing.' });
            }

            let customerPhone = targetPhone.toString().replace(/[^0-9]/g, '');
            if (customerPhone.startsWith('91') && customerPhone.length > 10) {
                customerPhone = customerPhone.substring(2);
            }

            if (mode === 'call' || mode === 'alternate') {
                return res.status(200).json({ success: true, mode: 'call', virtualNumber: '+911732361210' });
            } else {
                const smsMessage = `[AlertoQR] Emergency Alert! Vehicle (${data.vehicle_number || 'Vehicle'}) par alert: "${alertType}". Kripya check karein!`;
                const gatewayUrl = `https://bulksmsplans.com/api/send-sms`;
                
                axios.get(gatewayUrl, {
                    params: {
                        api_id: API_ID,
                        api_password: API_PASSWORD,
                        sms_type: 'Transactional',
                        sms_encoding: 'text',
                        sender: 'BLKSM5',
                        number: customerPhone,
                        message: smsMessage
                    }
                }).catch(e => console.log("Bypass background sync alert"));

                return res.status(200).json({ success: true, mode: 'sms' });
            }

        } catch (err) {
            return res.status(200).json({ success: false, error: err.message });
        }
    }
};
