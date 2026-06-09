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

    // Temporary Database
    const vehicleDatabase = {
      "1001": "9876543210", // <-- SAJAR BHAI, YAHAN APNA ASLI 10-DIGIT NUMBER DAALNA MAT BHOOLIYEGA (Bina +91 ke)
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
    const ivrNumber = "7971900123"; // Aapka naya Virtual Number

    // Asli URL Document ke hisaab se
    const bulkSmsApiUrl = `https://bulksmsplans.com/api/ivr/makeACall?api_id=${apiId}&api_password=${apiPassword}&ivr_number=${ivrNumber}&dial=${formattedHelper}&receiver_number=${formattedOwner}`;
    
    console.log(`Firing Call to telecom: ${bulkSmsApiUrl}`);

    // Call Fire!
    const apiResponse = await fetch(bulkSmsApiUrl);
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
