const requirePharmacyRole = (req, res, next) => {
  if (req.user && req.user.role === 'pharmacy') {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Requires Pharmacy Access' });
  }
};

module.exports = requirePharmacyRole;
