const assert = require('node:assert/strict');
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { confirmIfReady, watch } = require('./presence.cjs');

async function main() {
  const driver = await new Builder().forBrowser('chrome')
    .setChromeOptions(new chrome.Options().addArguments('--headless=new', '--window-size=1200,800')).build();
  try {
    const html = `<!doctype html><html><body>
      <dialog id="check"><form method="dialog">
      <button type="button" id="confirm" disabled>Je suis présent · Fermer</button>
      </form></dialog><script>
      window.clicks = 0;
      window.earlyClicks = 0;
      window.reactionTimes = [];
      window.openCheck = function() {
        const dialog = document.querySelector('#check');
        // Remplacer le bouton entre les apparitions pour tester la recherche DOM.
        dialog.querySelector('button').outerHTML =
          '<button type="button" id="confirm" disabled>Je suis présent · Fermer</button>';
        const button = dialog.querySelector('button');
        dialog.style.margin = '0';
        dialog.style.left = Math.floor(Math.random() * 700) + 'px';
        dialog.style.top = Math.floor(Math.random() * 500) + 'px';
        button.onclick = function() {
          window.reactionTimes.push(performance.now() - window.readyAt);
          if (button.disabled) window.earlyClicks++;
          window.clicks++;
          dialog.close();
          if (window.clicks < 3) setTimeout(window.openCheck, 900);
        };
        dialog.showModal();
        setTimeout(() => {
          window.readyAt = performance.now();
          button.disabled = false;
        }, 600);
      };
      </script></body></html>`;
    await driver.get(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    assert.equal(await confirmIfReady(driver), false, 'Un dialogue fermé ne doit pas être cliqué');
    await driver.executeScript('window.openCheck()');
    assert.equal(await confirmIfReady(driver), false, 'Le bouton désactivé doit être respecté');
    let stop = false;
    let count;
    const timer = setTimeout(() => { stop = true; }, 20000);
    const watcher = watch(driver, () => stop);
    try {
      await driver.wait(async () => (await driver.executeScript('return window.clicks')) === 3, 18000);
      await driver.wait(async () => !(await driver.executeScript('return document.querySelector("#check").open')), 1000);
      // Laisser un passage de surveillance pour enregistrer la dernière fermeture.
      await new Promise(resolve => setTimeout(resolve, 600));
    } finally {
      stop = true;
      clearTimeout(timer);
      count = await watcher;
    }
    assert.equal(await driver.executeScript('return window.clicks'), 3);
    assert.equal(await driver.executeScript('return window.earlyClicks'), 0);
    assert.equal(count, 3);
    const reactionTimes = await driver.executeScript('return window.reactionTimes');
    for (const elapsed of reactionTimes) {
      assert.ok(elapsed >= 1000, `Clic trop rapide : ${elapsed} ms`);
      assert.ok(elapsed < 10000, `Délai de 10 secondes dépassé : ${elapsed} ms`);
    }
    console.log('OK : 3 dialogues déplacés et recréés, activation différée respectée.');
  } finally {
    await driver.quit();
  }
}

main().catch(err => { console.error(err); process.exitCode = 1; });
