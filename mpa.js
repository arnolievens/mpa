#!/bin/env node

// -----------------------------mpd albumart program---------------------------

const mpdapi = require("mpd-api");

const fs = require("fs");

//  defining defaults

const config = {
  host: process.env.MPD_HOST,
  port: process.env.MPD_PORT,
};

var path = __dirname + "/cover.jpg";
var verbose = false;
var silent = false;
var fallback = __dirname + "/barbapapa.jpg";

function printHelp() {
  console.log("usage: mpa [options]");
  console.log("");
  console.log("option             description             default");
  console.log("==========================================================");
  console.log("-h, --host         mpd hostname            $MPD_HOST");
  console.log("-p, --port         mpd port                $MPD_PORT");
  console.log("-o, --output       output file path        ./cover.jpg");
  console.log("-f, --fallback     fallback img path       ./barbapapa.jpg");
  console.log("-v, --verbose      print host, port, ...   false");
  console.log("-s, --silent       mute stdout             false");
  console.log("    --help         this menu");
  console.log("");
}

//  parsing commandline arguments

for (var i = 0; i < process.argv.length; i++) {
  switch (process.argv[i]) {
    case "--help":
      printHelp();
      return;
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
    case "-s":
    case "--silent":
      silent = true;
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
  console.log("image path: " + path);
}

// get album art and save to file

async function getAlbumArt() {
  var client;

  try {
    client = await mpdapi.connect(config);
  } catch {
    console.log(
      "failed to connect to " + config.host + " at port " + config.port
    );
    return;
  }

  const song = await client.api.status.currentsong();

  if (!song) {
    console.log("there is no song playing");
    await client.disconnect();
    return;
  }

  const data = await client.api.db.albumartWhole(song.file);

  if (!data) {
    if (!silent) console.log("image not found, revert to " + fallback);

    try {
      fs.createReadStream(fallback).pipe(fs.createWriteStream(path));
    } catch {
      console.log("fallback image not found at " + fallback);
    }

    await client.disconnect();
    return;
  }

  fs.writeFile(path, data.buffer, "binary", function (err) {
    if (err) {
      return console.log(err);
    }
    if (!silent) {
      console.log("saved image to " + path);
    }
  });

  await client.disconnect();
}

getAlbumArt();
