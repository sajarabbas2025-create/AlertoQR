import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/xml');

  try {
    // URL ke parameters ko sahi se parse karne ka tareeka
    const params = new URLSearchParams(req.url.split('?')[1]);
    let pinInput = params.get('Digits') || params.get('digits') || "";
    
    // Extra quotes ya symbols hatana
    pinInput = pinInput.toString().replace(/[^0-9]/g, '');

    if (!pinInput || pinInput.length < 4) {
      console.log("Waiting for digits. Input:", pinInput);
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather numDigits="4" timeout="15" action="https://alerto-qr.vercel.app/api/incoming-call" method="GET"/>
</Response>`);
    }

    // Database Search
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .or(`sticker_id.eq.ALQR${pinInput},sticker_id.eq.${pinInput}`)
      .single();

    if (error || !data) {
      console.log("PIN not found in DB for:", pinInput);
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
    }

    let ownerNumber = data.mobile_number.toString().replace(/[^0-9]/g, '');
    if (ownerNumber.length === 10) ownerNumber = `0${ownerNumber}`;

    console.log("Dialing:", ownerNumber);
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="08047285175">${ownerNumber}</Dial>
</Response>`);

  } catch (e) {
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  }
}
