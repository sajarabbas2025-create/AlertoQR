export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { vehiclePin, helperNumber } = req.body;
    const ownerNumber = "6388522427"; // Aapka number

    const formatForAPI = (num) => {
        let clean = num.toString().replace(/\D/g, '');
        return clean.length === 10 ? '91' + clean : clean;
    };

    const authKey = "M5rIudGBrmiO4pdjCuoz"; 
    const authToken = "XWQDjyE87o1PpATFPtVdpXSVoNuSKH6sK6wvRK53"; 
    
    // SMSCountry API URL
    const smsCountryUrl = `https://restapi.smscountry.com/v0.1/Accounts/${authKey}/Calls/`;

    // FORM DATA (Yeh unka favorite format hai)
    const params = new URLSearchParams();
    params.append('From', '+918634512424'); // Caller ID
    params.append('To', '+' + formatForAPI(helperNumber)); // Helper
    params.append('AnswerUrl', `https://alerto-qr.vercel.app/api/webhook?owner=${formatForAPI(ownerNumber)}`);

    const encodedAuth = Buffer.from(`${authKey}:${authToken}`).toString('base64');

    const apiResponse = await fetch(smsCountryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${encodedAuth}`
      },
      body: params.toString()
    });

    const resultText = await apiResponse.text();
    
    if (!apiResponse.ok) {
        return res.status(200).json({ success: false, message: "SMSCountry Error: " + resultText });
    }

    return res.status(200).json({ success: true, message: "Call initiated!" });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
