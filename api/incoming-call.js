export default async function handler(req, res) {
  // CORS setup taaki API block na ho
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 1. Aane wale data ko capture karna (GET ya POST format mein)
    const incomingData = req.method === 'POST' ? req.body : req.query;
    
    // 2. Vercel Logs mein data print karna (Debugging ke liye sabse zaroori)
    console.log("=== INCOMING CALL DATA FROM SMSCOUNTRY ===");
    console.log(JSON.stringify(incomingData, null, 2));

    // 3. Caller ID aur DTMF (PIN) ko variables mein nikalna
    // (In keys ka naam hum logs check karne ke baad exact set karenge)
    const helperNumber = incomingData.caller_id || incomingData.From || incomingData.mobile || incomingData.number; 
    const vehiclePin = incomingData.dtmf || incomingData.Digits || incomingData.pin || incomingData.data;

    console.log(`Call Is Number Se Aayi Hai: ${helperNumber}`);
    console.log(`Helper Ne Ye PIN (DTMF) Dabaya Hai: ${vehiclePin}`);

    // 4. Temporary Database (Vehicle PIN ko Owner ke Number se match karna)
    // Asli project mein aap ise apne Supabase ya kisi aur DB se fetch karenge
    const vehicleDatabase = {
      "1001": "+919876543210", // Demo Owner 1 ka number
      "2540": "+918765432109"  // Demo Owner 2 ka number
    };

    let responseData = {};

    // 5. Call Routing Logic
    if (vehiclePin && vehicleDatabase[vehiclePin]) {
      const ownerNumber = vehicleDatabase[vehiclePin];
      console.log(`PIN Match Ho Gaya! Call Forward Hogi: ${ownerNumber} Par`);

      // SMSCountry ko successful response dena
      responseData = {
        success: true,
        action: "forward_call",
        bridge_to: ownerNumber, 
        message: "Code verified, routing call to vehicle owner."
      };
    } else {
      console.log("Sahi DTMF PIN nahi mila ya call missed thi.");
      responseData = {
        success: false,
        message: "No valid PIN received or direct missed call."
      };
    }

    // 6. Response wapas SMSCountry ko bhej dena
    return res.status(200).json(responseData);

  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
