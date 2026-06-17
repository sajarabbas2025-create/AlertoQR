import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // CORS Setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle Preflight Request
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { stickerId, helperNumber } = req.body;
    
    // Check missing fields
    if (!stickerId) return res.status(200).json({ success: false, error: 'Sticker ID is missing' });
    if (!helperNumber) return res.status(200).json({ success: false, error: 'Helper number is missing' });

    // 1. Fetch Owner Number from Database
    const { data, error } = await supabase.from('registrations')
      .select('mobile_number').eq('sticker_id', stickerId.trim().toUpperCase()).single();
    
    if (error || !data) return res.status(200).json({ success: false, error: 'Profile not found.' });

    // 2. Format Numbers (Exotel works best with numbers containing country code without '+')
    let helperClean = helperNumber.toString().replace(/[^0-9]/g, '');
    if (helperClean.length === 10) helperClean = `91${helperClean}`;
    
    let ownerClean = data.mobile_number.toString().replace(/[^0-9]/g, '');
    if (ownerClean.length === 10) ownerClean = `91${ownerClean}`;

    // 3. Exotel API Logic (Connecting Helper and Owner via Virtual Number)
    const exotelUrl = `https://api.exotel.com/v1/Accounts/${process.env.EXOTEL_SID}/Calls/connect.json`;
    
    const bodyParams = new URLSearchParams({
      "From": helperClean,           // Pehle call Helper ko aayegi
      "To": ownerClean,              // Jaise hi Helper uthayega, call Owner ko lag jayegi
      "CallerId": "08047285175"      // Dono ki screen par aapka Virtual Number dikhega
    });

    // 4. Trigger Call
    const response = await fetch(exotelUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${process.env.EXOTEL_KEY}:${process.env.EXOTEL_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams
    });

    const apiData = await response.json();
    
    // 5. Response Return
    if (response.ok) {
        return res.status(200).json({ success: true, message: "Call successfully triggered via Exotel", data: apiData });
    } else {
        return res.status(200).json({ success: false, error: `Exotel Error: ${JSON.stringify(apiData)}` });
    }

  } catch (err) {
    return res.status(200).json({ success: false, error: `Backend Crash: ${err.message}` });
  }
}
