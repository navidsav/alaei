module.exports = (req, res, next) => {
    const query = {};
    const { pageNum, perpage } = req.query;

    if (pageNum && perpage) query.limit = parseInt(pageNum * perpage);
    if (pageNum && perpage) query.skip = parseInt((pageNum - 1) * perpage);

    req.mongoQuery = query;
    next();
}