import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  
  const callFrom = (req.query.CallFrom || "").replace(/\D/g, '').slice(-10); 
  const digits = (req.query.Digits || "").replace(/["']/g, '').trim();

  console.log("--- DEBUGGING CALL ---");
  console.log("Caller:", callFrom, "Digits:", digits);

  // LOGIC 1: Owner Callback
  if (!digits && callFrom) {
    const { data, error } = await supabase
      .from('active_calls')
      .select('scanner_number')
      .eq('owner_number', callFrom)
      .order('created_at', { ascending: false });

    if (error) {
      console.log("DB ERROR:", error.message);
    } else {
      console.log("DB DATA RECEIVED:", JSON.stringify(data));
      if (data && data.length > 0) {
        return res.status(200).json({ "destination": { "numbers": [data[0].scanner_number] } });
      }
    }
  }

  // LOGIC 2: Scanner Call
  if (digits) {
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .eq('sticker_id', `ALQR${digits}`);

    if (error) {
      console.log("DB ERROR:", error.message);
    } else {
      console.log("DB DATA RECEIVED:", JSON.stringify(data));
      if (data && data.length > 0) {
        const ownerNumber = data[0].mobile_number.toString().replace(/\D/g, '').slice(-10);
        await supabase.from('active_calls').insert([{ scanner_number: callFrom, owner_number: ownerNumber }]);
        return res.status(200).json({ "destination": { "numbers": [ownerNumber] } });
      }
    }
  }

  return res.status(200).json({ "destination": { "numbers": [] } });
}
