import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Digits fetch aur cleanup
  const digits = (req.body?.Digits || req.query?.Digits || "").toString().replace(/"/g, '');

  // Agar input nahi hai
  if (!digits) {
    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Please enter the 4 digit sticker code.</Say></Response>`);
  }

  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .eq('sticker_id', digits)
      .single();

    if (error || !data) {
      res.setHeader('Content-Type', 'application/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid code.</Say></Response>`);
    }

    // Exotel ke liye XML format (Dial command)
    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Dial>91${data.mobile_number}</Dial></Response>`);

  } catch (err) {
    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>System error.</Say></Response>`);
  }
}
