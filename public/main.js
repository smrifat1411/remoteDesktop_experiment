const {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  Menu,
} = require("electron");

const path = require("path");

//Server

const cors = require("cors");
const express = require("express");
const expressApp = express();

const { createServer } = require("http");
const { Server } = require("socket.io");
expressApp.use(express.static(__dirname));

expressApp.set("port", 4000);
expressApp.use(cors({ origin: "*" }));

expressApp.use((req, res, next) => {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*");
  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);
  // Pass to next layer of middleware
  next();
});

const httpServer = createServer(expressApp);
httpServer.listen(4000, "0.0.0.0");
httpServer.on("error", (e) => console.log("error"));
httpServer.on("listening", () => console.log("listening....."));
const io = new Server(httpServer, {
  origin: "*",
});

// socket io connections
const connections = io.of("/remote-ctrl");

// exchanging SDP

connections.on("connection", (socket) => {
  console.log("connection established");

  socket.on("offer", (sdp) => {
    console.log("routing offer");
    // send to the electron app
    socket.broadcast.emit("offer", sdp);
  });

  socket.on("answer", (sdp) => {
    console.log("routing answer");
    // send to the electron app
    socket.broadcast.emit("answer", sdp);
  });

  socket.on("icecandidate", (icecandidate) => {
    socket.broadcast.emit("icecandidate", icecandidate);
  });
});

let availableScreens;
let mainWindow;

const sendSelectedScreen = (item) => {
  mainWindow.webContents.send("SET_SOURCE_ID", item.id);
};

const createTray = () => {
  const screensMenu = availableScreens.map((item) => {
    return {
      label: item.name,
      click: () => {
        sendSelectedScreen(item);
      },
    };
  });

  const menu = Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [{ role: "quit" }],
    },
    {
      label: "Screens",
      submenu: screensMenu,
    },
  ]);

  Menu.setApplicationMenu(menu);
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  ipcMain.on("set-size", (event, size) => {
    const { width, height } = size;
    try {
      console.log("electron dim..", width, height);
      // mainWindow.setSize(width, height || 500, true)
      mainWindow.setSize(width, height, true);
    } catch (e) {
      console.log(e);
    }
  });

  // mainWindow.loadURL(`${process.env.S_U}/`);
  mainWindow.loadURL('https://5f98-103-14-145-129.in.ngrok.io/')

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.setPosition(0, 0);

    desktopCapturer
      .getSources({
        types: ["screen"],
        // types: ['window', 'screen']
      })
      .then((sources) => {
        sendSelectedScreen(sources[0])
        availableScreens = sources;
        createTray();
        // for (const source of sources) {
        //     console.log(sources)
        //     if (source.name === 'Screen 1') {
        //         mainWindow.webContents.send('SET_SOURCE_ID', source.id)
        //         return
        //     }
        // }
      });
  });

  mainWindow.webContents.openDevTools();
};

app.on("ready", () => {
  createWindow();
});
