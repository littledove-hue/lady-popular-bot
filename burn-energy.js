const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const email = process.env.LP_EMAIL;
  const password = process.env.LP_PASSWORD;

  try {
    // ----------------------------------------
    // 🔐 Step 1 + 2: Login + Credential Handling
    let loginSuccess = false;

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        console.log(`🔐 [Attempt ${attempt}] Opening Lady Popular login page...`);
        await page.goto('https://ladypopular.com', {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });

        console.log("🔎 Waiting for Sign In button...");
        await page.waitForSelector('#login-btn', { timeout: 30000 });
        await page.waitForTimeout(5000);  // ⏱️ wait before click
        await page.click('#login-btn');
        console.log("✅ Sign In button clicked.");

        console.log("🔐 Entering credentials...");
        await page.waitForSelector('#login-username-field', { timeout: 10000 });
        await page.fill('#login-username-field', email);
        console.log("✅ Username entered.");

        await page.fill(
          '#loginForm3 > div > label:nth-child(2) > input[type=password]',
          password
        );
        console.log("✅ Password entered.");

        await page.waitForTimeout(5000);  // ⏱️ wait before submitting
        await page.click('#loginSubmit');
        console.log("📨 Credentials submitted.");

        await page.waitForSelector('#header', { timeout: 15000 });
        console.log("🎉 Login successful.");
        loginSuccess = true;
        break;

      } catch (error) {
        console.log(`❌ Login attempt ${attempt} failed: ${error.message}`);
        await page.screenshot({ path: `login-error-${attempt}.png`, fullPage: true });

        if (attempt < 5) {
          console.log("🔁 Retrying login from beginning...");
        } else {
          console.log("🚫 Max login attempts reached. Aborting.");
          await browser.close();
          return;
        }
      }
    }

    // ----------------------------------------
    // 🍪 Step 3: Cookie Consent (with retry)
    const cookieSelectors = [
      '#accept-all-btn',
      'button:has-text("Accept All")',
      'button:has-text("Accept")',
      'button:has-text("Confirm")',
      'button:has-text("Agree")'
    ];

    async function attemptCookieConsent() {
      console.log("🍪 Looking for cookie consent button...");
      for (const selector of cookieSelectors) {
        try {
          const button = await page.waitForSelector(selector, { timeout: 10000 });
          await page.waitForTimeout(15000);  // ⏱️ wait before clicking cookie
          await button.click();
          console.log(`🍪 Cookie accepted using selector: ${selector}`);
          await page.waitForTimeout(10000);
          return true;
        } catch {
          console.log(`🔍 Cookie button not found with selector: ${selector}`);
        }
      }
      return false;
    }

    let cookieAccepted = await attemptCookieConsent();
    if (!cookieAccepted) {
      console.log("🔁 Cookie button not found. Refreshing and retrying...");
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      cookieAccepted = await attemptCookieConsent();
    }

    if (!cookieAccepted) {
      console.log("❌ Failed to accept cookie even after retry. Aborting.");
      await page.screenshot({ path: 'cookie-error.png', fullPage: true });
      await browser.close();
      return;
    }
    // ----------------------------------------
    // 🟧 Step 4: Fashion Arena (with 3 refreshes to dismiss popups)
    let arenaEnergy = 1;

    while (arenaEnergy > 0) {
      try {
        console.log("🟧 Navigating to Fashion Arena...");
        await page.goto('https://v3.g.ladypopular.com/duels.php', { timeout: 60000 });

        // Quick 3 refreshes to dismiss possible popups
        for (let i = 1; i <= 3; i++) {
          console.log(`🔄 Refreshing Fashion Arena page (${i}/3)...`);
          await page.reload({ timeout: 30000 });
          await page.waitForTimeout(1500); // Short delay between refreshes
        }

        const energyText = await page.innerText(
          '#header > div.wrapper > div > div.player-panel-middle > div.player-panel-energy > a.player-energy.player-arena-energy > span.player-energy-value > span'
        );
        arenaEnergy = parseInt(energyText.trim());

        if (arenaEnergy <= 0 || isNaN(arenaEnergy)) {
          console.log("✅ No energy left. Skipping Fashion Arena.");
          break;
        }

        console.log(`🔋 You have ${arenaEnergy} energy. Starting duels...`);

        for (let i = 0; i < arenaEnergy; i++) {
          try {
            await page.click('#challengeLady', { timeout: 5000 });
            console.log(`⚔️ Duel ${i + 1}`);
            await page.waitForTimeout(1000);
          } catch (e) {
            console.log(`⚠️ Duel ${i + 1} failed: ${e.message}`);
            throw e;
          }
        }

        console.log("✅ Finished all duels in Fashion Arena.");
        break;

      } catch (err) {
        console.log("🔁 Error occurred. Refreshing page to retry Fashion Arena...");
        await page.reload({ timeout: 60000 });
        await page.waitForTimeout(5000);
      }
    }

    // ----------------------------------------
    
