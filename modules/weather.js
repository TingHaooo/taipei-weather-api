const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");

const WeatherSchema = new mongoose.Schema({
  dataTime: { type: Date, required: true },
  measures: { type: String, required: true },
  value: { type: String, required: true },
  locationName: { type: String, required: true },
  geocode: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
});

WeatherSchema.plugin(mongoosePaginate);

const Bag = mongoose.model("weather", WeatherSchema);

module.exports = Bag;
