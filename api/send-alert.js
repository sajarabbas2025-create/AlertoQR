import { createClient } from '@supabase/supabase-js';

// Environment variables aapke Vercel dashboard mein hone chahiye
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { stickerId, helperNumber } = req.body;
    
    // 1. Supabase se Owner ka number fetch karein
    const { data, error } = await supabase.from('registrations')
      .select('mobile_number')
      .eq('sticker_id', stickerId.trim().toUpperCase())
      .single();
    
    if (error || !data) throw new Error("Profile nahi mili.");

    // 2. Number Formatting (+91 format zaroori hai)
    const format = (num) => '+91' + num.toString().replace(/[^0-9]/g, '').slice(-10);
    const helperFormatted = format(helperNumber);
    const ownerFormatted = format(data.mobile_number);
    const callerId = "+918634512424"; // SMSCountry se mila hua Caller ID

    // 3. SMSCountry API Request
    const auth = Buffer.from("M5rIudGBrmiO4pdjCuoz:XWQDjyE87o1PpATFPtVdpXSVoNuSKH6sK6wvRK53").toString('base64');
    
    const response = await fetch("https://restapi.smscountry.com/v0.1/Accounts/M5rIudGBrmiO4pdjCuoz/Calls/", {
        method: 'POST',
        headers: { 
            'Authorization': 'Basic ' + auth, 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
            "PrimaryNumber": helperFormatted,
            "SecondaryNumber": ownerFormatted,
            "CallerId": callerId
        })
    });

    const result = await response.json();
    
    // 4. Response check
    if (response.ok) {
        return res.status(200).json({ success: true, message: "Call initiated", apiResponse: result });
    } else {
        return res.status(200).json({ success: false, error: JSON.stringify(result) });
    }

  } catch (err) {
    return res.status(200).json({ success: false, error: err.message });
  }
}
