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

    // Database - Aapka number '1001' par set hai
    const vehicleDatabase = {
      "1001": "6388522427", 
      "2540": "8765432109"
    };

    let ownerNumber = vehicleDatabase[vehiclePin];

    if (!ownerNumber) {
      return res.status(404).json({ success: false, message: "Galat QR Code." });
    }

    // SMSCountry ko numbers bina '+' ke 12-digit format (91...) mein chahiye
    let formattedHelper = helperNumber.length === 10 ? `91${helperNumber}` : helperNumber.replace('+', '');
    let formattedOwner = ownerNumber.length === 10 ? `91${ownerNumber}` : ownerNumber.replace('+', '');

    // ==========================================
    // SMSCOUNTRY CREDENTIALS (NEW KEYS APPLIED)
    // ==========================================
    const authKey = "M5rIudGBrmiO4pdjCuoz"; 
    const authToken = "XWQDjyE87o1PpATFPtVdpXSVoNuSKH6sK6wvRK53"; 
    const callerId = "918634512424"; // Krishna ji se mila naya Caller ID

    // Base64 Encoding - Jo documentation mein manga hai (Automatic)
    const encodedAuth = Buffer.from(`${authKey}:${authToken}`).toString('base64');

    // **Sarah ji ke mail ke mutabik EXACT LIVE URL**
    const smsCountryUrl = `https://restapi.smscountry.com/v0.1/Accounts/${authKey}/Calls/`;

    // Bridge Call Payload (Helper aur Owner ko jodna)
    const payload = {
      From: formattedHelper,   // Pehle call isko jayegi
      To: formattedOwner,      // Phir call aapko connect hogi
      CallerId: callerId       // Aapka Virtual Number display hoga
    };

    console.log(`Firing SMSCountry Bridge Call to: ${smsCountryUrl}`);

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
    console.log("SMSCountry Live Response: ", resultText);

    return res.status(200).json({
      success: true,
      message: "Call command sent via SMSCountry successfully.",
      telecomResponse: resultText
    });

  } catch (error) {
    console.error("Vercel Error:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
