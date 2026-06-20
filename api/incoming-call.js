import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    // 1. Environment variables check (Fallback logic for Vercel)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials missing in Environment Variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 2. Exotel se aayi 'Digits' (sticker code) lijiye
    const digits = req.body.Digits;

    // Agar digits nahi mile (initial call trigger), to welcome message
    if (!digits) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({ "Say": "Please enter the 4 digit sticker code." });
    }

    // 3. Database se Owner ka number fetch karein
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .eq('sticker_id', digits)
      .single();

    // 4. JSON Response setup
    res.setHeader('Content-Type', 'application/json');

    if (error || !data) {
      return res.status(200).json({ "Say": "Invalid code. Please try again." });
    }

    // Success response: Dialing the owner
    return res.status(200).json({
      "Dial": {
        "Number": `91${data.mobile_number}`
      }
    });

  } catch (err) {
    console.error("Critical Error:", err.message);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}
