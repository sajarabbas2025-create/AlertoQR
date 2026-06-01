const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Vercel Environment Variables Se Database aur Gateway Connect Kiya
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Naye Vercel Variables Jo Humne Abhi Add Kiye Hain
const API_ID = process.env.BULK_SMS_API_ID;
const API_PASSWORD = process.env.BULK_SMS_API_PASSWORD;
const SENDER_ID = "BLKSM5"; 

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
            // Supabase Query
            const { data, error } = await supabase
                .from('registrations')
                .select('*')
                .eq('sticker_id', stickerId.trim().toUpperCase())
                .single();

            if (error || !data) {
                return res.status(404).json({ success: false, error: 'Sticker ID not found in database.' });
            }

            let targetPhone = (mode === 'alternate') ? data.alternate_number : data.mobile_number;

            if (!targetPhone) {
                return res.status(400).json({ success: false, error: 'Requested phone number is not registered.' });
            }

            let cleanPhone = targetPhone.toString().replace(/[^0-9]/g, '');
            if (cleanPhone.startsWith('91') && cleanPhone.length > 10) {
                cleanPhone = cleanPhone.substring(2);
            }

            // 1. 📞 MASKED CALL MODE
            if (mode === 'call' || mode === 'alternate') {
                return res.status(200).json({ 
                    success: true, 
                    mode: 'call', 
                    virtualNumber: '+911732361210' 
                });
            } 
            
            // 2. 💬 BULK SMS PLANS QUICK ALERT SMS MODE
            else {
                const smsMessage = `[AlertoQR] Emergency Alert! Aapki vehicle (${data.vehicle_number || 'Vehicle'}) par ek notification aaya hai: "${alertType}". Kripya turant check karein!`;
                const gatewayUrl = `https://bulksmsplans.com/api/send-sms`;
                
                const response = await axios.get(gatewayUrl, {
                    params: {
                        api_id: API_ID,
                        api_password: API_PASSWORD,
                        sms_type: 'Transactional',
                        sms_encoding: 'text',
                        sender: SENDER_ID,
                        number: cleanPhone,
                        message: smsMessage
                    }
                });

                return res.status(200).json({ success: true, mode: 'sms', gatewayResponse: response.data });
            }

        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};
