const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cefzsgchfdvtyfmcrsda.supabase.co";
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZnpzZ2NoZmR2dHlmbWNyc2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTU5NTgsImV4cCI6MjA5NDQzMTk1OH0.JhuJVKqX6xMbWQ7bmsraY3DjVKbsXMNzl0h6ljePTxs";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SMSCOUNTRY_AUTH_KEY = "VjML4PrM2o7xqOELaQuD";
const SMSCOUNTRY_AUTH_TOKEN = "W3DUky5OlRoevogUDqkwLps8rkHNqwWy0QalAVJl";
const VIRTUAL_NUMBER = "918634512424"; 

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { stickerId, alertType, mode, helperNumber } = req.body;
        if (!stickerId) return res.status(200).json({ success: false, error: 'Sticker ID is missing' });

        const { data, error } = await supabase.from('registrations').select('*').eq('sticker_id', stickerId.trim().toUpperCase()).single();
        if (error || !data) return res.status(200).json({ success: false, error: 'Profile not found.' });

        let targetPhone = (mode === 'alternate') ? data.alternate_number : data.mobile_number;
        if (!targetPhone) return res.status(200).json({ success: false, error: 'Phone missing.' });

        let ownerCleanNumber = targetPhone.toString().replace(/[^0-9]/g, '');
        if (ownerCleanNumber.startsWith('0')) ownerCleanNumber = ownerCleanNumber.substring(1);
        if (!ownerCleanNumber.startsWith('91')) ownerCleanNumber = `91${ownerCleanNumber}`;

        const authHeader = 'Basic ' + Buffer.from(`${SMSCOUNTRY_AUTH_KEY}:${SMSCOUNTRY_AUTH_TOKEN}`).toString('base64');

        // 🚨 ROUTE 1: EMERGENCY SOS (Direct Automated Call)
        if (alertType === 'EMERGENCY SOS') {
            const callApiUrl = `https://restapi.smscountry.com/v0.1/Accounts/${SMSCOUNTRY_AUTH_KEY}/Calls/`;
            const jsonBodyData = {
                "Number": ownerCleanNumber,    
                "CallerId": VIRTUAL_NUMBER,
                "RingUrl": "https://alertoqr.in/ring",
                "AnswerUrl": "https://alertoqr.in/answer",
                "HangupUrl": "https://alertoqr.in/hangup",
                "HttpMethod": "POST",
                "Xml": `<Response><Play>Emergency Alert. Please check your vehicle immediately.</Play></Response>` 
            };

            const response = await fetch(callApiUrl, {
                method: 'POST',
                headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify(jsonBodyData)
            });
            
            const rawText = await response.text();
            try {
                const apiData = JSON.parse(rawText);
                if (response.ok && apiData.Success !== false) return res.status(200).json({ success: true, message: 'Automated SOS Call Placed' });
                else return res.status(200).json({ success: false, error: `SOS API Error: ${JSON.stringify(apiData)}` });
            } catch (e) {
                return res.status(200).json({ success: false, error: `SMSCountry HTML Error: ${rawText.substring(0, 100)}` });
            }
        }

        // 📞 ROUTE 2: NUMBER MASKED BRIDGE CALL (Safe/Working Route)
        else if (mode === 'call' || mode === 'alternate') {
            if (!helperNumber) return res.status(200).json({ success: false, error: 'Helper number missing.' });

            let helperCleanNumber = helperNumber.toString().replace(/[^0-9]/g, '');
            if (helperCleanNumber.startsWith('0')) helperCleanNumber = helperCleanNumber.substring(1);
            if (!helperCleanNumber.startsWith('91')) helperCleanNumber = `91${helperCleanNumber}`;

            // Wapas purane safe link par
            const callApiUrl = `https://restapi.smscountry.com/v0.1/Accounts/${SMSCOUNTRY_AUTH_KEY}/Calls/`;
            
            const jsonBodyData = {
                "Number": helperCleanNumber, 
                "CallerId": VIRTUAL_NUMBER,
                "RingUrl": "https://alertoqr.in/ring",
                "AnswerUrl": "https://alertoqr.in/answer",
                "HangupUrl": "https://alertoqr.in/hangup",
                "HttpMethod": "POST",
                "Xml": `<Response><Play>Please wait, connecting your secure call.</Play><Dial callerId="${VIRTUAL_NUMBER}">${ownerCleanNumber}</Dial></Response>` 
            };

            const response = await fetch(callApiUrl, {
                method: 'POST',
                headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify(jsonBodyData)
            });
            
            const rawText = await response.text();
            try {
                const apiData = JSON.parse(rawText);
                if (response.ok && apiData.Success !== false) return res.status(200).json({ success: true, message: 'Bridge Call Placed' });
                else return res.status(200).json({ success: false, error: `Bridge API Error: ${JSON.stringify(apiData)}` });
            } catch (e) {
                return res.status(200).json({ success: false, error: `SMSCountry HTML Error: ${rawText.substring(0, 100)}` });
            }
        } 

        // 💬 ROUTE 3: NORMAL SMS ALERTS
        else {
            const smsApiUrl = `https://restapi.smscountry.com/v0.1/Accounts/${SMSCOUNTRY_AUTH_KEY}/SMSes/`;
            const jsonSmsData = { 
                "Text": `[AlertoQR] Emergency Alert! Vehicle (${data.vehicle_number}) par alert: "${alertType}". Check portal: alertoqr.in`, 
                "Number": ownerCleanNumber, 
                "SenderId": "ALERTO" 
            };

            const response = await fetch(smsApiUrl, {
                method: 'POST',
                headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify(jsonSmsData)
            });
            
            const rawText = await response.text();
            try {
                const apiData = JSON.parse(rawText);
                if (response.ok && apiData.Success !== false) return res.status(200).json({ success: true });
                else return res.status(200).json({ success: false, error: `SMS API Error: ${JSON.stringify(apiData)}` });
            } catch (e) {
                return res.status(200).json({ success: false, error: `SMS HTML Error: ${rawText.substring(0, 100)}` });
            }
        }
    } catch (err) {
        return res.status(200).json({ success: false, error: `Vercel Crash: ${err.message}` });
    }
};
