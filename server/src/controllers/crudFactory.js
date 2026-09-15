const { AppError, catchAsync } = require("../utils/AppError");

const RESERVED = ["page", "limit", "sort", "fields", "q", "all"];

// Generic CRUD handlers usable by any model.
function crudFactory(Model) {
  const getAll = catchAsync(async (req, res) => {
    const filter = {};
    // pass-through equality filters for any non-reserved query key
    Object.keys(req.query).forEach((k) => {
      if (!RESERVED.includes(k)) filter[k] = req.query[k];
    });

    let query = Model.find(filter);

    if (req.query.sort) query = query.sort(req.query.sort.split(",").join(" "));
    if (req.query.fields) query = query.select(req.query.fields.split(",").join(" "));

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, parseInt(req.query.limit, 10) || 500);
    query = query.skip((page - 1) * limit).limit(limit);

    const [data, total] = await Promise.all([query, Model.countDocuments(filter)]);
    res.json({ status: "success", results: data.length, total, page, data });
  });

  const getOne = catchAsync(async (req, res, next) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) return next(new AppError("Record not found.", 404));
    res.json({ status: "success", data: doc });
  });

  const createOne = catchAsync(async (req, res) => {
    const doc = await Model.create(req.body);
    res.status(201).json({ status: "success", data: doc });
  });

  const updateOne = catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return next(new AppError("Record not found.", 404));
    res.json({ status: "success", data: doc });
  });

  const deleteOne = catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) return next(new AppError("Record not found.", 404));
    res.status(204).send();
  });

  return { getAll, getOne, createOne, updateOne, deleteOne };
}

module.exports = { crudFactory };
