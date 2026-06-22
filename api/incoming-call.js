import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase credentials missing" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // SAFE FETCH: req.body ya req.query undefined hone par bhi crash nahi hoga
  const digits = req.body?.Digits || req.query?.Digits;

  res.setHeader('Content-Type', 'application/json');

  if (!digits) {
    return res.status(200).json({ "Say": "Please enter the 4 digit sticker code." });
  }

  // Digits ko clean karna (agar quotes aa rahe hain)
  const cleanDigits = digits.toString().replace(/"/g, '');

  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .eq('sticker_id', cleanDigits)
      .single();

    if (error || !data) {
      return res.status(200).json({ "Say": "Invalid code." });
    }

    return res.status(200).json({
      "Dial": { "Number": `91${data.mobile_number}` }
    });

  } catch (err) {
    return res.status(200).json({ "Say": "System error." });
  }
}
