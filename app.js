const fetch = require("node-fetch");
const { URL } = require("url");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

let i = 0
const platoboost = "https://gateway.platoboost.com/a/8?id=";
const discordWebhookUrl = "";

function timeConvert(n) {
  var num = n;
  var hours = num / 60;
  var rhours = Math.floor(hours);
  var minutes = (hours - rhours) * 60;
  var rminutes = Math.round(minutes);
  return rhours + " Hours " + rminutes + " Minutes";
}

async function sendDiscordWebhook(link) {
  const payload = {
    embeds: [
      {
        title: "Có Security Check!",
        description: `**Vui lòng giải Captcha**: [Mở](${link})`,
        color: 5763719,
      },
    ],
  };

  try {
    const response = await fetch(discordWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Gửi Webhook Thất Bại: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`\x1b[31m ERROR \x1b[0m Lỗi: ${error.message}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getTurnstileResponse() {
  let e = "";
  while (true) {
    try {
      if ((e = turnstile.getResponse())) break;
    } catch (t) {}
    await sleep(1);
  }
  return turnstile.getResponse();
}

async function delta(id) {
  try {
    let response = await fetch(
      `https://api-gateway.platoboost.com/v1/authenticators/8/${id}`
    );
    if (!response.ok) {
      throw new Error(`Truy cập Platoboost thất bại: ${response.statusText}`);
    }
    let alreadyPass = await response.json();
    if (alreadyPass.key) {
      timeLeft = timeConvert(alreadyPass.minutesLeft);
      console.log(
        `\x1b[32m INFO \x1b[0m Thời gian còn lại:  \x1b[32m${timeLeft}\x1b[0m - KEY: \x1b[32m${alreadyPass.key} \x1b[0m`
      );
      return;
    }

    const captcha = alreadyPass.captcha;
    response = await fetch(
      `https://api-gateway.platoboost.com/v1/sessions/auth/8/${id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          captcha: captcha ? await getTurnstileResponse() : "",
          type: captcha ? "Turnstile" : "",
        }),
      }
    );

    if (!response.ok) {
      const securityCheckLink = `${platoboost}${id}`;
      await sendDiscordWebhook(securityCheckLink);
      throw new Error(`Có Security Check, Đã Thông Báo Về Discord!`);
    }

    let lootLink = await response.json();

    await sleep(1000);
    let decodeLootlink = decodeURIComponent(lootLink.redirect);
    const r = new URL(decodeLootlink).searchParams.get("r");
    const decodeBase64 = Buffer.from(r, "base64").toString();
    const tk = new URL(decodeBase64).searchParams.get("tk");
    await sleep(5000);

    response = await fetch(
      `https://api-gateway.platoboost.com/v1/sessions/auth/8/${id}/${tk}`,
      {
        method: "PUT",
      }
    );

    if (!response.ok) {
      throw new Error(`Tạo Key Thất Bại: ${response.statusText}`);
    }

    responseplato = await fetch(
      `https://api-gateway.platoboost.com/v1/authenticators/8/${id}`
    );

    Pass = await responseplato.json();
    if (Pass.key) {
      timeLeft = timeConvert(Pass.minutesLeft);
      console.log(
        `\x1b[32m INFO \x1b[0m Thời gian còn lại:  \x1b[32m${timeLeft}\x1b[0m - KEY: \x1b[32m${Pass.key} \x1b[0m`
      );
      return;
    }
  } catch (error) {
    console.error(`\x1b[31m EROR \x1b[0mLỗi: ${error.message}`);
  }
}

async function start() {
  const filePath = path.resolve(__dirname, "hwids.txt");
  return new Promise((resolve) => {
    fs.readFile(filePath, "utf-8", async (err, data) => {
      if (err) {
        console.error(
          `\x1b[31m  \x1b[0m Lỗi: Không tìm thấy File \x1b[33mhwids.txt\x1b[0m: ${err.message}`
        );
        resolve();
        return;
      }

      const hwids = data
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");

      console.log("\r\x1b[32m INFO \x1b[0m Bắt Đầu Bypass!");

      for (const hwid of hwids) {
        console.log(`\x1b[32m INFO \x1b[0m Bypass Hwid: \x1b[34m${hwid} \x1b[0m`);
        await delta(hwid);
      }

      console.log("\x1b[32m INFO \x1b[0m Bypass Hoàn Tất!");
      resolve();
    });
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("\x1b[33m SYST \x1b[0m Nhập thời gian chờ (M): ", (answer) => {
  const n = parseInt(answer);

  if (isNaN(n) || n <= 0) {
    console.log("\x1b[31m EROR \x1b[0m Lỗi: Số phút không hợp lệ.");
    rl.close();
    return;
  }

  const interval = n * 60 * 1000;

  async function runTask() {
    await start();

    let countdown = interval / 1000;
    const countdownInterval = setInterval(() => {
      process.stdout.write(`\r\x1b[33m SYST \x1b[0m Thời gian đến lần chạy tiếp theo: ${countdown} giây`);
      countdown--;

      if (countdown < 0) {
        console.clear();
        i += 1;
        console.log(`\x1b[33m SYST \x1b[0m Bắt đầu chạy lại lần thứ ${i}!`)
        clearInterval(countdownInterval);
        runTask();
      }
    }, 1000);
  }

  runTask();
  rl.close();
});
