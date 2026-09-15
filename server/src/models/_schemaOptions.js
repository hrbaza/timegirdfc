// Shared schema options: expose `id` (from string _id), hide __v and password.
const baseSchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.password;
      return ret;
    },
  },
  toObject: { virtuals: true, versionKey: false },
};

module.exports = { baseSchemaOptions };
