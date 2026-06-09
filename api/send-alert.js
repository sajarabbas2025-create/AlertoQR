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

    // 2. Clean and Format Numbers (12 digits with 91)
    let ownerCleanNumber = data.mobile_number.toString().replace(/[^0-9]/g, '');
    if (ownerCleanNumber.startsWith('0')) ownerCleanNumber = ownerCleanNumber.substring(1);
    if (!ownerCleanNumber.startsWith('91')) ownerCleanNumber = `91${ownerCleanNumber}`;

    let helperCleanNumber = helperNumber.toString().replace(/[^0-9]/g, '');
    if (helperCleanNumber.startsWith('0')) helperCleanNumber = helperCleanNumber.substring(1);
    if (!helperCleanNumber.startsWith('91')) helperCleanNumber = `91${helperCleanNumber}`;

    // 3. SMSCountry Credentials
    const SMSCOUNTRY_AUTH_KEY = "VjML4PrM2o7xqOELaQuD";
    const SMSCOUNTRY_AUTH_TOKEN = "W3DUky5OlRoevogUDqkwLps8rkHNqwWy0QalAVJl";
    const authHeader = 'Basic ' + Buffer.from(`${SMSCOUNTRY_AUTH_KEY}:${SMSCOUNTRY_AUTH_TOKEN}`).toString('base64');

    const callApiUrl = `https://restapi.smscountry.com/v0.1/Accounts/${SMSCOUNTRY_AUTH_KEY}/Calls/`;
    
    // 4. The Magic XML Payload
    const jsonBodyData = {
        "Number": helperCleanNumber,    
        "CallerId": "918634512424",
        "RingUrl": "https://alertoqr.in/ring",
        "AnswerUrl": "https://alertoqr.in/answer",
        "HangupUrl": "https://alertoqr.in/hangup",
        "HttpMethod": "POST",
        "Xml": `<Response><Play>Please wait, we are connecting your secure call.</Play><Dial>${ownerCleanNumber}</Dial></Response>` 
    };

    // 5. Trigger the Call
    const response = await fetch(callApiUrl, {
        method: 'POST',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonBodyData)
    });
    
    const apiData = await response.json();
    
    // 6. Return Result
    if (response.ok && apiData.Success !== false) {
        return res.status(200).json({ success: true, message: apiData });
    } else {
        return res.status(200).json({ success: false, error: `SMSCountry Error: ${JSON.stringify(apiData)}` });
    }

  } catch (err) {
    return res.status(200).json({ success: false, error: `Backend Crash: ${err.message}` });
  }
}
