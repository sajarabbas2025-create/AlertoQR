import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. Supabase setup
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase credentials missing" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 2. Input fetch (Body ya Query dono se)
  const body = req.body || {};
  const query = req.query || {};
  const digits = body.Digits || query.Digits;

  res.setHeader('Content-Type', 'application/json');

  // 3. Agar digits nahi hain, input maangein
  if (!digits) {
    return res.status(200).json({ "Say": "Please enter the 4 digit sticker code." });
  }

  try {
    // 4. Database Query
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .eq('sticker_id', digits)
      .single();

    if (error || !data) {
      return res.status(200).json({ "Say": "Invalid code. Please try again." });
    }

    // 5. Simplified JSON Response (Exotel specific)
    return res.status(200).json({
      "Dial": `91${data.mobile_number}`
    });

  } catch (err) {
    console.error("Error:", err);
    return res.status(200).json({ "Say": "System error. Please try later." });
  }
}
