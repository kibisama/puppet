const chalk = require("chalk");
const xPaths = require("./xPaths");

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
     * @returns {Promise<undefined|Error>}
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
        return new Error("Failed to sign in to Vantus HQ.");
      } catch (e) {
        return e;
      }
    },
    /**
     * @param {Page} page
     * @returns {Promise<undefined|Error>}
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
            if (login instanceof Error) {
              return login;
            } else {
              reloaded = true;
            }
          }
        }
        if (reloaded) {
          console.log(`${chalk[color](name + ":")} Vantus HQ reloaded.`);
        } else {
          return new Error("Failed to reload Vantus HQ.");
        }
      } catch (e) {
        return e;
      }
    },
    /**
     * Returns the first CIN string listed from the search result table.
     * @param {Page} page
     * @param {string} query
     * @returns {Promise<string|null|Error>}
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
          page.waitForElements([_xPaths.cin, _xPaths.stockStatus]),
          page.waitForElement(_xPaths.noResults),
        ];
        const i = await Promise.any(
          resultPromises.map((p, i) => p.then(() => i))
        );
        if (i === 0) {
          const stockStatus = (
            await page.getInnerTexts(_xPaths.stockStatus)
          )[0];
          const cin = (await page.getInnerTexts(_xPaths.cin))[0];
          if (stockStatus !== "INELIGIBLE" && cin) {
            return cin;
          }
        } else {
          const result = await page.getInnerTexts(_xPaths.noResults);
          if (result[0]) {
            return null;
          }
        }
        return new Error(`Failed to find search results for "${query}".`);
      } catch (e) {
        return e;
      }
    },
    /**
     * Scrape the entire Prodcut Details by cin.
     * @param {Page} page
     * @returns {Promise<object|Error>}
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
          const subsAndAlts = await this.scrapeSubsAndAlts(page);
          if (!(subsAndAlts instanceof Error)) {
            result.alts = subsAndAlts;
          } else {
            //
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
        return new Error(`Failed to scrape product details.`);
      } catch (e) {
        return e;
      }
    },
    /**
     * @param {Page} page
     * @returns {Promise<Array|Error>}
     */
    async scrapeSubsAndAlts(page) {
      try {
        const _xPaths = xPaths.product;
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
            return [];
          }
        } else {
          return (results = await page.getBatchData(_xPaths.alts));
        }
        return new Error("Failed to scrape Subs & alts.");
      } catch (e) {
        return e;
      }
    },
    /**
     * Scrape the Subs & alts page by cin.
     * @param {Page} page
     * @returns {Promise<Array|Error>}
     */
    async getSubsAndAlts(page, cin) {
      try {
        const _xPaths = xPaths.product;
        const url = `https://vantus.cardinalhealth.com/product/${cin}?tab=subs-and-alts`;
        await this.goto(page, url, 1000);
        const results = await this.scrapeSubsAndAlts(page);
        if (results instanceof Error) {
          return results;
        }
        const product = {
          name: (await page.getInnerTexts(_xPaths.info.name))[0],
          genericName: (await page.getInnerTexts(_xPaths.info.genericName))[0],
          ndc: (await page.getInnerTexts(_xPaths.info.ndc))[0],
          cin: (await page.getInnerTexts(_xPaths.info.cin))[0],
          upc: (await page.getInnerTexts(_xPaths.info.upc))[0],
          mfr: (await page.getInnerTexts(_xPaths.info.mfr))[0],
          orangeBookCode: (
            await page.getInnerTexts(_xPaths.info.orangeBookCode)
          )[0],
          estNetCost: (await page.getInnerTexts(_xPaths.info.estNetCost))[0],
          netUoiCost: (await page.getInnerTexts(_xPaths.info.netUoiCost))[0],
          lastOrdered: (await page.getInnerTexts(_xPaths.info.lastOrdered))[0],
          stockStatus: (await page.getInnerTexts(_xPaths.info.stockStatus))[0],
          rebateEligible: (
            await page.getInnerTexts(_xPaths.info.rebateEligible)
          )[0],
          returnable: (await page.getInnerTexts(_xPaths.info.returnable))[0],
        };
        const contract = await page.getInnerTexts(_xPaths.contract);
        if (contract[0]) {
          product.contract = contract[0];
        }
        if (product.stockStatus !== "INELIGIBLE") {
          product.stock = (await page.getInnerTexts(_xPaths.stock))[0];
        }
        results.push(product);
        return results;
      } catch (e) {
        return e;
      }
    },
  };
};

module.exports = fn;
