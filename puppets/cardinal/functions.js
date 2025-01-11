const chalk = require("chalk");
const xPaths = require("./xPaths");
const CardinalPuppetError = require("./CardinalPuppetError");
// const dayjs = require("dayjs");

const fn = (name, color, waitForOptions) => {
  return {
    /**
     * @param {Page} page
     * @param {string} url
     * @param {number} _minWaitingTime
     * @returns {Promise<undefined>}
     */
    async goto(page, url, _minWaitingTime) {
      try {
        const minWaitingTime = _minWaitingTime ?? 0;
        const naviPromise = page.waitForNavigation(waitForOptions);
        await page.goto(url);
        await naviPromise;
        await page.waitForPageRendering({ minWaitingTime });
      } catch (e) {
        throw e;
      }
    },
    /**
     * @param {Page} page
     * @returns {Promise<undefined|CardinalPuppetError>}
     */
    async signIn(page) {
      console.log(`${chalk[color](name + ":")} Signing in to Vantus HQ ...`);
      try {
        const id = process.env.CARDINAL_USERNAME;
        const password = process.env.CARDINAL_PASSWORD;
        const _xPaths = xPaths.loginPage;
        const inputEls = await page.waitForElements([
          _xPaths.usernameInput,
          _xPaths.passwordInput,
          _xPaths.loginButton,
        ]);
        await inputEls[0].type(id);
        await inputEls[1].type(password);
        const naviPromise = page.waitForNavigation();
        await inputEls[2].click();
        await naviPromise;
        await page.waitForPageRendering({ minWaitingTime: 10000 });
        /* Handle redirection pages */
        const currentUrl = page.url();
        if (currentUrl === "https://vantus.cardinalhealth.com/home") {
          console.log(`${chalk[color](name + ":")} Signed in to Vantus HQ.`);
          return;
        }
        return new CardinalPuppetError("Failed to sign in to Vantus HQ.");
      } catch (e) {
        return new CardinalPuppetError(e.message);
      }
    },
    /**
     * @param {Page} page
     * @returns {Promise<undefined|CardinalPuppetError>}
     */
    async reload(page) {
      console.log(`${chalk[color](name + ":")} Reloading Vantus HQ ...`);
      try {
        let reloaded = false;
        const url = process.env.CARDINAL_ADDRESS;
        await this.goto(page, url, 5000);
        /* Handle redirection pages */
        const currentUrl = page.url();
        if (currentUrl === "https://vantus.cardinalhealth.com/home") {
          reloaded = true;
        } else {
          if (
            currentUrl.startsWith("https://pdlogin.cardinalhealth.com/signin")
          ) {
            const login = await this.signIn(page);
            if (login instanceof CardinalPuppetError) {
              return login;
            } else {
              reloaded = true;
            }
          }
        }
        if (reloaded) {
          console.log(`${chalk[color](name + ":")} Vantus HQ reloaded.`);
        } else {
          return new CardinalPuppetError("Failed to reload Vantus HQ.");
        }
      } catch (e) {
        return new CardinalPuppetError(e.message);
      }
    },
    /**
     * Returns the first CIN string listed from the search result table.
     * @param {Page} page
     * @param {string} query
     * @returns {Promise<string|null|CardinalPuppetError>}
     */
    async search(page, query) {
      console.log(
        `${chalk[color](name + ":")} Searching Vantus HQ for "${query}" ...`
      );
      try {
        const url = `https://vantus.cardinalhealth.com/search?q=${query}`;
        await this.goto(page, url, 1000);
        const _xPaths = xPaths.search;
        const resultPromises = [
          page.waitForElement(_xPaths.cin_),
          page.waitForElement(_xPaths.noResults),
        ];
        const i = await Promise.any(
          resultPromises.map((p, i) => p.then(() => i))
        );
        if (i === 0) {
          const result = await page.getInnerTexts(_xPaths.cin_);
          if (result[0]) {
            return result[0];
          }
        } else {
          const result = await page.getInnerTexts(_xPaths.noResults);
          if (result[0]) {
            return null;
          }
        }
        return new CardinalPuppetError(
          `Failed to find search results for "${query}".`
        );
      } catch (e) {
        return new CardinalPuppetError(e.message);
      }
    },
    /**
     * @param {Page} page
     * @returns {Promise<object|CardinalPuppetError>}
     */
    async getProductDetails(page, cin) {
      console.log(`${chalk[color](name + ":")} Scraping product details ...`);
      try {
        const url = `https://vantus.cardinalhealth.com/product/${cin}?tab=more-details`;
        await this.goto(page, url, 1000);
        const _xPaths = xPaths.product;
        const imgEl = await page.waitForElement(_xPaths.img);
        const results = await page.getBatchData(_xPaths.info);
        if (results && results.length > 0 && imgEl) {
          const result = results[0];
          result.img = String(
            await (await imgEl.getProperty("src")).jsonValue()
          ).trim();
          const contract = await page.getInnerTexts(_xPaths.contract);
          if (contract[0]) {
            result.contract = contract[0];
          }
          const stockStatus = result.stockStatus;
          if (stockStatus !== "INELIGIBLE") {
            result.stock = (await page.getInnerTexts(_xPaths.stock))[0];
            const avlAlertButton = await page.$(
              `::-p-xpath(${_xPaths.avlAlertButton})`
            );
            if (avlAlertButton) {
              await avlAlertButton.click();
              const results = await page.getBatchData(_xPaths.avlAlertInfo);
              Object.assign(result, results[0]);
            }
          }
          const currentUrl = page.url();
          const url = currentUrl.replace("more-details", "subs-and-alts");
          await this.goto(page, url, 1000);
          const resultPromises = [
            page.waitForElement(_xPaths.noAlts),
            page.waitForElement(_xPaths.alts.cin),
          ];
          const i = await Promise.any(
            resultPromises.map((p, i) => p.then(() => i))
          );
          if (i === 0) {
            const _result = await page.getInnerTexts(_xPaths.noAlts);
            if (_result[0]) {
              result.alts = [];
            }
          } else {
            const results = await page.getBatchData(_xPaths.alts);
            result.alts = results;
          }

          if (result.lastOrdered === "— —") {
            result.purchaseHistory = [];
          } else {
            /* max 100 rows */
            const url = currentUrl.replace("more-details", "purchase-history");
            await this.goto(page, url, 1000);
            const last36months = await page.waitForElement(
              _xPaths.last36months
            );
            await last36months.click();
            await page.waitForPageRendering();
            // await page.waitForElementFade(_xPaths.spinnerLoader);
            const results = await page.getBatchData(_xPaths.purchaseHistory);
            result.purchaseHistory = results;
          }
          return result;
        }
        return new CardinalPuppetError(`Failed to scrape product details.`);
      } catch (e) {
        return new CardinalPuppetError(e.message);
      }
    },
  };
};

module.exports = fn;
