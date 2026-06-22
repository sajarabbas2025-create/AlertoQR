import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Exotel se digits nikalna
  let rawDigits = req.query.digits || req.query.Digits || "";
  
  // Digits ko clean karna
  const cleanDigits = decodeURIComponent(rawDigits).replace(/["']/g, '').trim();

  // THE REAL FIX: Database format ke hisaab se 'ALQR' add karna
  const searchId = `ALQR${cleanDigits}`;

  console.log("User ne dial kiya:", cleanDigits);
  console.log("Database mein dhoondh rahe hain:", searchId);

  res.setHeader('Content-Type', 'application/json');

  if (!cleanDigits) {
    return res.status(200).json([]);
  }

  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .eq('sticker_id', searchId) // Ab ye 'ALQR1004' search karega
      .single();

    if (error || !data) {
      console.log("ID match nahi hui:", searchId);
      return res.status(200).json([]);
    }

    const destinationNumber = `91${data.mobile_number}`;
    console.log("Match Found! Dialing:", destinationNumber);

    return res.status(200).json([ destinationNumber ]);

  } catch (err) {
    console.error("System error:", err);
    return res.status(200).json([]);
  }
}
