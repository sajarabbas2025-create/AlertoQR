import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/xml');

  try {
    const incomingData = req.method === 'POST' ? req.body : req.query;
    const pinInput = incomingData.Digits || incomingData.digits || "";

    // Agar PIN nahi mila ya 4 digit ka nahi hai, toh wapas Gather prompt bhejo
    if (!pinInput || pinInput.length < 4) {
      console.log(`Waiting for full 4-digit PIN. Current input: ${pinInput}`);
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather numDigits="4" timeout="10" action="https://alerto-qr.vercel.app/api/incoming-call" method="GET"/>
</Response>`);
    }

    // Database search (ALQR1005 ya 1005)
    const idWithPrefix = `ALQR${pinInput}`;
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .or(`sticker_id.eq.${idWithPrefix},sticker_id.eq.${pinInput}`)
      .single();

    if (error || !data || !data.mobile_number) {
      console.log(`PIN ${pinInput} not found in DB`);
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
    }

    // Number formatting: 10-digit number ke aage 0 lagana
    let rawNumber = data.mobile_number.toString().replace(/[^0-9]/g, '');
    let ownerNumber = rawNumber.length === 10 ? `0${rawNumber}` : rawNumber;

    // Final Dial Response
    const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="08047285175">${ownerNumber}</Dial>
</Response>`;

    return res.status(200).send(xmlResponse);

  } catch (error) {
    console.error("Critical Error:", error);
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  }
}
