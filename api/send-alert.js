import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { stickerId, helperNumber } = req.body;
    
    // 1. Data Fetch
    const { data, error } = await supabase.from('registrations')
      .select('mobile_number').eq('sticker_id', stickerId.trim().toUpperCase()).single();
    
    if (error || !data) throw new Error("Profile nahi mili.");

    // 2. Number Formatting (91 prefix)
    const format = (num) => '91' + num.toString().replace(/[^0-9]/g, '').slice(-10);
    const helper = format(helperNumber);
    const owner = format(data.mobile_number);

    // 3. Payload (Yeh structure SMSCountry ka official Bridge format hai)
    const payload = {
        "From": "918634512424",
        "To": helper,
        "Dial": owner
    };

    const auth = Buffer.from("M5rIudGBrmiO4pdjCuoz:XWQDjyE87o1PpATFPtVdpXSVoNuSKH6sK6wvRK53").toString('base64');
    
    // 4. API Call
    const response = await fetch("https://restapi.smscountry.com/v0.1/Accounts/M5rIudGBrmiO4pdjCuoz/Calls/", {
        method: 'POST',
        headers: { 
            'Authorization': 'Basic ' + auth,
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    return res.status(200).json({ success: response.ok, data: result });

  } catch (err) {
    return res.status(200).json({ success: false, error: err.message });
  }
}
