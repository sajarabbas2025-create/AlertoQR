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

    // Database - Aapka number '1001' PIN par set hai
    const vehicleDatabase = {
      "1001": "6388522427", 
      "2540": "8765432109"
    };

    let ownerNumber = vehicleDatabase[vehiclePin];

    if (!ownerNumber) {
      return res.status(404).json({ success: false, message: "Galat QR Code." });
    }

    // SMSCountry ko numbers country code (91) ke sath chahiye hote hain
    let formattedHelper = helperNumber.length === 10 ? `91${helperNumber}` : helperNumber;
    let formattedOwner = ownerNumber.length === 10 ? `91${ownerNumber}` : ownerNumber;

    // ==========================================
    // SMSCOUNTRY CREDENTIALS (YAHAN APNI KEY & TOKEN DALEIN)
    // ==========================================
    const authKey = "YAHAN_APNI_SMSCOUNTRY_AUTH_KEY_DALEIN"; 
    const authToken = "YAHAN_APNI_SMSCOUNTRY_AUTH_TOKEN_DALEIN"; 
    const callerId = "918634512424"; // SMSCountry se mila naya Virtual Number

    // Base64 Encoding for Security Authorization
    const encodedAuth = Buffer.from(`${authKey}:${authToken}`).toString('base64');

    // SMSCountry Outbound Call Endpoint URL
    const smsCountryUrl = `https://api.smscountry.com/v0.1/Accounts/${authKey}/Calls`;

    // API Payload Data
    const payload = {
      From: formattedHelper,   // Helper ka number
      To: formattedOwner,      // Owner ka number (Aapka number)
      CallerId: callerId       // SMSCountry Caller ID
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
