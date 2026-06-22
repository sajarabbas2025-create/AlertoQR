import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Digits dhoondhne ka foolproof tareeka
  let digits = req.body?.Digits || req.query?.Digits;
  
  // Agar digits JSON string mein hain (Exotel kabhi kabhi aisa karta hai)
  if (typeof digits === 'string') {
    digits = digits.replace(/["']/g, '');
  }

  res.setHeader('Content-Type', 'application/json');

  if (!digits) {
    return res.status(200).json({ "Say": "Please enter the 4 digit sticker code." });
  }

  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .eq('sticker_id', digits)
      .single();

    if (error || !data) {
      return res.status(200).json({ "Say": "Invalid code." });
    }

    // Exotel ke liye standard format
    return res.status(200).json({
      "Dial": { "Number": `91${data.mobile_number}` }
    });

  } catch (err) {
    // Error ko chupa rahe hain taaki Exotel crash na ho
    return res.status(200).json({ "Say": "System error." });
  }
}
