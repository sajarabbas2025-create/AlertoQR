import { createClient } from '@supabase/supabase-js';

// Supabase client initialization
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // Exotel ke liye response header hamesha XML hona chahiye
  res.setHeader('Content-Type', 'application/xml');

  try {
    // URL ke parameters ko parse karein
    const params = new URLSearchParams(req.url.split('?')[1]);
    let pinInput = params.get('Digits') || params.get('digits') || "";
    
    // Sirf numbers nikalna
    pinInput = pinInput.toString().replace(/[^0-9]/g, '');

    // Agar PIN nahi hai, toh Gather prompt bhejein
    if (!pinInput || pinInput.length < 4) {
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather numDigits="4" timeout="15" action="https://alerto-qr.vercel.app/api/incoming-call" method="GET"/>
</Response>`);
    }

    // Database lookup (registrations table)
    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .or(`sticker_id.eq.ALQR${pinInput},sticker_id.eq.${pinInput}`)
      .single();

    if (error || !data) {
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
    }

    // Mobile number ko 91 prefix ke saath format karein (Exotel requirement)
    let rawNumber = data.mobile_number.toString().replace(/[^0-9]/g, '');
    if (rawNumber.length === 10) {
      rawNumber = `91${rawNumber}`;
    } else if (rawNumber.length === 12 && rawNumber.startsWith('91')) {
      // Already correct format
    }

    // Final XML response
    const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="08047285175">${rawNumber}</Dial>
</Response>`;

    console.log("Dialing:", rawNumber);
    return res.status(200).send(xmlResponse);

  } catch (e) {
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  }
}

