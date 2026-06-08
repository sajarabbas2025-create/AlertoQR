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
    // 1. Incoming data nikalna (GET ya POST)
    const incomingData = req.method === 'POST' ? req.body : req.query;
    
    console.log("=== SMSCOUNTRY LIVE PING ===");
    console.log(JSON.stringify(incomingData, null, 2));

    // 2. Check karna ki kya SMSCountry ne humein DTMF (Digits) bheja hai
    // SMSCountry key ka naam 'digits', 'Digits', ya 'keys' rakhta hai
    const vehiclePin = incomingData.digits || incomingData.Digits || incomingData.keys || incomingData.dtmf;

    // Response header ko XML set karna kyunki SMSCountry XML samajhta hai
    res.setHeader('Content-Type', 'text/xml');

    // STEP A: Agar user ne abhi tak PIN nahi dabaya hai (Call bilkul abhi aayi hai)
    // Toh hum SMSCountry ko XML bhejenge ki 4-digit PIN capture karo
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

    // STEP B: Agar helper ke phone ne 4-digit PIN (jaise 1001) bhej diya hai
    console.log(`System ko PIN mil gaya: ${vehiclePin}`);

    // Hamari temporary gaadiyon ki list
    const vehicleDatabase = {
      "1001": "+919876543210", // Owner 1
      "2540": "+918765432109"  // Owner 2
    };

    if (vehicleDatabase[vehiclePin]) {
      const ownerNumber = vehicleDatabase[vehiclePin];
      console.log(`PIN Match ho gaya! Call forward ho rahi hai: ${ownerNumber}`);

      // SMSCountry ko Call Forward (Dial/Bridge) karne ka XML dena
      const forwardXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial>${ownerNumber}</Dial>
</Response>`;
      
      return res.status(200).send(forwardXml);
    } else {
      console.log("Galat PIN mila, call cut karne ka XML bhej raha hu.");
      
      const rejectXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Speak>Invalid vehicle code. Goodbye.</Speak>
    <Hangup/>
</Response>`;
      
      return res.status(200).send(rejectXml);
    }

  } catch (error) {
    console.error("Webhook Error:", error);
    res.setHeader('Content-Type', 'text/xml');
    return res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  }
}
