const path = require('node:path');
const { Builder, By, error } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const URL = 'https://venusmasters.com/presence/';
const BUTTON = 'dialog#check[open] button#confirm';

function log(message) {
  console.log(`[${new Date().toLocaleString('fr-FR')}] ${message}`);
}

// Rechercher l'élément à chaque passage : il peut bouger ou être recréé.
async function findReadyButton(driver) {
  const buttons = await driver.findElements(By.css(BUTTON));
  for (const button of buttons) {
    if (!(await button.isDisplayed()) || !(await button.isEnabled())) continue;
    return button;
  }
  return null;
}

async function confirmIfReady(driver, shouldStop = () => false) {
  if (!(await findReadyButton(driver))) return false;

  const delayMs = 1000 + Math.floor(Math.random() * 2001);
  await new Promise(resolve => setTimeout(resolve, delayMs));
  if (shouldStop()) return false;
 
  const button = await findReadyButton(driver);
  if (!button) return false;
  await button.click();
  return true;
}

function isTransient(errorValue) {
  return errorValue instanceof error.StaleElementReferenceError ||
    errorValue instanceof error.ElementClickInterceptedError ||
    errorValue instanceof error.ElementNotInteractableError;
}

async function watch(driver, shouldStop = () => false) {
  let pendingClose = false;
  let count = 0;
  while (!shouldStop()) {
    try {
      if (pendingClose) {
        const dialogs = await driver.findElements(By.css('dialog#check[open]'));
        let visible = false;
        for (const dialog of dialogs) {
          if (await dialog.isDisplayed()) visible = true;
        }
        if (!visible) {
          pendingClose = false;
          count += 1;
          log(`Dialogue fermé après clic (${count}).`);
        }
      } else if (await confirmIfReady(driver, shouldStop)) {
        pendingClose = true;
        log('Bouton de présence cliqué ; attente de fermeture du dialogue.');
      }
    } catch (err) {
      if (!isTransient(err)) throw err;
      // Le bouton a changé de place ou de DOM : le retrouver au prochain passage.
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return count;
}

async function main() {
  const options = new chrome.Options();
  options.addArguments(`--user-data-dir=${path.join(__dirname, '.browser-profile')}`);
  options.addArguments('--start-maximized');
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  let stopped = false;
  const stop = () => { stopped = true; };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  try {
    await driver.get(URL);
    log('Connectez-vous dans cette fenêtre Chrome si nécessaire.');
    log('Surveillance active. Gardez cet onglet ouvert sur la page de présence. Ctrl+C pour arrêter.');
    await watch(driver, () => stopped);
  } catch (err) {
    if (err instanceof error.NoSuchWindowError || err instanceof error.InvalidSessionIdError) {
      log('Navigateur fermé : surveillance arrêtée.');
    } else {
      console.error(`Arrêt : ${err.message}`);
      process.exitCode = 1;
    }
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    await driver.quit().catch(() => {});
  }
}

module.exports = { confirmIfReady, watch };
if (require.main === module) main().catch(err => {
  console.error(`Impossible de démarrer Chrome : ${err.message}`);
  process.exitCode = 1;
});
