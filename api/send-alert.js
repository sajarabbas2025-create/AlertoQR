const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cefzsgchfdvtyfmcrsda.supabase.co";
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZnpzZ2NoZmR2dHlmbWNyc2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTU5NTgsImV4cCI6MjA5NDQzMTk1OH0.JhuJVKqX6xMbWQ7bmsraY3DjVKbsXMNzl0h6ljePTxs";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// SMSCountry API Target Credentials (Sarah Ji Verified Structure)
const SMSCOUNTRY_AUTH_KEY = "VjML4PrM2o7xqOELaQuD";
const SMSCOUNTRY_AUTH_TOKEN = "W3DUky5OlRoevogUDqkwLps8rkHNqwWy0QalAVJl";

module.exports = async (req, res) => {
    // CORS Node Handling
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        const { stickerId, alertType, mode } = req.body;

        try {
            // 1. Supabase Fetching Record
            const { data, error } = await supabase
                .from('registrations')
                .select('*')
                .eq('sticker_id', stickerId.trim().toUpperCase())
                .single();

            if (error || !data) {
                return res.status(200).json({ success: false, error: 'Sticker ID profile records vacant.' });
            }

            let targetPhone = (mode === 'alternate') ? data.alternate_number : data.mobile_number;
            if (!targetPhone) {
                return res.status(200).json({ success: false, error: 'Vehicle owner number missing.' });
            }

            let ownerPhoneClean = targetPhone.toString().replace(/[^0-9]/g, '');
            if (ownerPhoneClean.length === 10) {
                ownerPhoneClean = `91${ownerPhoneClean}`;
            }

            // 📞 ROUTE 1: PHONE BRIDGE CALLING ENGINE (SMSCountry REST API v0.1)
            if (mode === 'call' || mode === 'alternate') {
                const callApiUrl = `https://restapi.smscountry.com/v0.1/Accounts/${SMSCOUNTRY_AUTH_KEY}/Calls/`;
                const authHeader = Buffer.from(`${SMSCOUNTRY_AUTH_KEY}:${SMSCOUNTRY_AUTH_TOKEN}`).toString('base64');

                const params = new URLSearchParams();
                params.append('From', '919703826178'); // Testing Fallback Reference Route Node
                params.append('To', ownerPhoneClean);  
                params.append('Type', 'bridge');

                try {
                    const apiResponse = await axios.post(callApiUrl, params, {
                        headers: {
                            'Authorization': `Basic ${authHeader}`,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    });
                    return res.status(200).json({ success: true, message: 'Bridge call dispatched.', data: apiResponse.data });
                } catch (apiErr) {
                    const errorMsg = apiErr.response ? JSON.stringify(apiErr.response.data) : apiErr.message;
                    return res.status(200).json({ success: false, error: `SMSCountry REST Node Error: ${errorMsg}` });
                }
            } 
            
            // 💬 ROUTE 2: TEXT SMS GATEWAY (Bulk SMS Plans Transactional)
            else {
                const smsMessage = `[AlertoQR] Emergency Alert! Vehicle (${data.vehicle_number || 'Vehicle'}) par alert: "${alertType}". Kripya check karein!`;
                const gatewayUrl = `https://bulksmsplans.com/api/send-sms`;
                
                let smsTarget = ownerPhoneClean;
                if (smsTarget.startsWith('91')) {
                    smsTarget = smsTarget.substring(2); 
                }

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
            }

        } catch (err) {
            return res.status(200).json({ success: false, error: `Backend Master Exception: ${err.message}` });
        }
    }
};
