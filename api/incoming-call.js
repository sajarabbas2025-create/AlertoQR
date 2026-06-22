import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Exotel se digits nikalna (GET request se)
  let rawDigits = req.query.digits || req.query.Digits || "";
  
  // Digits ko clean karna (%221005%22 -> 1005)
  const cleanDigits = decodeURIComponent(rawDigits).replace(/["']/g, '').trim();

  // Ye Vercel logs mein dikhega debug karne ke liye
  console.log("Exotel se mila Raw Input:", rawDigits);
  console.log("Clean kiya hua Sticker ID:", cleanDigits);

  res.setHeader('Content-Type', 'application/json');

  // Agar input nahi hai toh khali array bhejenge
  if (!cleanDigits) {
    console.log("Koi input nahi mila.");
    return res.status(200).json([]);
  }

  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .eq('sticker_id', cleanDigits)
      .single();

    if (error || !data) {
      console.log("Database mein ye sticker ID nahi mili:", cleanDigits);
      return res.status(200).json([]);
    }

    const destinationNumber = `91${data.mobile_number}`;
    console.log("Success! Exotel ko ye number bhej rahe hain:", destinationNumber);

    // EXOTEL REQUIREMENT: Sirf ek simple Array
    return res.status(200).json([ destinationNumber ]);

  } catch (err) {
    console.error("System crash ho gaya:", err);
    return res.status(200).json([]);
  }
}
