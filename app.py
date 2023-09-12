from flask import Flask, render_template, request
import aiohttp
import asyncio
from flask_socketio import SocketIO, emit
import json
import httpx
import threading

app = Flask(__name__)
app.secret_key = "abc1234"
socketio = SocketIO(app)

def get_timestamp(item):
    asset_str = item['asset']
    start_index = asset_str.find("'timestamp':") + len("'timestamp':")
    end_index = asset_str.find("}", start_index)
    timestamp_str = asset_str[start_index:end_index]
    return int(timestamp_str)

async def fetch_updates_from_api(key):
    while True:
        async with httpx.AsyncClient() as client:
            url = 'http://localhost:8000/graphql'
            # Define your GraphQL query or mutation
            graphql_query = """
                query { getFilteredTransactions(filter: {
                ownerPublicKey:""" + '""' + """
                recipientPublicKey:""" + '"' + str(key) + '"' + """
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
            """

            # Create a dictionary containing the GraphQL query
            payload = {
                'query': graphql_query
            }
            
            # Set the headers for the request
            headers = {
                'Content-Type': 'application/json',
                # Add any other headers as needed (e.g., authorization headers)
            }   
            response = await client.post(url, json=payload, headers=headers)
            
            # Check for a successful response (HTTP status code 200)
            if response.status_code == 200:
                # Parse the JSON response
                result = response.json()
                # Sort the data based on the "timestamp" field in each "asset" dictionary
                sorted_data = sorted(result["data"]["getFilteredTransactions"], key=get_timestamp)
                # Update the original data with the sorted data
                result = sorted_data
                if key == result[-1]["publicKey"]:
                    updates = {"amount": result[-1]["amount"], "key": result[-1]["publicKey"]}
            else:
                print(f"GraphQL request failed with status code: {response.status_code}")
                updates = response.text
            # Handle updates as needed
            socketio.emit('update', updates)
        await asyncio.sleep(10)  # Adjust the polling interval as needed

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    # You can perform any initial setup here when a client connects

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')
    # You can perform any cleanup here when a client disconnects

def run_asyncio_loop():
    pass

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        data = request.get_json()
        key = data.get('data')
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(fetch_updates_from_api(key))
    return render_template('index.html')

if __name__ == '__main__':
    asyncio_thread = threading.Thread(target=index)
    asyncio_thread.daemon = True
    asyncio_thread.start()

    # Start the Flask app
    socketio.run(app, debug=True)
    