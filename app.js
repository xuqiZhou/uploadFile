const express = require("express");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");
const bodyParser = require("body-parser");
const Jimp = require("jimp");
const sizeOf = require("image-size");
const fs = require("fs");
const base64Img = require("base64-img");

const app = express();

app.use(bodyParser.json());
app.use(methodOverride("_method"));
app.set("view engine", "ejs");

const mongoURI =
  "mongodb+srv://Callum:Callum@sandbox-nkbkb.mongodb.net/test?retryWrites=true";
const conn = mongoose.createConnection(mongoURI, { useNewUrlParser: true });

let gfs;

conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

//Create Storage Engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "uploads"
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ file: req.file });
  //   res.redirect("/");
});

app.get("/files", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({ err: "No files exist" });
    }
    return res.json(files);
  });
});

app.get("/files/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({ err: "No file exist" });
    }
    return res.json(file);
  });
});

app.post("/handlecertificate", (req, res) => {
  console.log(req.body.name);
  console.log(req.body._id);
  const name = "certificateName";
  let imgRaw = "img/raw/CertificateTemplate.jpg";

  let imgActive = "img/active/image.jpg";
  let imgExported = "img/export/" + name + "Certificate.jpg";
  var dimen = sizeOf(imgRaw);
  let width = dimen.width;
  let height = dimen.height;
  console.log(dimen);
  let textData = {
    text: name, //Text to render
    maxWidth: width - (5 + 5), //image width - L and R margins
    maxHeight: height - (5 + 5), //image height - margins
    placementX: 10, // 10 px L margin
    placementY: height - (height - (5 + 5)) + 650 // bottom of image = imgHeight - maxHeight + margin (to determine exact placement)
  };
  Jimp.read(imgRaw)
    .then(tpl => tpl.clone().write(imgActive))
    .then(() => Jimp.read(imgActive))
    .then(tpl => Jimp.loadFont("img/NameFont.fnt").then(font => [tpl, font]))
    .then(data => {
      tpl = data[0];
      font = data[1];

      return tpl.print(
        font,
        textData.placementX,
        textData.placementY,
        {
          text: textData.text,
          alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
          alignmentY: Jimp.VERTICAL_ALIGN_TOP
        },
        textData.maxWidth,
        textData.maxHeight
      );
    })
    .then(tpl => tpl.quality(100).write(imgExported))
    .then(console.log("success"))
    .catch(err => {
      console.error(err);
    });
  res.redirect("/upload");
});

app.get("/image/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({ err: "No file exist" });
    }
    if (file.contentType === "image/jpeg" || file.contentType === "img/png") {
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({ err: "Not an image" });
    }
  });
});

app.get("/", (req, res) => {
  res.render("index");
});

const port = 5001;
app.listen(port, () => console.log("Server started on port 5001"));
