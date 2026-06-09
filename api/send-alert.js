async function executeSecureVercelBridge(alertType, mode, helperPhone) {
    const consoleTicker = document.getElementById('ticker-box');
    consoleTicker.style.display = "block";
    consoleTicker.innerText = "Connecting secure call...";

    // SMSCountry API Credentials
    const authKey = "M5rIudGBrmiO4pdjCuoz";
    const authToken = "XWQDjyE87o1PpATFPtVdpXSVoNuSKH6sK6wvRK53";
    const authHeader = 'Basic ' + btoa(`${authKey}:${authToken}`);
    
    // Aapka Virtual Number
    const callerId = "+918634512424";
    
    // Owner ka number (Ise Supabase se fetch kiya hai)
    // Aapka DB structure ke hisaab se:
    const targetPhone = "6388522427"; // Asli number
    
    const payload = {
        "Number": `+91${helperPhone},+91${targetPhone}`,
        "CallerId": callerId
    };

    try {
        const response = await fetch(`https://restapi.smscountry.com/v0.1/Accounts/${authKey}/Calls/`, {
            method: 'POST',
            headers: { 
                'Authorization': authHeader, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            consoleTicker.innerText = "✅ Call Initiated Successfully!";
        } else {
            const err = await response.json();
            consoleTicker.innerText = "⚠️ Gateway Error: " + (err.Message || "Failed");
        }
    } catch (err) {
        consoleTicker.innerText = "⚠️ Fetch Error: " + err.message;
    }
}
