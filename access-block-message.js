"use strict";
(()=>{
  const q=new URLSearchParams(location.search);const reason=q.get("blocked");if(!reason)return;
  const n=document.getElementById("notice");if(!n)return;
  const messages={
    outside_new_zealand:"Access is restricted to New Zealand networks. Your current network location is outside New Zealand.",
    vpn_not_allowed:"VPN connections are not allowed. Turn off your VPN and sign in again from a New Zealand network.",
    proxy_not_allowed:"Proxy connections are not allowed. Use a direct New Zealand internet connection and try again.",
    tor_not_allowed:"Tor connections are not allowed for this learning platform.",
    network_location_unverified:"Your network location could not be verified as New Zealand, so access was blocked for security.",
    unsafe_browser_context:"This connection did not meet the browser security requirements. Use the HTTPS site in a modern browser.",
    network_policy:"Access was blocked by the network security policy."
  };
  n.textContent=messages[reason]||messages.network_policy;n.className="notice show error";
})();
