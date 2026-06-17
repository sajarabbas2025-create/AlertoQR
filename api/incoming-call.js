import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // CORS Headers taaki API block na ho
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Incoming data nikalna (GET ya POST)
    const incomingData = req.method === 'POST' ? req.body : req.query;
    
    console.log("=== LIVE CALL PING ===");
    console.log(JSON.stringify(incomingData, null, 2));

    // Exotel/SMSCountry se aane wala DTMF digits (Sticker ID / PIN)
    const vehiclePin = incomingData.digits || incomingData.Digits || incomingData.keys || incomingData.dtmf;

    // Response header ko XML set karna
    res.setHeader('Content-Type', 'text/xml');

    // STEP A: Agar user ne abhi tak PIN nahi dabaya hai (Call bilkul abhi aayi hai)
    if (!vehiclePin) {
      console.log("Nayi call aayi hai, DTMF/PIN capture karne ka XML bhej raha hu...");
      
      const gatherXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <GetKeys numDigits="4" timeout="10" method="POST">
        <Speak>Please enter your four digit vehicle code.</Speak>
    </GetKeys>
</Response>`;
      
      return res.status(200).send(gatherXml);
    }

    // STEP B: Agar helper ke phone se PIN/Sticker ID mil gayi hai
    console.log(`System ko PIN/ID mil gaya: ${vehiclePin}`);

    // DYNAMIC LOGIC: Database format se match karne ke liye ALQR add karna
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

    if (error || !data || !data.mobile_number) {
      console.log(`Supabase mein ID ${formattedPin} ke liye koi profile nahi mili. Error:`, error);
      
      const rejectXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Speak>Invalid vehicle code. Goodbye.</Speak>
    <Hangup/>
</Response>`;
      
      return res.status(200).send(rejectXml);
    }

    // --- YAHAN CHANGE HUA HAI: Number Format for Exotel ---
    let ownerNumber = data.mobile_number.toString().replace(/[^0-9]/g, '');
    
    // Agar number mein aage 91 laga hai toh use hatayein
    if (ownerNumber.startsWith('91') && ownerNumber.length === 12) {
        ownerNumber = ownerNumber.substring(2);
    }
    
    // Exotel standard ke hisaab se 10 digit number ke aage '0' lagana
    if (ownerNumber.length === 10) {
        ownerNumber = `0${ownerNumber}`; 
    }
    
    console.log(`Supabase se number mil gaya! Call forward ho rahi hai: ${ownerNumber}`);

    // Call Forward (Dial/Bridge) karne ka XML dena
    const forwardXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial>${ownerNumber}</Dial>
</Response>`;
      
    return res.status(200).send(forwardXml);

  } catch (error) {
    console.error("Webhook Error:", error);
    res.setHeader('Content-Type', 'text/xml');
    return res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  }
}
