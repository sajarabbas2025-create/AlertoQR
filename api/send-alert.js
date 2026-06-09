import { createClient } from '@supabase/supabase-js';

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
    if (!stickerId || !helperNumber) throw new Error("Missing parameters");

    // Supabase Fetch
    const { data, error } = await supabase.from('registrations')
      .select('mobile_number').eq('sticker_id', stickerId.trim().toUpperCase()).single();
    
    if (error || !data) throw new Error("Profile not found");

    // Call API
    const auth = Buffer.from("M5rIudGBrmiO4pdjCuoz:XWQDjyE87o1PpATFPtVdpXSVoNuSKH6sK6wvRK53").toString('base64');
    
    const response = await fetch(`https://restapi.smscountry.com/v0.1/Accounts/M5rIudGBrmiO4pdjCuoz/Calls/`, {
        method: 'POST',
        headers: { 'Authorization': 'Basic ' + auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "PrimaryNumber": "91" + helperNumber.slice(-10),
            "SecondaryNumber": "91" + data.mobile_number.toString().slice(-10),
            "CallerId": "918634512424"
        })
    });

    const result = await response.json();
    // Yahan hum asli response bhejenge
    return res.status(200).json({ success: response.ok, data: result });

  } catch (err) {
    // Ab 'undefined' ki jagah asli error msg aayega
    return res.status(200).json({ success: false, error: err.message });
  }
}
