import express from 'express';
import ytdl from 'ytdl-core';
import ffmpeg from 'ffmpeg-static';
import { spawn } from 'child_process';

const app = express();

// Endpoint to serve the merged video
app.get('/merge', (req, res) => {

// Global constants
const videoUrl = 'https://youtu.be/njX2bu-_Vw4?si=5CajpHjRh3tm02_p';
const audioUrl = 'https://youtu.be/njX2bu-_Vw4?si=5CajpHjRh3tm02_p';

// Get audio and video streams
const audio = ytdl(audioUrl, { quality: 'highestaudio' });
const video = ytdl(videoUrl, { quality: 'highestvideo' });

// Start the ffmpeg child process to merge audio and video
const ffmpegProcess = spawn(ffmpeg, [
    '-i', 'pipe:4', // Input audio from pipe 4
    '-i', 'pipe:5', // Input video from pipe 5
    '-c:v', 'copy', // Copy video codec
    '-c:a', 'aac', // Set audio codec to AAC
    '-strict', 'experimental',
    '-shortest', // Stop encoding when the shortest stream ends
    'output.mp4', // Output file
], {
    windowsHide: true,
    stdio: [
        'inherit', 'inherit', 'inherit',
        'pipe', 'pipe', // Audio from pipe 4, video from pipe 5
    ],
});

// Pipe audio and video streams to FFmpeg process
audio.pipe(ffmpegProcess.stdio[4]);
video.pipe(ffmpegProcess.stdio[5]);

    res.set({
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="merged.mp4"',
    });
    ffmpegProcess.stdio[1].pipe(res); // Send the merged stream to response
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
