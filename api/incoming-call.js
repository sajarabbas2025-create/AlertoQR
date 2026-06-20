import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // 1. Exotel se aayi 'Digits' (sticker code) lijiye
  const digits = req.body.Digits;

  // 2. Database se Owner ka number fetch karein
  const { data } = await supabase
    .from('registrations')
    .select('mobile_number')
    .eq('sticker_id', digits)
    .single();

  // 3. Exotel ko JSON response bhejein (XML ki jagah)
  res.setHeader('Content-Type', 'application/json');
  
  if (data) {
    return res.status(200).json({
      "Dial": {
        "Number": `91${data.mobile_number}` 
      }
    });
  } else {
    // Agar code nahi mila
    return res.status(200).json({ "Say": "Invalid code." });
  }
}
