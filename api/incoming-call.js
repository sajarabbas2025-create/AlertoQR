import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  
  // 1. Caller ka number nikalo
  const callFrom = (req.query.CallFrom || "").replace(/\D/g, '').slice(-10); 
  
  // 2. Digits nikalo (Exotel kabhi Digits, kabhi CustomField bhejta hai)
  const rawDigits = (req.query.Digits || req.query.digits || req.query.CustomField || "").replace(/["']/g, '').trim();
  
  // 3. Agar code mein '#' laga hai, toh use hata do
  let extractedCode = rawDigits.replace(/#/g, '');

  console.log("--- DEBUGGING NEW CALL ---");
  console.log("Caller:", callFrom, "| Raw Digits:", rawDigits, "| Extracted Code:", extractedCode);

  // LOGIC 1: Owner Callback (Agar koi code nahi aaya, toh callback mano)
  if (!extractedCode && callFrom) {
    console.log("Checking database for Owner callback:", callFrom);
    
    const { data, error } = await supabase
      .from('active_calls')
      .select('scanner_number')
      .eq('owner_number', callFrom)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.log("DB Error (Callback):", error.message);
    } else if (data) {
      console.log("Match Found! Connecting Owner to Scanner:", data.scanner_number);
      return res.status(200).json({ "destination": { "numbers": [data.scanner_number] } });
    }
  }

  // LOGIC 2: Scanner Call (Agar code aaya hai)
  if (extractedCode) {
    console.log("Searching DB for Code:", extractedCode, "OR ALQR" + extractedCode);
    
    // Yeh line smart hai: Ye '2577' aur 'ALQR2577' dono ko database mein search karegi
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .or(`sticker_id.eq.${extractedCode},sticker_id.eq.ALQR${extractedCode}`)
      .maybeSingle();

    if (error) {
      console.log("DB Error (Scanner Check):", error.message);
    } else if (data) {
      const ownerNumber = data.mobile_number.toString().replace(/\D/g, '').slice(-10);
      console.log("Match Found! Owner Number:", ownerNumber);

      // Future callbacks ke liye record save karo
      await supabase.from('active_calls').insert([{ 
        scanner_number: callFrom, 
        owner_number: ownerNumber 
      }]);
      
      return res.status(200).json({ "destination": { "numbers": [ownerNumber] } });
    } else {
      console.log("No Match Found in database for this code.");
    }
  }

  console.log("No condition met, ending call.");
  return res.status(200).json({ "destination": { "numbers": [] } });
}
