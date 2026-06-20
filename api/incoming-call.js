import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // Exotel jab 'Gather' ke baad call karega, wo 'Digits' parameter bheje ga
  const digits = req.body.Digits;

  res.setHeader('Content-Type', 'application/xml');

  if (!digits) {
    // Agar input nahi mila, to welcome message play karein
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Gather action="/api/incoming-call" method="POST" numDigits="4">
            <Say>Please enter the 4 digit sticker code.</Say>
        </Gather>
    </Response>`);
  }

  // Database se Owner ka number fetch karein
  const { data, error } = await supabase
    .from('registrations')
    .select('mobile_number')
    .eq('sticker_id', digits) // Yahan digits (1004) match hoga
    .single();

  if (error || !data) {
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Say>Invalid code. Please try again.</Say>
    </Response>`);
  }

  // SAHI XML FORMAT jo Exotel ko chahiye:
  // Ismein <Dial> tag ke andar number hona zaroori hai
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Dial>${data.mobile_number}</Dial>
    </Response>`);
}
