var head = document.getElementsByTagName('head')[0];
var script = document.createElement('script');
script.type = 'text/javascript';
script.src = "https://code.jquery.com/jquery-2.2.1.min.js";
import ResilientSDK from 'https://cdn.resilientdb.com/resilient-sdk.js';

const sdk = new ResilientSDK();

// Then bind the event to the callback function.
// There are several events for cross browser compatibility.
script.onreadystatechange = handler;
script.onload = handler;

// Fire the loading
head.appendChild(script);

var flag = "create";
var withdraw_amount = null;
var sender_balance = null;
var receiver_balance = null;
var sender_id = null;
var receiver_id = null;

var create = document.getElementById("fetchAccountAddress");
create.addEventListener("click", createBankAccount);

var authenticate = document.getElementById("authenticate");
authenticate.addEventListener("click", login);

var transfer = document.getElementById("withdraw");
transfer.addEventListener("click", withdraw);

function handler(){
    console.log('jquery added :)');
}

// Add a message listener
sdk.addMessageListener((event) => {
    const message = event.data.data;
    var nexres_response = message;
    console.log(nexres_response);
    console.log(flag);
    if (flag === "fetch") {
      sdk.sendMessage({
        direction: "get-page-script",
        id: nexres_response
      });
      flag = "success";
    } else if (flag === "create") {
      var bank_amount = 500;
      var bank_message = `"timestamp": ${new Date().getTime()}`;
      var bank_key = nexres_response;
      sdk.sendMessage({
        direction: "commit-page-script",
        message: bank_message,
        amount: bank_amount,
        address: bank_key,
      });
      flag = "fetch";
    } else if (flag === "login") {
      const getTimestamp = (obj) => {
        const new_obj = JSON.parse(obj.asset.replace(/'/g, '"'));
        return new_obj.timestamp;
      };
      const sortedData = nexres_response.sort((a, b) => getTimestamp(b) - getTimestamp(a));
      document.getElementById('showBankBalance').innerText = sortedData[0].amount;
      document.getElementById('address').value = sortedData[0].publicKey;
      localStorage.setItem("publicKey", sortedData[0].publicKey);
      // Generate and Output QR Code
      $("#qr").attr("src", "https://chart.googleapis.com/chart?cht=qr&chl=" + sortedData[0].publicKey + "&chs=160x160&chld=L|0");
      $("#loader").delay(1000).fadeOut("slow", function() {
        $("#follow").fadeIn("normal");
      });
    } else if(flag === "success") {
      document.getElementById('showBankBalance').innerText = nexres_response.amount;
      document.getElementById('address').value = nexres_response.publicKey;
      localStorage.setItem("publicKey", nexres_response.publicKey);
      longPoll(nexres_response.publicKey);
      // Generate and Output QR Code
      $("#qr").attr("src", "https://chart.googleapis.com/chart?cht=qr&chl=" + nexres_response.publicKey + "&chs=160x160&chld=L|0");
      $("#loader").delay(1000).fadeOut("slow", function() {
        $("#follow").fadeIn("normal");
      });

    } else if (flag === "filter-receiver") {
      const getTimestamp = (obj) => {
        const new_obj = JSON.parse(obj.asset.replace(/'/g, '"'));
        return new_obj.timestamp;
      };
      const sortedData = nexres_response.sort((a, b) => getTimestamp(b) - getTimestamp(a));
      sender_balance = sortedData[0].amount;
      sender_id = sortedData[0].id;
      var owner_filter_key = "";
      var receipient_filter_key = document.getElementById("send-address").value;
      sdk.sendMessage({
        direction: "filter-page-script",
        owner: owner_filter_key,
        recipient: receipient_filter_key,
      });
      flag = "update";
    } else if (flag === "withdraw-success") {
      document.getElementById('showBankBalance').innerText = nexres_response[0].amount;
      flag = null;
    } else if (flag === "update") {
      const getTimestamp = (obj) => {
        const new_obj = JSON.parse(obj.asset.replace(/'/g, '"'));
        return new_obj.timestamp;
      };
      const sortedData = nexres_response.sort((a, b) => getTimestamp(b) - getTimestamp(a));
      receiver_balance = sortedData[0].amount;
      receiver_id = sortedData[0].id;

      var withdraw_message = `"timestamp": ${new Date().getTime()}`;
      withdraw_amount = parseInt(document.getElementById("amount").value);
      
      var sender_address = localStorage.getItem('publicKey');
      var receiver_address = document.getElementById("send-address").value;
      
      if (sender_balance >= withdraw_amount){
        sender_balance = sender_balance - withdraw_amount;
        receiver_balance = receiver_balance + withdraw_amount;
        const valuesList = [
          {
            id: sender_id,
            message: withdraw_message,
            amount: sender_balance,
            address: sender_address,
          },
          {
            id: receiver_id,
            message: withdraw_message,
            amount: receiver_balance,
            address: receiver_address,
          }
        ];
  
        sdk.sendMessage({
          direction: "update-multi-page-script",
          values: valuesList,
        });
        flag = "withdraw-success";
      } else {
        alert("Insufficient funds.")
      }
    }
  });

function createBankAccount(){
  $("#initial").fadeOut("normal", function(){
    $("#loader").fadeIn("normal");
  });
  sdk.sendMessage({
    direction: "account-page-script",
  });
}

function login(){
  $("#login").fadeOut("normal", function(){
    $("#loader").fadeIn("normal");
  });

  var id = document.getElementById("id").value;

  sdk.sendMessage({
    direction: "filter-page-script",
    owner: "",
    recipient: id,
  });
  flag = "login";
}

function withdraw(){
  var owner_filter_key = "";
  var receipient_filter_key = localStorage.getItem('publicKey');
  sdk.sendMessage({
    direction: "filter-page-script",
    owner: owner_filter_key,
    recipient: receipient_filter_key,
  });
  flag = "filter-receiver";
}


function longPoll(key) {
  const url = 'https://cloud.resilientdb.com/graphql';
  const graphqlQuery = `
      query {
          getFilteredTransactions(filter: {
              ownerPublicKey: ""
              recipientPublicKey: "${key}"
          }) {
              id
              version
              amount
              metadata
              operation
              asset
              publicKey
              uri
              type
          }
      }
  `;

  const payload = {
      query: graphqlQuery
  };

  const headers = {
      'Content-Type': 'application/json',
      // Add any other headers as needed (e.g., authorization headers)
  };

  fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(data => {
      // Sorting the array
      const getTimestamp = (obj) => {
        const new_obj = JSON.parse(obj.asset.replace(/'/g, '"'));
        return new_obj.timestamp;
      };
      const sortedData = data.data.getFilteredTransactions.sort((a, b) => getTimestamp(b) - getTimestamp(a));
      document.getElementById('showBankBalance').innerText = sortedData[0].amount;
      setTimeout(() => longPoll(key), 5000); // Retry every 5 seconds
  })
  .catch(error => {
      console.error('Error:', error);
      setTimeout(() => longPoll(key), 15000); // Retry after 5 seconds in case of error
  });
}