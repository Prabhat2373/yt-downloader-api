module.exports = {
    apps : [{
      name: "fast4k",
      script: "npm",
      args: "start",
      cwd: "/root/yt-downloader-api",
      watch: true,
      env: {
        NODE_ENV: "production",
      }
    }],
 
  };