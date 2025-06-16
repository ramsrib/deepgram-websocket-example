const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const fetch = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const STREAMING_URL = 'http://stream.live.vc.bbcmedia.co.uk/bbc_world_service';
const DEEPGRAM_API_URL = 'https://api.deepgram.com';

const live = async () => {
  const dgClient = createClient(process.env.DEEPGRAM_API_KEY, {
    global: { url: DEEPGRAM_API_URL },
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
      console.log(data.channel.alternatives[0].transcript);
    });

    dgConnection.on(LiveTranscriptionEvents.Metadata, (data) => {
      console.log(data);
    });

    dgConnection.on(LiveTranscriptionEvents.Error, (err) => {
      console.error(err);
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
