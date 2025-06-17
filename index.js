const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const fetch = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

// uses the ws package instead of the native WebSocket to expose http request/response details
const WebSocket = require('ws');

const STREAMING_URL = 'http://stream.live.vc.bbcmedia.co.uk/bbc_world_service';

const DEEPGRAM_API_URL = 'https://api.deepgram.com/';

function createExtraLoggingWebSocket(url, protocols, options) {
  const ws = new WebSocket(url, protocols, options);

  ws.on('error', function (error) {
    console.log('WS: Error received.', error);
  });

  ws.on('unexpected-response', (request, response) => {
    const statusCode = response?.statusCode ?? 'unknown';
    const dgRequestId =
      response?.headers?.['dg-request-id'] ||
      response?.headers?.['Dg-Request-Id'] ||
      'not found';
    console.log('WS: Unexpected response received.', statusCode, dgRequestId);
  });

  ws.on('upgrade', function (response) {
    const statusCode = response?.statusCode ?? 'unknown';
    const dgRequestId =
      response?.headers?.['dg-request-id'] ||
      response?.headers?.['Dg-Request-Id'] ||
      'not found';
    console.log('WS: Upgrade received.', statusCode, dgRequestId);
  });

  ws.on('open', function () {
    console.log('WS: Connection opened.');
  });

  ws.on('close', function (code, reason) {
    console.log('WS: Connection closed.', code, reason?.toString() || 'No reason provided');
  });

  return ws;
}

const live = async () => {
  const dgClient = createClient(process.env.DEEPGRAM_API_KEY, {
    global: {
      url: DEEPGRAM_API_URL ,
      websocket: {
        client: createExtraLoggingWebSocket,
      },
    },
  });

  const dgConnection = dgClient.listen.live({
    model: 'nova-3',
    language: 'en-US',
    smart_format: true,
  });

  // manually call setupConnection to wire the events since sdk doesn't do it automatically
  console.log("Deepgram SDK: Setting up connection.");
  dgConnection?.setupConnection();

  dgConnection.on(LiveTranscriptionEvents.Open, () => {
    console.log("Deepgram SDK: Connection opened.");

    dgConnection.on(LiveTranscriptionEvents.Close, () => {
      console.log('Deepgram SDK: Connection closed.');
    });

    dgConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
      console.log("Deepgram SDK: Transcript: ", data.channel.alternatives[0].transcript);
    });

    dgConnection.on(LiveTranscriptionEvents.Metadata, (data) => {
      console.log("Deepgram SDK: Metadata: ",  data);
    });

    dgConnection.on(LiveTranscriptionEvents.Error, (err) => {
      console.error("Deepgram SDK: Error: ", err);
    });

    fetch(STREAMING_URL)
      .then((r) => r.body)
      .then((res) => {
        res.on('readable', () => {
          // console.log("Sending data to Deepgram SDK");
          dgConnection.send(res.read());
        });
      });
  });
};

live();
