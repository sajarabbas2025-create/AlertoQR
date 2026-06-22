import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. Supabase Setup
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 2. Fetch Digits (Exotel GET parameters mein 'digits' bhejta hai)
  let rawDigits = req.query.digits || req.query.Digits || "";
  
  // 3. Clean %22 and quotes (%221005%22 -> 1005)
  const cleanDigits = decodeURIComponent(rawDigits).replace(/["']/g, '').trim();

  res.setHeader('Content-Type', 'application/json');

  // Agar input nahi mila ya galat hai, toh empty array bhejenge
  if (!cleanDigits) {
    return res.status(200).json({ "numbers": [] });
  }

  try {
    // 4. Database Se Number Nikalna
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .eq('sticker_id', cleanDigits)
      .single();

    if (error || !data) {
      return res.status(200).json({ "numbers": [] });
    }

    // 5. EXOTEL CONNECT APPLET FORMAT (Sirf 'numbers' array chalega)
    return res.status(200).json({
      "numbers": [`91${data.mobile_number}`]
    });

  } catch (err) {
    return res.status(500).json({ error: "System error" });
  }
}
