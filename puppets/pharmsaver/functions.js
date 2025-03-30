const chalk = require("chalk");
const xPaths = require("./xPaths");

/**
 * @typedef {import("puppeteer").Page} Page
 */

const fn = (name, color, waitForOptions) => {
  return {
    /**
     * @param {Page} page
     * @param {string} url
     * @returns {Promise<undefined>}
     */
    async goto(page, url) {
      try {
        const naviPromise = page.waitForNavigation(waitForOptions);
        await page.goto(url);
        await naviPromise;
        await page.waitForElementFade(xPaths.blockUI);
        await page.waitForPageRendering({ minStableSizeIterations: 2 });
      } catch (e) {
        throw e;
      }
    },
    /**
     * @param {Page} page
     * @returns {Promise<undefined|Error>}
     */
    async signIn(page) {
      console.log(`${chalk[color](name + ":")} Signing in to PharmSaver ...`);
      try {
        const id = process.env.PHARMSAVER_USERNAME;
        const password = process.env.PHARMSAVER_PASSWORD;
        const _xPaths = xPaths.loginPage;
        const inputEls = await page.waitForElements([
          _xPaths.usernameInput,
          _xPaths.passwordInput,
          _xPaths.loginButton,
        ]);
        await inputEls[0].type(id);
        await inputEls[1].type(password);
        await Promise.all([
          page.waitForNavigation(waitForOptions),
          inputEls[2].click(),
        ]);
        await page.waitForElementFade(xPaths.blockUI);
        await page.waitForPageRendering({ minStableSizeIterations: 2 });
        const currentUrl = page.url();
        if (
          currentUrl === "https://pharmsaver.net/Pharmacy/Default.aspx" ||
          currentUrl.startsWith("https://pharmsaver.net/Default.aspx/")
        ) {
          console.log(`${chalk[color](name + ":")} Signed in to PharmSaver.`);
          return;
        }
        return new Error("Failed to sign in to PharmSaver.");
      } catch (e) {
        return e;
      }
    },
    /**
     * @param {Page} page
     * @returns {Promise<undefined|Error>}
     */
    async reload(page) {
      console.log(`${chalk[color](name + ":")} Reloading Pharmsaver ...`);
      try {
        let reloaded = false;
        const url = process.env.PHARMSAVER_ADDRESS;
        await this.goto(page, url);
        const currentUrl = page.url();
        if (currentUrl === url) {
          reloaded = true;
        } else {
          if (currentUrl === "https://pharmsaver.net/Login.aspx") {
            const login = await this.signIn(page);
            if (login instanceof Error) {
              return login;
            } else {
              reloaded = true;
            }
          }
        }
        if (reloaded) {
          console.log(`${chalk[color](name + ":")} Pharmsaver reloaded.`);
        } else {
          return new Error("Failed to reload Pharmsaver.");
        }
      } catch (e) {
        return e;
      }
    },
    /**
     * @param {Page} page
     * @param {string} query
     * @returns {Promise<Boolean|Error>}
     */
    async search(page, query) {
      console.log(
        `${chalk[color](name + ":")} Searching Pharmsaver "${query}" ...`
      );
      try {
        /* query value must be 11-digit ndc with no hyphens */
        const url = `https://pharmsaver.net/Pharmacy/Order.aspx?q=${query}`;
        await this.goto(page, url);
        return await this.interpretSearchResult(page);
      } catch (e) {
        return e;
      }
    },
    /**
     * @param {Page} page
     * @param {string} query
     * @returns {Promise<Boolean|Error>}
     */
    async interpretSearchResult(page) {
      try {
        const _xPaths = xPaths.orderPage;
        const promises = [
          page.waitForElement(_xPaths.inlineOopsImg),
          page.waitForElement(_xPaths.results.description),
        ];
        const [res, i] = await Promise.any(
          promises.map((p, i) => p.then((res) => [res, i]))
        );
        if (i && res) {
          return true; // Results found
        } else if (res) {
          return false; // Not found
        }
        return new Error(`Failed to search for "${query}"`);
      } catch (e) {
        return e;
      }
    },
    /**
     * @param {Page} page
     * @param {string} query
     * @returns {Promise<Boolean|Error>}
     */
    async textSearch(page, query) {
      console.log(
        `${chalk[color](name + ":")} Searching a text "${query}" ...`
      );
      try {
        const _xPaths = xPaths.orderPage;
        const inputEls = await page.waitForElements([
          _xPaths.searchInput,
          _xPaths.searchButton,
        ]);
        await inputEls[0].type(query);
        await inputEls[1].click();
        await page.waitForElementFade(xPaths.blockUI);
        await page.waitForPageRendering({ minStableSizeIterations: 2 });
        return await this.interpretSearchResult(page);
      } catch (e) {
        return e;
      }
    },
    /**
     * @param {Page} page
     * @returns {Promise<string|Error>}
     */
    async getTextSearchValue(page) {
      try {
        const searchInput = await page.waitForElement(
          xPaths.orderPage.searchInput
        );
        if (searchInput) {
          return await (await searchInput.getProperty("value")).jsonValue();
        }
        return new Error();
      } catch (e) {
        return e;
      }
    },
    /**
     * @param {Page} page
     * @returns {Promise<object|Error>}
     */
    async getSearchResults(page) {
      const _xPaths = xPaths.orderPage;
      console.log(`${chalk[color](name + ":")} Scraping product details ...`);
      try {
        return (results = await page.getBatchData(_xPaths.results));
      } catch (e) {
        return e;
      }
    },
  };
};

module.exports = fn;
