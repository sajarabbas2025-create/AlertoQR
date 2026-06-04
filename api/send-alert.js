const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cefzsgchfdvtyfmcrsda.supabase.co";
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZnpzZ2NoZmR2dHlmbWNyc2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTU5NTgsImV4cCI6MjA5NDQzMTk1OH0.JhuJVKqX6xMbWQ7bmsraY3DjVKbsXMNzl0h6ljePTxs";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// SMSCountry Clear Text Credentials 
const SMSCOUNTRY_AUTH_KEY = "VjML4PrM2o7xqOELaQuD";
const SMSCOUNTRY_AUTH_TOKEN = "W3DUky5OlRoevogUDqkwLps8rkHNqwWy0QalAVJl";

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        const { stickerId, alertType, mode } = req.body;

        try {
            // 1. Supabase se profile fetch karna
            const { data, error } = await supabase
                .from('registrations')
                .select('*')
                .eq('sticker_id', stickerId.trim().toUpperCase())
                .single();

            if (error || !data) {
                return res.status(200).json({ success: false, error: 'Sticker ID profile not found.' });
            }

            let targetPhone = (mode === 'alternate') ? data.alternate_number : data.mobile_number;
            if (!targetPhone) {
                return res.status(200).json({ success: false, error: 'Target phone number missing.' });
            }

            // 🛠️ SMSCOUNTRY MANDATORY '91' FORMATTING
            let cleanNumber = targetPhone.toString().replace(/[^0-9]/g, '');
            
            // Suru ka 0 hatao agar hai toh
            if (cleanNumber.startsWith('0')) {
                cleanNumber = cleanNumber.substring(1);
            }
            
            // Ensure strict 12-digit format with '91'
            if (cleanNumber.startsWith('91') && cleanNumber.length === 12) {
                // Already perfect format
            } else {
                if (cleanNumber.length === 10) {
                    cleanNumber = `91${cleanNumber}`;
                }
            }

            // Basic Authentication header lock generator
            const authHeader = 'Basic ' + Buffer.from(`${SMSCOUNTRY_AUTH_KEY}:${SMSCOUNTRY_AUTH_TOKEN}`).toString('base64');

            // 📞 ROUTE 1: BRIDGE CALL
            if (mode === 'call' || mode === 'alternate') {
                const callApiUrl = `https://restapi.smscountry.com/v0.1/Accounts/${SMSCOUNTRY_AUTH_KEY}/Calls/`;

                // Unke mail ke mutabik dono numbers strict '91' ke sath ja rahe hain
                const jsonBodyData = {
                    "From": "919703826178", 
                    "To": cleanNumber,
                    "Type": "bridge"
                };

                try {
                    const apiResponse = await axios.post(callApiUrl, jsonBodyData, {
                        headers: {
                            'Authorization': authHeader,
                            'Content-Type': 'application/json'
                        }
                    });
                    return res.status(200).json({ success: true, message: 'Call Request Initiated.', data: apiResponse.data });
                } catch (apiErr) {
                    const errorMsg = apiErr.response ? JSON.stringify(apiErr.response.data) : apiErr.message;
                    return res.status(200).json({ success: false, error: `SMSCountry REST Error: ${errorMsg}` });
                }
            } 
            
            // 💬 ROUTE 2: SMS QUICK ALERTS
            else {
                const smsApiUrl = `https://restapi.smscountry.com/v0.1/Accounts/${SMSCOUNTRY_AUTH_KEY}/SMSes/`;
                const formattedMsg = `[AlertoQR] Emergency Alert! Vehicle (${data.vehicle_number || 'Vehicle'}) par alert: "${alertType}". Kripya check karein!`;
                
                const jsonSmsData = {
                    "Text": formattedMsg,
                    "To": cleanNumber,
                    "SenderId": "ALERTO"
                };

                try {
                    await axios.post(smsApiUrl, jsonSmsData, {
                        headers: {
                            'Authorization': authHeader,
                            'Content-Type': 'application/json'
                        }
                    });
                    return res.status(200).json({ success: true, mode: 'sms' });
                } catch (smsErr) {
                    const errorMsg = smsErr.response ? JSON.stringify(smsErr.response.data) : smsErr.message;
                    return res.status(200).json({ success: false, error: `SMSCountry SMS Error: ${errorMsg}` });
                }
            }

        } catch (err) {
            return res.status(200).json({ success: false, error: `Server Master Crash: ${err.message}` });
        }
    }
};
