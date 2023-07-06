var head = document.getElementsByTagName('head')[0];
var script = document.createElement('script');
script.type = 'text/javascript';
script.src = "http://code.jquery.com/jquery-2.2.1.min.js";

// Then bind the event to the callback function.
// There are several events for cross browser compatibility.
script.onreadystatechange = handler;
script.onload = handler;

// Fire the loading
head.appendChild(script);

function handler(){
    console.log('jquery added :)');
}

function messageContentScript() {
  window.postMessage({
    direction: "commit-page-script",
    message: data.value,
    amount: amount.value,
    address: address.value,
  }, "*");
}

function fetchContentScript() {
    window.postMessage({
      direction: "get-page-script",
      id: id.value
    }, "*");
}

// Listen for messages from the content script
window.addEventListener('message', receiveMessageFromContentScript);

// Function to handle messages from the content script
function receiveMessageFromContentScript(event) {
  if (event.source === window && event.data && event.data.type === 'FROM_CONTENT_SCRIPT') {
    const message = event.data.data;
    nexres_response = message;
    console.log(nexres_response);
    if (typeof nexres_response === 'string') {
      window.postMessage({
        direction: "get-page-script",
        id: nexres_response
      }, "*");
    } else {
      document.getElementById('showBankBalance').innerText = nexres_response.amount;
      document.getElementById('showCashBalance').innerText = nexres_response.amount;
      document.getElementById('address').innerText = nexres_response.publicKey;
      // Generate and Output QR Code
      $("#qr").attr("src", "https://chart.googleapis.com/chart?cht=qr&chl=" + nexres_response.publicKey + "&chs=160x160&chld=L|0");
      $("#loader").delay(1000).fadeOut("slow", function() {
        $("#follow").fadeIn("normal");
      });
    }
  } 
}

function createAccount(){
  $("#initial").fadeOut("normal", function(){
    $("#loader").fadeIn("normal");
  });
  var key = "68DTr7tCKcwgjHCQheUbNL4sJWX67db7aSxpopAcpeUw";
  var amount = 500;
  var message = "";
  window.postMessage({
    direction: "commit-page-script",
    message: message,
    amount: amount,
    address: key,
  }, "*");
}

idaddress = document.getElementById('idaddress');
idaddress.addEventListener("click", messageContentScript);

function copy() {
  var copyText = document.getElementById("address");

  // Select the text field
  copyText.select();
  copyText.setSelectionRange(0, 99999); // For mobile devices

   // Copy the text inside the text field
  navigator.clipboard.writeText(copyText.value);

  $("#idaddress").text($("#idaddress").text() == 'Identification Address' ? 'Copied Address!' : 'Identification Address');
}