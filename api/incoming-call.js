import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    // Environment variables check karein
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      throw new Error("Supabase credentials missing");
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    const digits = req.body.Digits;

    if (!digits) {
      return res.status(200).json({ "Say": "Please enter the code." });
    }

    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .eq('sticker_id', digits)
      .single();

    if (error || !data) {
      return res.status(200).json({ "Say": "Invalid code." });
    }

    // Success response
    return res.status(200).json({
      "Dial": { "Number": `91${data.mobile_number}` }
    });

  } catch (err) {
    console.error("Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
