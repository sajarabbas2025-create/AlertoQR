import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // CORS and Headers
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const incomingData = req.method === 'POST' ? req.body : req.query;
    
    // 1. PIN capture: Gather block 'Digits' bhejta hai
    const pinInput = incomingData.Digits || incomingData.digits || "";

    if (!pinInput) {
      console.log("No PIN received.");
      return res.status(200).send("");
    }

    // 2. Search database: ALQR prefix ke sath
    const idWithPrefix = `ALQR${pinInput}`;
    
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .or(`sticker_id.eq.${idWithPrefix},sticker_id.eq.${pinInput}`)
      .single();

    if (error || !data || !data.mobile_number) {
      console.log(`Record not found for PIN: ${pinInput}`);
      return res.status(200).send(""); 
    }

    // 3. Number Formatting: Database mein agar 6388522427 hai, toh use 06388522427 banayenge
    let rawNumber = data.mobile_number.toString().replace(/[^0-9]/g, '');
    
    // Agar number 10 digit ka hai, to aage 0 lagao
    let ownerNumber = rawNumber.length === 10 ? `0${rawNumber}` : rawNumber;

    console.log(`Forwarding call to: ${ownerNumber}`);

    // 4. Return plain number for Exotel Connect
    return res.status(200).send(ownerNumber);

  } catch (error) {
    console.error("Critical Webhook Error:", error);
    return res.status(200).send("");
  }
}
