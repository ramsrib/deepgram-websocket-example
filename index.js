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
    console.log('Error received.', error);
  });

  ws.on('unexpected-response', (request, response) => {
    const statusCode = response?.statusCode ?? 'unknown';
    const dgRequestId =
      response?.headers?.['dg-request-id'] ||
      response?.headers?.['Dg-Request-Id'] ||
      'not found';
    console.log('Unexpected response received.', statusCode, dgRequestId);
  });

  ws.on('upgrade', function (response) {
    const statusCode = response?.statusCode ?? 'unknown';
    const dgRequestId =
      response?.headers?.['dg-request-id'] ||
      response?.headers?.['Dg-Request-Id'] ||
      'not found';
    console.log('Upgrade received.', statusCode, dgRequestId);
  });

  ws.on('open', function () {
    console.log('Connection opened.');
  });

  ws.on('close', function (code, reason) {
    console.log('Connection closed.', code, reason?.toString() || 'No reason provided');
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

  dgConnection.on(LiveTranscriptionEvents.Open, () => {
    dgConnection.on(LiveTranscriptionEvents.Close, () => {
      console.log('Connection closed.');
    });

    dgConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
      console.log("Transcript: ", data.channel.alternatives[0].transcript);
    });

    dgConnection.on(LiveTranscriptionEvents.Metadata, (data) => {
      console.log("Metadata: ",  data);
    });

    dgConnection.on(LiveTranscriptionEvents.Error, (err) => {
      console.error("Error: ", err);
    });

    fetch(STREAMING_URL)
      .then((r) => r.body)
      .then((res) => {
        res.on('readable', () => {
          dgConnection.send(res.read());
        });
      });
  });
};

live();
