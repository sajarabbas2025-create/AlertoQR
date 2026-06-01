const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const API_ID = process.env.BULK_SMS_API_ID;
const API_PASSWORD = process.env.BULK_SMS_API_PASSWORD;
const SENDER_ID = "BLKSM5"; 

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 📞 HENCE DIGITAL IVR WEBHOOK HANDSHAKE (GET or POST)
    // Jab unka telematics server call route karne aayega
    const incomingStickerId = req.query.stickerId || req.body.stickerId || "ALQR1005"; // Default fallback testing ke liye

    if (req.method === 'GET' || (req.body && !req.body.alertType)) {
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
                // Unka exact required format: {"data":"NUMBER"}
                return res.status(200).json({ data: cleanPhone });
            }
        } catch (e) {
            console.log("IVR dynamic fetch bypass");
        }
        // Agar kuch na mile toh emergency backup alerto number response
        return res.status(200).json({ data: "9254021578" });
    }

    // 💬 FRONTEND APP PROTOCOL (POST)
    if (req.method === 'POST') {
        const { stickerId, alertType, mode } = req.body;

        try {
            const { data, error } = await supabase
                .from('registrations')
                .select('*')
                .eq('sticker_id', stickerId.trim().toUpperCase())
                .single();

            if (error || !data) {
                return res.status(200).json({ success: false, error: 'Sticker ID not found.' });
            }

            let targetPhone = (mode === 'alternate') ? data.alternate_number : data.mobile_number;
            if (!targetPhone) {
                return res.status(200).json({ success: false, error: 'Phone vacant.' });
            }

            let cleanPhone = targetPhone.toString().replace(/[^0-9]/g, '');
            if (cleanPhone.startsWith('91') && cleanPhone.length > 10) {
                cleanPhone = cleanPhone.substring(2);
            }

            if (mode === 'call' || mode === 'alternate') {
                return res.status(200).json({ success: true, mode: 'call', virtualNumber: '+911732361210' });
            } else {
                const smsMessage = `[AlertoQR] Emergency Alert! Aapki vehicle (${data.vehicle_number || 'Vehicle'}) par ek notification aaya hai: "${alertType}". Kripya check karein!`;
                const gatewayUrl = `https://bulksmsplans.com/api/send-sms`;
                
                axios.get(gatewayUrl, {
                    params: {
                        api_id: API_ID,
                        api_password: API_PASSWORD,
                        sms_type: 'Transactional',
                        sms_encoding: 'text',
                        sender: SENDER_ID,
                        number: cleanPhone,
                        message: smsMessage
                    }
                }).catch(e => console.log("Gateway bypass"));

                return res.status(200).json({ success: true, mode: 'sms' });
            }

        } catch (err) {
            return res.status(200).json({ success: false, error: err.message });
        }
    }
};
