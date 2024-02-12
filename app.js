const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const https = require('https');
const path = require('path');
const adminRoutes = require('./routes/admin');
const Weather = require('./models/weather');
const User = require('./models/user');
const adminAuth = require('./routes/adminAuth');
const app = express();
const port = 3000;

mongoose.connect('mongodb+srv://practice:Ansar123@cluster0.eotba7o.mongodb.net/WeatherForcast?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({ 
  secret: 'rejimvdfmvdimscwe123',
  resave: false,
  saveUninitialized: false
})); 

app.use(express.static(path.join(__dirname, 'views')));


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const loginRouter = require('./routes/login');
const registerRouter = require('./routes/register');

app.use('/login', loginRouter);
app.use('/register', registerRouter);
app.use('/admin', adminAuth); 
app.use('/admin', adminRoutes);

app.get('/index', (req, res) => {
  res.render('index'); 
});

app.get('/', (req, res) => {
  if (req.session && req.session.user) {
      res.redirect('/index'); 
  } else {
      res.redirect('/login');
  }
});

app.get('/login/admin', (req, res) => {
  res.render('admin-login'); 
});

app.get('/admin', (req, res) => {
  res.redirect('/admin/login');
});


const apiKey = '0e6b9a1893a47c1f2fd8c3d909372714';
const googleMapKey = 'AIzaSyDIcyq7D-vsf4_rPxnuGiZUDwtk4pKxTSc';
const timeZoneApiKey = 'QU8YLVHYKXH6';

app.get('/weather', (req, res) => {
    const cityName = req.query.city;
    if (!cityName) {
      return res.status(400).json({ error: 'City parameter is required' });
    }
  
    const weatherURL = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}`;
  
    https.get(weatherURL, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
  
      response.on('end', async () => {
        try {
          const weatherData = JSON.parse(data);
          if (
            weatherData &&
            weatherData.main &&
            weatherData.main.temp &&
            weatherData.weather &&
            weatherData.weather[0] &&
            weatherData.weather[0].description &&
            weatherData.weather[0].icon &&
            weatherData.coord &&
            weatherData.main.feels_like &&
            weatherData.main.humidity &&
            weatherData.main.pressure &&
            weatherData.wind &&
            weatherData.wind.speed &&
            weatherData.sys &&
            weatherData.sys.country
          ) {
            const celsiusTemperature = (weatherData.main.temp - 273.15).toFixed(1);

            const newWeather = new Weather({
              cityName: cityName,
              temperature: celsiusTemperature,
              description: weatherData.weather[0].description,
              icon: weatherData.weather[0].icon,
              coordinates: weatherData.coord,
              feelsLike: (weatherData.main.feels_like - 273.15).toFixed(1),
              humidity: weatherData.main.humidity,
              pressure: weatherData.main.pressure,
              windSpeed: weatherData.wind.speed,
              countryCode: weatherData.sys.country,
              rainVolume: weatherData.rain ? weatherData.rain['1h'] : 0,
            });

            await newWeather.save();

           
            res.json({
              city: weatherData.name,
              temperature: { celsius: celsiusTemperature },
              description: weatherData.weather[0].description,
              icon: weatherData.weather[0].icon,
              coordinates: weatherData.coord,
              feelsLike: (weatherData.main.feels_like - 273.15).toFixed(1),
              humidity: weatherData.main.humidity,
              pressure: weatherData.main.pressure,
              windSpeed: weatherData.wind.speed,
              countryCode: weatherData.sys.country,
              rainVolume: weatherData.rain ? weatherData.rain['1h'] : 0,
            });
          } else {
            console.error('Error parsing weather data: Response format is not as expected.');
            res.status(500).json({ error: 'Internal Server Error' });
          }
        } catch (error) {
          console.error('Error parsing weather data:', error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });
    }).on('error', (error) => {
      console.error('Error fetching weather data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});


app.get('/timezone', (req, res) => {
    const lat = req.query.lat;
    const lon = req.query.lon;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude parameters are required' });
    }
  
    const timeZoneURL = `https://api.timezonedb.com/v2.1/get-time-zone?key=${timeZoneApiKey}&format=json&by=position&lat=${lat}&lng=${lon}`;
  
    https.get(timeZoneURL, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
  
      response.on('end', () => {
        try {
          const timeZoneData = JSON.parse(data);
          res.json(timeZoneData);
        } catch (error) {
          console.error('Error parsing time zone data:', error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });
    }).on('error', (error) => {
      console.error('Error fetching time zone data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});

app.get('/map', (req, res) => {
    const lat = req.query.lat;
    const lon = req.query.lon;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude parameters are required' });
    }
  
    const mapURL = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lon}&zoom=10&size=400x300&key=${googleMapKey}`;
  
    https.get(mapURL, (response) => {
      let imageData = '';
      response.setEncoding('binary');
      response.on('data', (chunk) => {
        imageData += chunk;
      });
  
      response.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(imageData, 'binary');
      });
    }).on('error', (error) => {
      console.error('Error fetching map data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
