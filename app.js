/**
 * app.js
 *
 * Main execution file for this project.
 */

/** External modules **/
var express = require("express");
var https = require("https");
var app = express();
var cors = require("cors");
const VZ = require("./controllers/VZController");
// const User = require("./models/User");
// const Workspace = require("./models/Workspace");
var fs = require("fs");
var Schedule = require('node-schedule');

const allowCORS = function (req, res, next) {
  var origin = req.get("origin");
  res.header(
    "Access-Control-Allow-Origin",
    "http://localhost:8000 , https://ego.comboware.io"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
};

var corsOptions = {
  origin: ["http://localhost:3000","http://localhost:8000", "https://ego.comboware.io", 'http://127.0.0.1:8000'],
  credentials: true,
};

// app.use(cors(corsOptions));
app.set("view engine", "ejs");
app.all(function (req, res, next) {
  res.header(
    "Access-Control-Allow-Origin",
    "http://localhost:8000, https://ego.comboware.io",
    "http://localhost:3000",
  );
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Accept");
  next();
});

// app.options("*", cors(corsOptions));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); //* will allow from all cross domain
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

/** Internal modules **/
//  var config = require('./private/config');
var UserRoutes = require("./routes/User");
var AdminRoutes = require("./routes/Admin");
var WorkspaceRoutes = require("./routes/Workspace");
var TicketRoutes = require("./routes/Ticket");
var PaymentRoutes = require("./routes/Payment");
var ChatRoutes = require("./routes/Chat");
var CategoryRoutes = require("./routes/Category");

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(express.static(__dirname + "/public"));
// app.use(session({
//    keys: config.SESSION_SECRET_KEYS,
//    cookie: { maxAge: 60000 }
// }))
//  app.use(passport.initialize());
//  app.use(passport.session());

/** Express routing **/

app.get("/check", function (req, res) {
  res
    .status(200)
    .send(`${req.protocol}://${req.get("host")} It is working fine !`);
});

//app.use('/v1', authController);
app.use("/v1/user", cors(corsOptions), UserRoutes);
app.use("/v1/admin", cors(corsOptions), AdminRoutes);
app.use("/v1/workspace", cors(corsOptions), WorkspaceRoutes);
app.use("/v1/ticket", cors(corsOptions), TicketRoutes);
app.use("/v1/payment", cors(corsOptions), PaymentRoutes);
app.use("/v1/chat", cors(corsOptions), ChatRoutes);
app.use("/v1/category", cors(corsOptions), CategoryRoutes);

app.post("/vz-call", cors(corsOptions), async function (req, res) {
  let response = await VZ.Call(
    req?.body?.data,
    req?.body?.endpoint,
    req?.body?.method,
    req?.body?.isCompute,
    req?.body?.hostUrl
  );
  res.status(200).json(response?.data);
});


const paypal = require('paypal-rest-sdk');

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': 'AbbaGZEMp-_BO8Jf3maK1IF5wgRuT0vS-I2LlFUtiB2S6bLD1oKvCz_nSHuLTZJXgT6-I9KeobBEvDQt',
  'client_secret': 'EAxheRe9j8SYirCAHWHToyitK6-R-hBOkO26WxKaX9xJHQaoiEUF__4p2JuyaeoDVBgI_0y_oGGMH4qH'
});

app.get('/pay', (req, res) => {
  const create_payment_json = {
    "intent": "sale",
    "payer": {
      "payment_method": "paypal"
    },
    "redirect_urls": {
      "return_url": "http://localhost:8000/success",
      "cancel_url": "http://localhost:8000/cancel"
    },
    "transactions": [{
      "item_list": {
        "items": [{
          "name": "Red Sox Hat",
          "sku": "001",
          "price": "25.00",
          "currency": "USD",
          "quantity": 1
        }]
      },
      "amount": {
        "currency": "USD",
        "total": "25.00"
      },
      "description": "Hat for the best team ever"
    }]
  };

  paypal.payment.create(create_payment_json, function (error, payment) {
    if (error) {
      throw error;
    } else {
      for (let i = 0; i < payment.links.length; i++) {
        if (payment.links[i].rel === 'approval_url') {
          res.redirect(payment.links[i].href);
        }
      }
    }
  });

});

app.get('/success', (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  const execute_payment_json = {
    "payer_id": payerId,
    "transactions": [{
      "amount": {
        "currency": "USD",
        "total": "25.00"
      }
    }]
  };

  paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    if (error) {
      console.log(error.response);
      throw error;
    } else {
      console.log(JSON.stringify(payment));
      res.send('Success');
    }
  });
});

app.get('/cancel', (req, res) => res.send('Cancelled'));

app.all("*", function (req, res) {
  res.status(403).send("welcome to comboware Orchrastation !");
});

/*try {
  (async function() {
    let currentDate = new Date().toJSON().slice(0, 10).replace(/-/g, '-');
    console.log(currentDate);
    let users = await User.getUser(` where (trial_expire_date <= '${currentDate}' or trial_extend_date <= '${currentDate}') and status = 1`);
    if(users.length){
      users.forEach(async (element) => {
        console.log(element.id);
        await User.updateUserFields({fields:[{status:0}],userId:element.id});
        await Workspace.blockVM(element.id);
      });
    }
  })();
  var cronTime = new Schedule.RecurrenceRule();
  cronTime.dayOfWeek = [0, 1, 2, 3, 4, 5, 6];
  cronTime.hour = 23;
  cronTime.minute = 15;
  cronTime.second = 0;
  Schedule.scheduleJob(cronTime, async function () {
    let currentDate = new Date().toJSON().slice(0, 10).replace(/-/g, '-');
    let users = await User.getUser(` where trial_expire_date <= '${currentDate}' or trial_extend_date <= '${currentDate}' and status = 1`);
    if(users.length){
      users.forEach(async (element) => {
        await User.updateUserFields({fields:[{status:0}],userId:element.id});
        await Workspace.blockVM(element.id);
      });
    }
  });
} catch (ex) {
  console.error(ex);
}*/

/** Server deployment **/
var port = process.env.PORT;
if (process.env.NODE_ENV === "DEV1") {
  app.listen(port, function () {
    console.log(`App is running on port ${port} in development mode.`);
  });
 } else {
  https
    .createServer(
      {
        key: fs.readFileSync("private.key", "utf8"),
        cert: fs.readFileSync("certificate.crt", "utf8"),
        requestCert: false,
        rejectUnauthorized: false
      },
      app
    )
    .listen(port, function () {
      console.log(
        `The app listening on port ${port} in production mode`
      );
    });
}
