require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fetch = require("node-fetch");
const schedule = require("node-schedule");
const Weather = require("./modules/weather");

const app = express();

const port = 5000;

const connect = async () => {
  // Connect database
  await mongoose.connect(process.env.DB_URL, { useNewUrlParser: true });
};

const fetchWeather = async () => {
  // 拉資料
  const res = await fetch("https://data.taipei/opendata/datalist/apiAccess?scope=resourceAquire&rid=1f1aaba5-616a-4a33-867d-878142cac5c4");
  const data = await res.json();
  const weathers = data.result.results.map((result) => {
    const {
      dataTime,
      measures,
      lon,
      value,
      locationName,
      geocode,
      lat,
    } = result;
    return {
      dataTime,
      measures,
      value,
      locationName,
      geocode,
      location: {
        coordinates: [lat, lon],
      },
    };
  });
  // 清掉 db 舊資料
  await Weather.deleteMany({});
  // 更新 db 資料
  await Weather.create(weathers);
};

const runApp = () => {
  // CORS
  app.use(cors());
  // Body parser
  app.use(express.urlencoded({ extended: false }));

  app.get("/", (req, res) => {
    res.send("Welcome to a basic express App");
  });

  app.get("/tapei-weather", async (req, res) => {
    console.log(req.query);
    const {
      offset = "0", limit = "10", q, sort,
    } = req.query;
    let field;
    let order;
    if (sort) {
      [field, order] = sort.split(":");
    }

    const processQuery = {};

    if (q) {
      processQuery.locationName = q;
    }

    const weathers = await Weather.paginate(
      processQuery,
      {
        offset: parseInt(offset, 10),
        limit: parseInt(limit, 10),
        lean: true,
        sort: { [field]: order === "ascend" ? 1 : -1 },
      },
    );

    const results = weathers.docs.map((weather) => {
      const {
        _id, dataTime, measures, locationName, value, geocode, location,
      } = weather;
      return {
        _id,
        dataTime: dataTime.toString(),
        measures,
        locationName,
        value,
        geocode,
        lat: location.coordinates[0].toString(),
        lon: location.coordinates[1].toString(),
      };
    });

    const resJson = {
      result: {
        limit,
        offset,
        count: weathers.total.toString(),
        sort,
        results,
      },
    };

    res.json(resJson);
  });

  // corn jobs，每一小時更新 db 資料
  schedule.scheduleJob("0 * * * *", () => {
    console.log("更新 weahter 資料");
    fetchWeather();
  });

  // Listen on port 5000
  app.listen(port, () => {
    console.log(`Server is booming on port 5000
Visit http://localhost:5000`);
  });
};

const main = async () => {
  await connect();
  await fetchWeather();
  runApp();
};

main();
