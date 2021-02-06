#!/bin/env node

// -----------------------------mpd albumart program---------------------------

const mpdapi = require("mpd-api");

const fs = require("fs");

//  defining defaults

const config = {
  host: "",
  port: "",
};

var path = __dirname + "/cover.jpg";
var verbose = false;
var fallback = __dirname + "/barbapapa.jpg";

// environment variables

if (process.env.MPD_HOST) {
  config.host = process.env.MPD_HOST;
}
if (process.env.MPD_PORT) {
  config.port = process.env.MPD_PORT;
}

//  parsing commandline arguments

for (var i = 0; i < process.argv.length; i++) {
  switch (process.argv[i]) {
    case "-h":
    case "--host":
      config.host = process.argv[++i];
      break;
    case "-p":
    case "--port":
      config.port = process.argv[++i];
      break;
    case "-o":
    case "--output":
      path = process.argv[++i];
      break;
    case "-v":
    case "--verbose":
      verbose = true;
      break;
    case "-f":
    case "--fallback":
      fallback = process.argv[++i];
      break;
  }
}

// validate host and port and verbose

if (!config.port || !config.host) {
  console.log("please provide --host and --port");
  return;
}

if (verbose) {
  console.log(
    "attempting to connect to " + config.host + " at port " + config.port
  );
  console.log("saving file to " + path);
  console.log("fallback image is " + fallback);
}

// function to display album art

var getAlbumArt = async function () {
  const client = await mpdapi.connect(config);

  const song = await client.api.status.currentsong();

  if (!song) {
    console.log("there is no song playing");
    await client.disconnect();
    return;
  }

  const data = await client.api.db.albumartWhole(song.file);

  if (!data) {
    fs.createReadStream(fallback).pipe(fs.createWriteStream(path));
    await client.disconnect();
    return;
  }

  fs.writeFile(path, data.buffer, "binary", function (err) {
    if (err) {
      return console.log(err);
    }
    console.log("The file was saved!");
  });

  await client.disconnect();
};

getAlbumArt();
