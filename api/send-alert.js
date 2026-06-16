import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { stickerId, helperNumber } = req.body;
    
    // 1. Fetch Owner Number from DB
    const { data, error } = await supabase.from('registrations')
      .select('mobile_number').eq('sticker_id', stickerId.trim().toUpperCase()).single();
    
    if (error || !data) return res.status(200).json({ success: false, error: 'Profile not found.' });

    // 2. Exotel API Call Trigger
    const exotelUrl = `https://api.exotel.com/v1/Accounts/${process.env.EXOTEL_SID}/Calls/connect.json`;
    
    const body = new URLSearchParams({
      "From": "YOUR_VIRTUAL_NUMBER", // Yahan apna Exotel virtual number daalein
      "To": helperNumber,            // Helper ko call jayegi
      "CallerId": "YOUR_VIRTUAL_NUMBER"
    });

    const response = await fetch(exotelUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${process.env.EXOTEL_KEY}:${process.env.EXOTEL_TOKEN}`).toString('base64')
      },
      body: body
    });

    const apiData = await response.json();
    return res.status(200).json({ success: true, data: apiData });

  } catch (err) {
    return res.status(200).json({ success: false, error: err.message });
  }
}
