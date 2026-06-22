import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Exotel se digits nikalna
  let rawDigits = req.query.digits || req.query.Digits || "";
  const cleanDigits = decodeURIComponent(rawDigits).replace(/["']/g, '').trim();

  // ALQR add karna
  const searchId = `ALQR${cleanDigits}`;

  console.log("User ne dial kiya:", cleanDigits);
  console.log("Database mein dhoondh rahe hain:", searchId);

  res.setHeader('Content-Type', 'application/json');

  if (!cleanDigits) {
    return res.status(200).json({ "numbers": [] });
  }

  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .eq('sticker_id', searchId)
      .single();

    if (error || !data) {
      console.log("ID match nahi hui:", searchId);
      return res.status(200).json({ "numbers": [] });
    }

    // Exotel outbound dialing ke liye '0' prefix best hota hai
    const destinationNumber = `0${data.mobile_number}`;
    console.log("Match Found! Exotel ko bhej rahe hain:", destinationNumber);

    // EXOTEL KA EXACT FORMAT (Yeh format ab sahi number ke sath jayega)
    return res.status(200).json({
      "numbers": [destinationNumber]
    });

  } catch (err) {
    console.error("System error:", err);
    return res.status(200).json({ "numbers": [] });
  }
}
