import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/xml');

  try {
    const incomingData = req.method === 'POST' ? req.body : req.query;
    
    // Yahan hum inputs ko saaf kar rahe hain taaki "1011" match ho sake
    let pinInput = incomingData.Digits || incomingData.digits || "";
    pinInput = pinInput.toString().replace(/[^0-9]/g, '');

    if (!pinInput || pinInput.length < 4) {
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather numDigits="4" timeout="10" action="https://alerto-qr.vercel.app/api/incoming-call" method="GET"/>
</Response>`);
    }

    const idWithPrefix = `ALQR${pinInput}`;
    
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .or(`sticker_id.eq.${idWithPrefix},sticker_id.eq.${pinInput}`)
      .single();

    if (error || !data || !data.mobile_number) {
      console.log(`PIN ${pinInput} not found or error:`, error);
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
    }

    let rawNumber = data.mobile_number.toString().replace(/[^0-9]/g, '');
    let ownerNumber = rawNumber.length === 10 ? `0${rawNumber}` : rawNumber;

    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="08047285175">${ownerNumber}</Dial>
</Response>`);

  } catch (error) {
    console.error("Critical Error:", error);
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  }
}
