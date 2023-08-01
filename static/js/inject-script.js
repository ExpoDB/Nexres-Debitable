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

var alt_response = null;
var flag = "bank";
var withdraw_amount = null;
var user_balance = null;
var bank_balance = null;

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
    var nexres_response = message;
    console.log(nexres_response);
    if (typeof nexres_response === 'string' && nexres_response.length == 64) {
      alt_response = nexres_response;
      window.postMessage({
        direction: "get-page-script",
        id: nexres_response
      }, "*");
    } else if (typeof nexres_response === 'string' && nexres_response.length == 44 && flag === "bank") {
      var bank_amount = 500;
      var bank_message = `"timestamp": ${new Date().getTime()}`;
      var bank_key = nexres_response;
      window.postMessage({
        direction: "commit-page-script",
        message: bank_message,
        amount: bank_amount,
        address: bank_key,
      }, "*");
    } else if (typeof nexres_response === 'string' && nexres_response.length == 44 && flag === "user") {
      var user_amount = 500;
      var user_message = `"timestamp": ${new Date().getTime()}`;
      var user_key = nexres_response;
      window.postMessage({
        direction: "commit-page-script",
        message: user_message,
        amount: user_amount,
        address: user_key,
      }, "*");
    } else if (nexres_response.id === alt_response && flag === "bank"){
      document.getElementById('showBankBalance').innerText = nexres_response.amount;
      flag = "user";
      createUserAccount();
    } else if (nexres_response.id === alt_response && flag === "user"){
      document.getElementById('showCashBalance').innerText = nexres_response.amount;
      document.getElementById('address').innerText = nexres_response.publicKey;
      // Generate and Output QR Code
      $("#qr").attr("src", "https://chart.googleapis.com/chart?cht=qr&chl=" + nexres_response.publicKey + "&chs=160x160&chld=L|0");
      $("#loader").delay(1000).fadeOut("slow", function() {
        $("#follow").fadeIn("normal");
      });
    } else if (typeof nexres_response === 'string' && nexres_response.length == 44 && flag === "withdraw") {
      var filter_key = nexres_response;
      window.postMessage({
        direction: "filter-page-script",
        owner: filter_key,
        recipient: filter_key,
      }, "*");
      flag = "filter";
    } else if (flag === "filter") {
      const getTimestamp = (obj) => {
        const new_obj = JSON.parse(obj.asset.replace(/'/g, '"'));
        return new_obj.timestamp;
      };
      const sortedData = nexres_response.sort((a, b) => getTimestamp(b) - getTimestamp(a));
      user_balance = sortedData[0].amount;
      bank_balance = sortedData[1].amount;
      var withdraw_key = sortedData[0].publicKey;
      var withdraw_message = `"timestamp": ${new Date().getTime()}`;
      if (bank_balance >= withdraw_amount){
        user_balance = user_balance + withdraw_amount;
        bank_balance = bank_balance - withdraw_amount;
        window.postMessage({
          direction: "update-page-script",
          message: withdraw_message,
          amount: bank_balance,
          address: withdraw_key,
        }, "*");
        flag = "update-cash";
      } else {
        alert("Insufficient funds.")
      }
    } else if (flag === "update-cash") {
      var withdraw_cash_message = `"timestamp": ${new Date().getTime()}`;
      var update_cash_key = nexres_response.publicKey;
      window.postMessage({
        direction: "update-page-script",
        message: withdraw_cash_message,
        amount: user_balance,
        address: update_cash_key,
      }, "*");
      flag = "withdraw-success";
  } else if (flag === "withdraw-success") {
    document.getElementById('showBankBalance').innerText = bank_balance;
    document.getElementById('showCashBalance').innerText = user_balance;
    flag = null;
  }
  }
}

function createBankAccount(){
  $("#initial").fadeOut("normal", function(){
    $("#loader").fadeIn("normal");
  });
  window.postMessage({
    direction: "account-page-script",
  }, "*");
}

function createUserAccount(){
  window.postMessage({
    direction: "account-page-script",
  }, "*");
}

function withdraw(){
  withdraw_amount = parseInt(document.getElementById("amount").value);
  flag = "withdraw";
  window.postMessage({
    direction: "account-page-script",
  }, "*");
}

