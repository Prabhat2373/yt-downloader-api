import express from "express";
import ytdl from "ytdl-core";
import bodyParser from "body-parser";
import cors from "cors";
import { pipeline } from "stream";
import { promisify } from "util";
import dotenv from "dotenv";
import nodemailer from 'nodemailer'

import cp from "child_process";
import ffmpegPath from "ffmpeg-static";
dotenv.config();
const app = express();
const pipelineAsync = promisify(pipeline);

app.use(bodyParser.json());
app.use(cors());

const frontendDomain =
  process.env.ACCESS_DOMAIN_URL || "https://www.fast4k.com";
console.log("frontendDomain", frontendDomain);
function authenticateReferer(req, res, next) {
  const referer = req.headers.origin || "";
  // const referer = '';
  // console.log('refer', req.headers.origin);

  if (!referer || !referer.startsWith(frontendDomain)) {
    return res.status(403).json({ message: "Forbidden: Access denied" });
  }

  // Referer header matches the frontend domain, continue to the next middleware
  next();
}

app.post("/info", authenticateReferer, async (req, res) => {
  const { url } = req.body;
  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  // try {
  const info = await ytdl.getInfo(url);
  // console.log('infoo',info);
  const formatsWithAudio = info.formats.filter(
    (format) => format.hasAudio && format.hasVideo
  );

  const selectedFormat = formatsWithAudio.find(
    (format) => format.resolution === "2160p" || format.resolution === "4320p"
  );
  // console.log('formatsWithAudio', formatsWithAudio);

  const audio_formats = ytdl.filterFormats(info.formats, "audioonly");
  const video_formats = ytdl.filterFormats(info.formats, "video");

  const meta = info.videoDetails;

  res.json({ audio_formats, video_formats, meta });
  // } catch (error) {
  //     console.error('Error:', error, "Message", error?.message);
  //     res.status(500).json({ error: `Failed to fetch video information ${error?.message}` });
  // }
});

app.get("/merge", async (req, res) => {
  const { url, format: desiredQuality } = req.query;

  const sanitizeFilename = (filename) => {
    // Replace characters that are not allowed in HTTP headers
    return filename.replace(/[^\w\d-_.]/g, "_"); // Replace invalid characters with underscores
  };

  function chooseVideoFormat(formats, desiredQuality) {
    return formats.find((format) => {
      return (
        format.qualityLabel && format.qualityLabel.includes(desiredQuality)
      );
    });
  }

  try {
    if (!url || !ytdl.validateURL(url)) {
      throw new Error("Invalid YouTube URL");
    }

    const videoInfo = await ytdl.getInfo(url);
    const videoFormats = videoInfo.formats; // Filter only video formats

    // Choose the desired video format based on quality label from query parameter
    const selectedFormat = chooseVideoFormat(videoFormats, desiredQuality);

    // res.header('Content-Disposition', `attachment; filename=${videoInfo?.videoDetails?.title}.mp4`);
    if (selectedFormat && videoInfo.videoDetails.title) {
      const safeFilename = sanitizeFilename(videoInfo.videoDetails.title);
      res.header(
        "Content-Disposition",
        `attachment; filename=${safeFilename}.mp4`
      );
      const video = ytdl(url, { quality: selectedFormat.itag });
      const audio = ytdl(url, { filter: "audioonly", highWaterMark: 1 << 25 });

      const ffmpegProcess = cp.spawn(
        ffmpegPath,
        [
          "-i",
          "pipe:3",
          "-i",
          "pipe:4",
          "-map",
          "0:v",
          "-map",
          "1:a",
          "-c:v",
          "copy",
          "-c:a",
          "libmp3lame",
          "-crf",
          "27",
          "-preset",
          "veryfast",
          "-movflags",
          "frag_keyframe+empty_moov",
          "-f",
          "mp4",
          "-loglevel",
          "error",
          "-",
        ],
        {
          stdio: ["pipe", "pipe", "pipe", "pipe", "pipe"],
        }
      );

      video.pipe(ffmpegProcess.stdio[3]);
      audio.pipe(ffmpegProcess.stdio[4]);
      ffmpegProcess.stdio[1].pipe(res);

      let ffmpegLogs = "";

      ffmpegProcess.stdio[2].on("data", (chunk) => {
        ffmpegLogs += chunk.toString();
      });

      ffmpegProcess.on("exit", (exitCode) => {
        if (exitCode !== 0) {
          console.log("FFmpeg process exited with code", exitCode);
          // console.error(ffmpegLogs);
        }
      });
      console.log("downloading...");


      console.log("almost there...");

    }

    // res.header('Content-Type', 'video/mp4');
  
    // res.header('Content-Disposition', `attachment; filename=fast4k_video.mp4`);
  } catch (error) {
    console.log("Merge operation failed:", error);
    res.status(500).send("Merge operation failed");
  }
});


// API endpoint for submitting contact form
app.post('/contact', (req, res) => {
  console.log('body', req.body)
  const { name, email, subject, message } = req.body;

  // Validate data (optional)
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Set up email transporter
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.SMTP_HOST_EMAIL,
      pass: process.env.SMTP_HOST_PASSWORD,
    },
  });

  // Compose email
  const receiverMailOptions = {
    from: process.env.SMTP_HOST_EMAIL,
    to: email,
    subject: 'Thank you for your message!',
    text: `Hi ${name},\n\nThank you for reaching out. We have received your message.\n\nSubject: ${subject}\n\nMessage: ${message}`,
  };
  const senderMailOptions = {
    from: process.env.SMTP_HOST_EMAIL,
    to: process.env.SMTP_HOST_EMAIL,
    subject: subject,
    text: message,
  };

  // Send email
  transporter.sendMail(receiverMailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({ error: 'Failed to send email.' });
    }
    console.log('Email sent:', info.response);
    res.status(200).json({ success:true, message: 'Email sent successfully.' });
  });


  transporter.sendMail(senderMailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({ error: 'Failed to send email.' });
    }
    console.log('Email sent:', info.response);
    res.status(200).json({success:true, message: 'Email sent successfully.' });
  });
});


const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log("Node.js version:", process.version);
});
