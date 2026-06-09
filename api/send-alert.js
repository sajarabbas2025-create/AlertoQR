export default async function handler(req, res) {
  // CORS Security Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { vehiclePin, helperNumber } = req.body;

    if (!vehiclePin || !helperNumber) {
      return res.status(400).json({ success: false, message: "PIN aur Helper ka number dono zaruri hain." });
    }

    // Aapka asli number (Owner)
    const vehicleDatabase = {
      "1001": "6388522427", 
      "2540": "8765432109"
    };

    let ownerNumber = vehicleDatabase[vehiclePin];

    if (!ownerNumber) {
      return res.status(404).json({ success: false, message: "Galat QR Code." });
    }

    // SMSCountry usually requires numbers with country code (91)
    let formattedHelper = helperNumber.length === 10 ? `91${helperNumber}` : helperNumber;
    let formattedOwner = ownerNumber.length === 10 ? `91${ownerNumber}` : ownerNumber;

    // ==========================================
    // SMSCOUNTRY CREDENTIALS (YAHAN UPDATE KAREIN)
    // ==========================================
    const authKey = "YAHAN_SMSCOUNTRY_KI_AUTH_KEY_DALEIN"; 
    const authToken = "YAHAN_SMSCOUNTRY_KA_AUTH_TOKEN_DALEIN"; 
    const callerId = "YAHAN_SMSCOUNTRY_KA_VIRTUAL_NUMBER_DALEIN"; // e.g., "9180XXXXXXX"

    // Base64 Encoding for Basic Authorization
    const encodedAuth = Buffer.from(`${authKey}:${authToken}`).toString('base64');

    // SMSCountry Outbound Call API Endpoint
    const smsCountryUrl = `https://api.smscountry.com/v0.1/Accounts/${authKey}/Calls`;

    // API Payload (Data)
    const payload = {
      From: formattedHelper,   // Helper ka number (Pehli call isko jayegi)
      To: formattedOwner,      // Owner ka number (Dusri call isko jayegi)
      CallerId: callerId       // Aapka SMSCountry wala Virtual Number
    };

    console.log(`Firing SMSCountry Call...`);

    // Call Fire! (Secure POST Request)
    const apiResponse = await fetch(smsCountryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encodedAuth}`
      },
      body: JSON.stringify(payload)
    });

    const resultText = await apiResponse.text();
    console.log("SMSCountry Response: ", resultText);

    return res.status(200).json({
      success: true,
      message: "Call command sent via SMSCountry successfully."
    });

  } catch (error) {
    console.error("Vercel Error:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
