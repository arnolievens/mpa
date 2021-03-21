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


// get album art and save to file

async function getAlbumArt() {
    let client;
    let data;
    let song;
   
    // connection
    if (verbose) {
        console.log( "attempting to connect to "
            + config.host + " at port " + config.port);
        console.log("image path: " + path);
    }

    try {
        client = await mpdapi.connect(config);
        if (!silent) console.log("connected to "
            + config.host + " at port " + config.port);
    } catch {
        console.err("failed to connect to " 
            + config.host + " at port " + config.port);
        return;
    }

    // request current song
    try {
        song = await client.api.status.currentsong();
        if (verbose) console.log(song);
    } catch {
        console.err("failed to request current song");
        await client.disconnect();
        return;
    }

    if (!song) {
        console.err("there is no song playing");
        await client.disconnect();
        return;
    }

    // fetch album art for song
    try {
        data = await client.api.db.albumartWhole(song.file);
        if (verbose) console.log("fetching albumart for current song");
    } catch {
        console.err("invalid image");
    }

    // revert to fallback image
    if (!data) {
        if (!silent) console.log("image not found, revert to " + fallback);

        try {
            fs.createReadStream(fallback).pipe(fs.createWriteStream(path));
        } catch {
            console.err("fallback image not found at " + fallback);
        }

        await client.disconnect();
        return;
    }

    // write to file
    fs.writeFile(path, data.buffer, "binary", function (err) {
        if (err) {
            return console.err(err);
        }
        if (!silent) {
            console.log("saved image to " + path);
        }
    });

    await client.disconnect();
}

getAlbumArt();
