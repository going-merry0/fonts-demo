const express = require("express");
const fs = require("fs");
const util = require("util");
const path = require("path");
const fontKit = require("./fonts/dist/src");

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const appendFile = util.promisify(fs.appendFile);

const app = express();

app.get("/", async (req, res) => {
  try {
    const data = await readFile("index.html", "utf8");
    res.send(data);
  } catch (e) {
    res.send("error");
  }
});

const fonts = ["王羲之书法字体", "方正瘦金书简体", "米芾书法字体"];
const fontNames = ["wxz", "sj", "mf"];

app.get("/fonts", async (req, res) => {
  const { font, text } = req.query;
  const resp = { code: 0, msg: "", data: null };
  if (!font || !text || !["0", "1", "2"].includes(font)) {
    resp.code = 1;
    resp.msg = "deformed request";
    res.send(resp);
    return;
  }

  try {
    const fontName = fonts[font] + ".ttf";
    const buf = await readFile(fontName);
    const srcFont = new fontKit.Font(buf);
    srcFont.satisfy();

    const mini = new fontKit.Minifier();
    const newFont = mini.filter(srcFont, text);
    const outName = `${new Date().getTime()}.ttf`;
    const dist = path.resolve(__dirname, "../tmp", outName);
    const wb = new fontKit.BufferWriter();
    newFont.write2(wb);
    await writeFile(dist, wb.buffer);

    const fn = fontNames[font];
    const css = `
    @font-face {
      font-family: '${fn}';
      src: url('${outName}') format('truetype');
      font-weight: normal;
      font-style: normal;
     }
    `;
    resp.data = { css, fontName: fn };
    res.send(resp);
  } catch (e) {
    const log = `font: ${font} text: ${text} errStack: ${e.stack}\n`;
    await appendFile("../tmp/log.txt", log);

    resp.code = 1;
    resp.msg = "server internal error";
    res.send(resp);
  }
});

app.get("/*.ttf", express.static("../tmp"));

app.listen(3000, () => console.log("Example app listening on port 3000!"));
