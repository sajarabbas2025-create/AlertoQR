import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { stickerId, helperNumber } = req.body;
    
    if (!stickerId) return res.status(200).json({ success: false, error: 'Sticker ID is missing' });
    if (!helperNumber) return res.status(200).json({ success: false, error: 'Helper number is missing' });

    // 1. Fetch Owner Profile
    const { data, error } = await supabase.from('registrations')
      .select('mobile_number').eq('sticker_id', stickerId.trim().toUpperCase()).single();
    
    if (error || !data) return res.status(200).json({ success: false, error: 'Profile not found.' });

    // 2. Format Numbers as strictly required by SMSCountry Group Call Docs (91XXXXXXXXXX)
    let helperCleanNumber = helperNumber.toString().replace(/[^0-9]/g, '');
    if (helperCleanNumber.startsWith('0')) helperCleanNumber = helperCleanNumber.substring(1);
    if (!helperCleanNumber.startsWith('91')) helperCleanNumber = `91${helperCleanNumber}`;

    let ownerCleanNumber = data.mobile_number.toString().replace(/[^0-9]/g, '');
    if (ownerCleanNumber.startsWith('0')) ownerCleanNumber = ownerCleanNumber.substring(1);
    if (!ownerCleanNumber.startsWith('91')) ownerCleanNumber = `91${ownerCleanNumber}`;

    // 3. SMSCountry Active Credentials
    const SMSCOUNTRY_AUTH_KEY = "M5rIudGBrmiO4pdjCuoz";
    const SMSCOUNTRY_AUTH_TOKEN = "XWQDjyE87o1PpATFPtVdpXSVoNuSKH6sK6wvRK53";
    const authHeader = 'Basic ' + Buffer.from(`${SMSCOUNTRY_AUTH_KEY}:${SMSCOUNTRY_AUTH_TOKEN}`).toString('base64');

    // 4. NAYA API URL: "GroupCalls"
    const callApiUrl = `https://restapi.smscountry.com/v0.1/Accounts/${SMSCOUNTRY_AUTH_KEY}/GroupCalls/`;
    
    // 5. NAYA PAYLOAD: Documentation wale screenshot ke hisaab se
    const jsonBodyData = {
        "Name": `Alert_${stickerId.trim()}`,
        "Participants": [
            {
                "Name": "Helper",
                "Number": helperCleanNumber
            },
            {
                "Name": "Owner",
                "Number": ownerCleanNumber
            }
        ]
    };

    // 6. Trigger the Call
    const response = await fetch(callApiUrl, {
        method: 'POST',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonBodyData)
    });
    
    const apiData = await response.json();
    
    // 7. Return Result
    if (response.ok && apiData.Success !== false) {
        return res.status(200).json({ success: true, message: apiData });
    } else {
        return res.status(200).json({ success: false, error: `SMSCountry Error: ${JSON.stringify(apiData)}` });
    }

  } catch (err) {
    return res.status(200).json({ success: false, error: `Backend Crash: ${err.message}` });
  }
}
