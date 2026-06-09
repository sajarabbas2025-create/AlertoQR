export default async function handler(req, res) {
  // CORS setup taaki aapki website se API block na ho
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Website se aane wala data (QR Code aur Helper ka Number)
    const { vehiclePin, helperNumber } = req.body;

    console.log(`Scan Code: ${vehiclePin}, Helper Number: ${helperNumber}`);

    if (!vehiclePin || !helperNumber) {
      return res.status(400).json({ success: false, message: "PIN aur Helper ka number dono zaruri hain." });
    }

    // 2. Temporary Database (Asli app mein hum ise Supabase se jodenge)
    const vehicleDatabase = {
      "1001": "+917409081112", // YAHAN APNA ASLI TEST NUMBER DAAL DIJIYEGA
      "2540": "+918765432109"  
    };

    const ownerNumber = vehicleDatabase[vehiclePin];

    if (!ownerNumber) {
      return res.status(404).json({ success: false, message: "Galat QR Code." });
    }

    // 3. BulkSMSPlans ka Click-to-Call API hit karna
    // (Anjli ji API Key dengi, usko 'YOUR_API_KEY_HERE' ki jagah dalna hai)
    const apiKey = "YOUR_API_KEY_HERE"; 
    
    // BulkSMSPlans ka Click-to-Call URL 
    const bulkSmsApiUrl = `https://www.bulksmsplans.com/api/voice_call?api_key=${apiKey}&caller=${helperNumber}&receiver=${ownerNumber}`;
    
    console.log(`Calling API: ${bulkSmsApiUrl}`);

    // Call lagane ki command bhejna (API Key aane par isko chalu karenge)
    /* const apiResponse = await fetch(bulkSmsApiUrl);
    const result = await apiResponse.json();
    console.log("BulkSMS Response:", result);
    */

    // Website ko success message wapas bhejna
    return res.status(200).json({
      success: true,
      message: "Call connect ki ja rahi hai. Kripya line par bane rahein."
    });

  } catch (error) {
    console.error("Vercel Error:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
