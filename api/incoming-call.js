import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const incomingData = req.method === 'POST' ? req.body : req.query;
    console.log("=== LIVE CALL PING (PLAIN TEXT MODE) ===");
    console.log(JSON.stringify(incomingData, null, 2));

    // Exotel se aane wala PIN (4 digits)
    const vehiclePin = incomingData.digits || incomingData.Digits || incomingData.keys || incomingData.dtmf;

    // Agar PIN nahi mila, toh blank bhej do taaki Exotel fallback kare
    if (!vehiclePin) {
      console.log("PIN capture nahi hua.");
      return res.status(200).send("");
    }

    // Database search ke liye PIN format karna (ALQR lagana)
    let formattedPin = vehiclePin.trim().toUpperCase();
    if (/^\d{4}$/.test(formattedPin)) {
        formattedPin = `ALQR${formattedPin}`;
    }

    console.log(`Supabase mein search kar raha hu: ${formattedPin}`);

    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .eq('sticker_id', formattedPin)
      .single();

    // Agar database mein record nahi mila
    if (error || !data || !data.mobile_number) {
      console.log(`Record nahi mila is ID ke liye: ${formattedPin}`);
      return res.status(200).send(""); 
    }

    // Number ko Exotel Connect ke hisaab se format karna (0 lagana)
    let ownerNumber = data.mobile_number.toString().replace(/[^0-9]/g, '');
    if (ownerNumber.startsWith('91') && ownerNumber.length === 12) {
        ownerNumber = ownerNumber.substring(2);
    }
    if (ownerNumber.length === 10) {
        ownerNumber = `0${ownerNumber}`;
    }

    console.log(`Number mil gaya, Exotel ko bhej raha hu: ${ownerNumber}`);

    // YAHAN CHANGE HUA HAI: XML nahi, sirf plain text mein number bhejna hai
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(ownerNumber);

  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).send("");
  }
}
