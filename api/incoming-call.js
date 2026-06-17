import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  try {
    const incomingData = req.method === 'POST' ? req.body : req.query;
    
    // 1. PIN capture: Gather se aane wala 'Digits' parameter
    const pinInput = incomingData.Digits || incomingData.digits || "";

    if (!pinInput) {
      return res.status(200).send("");
    }

    // 2. Search database (ALQR prefix ke sath)
    const idWithPrefix = `ALQR${pinInput}`;
    
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .or(`sticker_id.eq.${idWithPrefix},sticker_id.eq.${pinInput}`)
      .single();

    if (error || !data || !data.mobile_number) {
      return res.status(200).send(""); 
    }

    // 3. Format phone number: 06388522427
    let rawNumber = data.mobile_number.toString().replace(/[^0-9]/g, '');
    let ownerNumber = rawNumber.length === 10 ? `0${rawNumber}` : rawNumber;

    // 4. XML Response (Caller ID fix ke sath)
    // IMPORTANT: Yahan apna actual virtual number 08047285175 use karein
    const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="08047285175">${ownerNumber}</Dial>
</Response>`;

    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(xmlResponse);

  } catch (error) {
    console.error("Critical Error:", error);
    return res.status(200).send("");
  }
}
