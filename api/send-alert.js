const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cefzsgchfdvtyfmcrsda.supabase.co";
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZnpzZ2NoZmR2dHlmbWNyc2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTU5NTgsImV4cCI6MjA5NDQzMTk1OH0.JhuJVKqX6xMbWQ7bmsraY3DjVKbsXMNzl0h6ljePTxs";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SMSCOUNTRY_AUTH_KEY = "M5rIudGBrmiO4pdjCuoz";
const SMSCOUNTRY_AUTH_TOKEN = "XWQDjyE87o1PpATFPtVdpXSVoNuSKH6sK6wvRK53";

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { stickerId, mode, helperNumber } = req.body;
        
        const { data } = await supabase.from('registrations').select('*').eq('sticker_id', stickerId.trim().toUpperCase()).single();
        let targetPhone = (mode === 'alternate') ? data.alternate_number : data.mobile_number;

        // Clean numbers
        const clean = (num) => num.toString().replace(/[^0-9]/g, '').slice(-10);
        let helperClean = clean(helperNumber);
        let ownerClean = clean(targetPhone);

        const authHeader = 'Basic ' + Buffer.from(`${SMSCOUNTRY_AUTH_KEY}:${SMSCOUNTRY_AUTH_TOKEN}`).toString('base64');

        // DIRECT BRIDGE CALL (No Webhook URLs needed)
        const callApiUrl = `https://restapi.smscountry.com/v0.1/Accounts/${SMSCOUNTRY_AUTH_KEY}/Calls/`;
        
        const response = await fetch(callApiUrl, {
            method: 'POST',
            headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "PrimaryNumber": "91" + helperClean,
                "SecondaryNumber": "91" + ownerClean,
                "CallerId": "918634512424"
            })
        });

        const apiData = await response.json();
        return res.status(200).json(apiData);

    } catch (err) {
        return res.status(200).json({ success: false, error: err.message });
    }
};
