import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  
  // Exotel GET aur POST dono bhej sakta hai, isliye dono ko merge kar diya
  const params = { ...req.query, ...req.body };
  
  // 1. Caller ka number nikalo (10 Digits)
  const callFrom = (params.CallFrom || "").replace(/\D/g, '').slice(-10); 
  
  // 2. Raw Digits nikalo
  const rawDigits = (params.Digits || params.digits || params.CustomField || "").replace(/["']/g, '').trim();
  
  // 3. '#' hatao
  let cleanDigits = rawDigits.replace(/#/g, '');

  // 4. SMART FILTER: '2577' ya '2571' ko automatically hata do
  let extractedCode = cleanDigits;
  if (extractedCode.startsWith('2577')) {
      extractedCode = extractedCode.replace(/^2577/, '');
  } else if (extractedCode.startsWith('2571')) {
      extractedCode = extractedCode.replace(/^2571/, '');
  }

  console.log("--- DEBUGGING SMART CALL ---");
  console.log("Caller:", callFrom, "| Raw Digits:", rawDigits, "| Final Code:", extractedCode);

  // LOGIC 1: Owner Callback (Agar digits khali hain, toh ye owner ki callback call hai)
  if (!extractedCode && callFrom) {
    console.log("Checking database for Owner callback:", callFrom);
    
    const { data } = await supabase
      .from('active_calls')
      .select('scanner_number')
      .eq('owner_number', callFrom)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      const targetNumber = data.scanner_number.toString().replace(/\D/g, '').slice(-10);
      console.log("Match Found! Connecting Owner to Scanner:", targetNumber);
      
      // Sateek JSON format jo Exotel ko chahiye
      return res.status(200).json({ "destination": { "numbers": [targetNumber] } });
    } else {
      console.log("Owner found but no active scanner mapping in active_calls.");
    }
  }

  // LOGIC 2: Scanner Call (Agar helper ne QR scan karke call kiya hai)
  if (extractedCode) {
    console.log("Searching DB for Code:", extractedCode);
    
    const { data } = await supabase
      .from('registrations')
      .select('mobile_number')
      .or(`sticker_id.eq.${extractedCode},sticker_id.eq.ALQR${extractedCode}`)
      .maybeSingle();

    if (data) {
      const ownerNumber = data.mobile_number.toString().replace(/\D/g, '').slice(-10);
      console.log("Match Found! Owner Number:", ownerNumber);

      // Mapping save karo taaki wapas call lag sake
      await supabase.from('active_calls').insert([{ 
        scanner_number: callFrom, 
        owner_number: ownerNumber 
      }]);
      
      // Sateek JSON format jo Exotel ko chahiye
      return res.status(200).json({ "destination": { "numbers": [ownerNumber] } });
    } else {
      console.log("No Match Found in database.");
    }
  }

  // Defaut response agar kuch match na ho
  return res.status(200).json({ "destination": { "numbers": [] } });
}
