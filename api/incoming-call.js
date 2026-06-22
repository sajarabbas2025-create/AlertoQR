import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Exotel se aane wala Data
  let rawDigits = req.query.digits || req.query.Digits || "";
  let callFrom = req.query.CallFrom || "";

  // Number aur Digits ko clean karna (taaki sirf 10 digit bache)
  const cleanCallFrom = callFrom.replace(/\D/g, '').slice(-10);
  const cleanDigits = decodeURIComponent(rawDigits).replace(/["']/g, '').trim();

  console.log("Jis number se call aayi hai:", cleanCallFrom);

  res.setHeader('Content-Type', 'application/json');

  try {
    // SCENARIO 1: Owner ne wapas call kiya hai (Usne koi 4-digit code nahi daala)
    if (!cleanDigits && cleanCallFrom) {
      // Database mein check karo ki is number ko pichle kuch time mein call aayi thi kya?
      const { data: callbackData } = await supabase
        .from('active_calls')
        .select('scanner_number')
        .ilike('owner_number', `%${cleanCallFrom}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (callbackData && callbackData.scanner_number) {
        // Owner mil gaya! Direct Scanner ko call laga do
        console.log("Owner is calling back! Dialing Scanner:", callbackData.scanner_number);
        const scannerNumberToDial = `+91${callbackData.scanner_number.slice(-10)}`;
        return res.status(200).json({
          "destination": { "numbers": [scannerNumberToDial] }
        });
      } else {
         // Agar owner nahi hai, toh empty bhej do taaki Exotel aage IVR baja de
         return res.status(200).json({ "destination": { "numbers": [] } });
      }
    }

    // SCENARIO 2: Scanner ne QR scan karke 4-digit code daala hai
    if (cleanDigits) {
      console.log("Scanner ne code daala hai:", cleanDigits);
      const searchId = `ALQR${cleanDigits}`;
      const { data, error } = await supabase
        .from('registrations')
        .select('mobile_number')
        .eq('sticker_id', searchId)
        .single();

      if (error || !data) {
         return res.status(200).json({ "destination": { "numbers": [] } });
      }

      const ownerNumber = data.mobile_number.replace(/\D/g, '').slice(-10);

      // Call connect karne se pehle dono ka number 'active_calls' mein save kar lo
      if (cleanCallFrom && ownerNumber) {
        await supabase.from('active_calls').insert([
          { scanner_number: cleanCallFrom, owner_number: ownerNumber }
        ]);
        console.log("Call record database mein save ho gaya!");
      }

      // Owner ko dial karo
      const destinationNumber = `+91${ownerNumber}`;
      console.log("Match Found! Dialing Owner:", destinationNumber);

      return res.status(200).json({
        "destination": { "numbers": [destinationNumber] }
      });
    }

    // Fallback
    return res.status(200).json({ "destination": { "numbers": [] } });

  } catch (err) {
    console.error("System error:", err);
    return res.status(200).json({ "destination": { "numbers": [] } });
  }
}
