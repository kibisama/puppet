const PSPuppetError = require("../../puppets/pharmsaver/PSPuppetError");

module.exports = async (req, res, next) => {
  try {
    const { puppetIndex } = res.locals;
    const { page, fn } = req.app.get("psPuppets")[puppetIndex];
    const reload = await fn.reload(page);
    if (reload instanceof PSPuppetError) {
      return next(reload);
    }
    next();
  } catch (e) {
    const error = new PSPuppetError(e.message);
    next(error);
  }
};
