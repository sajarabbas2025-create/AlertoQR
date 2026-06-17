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
    console.log("=== EXOTEL CONNECT PING ===");
    console.log(JSON.stringify(incomingData, null, 2));

    // Exotel ka Gather block hamesha capital 'Digits' bhejta hai
    const vehiclePin = incomingData.Digits || incomingData.digits || incomingData.keys || incomingData.dtmf;

    // Agar PIN nahi mila, toh blank bhejkar call safely cut karein
    if (!vehiclePin) {
      console.log("Error: Exotel se Digits/PIN nahi mila.");
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send("");
    }

    let formattedPin = vehiclePin.trim().toUpperCase();
    if (/^\d{4}$/.test(formattedPin)) {
        formattedPin = `ALQR${formattedPin}`;
    }

    console.log(`Supabase mein Sticker ID dhoondh raha hu: ${formattedPin}`);

    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .eq('sticker_id', formattedPin)
      .single();

    if (error || !data || !data.mobile_number) {
      console.log(`Database mein yeh ID nahi mili: ${formattedPin}`, error);
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(""); 
    }

    // Number format ko Exotel Connect ke liye set karna (0 lagana)
    let ownerNumber = data.mobile_number.toString().replace(/[^0-9]/g, '');
    if (ownerNumber.startsWith('91') && ownerNumber.length === 12) {
        ownerNumber = ownerNumber.substring(2);
    }
    if (ownerNumber.length === 10) {
        ownerNumber = `0${ownerNumber}`;
    }

    console.log(`Success! Call is number par forward ho rahi hai: ${ownerNumber}`);

    // Exotel ko plain text mein number lautana
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(ownerNumber);

  } catch (error) {
    console.error("Critical Webhook Error:", error);
    res.setHeader('Content-Type', 'text/plain');
    return res.status(500).send("");
  }
}
