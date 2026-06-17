import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // CORS Headers for stability
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const incomingData = req.method === 'POST' ? req.body : req.query;
    
    // Gather block hamesha 'Digits' parameter bhejta hai
    const vehiclePin = incomingData.Digits || incomingData.digits || incomingData.keys;

    if (!vehiclePin) {
      console.log("No PIN received.");
      return res.status(200).send("");
    }

    let formattedPin = vehiclePin.trim().toUpperCase();
    if (/^\d{4}$/.test(formattedPin)) {
        formattedPin = `ALQR${formattedPin}`;
    }

    console.log(`Searching for ID: ${formattedPin}`);

    const { data, error } = await supabase
      .from('registrations')
      .select('mobile_number')
      .eq('sticker_id', formattedPin)
      .single();

    if (error || !data || !data.mobile_number) {
      console.log("Record not found.");
      return res.status(200).send(""); 
    }

    // Format phone number to start with '0' for Exotel Connect
    let ownerNumber = data.mobile_number.toString().replace(/[^0-9]/g, '');
    if (ownerNumber.startsWith('91') && ownerNumber.length === 12) {
        ownerNumber = ownerNumber.substring(2);
    }
    if (ownerNumber.length === 10) {
        ownerNumber = `0${ownerNumber}`;
    }

    console.log(`Forwarding call to: ${ownerNumber}`);

    // Exotel Connect block specific response: Only plain number
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(ownerNumber.trim());

  } catch (error) {
    console.error("Critical Webhook Error:", error);
    return res.status(200).send("");
  }
}
