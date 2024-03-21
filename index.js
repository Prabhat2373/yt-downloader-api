


const express = require('express');
const app = express();
const ytdl = require('ytdl-core');
const bodyParser = require('body-parser');
const cors = require('cors');

const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);
app.use(bodyParser.json());

app.use(cors()); // Enable CORS (if needed)

app.post('/download', async (req, res) => {
    const { url, resolution } = req.body;
    if (!ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    try {
        const info = await ytdl.getInfo(url);
        console.log('info', info.formats);

        const quality = resolution 

        // Find the format with the requested resolution
        const format = ytdl.chooseFormat(info.formats, { quality });
        if (!format) {
            return res.status(400).json({ error: 'Requested resolution not available for this video' });
        }

        res.setHeader('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp4"`);
        
        // Stream the video directly to the response stream
        await pipelineAsync(
            ytdl(url, { quality: format.itag }),
            res
        );

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to download video' });
    }
});
  


app.post('/info', async (req, res) => {
    const { url } = req.body;
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
  
    try {
      const info = await ytdl.getInfo(url);
      const formatsWithAudio = info.formats.filter(format => format.hasAudio && format.hasVideo);

      const selectedFormat = formatsWithAudio.find(format => format.resolution === '2160p' || format.resolution === '4320p');
      console.log('formatsWithAudio', formatsWithAudio);


      // const formats =  ytdl.filterFormats(info)
      // const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
      const audio_formats = ytdl.filterFormats(info.formats, 'audioonly');
      const video_formats = ytdl.filterFormats(info.formats, 'videoandaudio');
      // res.json({ formats: info.formats });
      res.json({ audio_formats,video_formats});
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Failed to fetch video information' });
    }
  });


  const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


// const express = require('express');
// const app = express();
// const ytdl = require('ytdl-core');
// const bodyParser = require('body-parser');
// const cors = require('cors');

// app.use(bodyParser.json());
// app.use(cors());

// app.post('/stream', async (req, res) => {
//     const { url, resolution } = req.body;
//     if (!ytdl.validateURL(url)) {
//         return res.status(400).json({ error: 'Invalid YouTube URL' });
//     }

//     try {
//         const info = await ytdl.getInfo(url);
//         console.log('info', info.formats);

//         const quality = resolution;
//         const format = ytdl.chooseFormat(info.formats, { quality });

//         if (!format) {
//             return res.status(400).json({ error: 'Requested resolution not available for this video' });
//         }

//         res.setHeader('Content-Type', 'video/mp4');
//         ytdl(url, { quality: format.itag }).pipe(res);
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).json({ error: 'Failed to stream video' });
//     }
// });

// const PORT = process.env.PORT || 8000;
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });
