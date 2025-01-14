module.exports = async (req, res, next) => {
  try {
    const psPuppetsOccupied = req.app.get("psPuppetsOccupied");
    for (let i = 0; i < psPuppetsOccupied.length; i++) {
      if (!psPuppetsOccupied[i]) {
        psPuppetsOccupied[i] = true;
        res.locals.puppetIndex = i;
        break;
      }
    }
    if (res.locals.puppetIndex == null) {
      const error = new Error("All Pharmsaver puppets are busy");
      error.status = 503;
      return next(error);
    }
    next();
  } catch (e) {
    next(e);
  }
};
