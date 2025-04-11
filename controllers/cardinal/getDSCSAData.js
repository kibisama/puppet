const chalk = require("chalk");
const dayjs = require("dayjs");

module.exports = async (req, res, next) => {
  let page2;
  let page3;
  try {
    const { puppetIndex } = res.locals;
    const { name, browser, color, page, fn } =
      req.app.get("cardinalPuppets")[puppetIndex];
    let { date } = req.body;
    console.log(
      `${chalk[color](name + ":")} ${dayjs().format(
        "MM/DD/YY HH:mm:ss"
      )} Retrieving DSCSA Transaction Data History on ${date}" ...`
    );
    if (date) {
      const target = page.target();
      await fn.clickMenu(page, "reports", "dscsaReport");
      const target2 = await browser.waitForTarget(
        (tgt) => tgt.opener() === target
      );
      page2 = await target2.page();
      await fn.getDSCSAData(page2, date);
      const target3 = await browser.waitForTarget(
        (tgt) => tgt.opener() === target2
      );
      page3 = await target3.page();
      await page3.waitForElement("//body");
      const json = JSON.parse((await page3.getInnerTexts("//body"))[0]);
      res.send({ results: json });
      await page3.close();
      await page2.close();
    }
    next();
  } catch (e) {
    if (page3) {
      await page3.close();
    }
    if (page2) {
      await page2.close();
    }
    next(e);
  }
};
