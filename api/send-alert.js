const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Fallback checking agar Vercel par environment variables set na ho toh
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cefzsgchfdvtyfmcrsda.supabase.co";
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZnpzZ2NoZmR2dHlmbWNyc2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTU5NTgsImV4cCI6MjA5NDQzMTk1OH0.JhuJVKqX6xMbWQ7bmsraY3DjVKbsXMNzl0h6ljePTxs";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SMSCOUNTRY_AUTH_KEY = "VjML4PrM2o7xqOELaQuD";
const SMSCOUNTRY_AUTH_TOKEN = "W3DUky5OlRoevogUDqkwLps8rkHNqwWy0QalAVJl";

module.exports = async (req, res) => {
    // CORS configuration bypass
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        const { stickerId, alertType, mode } = req.body;

        if (!stickerId) {
            return res.status(200).json({ success: false, error: 'Sticker ID parameter missing in request body.' });
        }

        try {
            // 1. Supabase Fetching with Error Handling
            const { data, error } = await supabase
                .from('registrations')
                .select('*')
                .eq('sticker_id', stickerId.trim().toUpperCase())
                .single();

            if (error || !data) {
                return res.status(200).json({ success: false, error: `Supabase Error: Record not found for ID ${stickerId}` });
            }

            let targetPhone = (mode === 'alternate') ? data.alternate_number : data.mobile_number;
            if (!targetPhone) {
                return res.status(200).json({ success: false, error: 'Vehicle owner number is missing in database.' });
            }

            let ownerPhoneClean = targetPhone.toString().replace(/[^0-9]/g, '');
            if (ownerPhoneClean.length === 10) {
                ownerPhoneClean = `91${ownerPhoneClean}`;
            }

            // 📞 SMSCOUNTRY CALL TRIGGER
            if (mode === 'call' || mode === 'alternate') {
                const callApiUrl = `https://api.smscountry.com/v1/Accounts/Voice/Calls.json`;
                const authHeader = Buffer.from(`${SMSCOUNTRY_AUTH_KEY}:${SMSCOUNTRY_AUTH_TOKEN}`).toString('base64');

                const params = new URLSearchParams();
                params.append('From', '919703826178'); // Testing hardcoded target route node
                params.append('To', ownerPhoneClean);  
                params.append('Type', 'bridge');

                try {
                    const apiResponse = await axios.post(callApiUrl, params, {
                        headers: {
                            'Authorization': `Basic ${authHeader}`,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    });

                    return res.status(200).json({ success: true, data: apiResponse.data });

                } catch (apiErr) {
                    // Agar SMSCountry fail karega toh frontend ko saaf message dikhega
                    const msg = apiErr.response ? JSON.stringify(apiErr.response.data) : apiErr.message;
                    return res.status(200).json({ success: false, error: `SMSCountry Node Denied: ${msg}` });
                }
            } 
            
            // 💬 SMS TRANS-PROTOCOL
            else {
                const smsMessage = `[AlertoQR] Emergency Alert! Vehicle (${data.vehicle_number || 'Vehicle'}) par alert: "${alertType}". Kripya check karein!`;
                const gatewayUrl = `https://bulksmsplans.com/api/send-sms`;
                
                let smsTarget = ownerPhoneClean;
                if (smsTarget.startsWith('91')) { smsTarget = smsTarget.substring(2); }

                try {
                    await axios.get(gatewayUrl, {
                        params: {
                            api_id: "API42znmxVL150879", 
                            api_password: "ND7oMLCE",
                            sms_type: 'Transactional',
                            sms_encoding: 'text',
                            sender: 'BLKSM5',
                            number: smsTarget,
                            message: smsMessage
                        }
                    });
                    return res.status(200).json({ success: true, mode: 'sms' });
                } catch (smsErr) {
                    return res.status(200).json({ success: false, error: `SMS Vendor Gateway Error: ${smsErr.message}` });
                }
            }

        } catch (err) {
            // Main Execution Thread Safety
            return res.status(200).json({ success: false, error: `Backend Runtime Exception: ${err.message}` });
        }
    } else {
        return res.status(200).json({ success: false, error: 'Only HTTP POST requests are authorized.' });
    }
};
