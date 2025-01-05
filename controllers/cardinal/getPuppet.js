module.exports = async (req, res, next) => {
  try {
    const cardinalPuppetsOccupied = req.app.get("cardinalPuppetsOccupied");
    for (let i = 0; i < cardinalPuppetsOccupied.length; i++) {
      if (!cardinalPuppetsOccupied[i]) {
        cardinalPuppetsOccupied[i] = true;
        res.locals.puppetIndex = i;
        break;
      }
    }
    if (res.locals.puppetIndex == null) {
      const error = new Error("All Cardinal puppets are busy");
      error.status = 503;
      return next(error);
    }
    next();
  } catch (e) {
    next(e);
  }
};
