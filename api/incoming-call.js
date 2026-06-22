import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. Supabase Setup
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 2. The Real Fix: Dono small 'digits' aur capital 'Digits' check karna (bina crash hue)
  const query = req.query || {};
  const body = req.body || {};
  
  let rawDigits = query.digits || query.Digits || body.digits || body.Digits;

  res.setHeader('Content-Type', 'application/json');

  // Agar sach mein koi input nahi aaya hai
  if (!rawDigits) {
    return res.status(200).json({ "Say": "Please enter the 4 digit sticker code." });
  }

  // 3. Exotel %22 (quotes) bhejta hai, use yahan saaf (clean) kar rahe hain
  const cleanDigits = rawDigits.toString().replace(/["'%]/g, '');

  try {
    // 4. Database Check
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .eq('sticker_id', cleanDigits)
      .single();

    if (error || !data) {
      return res.status(200).json({ "Say": "Invalid code." });
    }

    // 5. Exotel ke liye Exact JSON (Destination Number)
    return res.status(200).json({
      "Dial": `91${data.mobile_number}`
    });

  } catch (err) {
    return res.status(200).json({ "Say": "System error. Please try again." });
  }
}
