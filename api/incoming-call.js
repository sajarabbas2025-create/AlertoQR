import { createClient } from '@supabase/supabase-js';

// Supabase client initialization
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // Exotel ke liye response header hamesha XML hona chahiye
  res.setHeader('Content-Type', 'application/xml');

  try {
    // 1. Exotel se aane wale request parameters
    const params = new URLSearchParams(req.url.split('?')[1]);
    const digits = params.get('Digits') || params.get('digits'); // Gather se aaya PIN
    
    // 2. Agar PIN nahi hai (Initial Call), to Gather ka XML bhejein
    if (!digits) {
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather numDigits="4" timeout="15" action="https://alerto-qr.vercel.app/api/incoming-call" method="GET"/>
</Response>`);
    }

    // 3. Database lookup (PIN/Sticker ID ke liye)
    const pinInput = digits.toString().replace(/[^0-9]/g, '');
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .or(`sticker_id.eq.ALQR${pinInput},sticker_id.eq.${pinInput}`)
      .single();

    // 4. Agar number nahi mila ya error aaya, to Hangup
    if (error || !data) {
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
    }

    // 5. Mobile number formatting (Exotel requirement: 91 prefix)
    let rawNumber = data.mobile_number.toString().replace(/[^0-9]/g, '');
    if (rawNumber.length === 10) {
      rawNumber = `91${rawNumber}`;
    }

    // 6. Final Dial XML response
    const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="08047285175" timeout="45">${rawNumber}</Dial>
</Response>`;

    console.log("Dialing:", rawNumber);
    return res.status(200).send(xmlResponse);

  } catch (e) {
    console.error("Error:", e);
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  }
}
