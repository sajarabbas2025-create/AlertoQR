export default async function handler(req, res) {
  // ==========================================
  // 1. WEBHOOK (ANSWER URL) - Jab Helper Call Uthayega
  // ==========================================
  if (req.query.action === 'bridge') {
    const owner = '+' + req.query.owner;
    const callerId = '+' + req.query.callerId;

    // SMSCountry ko XML bhasha mein Owner ko connect karne ka order
    const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="${callerId}">${owner}</Dial>
</Response>`;

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(xmlResponse);
  }

  // ==========================================
  // 2. MAIN API - Jab QR Button Dabaya Jayega
  // ==========================================
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

    // Owner Data
    const vehicleDatabase = {
      "1001": "6388522427", 
      "2540": "8765432109"
    };

    let ownerNumber = vehicleDatabase[vehiclePin];

    if (!ownerNumber) {
      return res.status(404).json({ success: false, message: "Galat QR Code." });
    }

    const formatNumber = (num) => {
        let cleanNum = num.toString().replace(/\D/g, '');
        if (cleanNum.length === 10) cleanNum = '91' + cleanNum;
        return '+' + cleanNum;
    };

    let formattedHelper = formatNumber(helperNumber);
    
    // URL ke liye numbers bina '+' ke (taki koi error na aaye)
    let ownerForQuery = formatNumber(ownerNumber).replace('+', '');

    const authKey = "M5rIudGBrmiO4pdjCuoz"; 
    const authToken = "XWQDjyE87o1PpATFPtVdpXSVoNuSKH6sK6wvRK53"; 
    const callerId = "+918634512424"; 
    const callerIdForQuery = callerId.replace('+', '');

    const encodedAuth = Buffer.from(`${authKey}:${authToken}`).toString('base64');
    const smsCountryUrl = `https://restapi.smscountry.com/v0.1/Accounts/${authKey}/Calls/`;

    // Yeh wahi Webhook URL hai jo Krishna Sir maang rahe the
    const answerUrl = `https://alerto-qr.vercel.app/api/send-alert?action=bridge&owner=${ownerForQuery}&callerId=${callerIdForQuery}`;

    // ==========================================
    // SMSCOUNTRY OFFICIAL PAYLOAD
    // ==========================================
    const payload = {
      From: callerId,          // Call Virtual Number se jayegi
      To: formattedHelper,     // Pehli call Helper ko jayegi
      AnswerUrl: answerUrl     // Uthane par Webhook fire hoga
    };

    console.log(`Firing SMSCountry Call...`);

    const apiResponse = await fetch(smsCountryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encodedAuth}`
      },
      body: JSON.stringify(payload)
    });

    const resultText = await apiResponse.text();
    
    // Error Catcher
    if (!apiResponse.ok) {
        return res.status(200).json({
            success: false,
            message: "SMSCountry Error: " + resultText
        });
    }

    return res.status(200).json({
      success: true,
      message: "Call command sent successfully."
    });

  } catch (error) {
    console.error("Vercel Error:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
