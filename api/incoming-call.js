import { createClient } from '@supabase/supabase-js';

// Vercel Environment Variables se URL aur Key uthayega
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/xml');

  try {
    const incomingData = req.method === 'POST' ? req.body : req.query;
    const pinInput = incomingData.Digits || incomingData.digits || "";

    if (!pinInput || pinInput.length < 4) {
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
    }

    const idWithPrefix = `ALQR${pinInput}`;
    
    // Supabase se data fetch
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .or(`sticker_id.eq.${idWithPrefix},sticker_id.eq.${pinInput}`)
      .single();

    if (error || !data || !data.mobile_number) {
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
    }

    let rawNumber = data.mobile_number.toString().replace(/[^0-9]/g, '');
    let ownerNumber = rawNumber.length === 10 ? `0${rawNumber}` : rawNumber;

    // Caller ID fix: Exotel ka virtual number 08047285175
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="08047285175">${ownerNumber}</Dial>
</Response>`);

  } catch (error) {
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  }
}
