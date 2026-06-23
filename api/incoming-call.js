import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Supabase client setup
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  
  // Exotel se aane wala data - Phone numbers ko 10-digit format mein clean kar rahe hain
  const callFrom = (req.query.CallFrom || "").replace(/\D/g, '').slice(-10); 
  const digits = (req.query.Digits || "").replace(/["']/g, '').trim();

  console.log("--- NEW CALL RECEIVED ---");
  console.log("Caller Number (Cleaned):", callFrom);
  console.log("Digits Received:", digits);

  // LOGIC 1: Owner Callback (Scanner number dhoondhna)
  if (!digits && callFrom) {
    console.log("Checking database for Owner callback mapping:", callFrom);
    
    // .maybeSingle() ka use kiya taaki multiple records hone par error na aaye
    const { data, error } = await supabase
      .from('active_calls')
      .select('scanner_number')
      .eq('owner_number', callFrom)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(); 

    if (error) {
      console.log("Supabase Error (Owner Check):", error.message);
    } else if (data) {
      console.log("Match Found! Connecting Owner to Scanner:", data.scanner_number);
      return res.status(200).json({ "destination": { "numbers": [data.scanner_number] } });
    }
  }

  // LOGIC 2: Scanner Call (Owner number dhoondhna)
  if (digits) {
    console.log("Searching for Sticker ID:", `ALQR${digits}`);
    
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .eq('sticker_id', `ALQR${digits}`)
      .maybeSingle();

    if (error) {
      console.log("Supabase Error (Sticker Check):", error.message);
    } else if (data) {
      const ownerNumber = data.mobile_number.toString().replace(/\D/g, '').slice(-10);
      console.log("Sticker Match Found! Owner Number:", ownerNumber);

      // Mapping save karo taaki Owner baad mein call back kar sake
      await supabase.from('active_calls').insert([{ 
        scanner_number: callFrom, 
        owner_number: ownerNumber 
      }]);
      
      return res.status(200).json({ "destination": { "numbers": [ownerNumber] } });
    }
  }

  console.log("No match found, ending call.");
  return res.status(200).json({ "destination": { "numbers": [] } });
}
