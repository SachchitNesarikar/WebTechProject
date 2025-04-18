require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const axios = require("axios");
const cron = require("node-cron");

const app = express();
const port = 5000;

const cors = require("cors");
app.use(cors({origin: "http://localhost:3000"}));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL");
  }
});

const fetchAQI = async (lat, lon) => {
  try {
    const response = await axios.get(process.env.AQI_URL, {
      params: { lat, lon, appid: process.env.WEATHER_API_KEY },
    });
    return response.data.list[0].main.aqi;
  } 
  catch (error) {
    console.error("Error fetching AQI:", error);
    return null;
  }
};

const fetchWeatherData = async () => {
    try {
      const cities = ["London", "New York", "Tokyo", "Sydney", "Pune", "Berlin", "Cairo", "Rio de Janeiro", "Toronto", "Dubai", "Singapore", "Mumbai", "Paris", "Barcelona", "Rome", "Istanbul", "Moscow", "Cape Town", "Los Angeles", "Chicago", "Mexico City", "Buenos Aires", "Lima", "Santiago", "Caracas", "Lagos", "Nairobi", "Cairo", "Riyadh", "Baghdad", "Tehran", "Karachi", "Mumbai", "Kolkata", "Dhaka", "Yangon", "Bangkok", "Hanoi", "Manila", "Jakarta", "Perth", "Melbourne", "Auckland", "Hawaii", "Anchorage", "Vancouver", "San Francisco", "Seattle", "Denver", "Mexico City", "Chicago", "New York", "Toronto", "Havana", "Rio de Janeiro", "Buenos Aires", "Cape Town", "Cairo", "Riyadh", "Moscow", "Istanbul", "Karachi", "Mumbai", "Kolkata", "Dhaka", "Bangkok", "Hanoi", "Manila", "Jakarta", "Perth", "Melbourne", "Auckland", "Hawaii", "Anchorage", "Vancouver", "San Francisco", "Seattle", "Denver", "Mexico City", "Chicago", "New York", "Toronto", "Havana", "Rio de Janeiro", "Buenos Aires", "Cape Town", "Cairo", "Riyadh", "Moscow", "Istanbul", "Karachi", "Mumbai", "Kolkata", "Dhaka", "Bangkok", "Hanoi", "Manila", "Jakarta", "Perth", "Melbourne", "Auckland", "Hawaii", "Anchorage", "Vancouver", "San Francisco", "Seattle", "Denver", "Mexico City", "Chicago", "New York", "Toronto", "Havana", "Rio de Janeiro", "Buenos Aires", "Cape Town", "Cairo", "Riyadh", "Moscow", "Istanbul", "Karachi", "Mumbai", "Kolkata", "Dhaka", "Bangkok", "Hanoi", "Manila", "Jakarta", "Perth", "Melbourne", "Auckland", "Hawaii", "Anchorage", "Vancouver", "San Francisco", "Seattle", "Denver", "Mexico City", "Chicago", "New York", "Toronto", "Havana", "Rio de Janeiro"];

      for (const city of cities) {
        console.log(`Fetching weather data for ${city}...`); 

        const response = await axios.get(
          `${process.env.WEATHER_API_URL}?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=metric`
        );

        if (!response.data || !response.data.main) {
          console.error(`No weather data for ${city}`);
          continue;
        }

        const name = response.data.name;
        const temperature = response.data.main.temp;
        const timestamp = new Date();
        const aqi = await fetchAQI(response.data.coord.lat, response.data.coord.lon);

        console.log(`API Response for ${name}: ${temperature}°C`);
        const query = "INSERT INTO weather_data (city, temperature, timestamp, aqi) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE temperature = VALUES(temperature), timestamp = VALUES(timestamp), aqi = VALUES(aqi)";
        db.query(query, [name, temperature, timestamp, aqi], (err, result) => {
          if (err) {
            console.error("Error inserting data into DB:", err);
          } else {
              console.log(`Inserted into DB: ${name} - ${temperature}°C`);
          }
        });
      }
    } catch (error) {
      console.error("Error fetching weather data:", error);
    }
  };

cron.schedule("*/5 * * * *", () => {
  console.log("Fetching weather data...");
  fetchWeatherData();
});

app.get("/all", (req, res) => {
  const query = `
    SELECT city, temperature, timestamp 
    FROM weather_data 
    ORDER BY city, timestamp ASC`;

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err });
    } else {
      const cityData = {};
      results.forEach((row) => {
        if (!cityData[row.city]) {
          cityData[row.city] = { city: row.city, history: [] };
        }
        cityData[row.city].history.push({
          timestamp: row.timestamp,
          temperature: row.temperature,
        });
      });

      res.json(Object.values(cityData));
    }
  });
});

app.get("/city", (req, res) => {
  const city = req.params.city;
  console.log(`Received request for city: ${city}`);
  db.query("SELECT * FROM weather_data WHERE city = ? ORDER BY timestamp DESC", [city], (err, results) => {
    if (err) res.status(500).json({ error: err });
    else res.json(results);
  });
});

app.get("/aqi", (req, res) => {
  const query = "SELECT city, aqi FROM weather_data";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching AQI:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    const aqiData = {};
    results.forEach((row) => {
      aqiData[row.city] = row.aqi;
    });

    res.json(aqiData);
  });
});

app.get("/", (req, res) => {
  res.send("Server is working! 🚀");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
fetchWeatherData();
fetchAQI();