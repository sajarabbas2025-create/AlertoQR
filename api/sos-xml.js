export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/xml');
  
  const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
      <Say>Emergency Alert! Alerto Q R user, aapki gaadi ke paas ek emergency report hui hai. Kripya turant apni gaadi ke paas pahuchein.</Say>
  </Response>`;
  
  res.status(200).send(xmlResponse);
}