// ----------------------------------------
// 💅 Step 5: Beauty Pageant
console.log("🔷 Navigating to Beauty Pageant page...");
await page.goto('https://v3.g.ladypopular.com/beauty_pageant.php', {
  waitUntil: 'domcontentloaded',
  timeout: 60000
});
await page.waitForTimeout(10000);

// 🔷 Get blue energy and judge cycles
const energySelector = '#header > div.wrapper > div > div.player-panel-middle > div.player-panel-energy > a.player-energy.player-bp-energy > span.player-energy-value';
const parseEnergy = async () => parseInt((await page.innerText(energySelector)).trim());

let blueEnergy = await parseEnergy();
const judgeCycles = Math.floor(blueEnergy / 2);
console.log(`🔷 You have ${blueEnergy} blue energy. Performing up to ${judgeCycles} judge + vote cycles...`);

// ----------------------------------------
// 🔍 Step B: Test if (345, 512) is vote coordinate (twice if needed)
let voteCoordinate = null;
let coordinateVerified = false;

async function testFixedCoordinate() {
  console.log("📌 Testing fixed vote coordinate (345,512)...");
  await page.click('#judgeButton');
  await page.waitForTimeout(2000);

  const initialEnergy = await parseEnergy();
  for (let i = 0; i < 3; i++) {
    await page.mouse.click(345, 512);
    await page.waitForTimeout(5000);
  }
  const finalEnergy = await parseEnergy();
  if (finalEnergy < initialEnergy) {
    voteCoordinate = { x: 345, y: 512 };
    console.log("✅ Fixed vote coordinate (345,512) confirmed.");
    return true;
  } else {
    console.log("❌ Fixed vote coordinate (345,512) did not reduce energy.");
    return false;
  }
}

coordinateVerified = await testFixedCoordinate();
if (!coordinateVerified) {
  console.log("🔄 Retrying coordinate (345,512) after refresh...");
  await page.goto('https://v3.g.ladypopular.com/beauty_pageant.php', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(10000);
  coordinateVerified = await testFixedCoordinate();
}

// ----------------------------------------
// 🎯 Step C: Fallback to judge-left detection if needed
if (!coordinateVerified) {
  console.log("📍 Falling back to arrow-based vote coordinate detection...");
  await page.goto('https://v3.g.ladypopular.com/beauty_pageant.php', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(10000);

  try {
    await page.click('#judgeButton');
    await page.waitForSelector('#dynamic-info-container > div.judge-panel > div.judge-left', { timeout: 10000 });

    const arrow = await page.$('#dynamic-info-container > div.judge-panel > div.judge-left');
    const box = await arrow.boundingBox();
    if (!box) throw new Error("Judge-left arrow not found");

    voteCoordinate = {
      x: box.x - 100,
      y: box.y + box.height / 2
    };

    console.log(`✅ Vote coordinate locked at (${Math.round(voteCoordinate.x)}, ${Math.round(voteCoordinate.y)})`);
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log("❌ Fallback coordinate detection failed: " + e.message);
    await page.screenshot({ path: 'bp-fallback-error.png', fullPage: true });
    return;
  }
}

// ----------------------------------------
// 🔁 Step D: Judge + Vote Loop
let completed = 0;
let lastEnergy = await parseEnergy();

while (lastEnergy > 1) {
  console.log(`👑 Cycle ${completed + 1}: Refreshing and clicking Judge...`);
  try {
    await page.goto('https://v3.g.ladypopular.com/beauty_pageant.php', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(5000);

    await page.waitForSelector('#judgeButton', { timeout: 10000 });
    await page.click('#judgeButton');
    console.log("🖱️ Judge clicked.");


    for (let i = 0; i < 3; i++) {
      await page.mouse.click(voteCoordinate.x, voteCoordinate.y);
      console.log(`🗳️ Vote click ${i + 1} at (${Math.round(voteCoordinate.x)}, ${Math.round(voteCoordinate.y)})`);
      await page.waitForTimeout(5000);
    }

    const currentEnergy = await parseEnergy();
    if (currentEnergy < lastEnergy) {
      lastEnergy = currentEnergy;
      completed++;
      console.log(`✅ Energy dropped. Now: ${currentEnergy}`);
    } else {
      console.log("⚠️ Energy did not change after voting. Skipping.");
    }

  } catch (e) {
    console.log(`⚠️ Judge cycle ${completed + 1} failed: ${e.message}`);
    await page.screenshot({ path: `bp-error-${completed + 1}.png`, fullPage: true });
  }
}


    // ----------------------------------------
 } catch (err) {
    console.error("💥 Script crashed:", err);
    await page.screenshot({ path: 'error.png', fullPage: true });
    console.log("📸 Screenshot saved as 'error.png' for debugging.");
  } finally {
    await browser.close();
  }
})();
