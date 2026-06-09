const { createClient } = require('@supabase/supabase-js');

// Ensure you have these as Environment Variables in Vercel Dashboard
const supabase = createClient(
  process.env.SUPABASE_URL || "https://cefzsgchfdvtyfmcrsda.supabase.co", 
  process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // Aapki key
);

export default async function handler(req, res) {
  // 1. Mandatory CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. Handle Preflight Request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { stickerId, mode, helperNumber } = req.body;
    
    // Database Logic
    const { data, error } = await supabase.from('registrations')
        .select('*').eq('sticker_id', stickerId.trim().toUpperCase()).single();
    
    if (error || !data) return res.status(200).json({ success: false, error: 'Profile not found.' });

    let targetPhone = (mode === 'alternate') ? data.alternate_number : data.mobile_number;
    
    // SMSCountry API
    const auth = Buffer.from("M5rIudGBrmiO4pdjCuoz:XWQDjyE87o1PpATFPtVdpXSVoNuSKH6sK6wvRK53").toString('base64');
    
    const response = await fetch(`https://restapi.smscountry.com/v0.1/Accounts/M5rIudGBrmiO4pdjCuoz/Calls/`, {
        method: 'POST',
        headers: { 
            'Authorization': 'Basic ' + auth, 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
            "PrimaryNumber": "91" + helperNumber.slice(-10),
            "SecondaryNumber": "91" + targetPhone.toString().slice(-10),
            "CallerId": "918634512424"
        })
    });

    const apiData = await response.json();
    return res.status(200).json({ success: response.ok, data: apiData });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
