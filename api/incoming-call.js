import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  
  const callFrom = (req.query.CallFrom || "").replace(/\D/g, '').slice(-10); 
  // Agar digits URL mein "25771008#" aa rahe hain, to hum last 4 digits nikalenge
  const rawDigits = (req.query.Digits || "").replace(/["']/g, '').trim();
  
  // Logic: Agar pure digits aa rahe hain, to last 4 extract karo
  const extractedCode = rawDigits.length > 4 ? rawDigits.slice(-5, -1) : rawDigits.replace('#', '');

  console.log("--- DEBUGGING ---");
  console.log("Caller:", callFrom, "Raw Digits:", rawDigits, "Extracted Code:", extractedCode);

  // LOGIC 1: Owner Callback
  if (!rawDigits && callFrom) {
    const { data } = await supabase
      .from('active_calls')
      .select('scanner_number')
      .eq('owner_number', callFrom)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      return res.status(200).json({ "destination": { "numbers": [data.scanner_number] } });
    }
  }

  // LOGIC 2: Scanner Call (Using Extracted Code)
  if (extractedCode) {
    console.log("Searching for Sticker ID: ALQR" + extractedCode);
    
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .eq('sticker_id', 'ALQR' + extractedCode)
      .maybeSingle();

    if (data) {
      const ownerNumber = data.mobile_number.toString().replace(/\D/g, '').slice(-10);
      await supabase.from('active_calls').insert([{ scanner_number: callFrom, owner_number: ownerNumber }]);
      return res.status(200).json({ "destination": { "numbers": [ownerNumber] } });
    }
  }

  return res.status(200).json({ "destination": { "numbers": [] } });
}
