const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cefzsgchfdvtyfmcrsda.supabase.co";
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZnpzZ2NoZmR2dHlmbWNyc2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTU5NTgsImV4cCI6MjA5NDQzMTk1OH0.JhuJVKqX6xMbWQ7bmsraY3DjVKbsXMNzl0h6ljePTxs";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SMSCOUNTRY_AUTH_KEY = "VjML4PrM2o7xqOELaQuD";
const SMSCOUNTRY_AUTH_TOKEN = "W3DUky5OlRoevogUDqkwLps8rkHNqwWy0QalAVJl";

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { stickerId, alertType, mode } = req.body;
        if (!stickerId) return res.status(200).json({ success: false, error: 'Sticker ID is missing' });

        const { data, error } = await supabase.from('registrations').select('*').eq('sticker_id', stickerId.trim().toUpperCase()).single();
        if (error || !data) return res.status(200).json({ success: false, error: 'Profile not found.' });

        let targetPhone = (mode === 'alternate') ? data.alternate_number : data.mobile_number;
        if (!targetPhone) return res.status(200).json({ success: false, error: 'Phone missing.' });

        let cleanNumber = targetPhone.toString().replace(/[^0-9]/g, '');
        if (cleanNumber.startsWith('0')) cleanNumber = cleanNumber.substring(1);
        if (!cleanNumber.startsWith('91')) cleanNumber = `91${cleanNumber}`;

        const authHeader = 'Basic ' + Buffer.from(`${SMSCOUNTRY_AUTH_KEY}:${SMSCOUNTRY_AUTH_TOKEN}`).toString('base64');

        if (mode === 'call' || mode === 'alternate') {
            const callApiUrl = `https://restapi.smscountry.com/v0.1/Accounts/${SMSCOUNTRY_AUTH_KEY}/Calls/`;
            
            // Yahan se dummy URL hata diye gaye hain aur aawaz wala XML tag lagaya gaya hai
            const jsonBodyData = {
                "Number": cleanNumber,
                "CallerId": "918634512424",
                "HttpMethod": "POST",
                "Xml": "<Response><play>Hello. This is an emergency alert from Alerto QR. Someone is requesting you to check your vehicle immediately. Thank you.</play></Response>"
            };

            const response = await fetch(callApiUrl, {
                method: 'POST',
                headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify(jsonBodyData)
            });
            const apiData = await response.json();
            
            if (response.ok && apiData.Success !== false) {
                return res.status(200).json({ success: true, data: apiData });
            } else {
                return res.status(200).json({ success: false, error: `SMSCountry Error: ${JSON.stringify(apiData)}` });
            }
        } else {
            const smsApiUrl = `https://restapi.smscountry.com/v0.1/Accounts/${SMSCOUNTRY_AUTH_KEY}/SMSes/`;
            const jsonSmsData = { "Text": `[AlertoQR] Emergency Alert! Vehicle (${data.vehicle_number}) par alert: "${alertType}".`, "To": cleanNumber, "SenderId": "ALERTO" };

            const response = await fetch(smsApiUrl, {
                method: 'POST',
                headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify(jsonSmsData)
            });
            const apiData = await response.json();
            
            if (response.ok && apiData.Success !== false) return res.status(200).json({ success: true });
            else return res.status(200).json({ success: false, error: `SMS Error: ${JSON.stringify(apiData)}` });
        }
    } catch (err) {
        return res.status(200).json({ success: false, error: `Backend Crash: ${err.message}` });
    }
};
