const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://cefzsgchfdvtyfmcrsda.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZnpzZ2NoZmR2dHlmbWNyc2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTU5NTgsImV4cCI6MjA5NDQzMTk1OH0.JhuJVKqX6xMbWQ7bmsraY3DjVKbsXMNzl0h6ljePTxs"
);

const SMSCOUNTRY_AUTH_KEY = "M5rIudGBrmiO4pdjCuoz";
const SMSCOUNTRY_AUTH_TOKEN = "XWQDjyE87o1PpATFPtVdpXSVoNuSKH6sK6wvRK53";

export default async function handler(req, res) {
  // CORS Headers (Yeh 'Failed to fetch' error hatayenge)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { stickerId, mode, helperNumber } = req.body;
    
    // Supabase data fetch
    const { data, error } = await supabase.from('registrations').select('*').eq('sticker_id', stickerId.trim().toUpperCase()).single();
    if (error || !data) return res.status(200).json({ success: false, error: 'Profile not found.' });

    let targetPhone = (mode === 'alternate') ? data.alternate_number : data.mobile_number;
    const clean = (num) => num.toString().replace(/[^0-9]/g, '').slice(-10);
    let ownerClean = clean(targetPhone);
    let helperClean = clean(helperNumber);

    // Call API
    const authHeader = 'Basic ' + Buffer.from(`${SMSCOUNTRY_AUTH_KEY}:${SMSCOUNTRY_AUTH_TOKEN}`).toString('base64');
    const response = await fetch(`https://restapi.smscountry.com/v0.1/Accounts/${SMSCOUNTRY_AUTH_KEY}/Calls/`, {
        method: 'POST',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "PrimaryNumber": "91" + helperClean,
            "SecondaryNumber": "91" + ownerClean,
            "CallerId": "918634512424"
        })
    });

    const apiData = await response.json();
    return res.status(200).json({ success: response.ok, data: apiData });

  } catch (err) {
    return res.status(200).json({ success: false, error: err.message });
  }
}
