import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  const params = { ...req.query, ...req.body };
  
  // 1. Caller ka number nikalo
  const callFrom = (params.CallFrom || "").replace(/\D/g, '').slice(-10); 
  
  // 2. Raw Digits nikalo
  const rawDigits = (params.Digits || params.digits || params.CustomField || "").replace(/["']/g, '').trim();
  let cleanDigits = rawDigits.replace(/#/g, '');

  // 3. SMART FILTER: '2577' ya '2571' ko automatically hatao
  let extractedCode = cleanDigits;
  if (extractedCode.startsWith('2577')) {
      extractedCode = extractedCode.replace(/^2577/, '');
  } else if (extractedCode.startsWith('2571')) {
      extractedCode = extractedCode.replace(/^2571/, '');
  }

  console.log("--- DEBUGGING SMART CALL ---");
  console.log("Caller:", callFrom, "| Raw Digits:", rawDigits, "| Final Code:", extractedCode);

  // LOGIC 1: Owner Callback (Neeche wala Telephone Icon - Connect Applet)
  // Yeh Exotel ke Connect Applet ke liye PLAIN TEXT number bhejega
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
      
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(targetNumber); // Plain text number for Connect Applet
    }
  }

  // LOGIC 2: Scanner Call (Upar wala Cube Icon - Passthru Applet)
  // Yeh Passthru ke liye JSON format bhejega
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

      await supabase.from('active_calls').insert([{ 
        scanner_number: callFrom, 
        owner_number: ownerNumber 
      }]);
      
      return res.status(200).json({ "destination": { "numbers": [ownerNumber] } }); // JSON format
    }
  }

  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send("");
}
