const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const email = process.env.LP_EMAIL;
  const password = process.env.LP_PASSWORD;

// ----------------------------------------------------------------------------------------
let loginAttempts = 0;
const maxLoginAttempts = 2;

async function performLogin() {
  while (loginAttempts < maxLoginAttempts) {
    try {
      console.log(`🔐 Opening Lady Popular login page... Attempt ${loginAttempts + 1}`);
      await page.goto('https://ladypopular.com', { waitUntil: 'domcontentloaded', timeout: 60000 });

      console.log("🔍 Waiting for Sign In button...");
      await page.waitForSelector('#login-btn', { timeout: 60000 });
      await page.click('#login-btn');
      console.log("✅ Sign In button clicked.");

      console.log("✍️ Entering credentials...");
      await page.waitForSelector('#login-username-field', { timeout: 10000 });
      await page.fill('#login-username-field', email);
      console.log("✅ Username filled.");

      await page.waitForSelector('#loginForm3 > div > label:nth-child(2) > input[type=password]', { timeout: 10000 });
      await page.fill('#loginForm3 > div > label:nth-child(2) > input[type=password]', password);
      console.log("✅ Password filled.");

      await page.waitForSelector('#loginSubmit', { timeout: 10000 });
      await page.click('#loginSubmit');
      console.log("🚀 Login credentials submitted.");

      return true; // Success
    } catch (error) {
      loginAttempts++;
      console.log(`⚠️ Login attempt ${loginAttempts} failed: ${error.message}`);

      if (loginAttempts < maxLoginAttempts) {
        console.log("🔁 Refreshing and retrying login from Step 1...");
        await page.reload({ waitUntil: 'domcontentloaded' });
      } else {
        console.log("❌ Login failed after 2 attempts. Aborting...");
        await page.screenshot({ path: 'login-error.png', fullPage: true });
        console.log("📸 Screenshot saved as 'login-error.png'");
        await browser.close();
        process.exit(1);
      }
    }
  }
}

await performLogin();


// -----------------------------------------------------------------------------------------
console.log("🍪 Looking for cookie consent button...");

let cookieAccepted = false;
const cookieSelectors = [
  '#accept-all-btn',
  'button:has-text("Accept All")',
  'button:has-text("Accept")',
  'button:has-text("Confirm")',
  'button:has-text("Agree")',
];

for (const selector of cookieSelectors) {
  try {
    const button = await page.waitForSelector(selector, { timeout: 3000 });
    await button.click();
    cookieAccepted = true;
    console.log(`🍪 Cookie accepted using selector: ${selector}`);
    await page.waitForTimeout(5000);
    break;
  } catch {
    console.log(`🔍 Cookie button not found with selector: ${selector}`);
  }
}

if (!cookieAccepted) {
  console.log("⚠️ Could not find any cookie consent button, continuing anyway.");
}

// ----------------------------------------------------------------------------------------------
// fashion arena
let arenaEnergy = 1;

while (arenaEnergy > 0) {
  try {
    console.log("🟧 Navigating to Fashion Arena...");
    await page.goto('https://v3.g.ladypopular.com/duels.php', { timeout: 60000 });
    await page.waitForTimeout(5000);

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
        throw e; // Trigger outer retry logic
      }
    }

    // ✅ Done if all duels succeeded
    console.log("✅ Finished all duels in Fashion Arena.");
    break;

  } catch (err) {
    console.log("🔁 Error occurred. Refreshing page to retry Fashion Arena...");
    await page.reload({ timeout: 60000 });
    await page.waitForTimeout(5000);
  }
}

// ----------------------------------------------------------------------------
 // 💅 Beauty Pageant via direct link
    console.log("🔷 Navigating to Beauty Pageant page...");
    await page.goto('https://v3.g.ladypopular.com/beauty_pageant.php', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(10000);

    // 🔷 Get blue energy and judge cycles
    const blueEnergyText = await page.innerText('#header > div.wrapper > div > div.player-panel-middle > div.player-panel-energy > a.player-energy.player-bp-energy > span.player-energy-value');
    const blueEnergy = parseInt(blueEnergyText.trim());
    const judgeCycles = Math.floor(blueEnergy / 2);
    console.log(`🔷 You have ${blueEnergy} blue energy. Performing up to ${judgeCycles} judge + vote cycles...`);

    // 📍 Find vote coordinate (try 3 times with refresh)
    let voteCoordinate = null;
    let retryCount = 0;
    const maxRetries = 3;

    while (!voteCoordinate && retryCount < maxRetries) {
      try {
        if (retryCount > 0) {
          console.log(`🔄 Retrying coordinate detection (Attempt ${retryCount + 1})...`);
          await page.goto('https://v3.g.ladypopular.com/beauty_pageant.php', { waitUntil: 'domcontentloaded', timeout: 60000 });
          await page.waitForTimeout(10000);
        }

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
        retryCount++;
        console.log(`⚠️ Failed to get vote coordinate (Attempt ${retryCount}): ${e.message}`);
        await page.screenshot({ path: `bp-init-retry-${retryCount}.png`, fullPage: true });

        if (retryCount >= maxRetries) {
          console.log("❌ All attempts to get vote coordinate failed. Skipping Beauty Pageant.");
          return;
        }
      }
    }

    // 👑 Run judge + vote cycles
    let completed = 0;
    let lastEnergy = blueEnergy;

    while (completed < judgeCycles) {
      console.log(`👑 Cycle ${completed + 1}: Clicking Judge button...`);
      try {
        await page.click('#judgeButton');
        await page.waitForTimeout(3000);
        await page.mouse.click(voteCoordinate.x, voteCoordinate.y);
        await page.waitForTimeout(3000);

        const energyText = await page.innerText('#header > div.wrapper > div > div.player-panel-middle > div.player-panel-energy > a.player-energy.player-bp-energy > span.player-energy-value');
        const currentEnergy = parseInt(energyText.trim());

        if (currentEnergy < lastEnergy) {
          lastEnergy = currentEnergy;
          completed++;
          console.log(`✅ Voted. Energy now: ${currentEnergy}`);
        } else {
          console.log("❌ Vote click did not consume energy. Skipping.");
        }

      } catch (e) {
        console.log(`⚠️ Judge cycle ${completed + 1} failed: ${e.message}`);
        await page.screenshot({ path: `bp-error-${completed + 1}.png`, fullPage: true });
      }
    }

// ------------------------------------------------------------------------
    console.log("🎉 All tasks completed. Closing browser.");

  } catch (err) {
    console.error("💥 Script crashed:", err);
    await page.screenshot({ path: 'error.png', fullPage: true });
    console.log("📸 Screenshot saved as 'error.png' for debugging.");
  } finally {
    await browser.close();
  }
})();
