import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { stickerId } = req.body;
    if (!stickerId) return res.status(200).json({ success: false, error: 'ID missing' });

    // Ab hum naam aur vehicle number bhi nikal rahe hain
    const { data, error } = await supabase.from('registrations')
      .select('mobile_number, full_name, vehicle_number').eq('sticker_id', stickerId.trim().toUpperCase()).single();
    
    if (error || !data) return res.status(200).json({ success: false, error: 'Vehicle profile nahi mili' });

    let ownerNumber = data.mobile_number.toString().replace(/[^0-9]/g, '');
    if (ownerNumber.startsWith('0')) ownerNumber = ownerNumber.substring(1);
    if (ownerNumber.length === 10) ownerNumber = `91${ownerNumber}`;

    return res.status(200).json({ 
        success: true, 
        mobileNumber: ownerNumber,
        ownerName: data.full_name || 'Vehicle Owner',
        vehicleNumber: data.vehicle_number || 'N/A'
    });

  } catch (err) {
    return res.status(200).json({ success: false, error: `Server Error: ${err.message}` });
  }
}
