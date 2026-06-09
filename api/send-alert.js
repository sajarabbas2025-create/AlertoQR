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
      "1001": "+916388522427", // SAJAR BHAI, YAHAN APNA ASLI 10-DIGIT NUMBER DAALNA MAT BHOOLIYEGA!
      "2540": "+918765432109"
    };

    const ownerNumber = vehicleDatabase[vehiclePin];

    if (!ownerNumber) {
      return res.status(404).json({ success: false, message: "Galat QR Code." });
    }

    // Aapke BulkSMSPlans API details (Screenshot se)
    const apiId = "API42znmxVL150879";
    const apiPassword = "ND7oMLCE";

    // Click-to-Call ka Standard API URL
    const bulkSmsApiUrl = `https://bulksmsplans.com/api/voice_call?api_id=${apiId}&api_password=${apiPassword}&caller=${helperNumber}&receiver=${ownerNumber}`;
    
    console.log(`Firing Call to telecom: ${bulkSmsApiUrl}`);

    // === AB HUM ASLI CALL FIRE KAR RAHE HAIN ===
    const apiResponse = await fetch(bulkSmsApiUrl);
    
    // Website ko Success bhejna taaki green message aa jaye
    return res.status(200).json({
      success: true,
      message: "Call command sent successfully."
    });

  } catch (error) {
    console.error("Vercel Error:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
