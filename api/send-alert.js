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

    // Aapka asli number yahan set hai
    const vehicleDatabase = {
      "1001": "6388522427", 
      "2540": "8765432109"
    };

    let ownerNumber = vehicleDatabase[vehiclePin];

    if (!ownerNumber) {
      return res.status(404).json({ success: false, message: "Galat QR Code." });
    }

    // Telecom API ko numbers '91' ke sath chahiye hote hain
    let formattedHelper = helperNumber.length === 10 ? `91${helperNumber}` : helperNumber;
    let formattedOwner = ownerNumber.length === 10 ? `91${ownerNumber}` : ownerNumber;

    // Aapke BulkSMSPlans API details
    const apiId = "API42znmxVL150879";
    const apiPassword = "ND7oMLCE";
    const ivrNumber = "7971900123"; 

    // Error ke hisaab se sahi variables (agent_number aur receiver_number)
    const bulkSmsApiUrl = `https://bulksmsplans.com/api/ivr/makeACall?api_id=${apiId}&api_password=${apiPassword}&ivr_number=${ivrNumber}&agent_number=${formattedOwner}&receiver_number=${formattedHelper}`;
    
    console.log(`Firing Call to telecom: ${bulkSmsApiUrl}`);

    // Call Fire! (POST method ke sath, jaise document mein chahiye)
    const apiResponse = await fetch(bulkSmsApiUrl, {
        method: 'POST'
    });
    const resultText = await apiResponse.text();
    console.log("API Response: ", resultText);

    return res.status(200).json({
      success: true,
      message: "Call command sent successfully."
    });

  } catch (error) {
    console.error("Vercel Error:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
