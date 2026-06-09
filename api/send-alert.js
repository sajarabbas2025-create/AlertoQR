export default async function handler(req, res) {
  // CORS Security Headers (Ye darwaza kholenge)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // YAHI LINE MISSING THI

  // Browser ki checking request (Preflight) ko pass karna
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
      "1001": "+919876543210", // Yahan apna asli number daal lijiye testing ke liye
      "2540": "+918765432109"
    };

    const ownerNumber = vehicleDatabase[vehiclePin];

    if (!ownerNumber) {
      return res.status(404).json({ success: false, message: "Galat QR Code." });
    }

    // BulkSMSPlans API details
    const apiKey = "YOUR_API_KEY_HERE"; 
    const bulkSmsApiUrl = `https://www.bulksmsplans.com/api/voice_call?api_key=${apiKey}&caller=${helperNumber}&receiver=${ownerNumber}`;
    
    console.log(`Calling API: ${bulkSmsApiUrl}`);

    // Website ko Success bhejna
    return res.status(200).json({
      success: true,
      message: "Call command sent successfully."
    });

  } catch (error) {
    console.error("Vercel Error:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
