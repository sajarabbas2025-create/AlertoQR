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

    // Owner Data
    const vehicleDatabase = {
      "1001": "6388522427", 
      "2540": "8765432109"
    };

    let ownerNumber = vehicleDatabase[vehiclePin];

    if (!ownerNumber) {
      return res.status(404).json({ success: false, message: "Galat QR Code." });
    }

    // ==========================================
    // NAYA NUMBER FORMATTER (Jo automatic '+' lagayega)
    // ==========================================
    const formatNumber = (num) => {
        let cleanNum = num.toString().replace(/\D/g, ''); // Sirf numbers rakhega
        if (cleanNum.length === 10) cleanNum = '91' + cleanNum;
        return '+' + cleanNum; // '+' zaroori hai
    };

    let formattedHelper = formatNumber(helperNumber);
    let formattedOwner = formatNumber(ownerNumber);

    const authKey = "M5rIudGBrmiO4pdjCuoz"; 
    const authToken = "XWQDjyE87o1PpATFPtVdpXSVoNuSKH6sK6wvRK53"; 
    const callerId = "+918634512424"; // Yahan bhi '+' laga diya gaya hai

    const encodedAuth = Buffer.from(`${authKey}:${authToken}`).toString('base64');
    const smsCountryUrl = `https://restapi.smscountry.com/v0.1/Accounts/${authKey}/Calls/`;

    const payload = {
      From: formattedHelper,   
      To: formattedOwner,      
      CallerId: callerId       
    };

    // Call Fire! 
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
