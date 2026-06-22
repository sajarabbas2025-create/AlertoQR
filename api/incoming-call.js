import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Exotel ke digits ko clean karne ke liye (Quotes hatane ke liye)
  const rawDigits = req.body.Digits || req.query.Digits;
  const digits = rawDigits ? rawDigits.toString().replace(/"/g, '') : null;

  res.setHeader('Content-Type', 'application/json');

  // Agar digits nahi hain, toh input maangein
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

    // Exotel ko "Dial" command bhej rahe hain
    return res.status(200).json({
      "Dial": `91${data.mobile_number}`
    });

  } catch (err) {
    return res.status(200).json({ "Say": "System error." });
  }
}
