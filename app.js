if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}
//const Availability = require("./models/availability.js");
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const Booking = require("./models/booking.js");
const Review = require("./models/review.js");
const path = require("path");
const methodoverride = require("method-override");
const ejsMate = require("ejs-mate");

const session = require("express-session");
const MongoStore = require("connect-mongo").default;

const flash = require("connect-flash");
const multer = require("multer");
const { storage } = require("./cloudConfig.js");
const upload = multer({ storage });
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
//const ExpressError=require("./utils/ExpressError.js");

app.listen(8080, () => {
  console.log("app is listening");
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// const DBconnection="mongodb://127.0.0.1:27017/wanderlust"
const dbUrl = process.env.ATLASDB_URL;

const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});

store.on("error", function (e) {
  console.log("SESSION STORE ERROR", e);
});

const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 24 * 60 * 60 * 1000,
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(methodoverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));

app.engine("ejs", ejsMate);

//MONGODB connection

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dbUrl);
}


function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next();
  }
  req.flash("error", "Admin only");
  res.redirect("/listings");
}


function isOwner(req, res, next) {
  if (req.isAuthenticated() && req.user.role === "owner") {
    return next();
  }
  req.flash("error", "Owner only");
  res.redirect("/listings");
}   

function isUser(req, res, next) {
  if (req.isAuthenticated() && req.user.role === "user") {
    return next();
  }
  req.flash("error", "User only");
  res.redirect("/listings");
}  


function isAdminOrOwner(req, res, next) {
  if (!req.isAuthenticated()) {
    req.flash("error", "Login first");
    return res.redirect("/login");
  }

  if (req.user.role === "admin" || req.user.role === "owner") {
    return next();
  }

  req.flash("error", "Only Admin or Owner allowed");
  res.redirect("/listings");
}

/*

FOR ONE DATA INSERTION 

app.get("/testListing",async(req,res)=>{
    let sampleListing=new Listing({
        title:"My new Villa",
        description:"BY the Beach",
        price:1200,
        location:"kolkata",
        country:"India"
    });

    await sampleListing.save();
    console.log("sample is saved");
    res.send("succesful testing");
})*/

//ROUTE creation
/* app.get("/",(req,res)=>{
    res.send("this is the root");
}); */

/*
app.get("/demouser", async (req, res) => {
        let fakeUser = new User({
            email: "abc@gmail.com",
            username: "abc-student"
        });

        let registeredUser = await User.register(fakeUser, "helloworld");
        res.send(registeredUser);
});
*/

//SIGNUP PAGE
app.get("/signup", (req, res) => {
  res.render("users/signup.ejs");
});

app.post("/signup", async (req, res, next) => {
  try {
    const { username, email, password,role } = req.body;
    const newUser = new User({ username, email ,role});


    const existingUser = await User.findOne({ username });
    if (existingUser) {
      req.flash("error", "Username already exists!");
      return res.redirect("/signup");
    }

  
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      req.flash("error", "Email already registered!");
      return res.redirect("/signup");
    }

    if (username === password) {
      req.flash("error", "Username and Password cannot be the same!");
      return res.redirect("/signup");
    }

    if (username.length < 5) {
      req.flash("error", "Username must be greater than 5 characters");
      return res.redirect("/signup");
    }

    const strongPassword =
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[@$!%*?&]).{5,}$/;

    if (!strongPassword.test(password)) {
      req.flash(
        "error",
        "Password must contain uppercase, lowercase, number, and special character",
      );
      return res.redirect("/signup");
    }


    const registeredUser = await User.register(newUser, password);
    

    req.login(registeredUser, (err) => {
      if (err) return next(err);
      req.flash(
        "success",
        `Welcome ${registeredUser.username} to our website!`,
      );
      res.redirect("/listings");
    });
  } catch (e) {
    req.flash("error", e.message);
    res.redirect("/signup");
  }
});

//LOGIN PAGE

app.get("/login", (req, res) => {
  res.render("users/login.ejs");
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (req, res) => {
    req.flash("success", `Welcome back, ${req.user.username}!`);
    res.redirect("/listings");
  },
);

//INDEX ROUTE

app.get("/", async (req, res) => {
  let allListings = await Listing.find();
  res.render("listings/index.ejs", { allListings });
});

app.get("/listings", async (req, res) => {
  let allListings = await Listing.find();
  res.render("listings/index.ejs", { allListings });
});

//new Post Form

app.get("/listings/new", isOwner,(req, res) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "Log In First");
    return res.redirect("/login");
  }
  res.render("listings/new.ejs");
});

//new form submit

app.post(
  "/listings",
  upload.single("listing[image]"),
  async (req, res, next) => {
    try {
      let url = req.file.path;
      let filename = req.file.filename;
      const newListing = new Listing(req.body.listing);
      newListing.owner = req.user._id;
      newListing.image = { url, filename };
      await newListing.save();
      req.flash("success", "New Listing Created");
      res.redirect(`/listings`);
    } catch (err) {
      next(err);
    }
  },
);

//Edit route

app.get("/listings/:id/edit", isAdminOrOwner, async (req, res) => {
  let { id } = req.params;
  const listings = await Listing.findById(id);
  if (!req.isAuthenticated()) {
    req.flash("error", "Logged In First");
    return res.redirect("/login");
  }
  res.render("listings/edit.ejs", { listings });
});

//Update route
app.put("/listings/:id",isAdminOrOwner, upload.single("listing[image]"), async (req, res) => {
  let { id } = req.params;
  if (!req.isAuthenticated()) {
    req.flash("error", "Logged In First");
    return res.redirect("/login");
  }
  let listing = await Listing.findById(id);
  if (req.user.role === "owner" && !listing.owner.equals(req.user._id)) {
    req.flash("error", "You don't have permission to edit");
    return res.redirect(`/listings/${id}`);
  }

  let listings = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

  if (typeof req.file !== "undefined") {
    let url = req.file.path;
    let filename = req.file.filename;
    listings.image = { url, filename };
    await listings.save();
  }

  req.flash("success", "Listing Updated");
  res.redirect(`/listings/${id}`);
});

//Delete

app.delete("/listings/:id", isAdminOrOwner, async (req, res) => {
  let { id } = req.params;

  let listing = await Listing.findById(id);

  if (req.user.role === "owner" && !listing.owner.equals(req.user._id)) {
    req.flash("error", "No permission");
    return res.redirect(`/listings/${id}`);
  }

  // 🔥 Delete all bookings of this listing
  await Booking.deleteMany({ listing: id });

  // 🔥 Delete availability dates
  await Availability.deleteMany({ listing: id });

  await Listing.findByIdAndDelete(id);

  req.flash("success", "Listing and related bookings deleted");
  res.redirect("/listings");
});

//SHOW ROUTE

app.get("/listings/:id", async (req, res) => {
  let { id } = req.params;

  const listings = await Listing.findById(id)
    .populate("owner")
    .populate({ path: "reviews", populate: { path: "author" } });

  res.render("listings/show.ejs", { listings });
});

//REVIEWS

app.post("/listings/:id/reviews", async (req, res) => {
  let { id } = req.params;
  let listing = await Listing.findById(id);
  let newReview = new Review(req.body.review);
  newReview.author = req.user._id;
  listing.reviews.push(newReview);

  await newReview.save();
  await listing.save();
  req.flash("success", "New Review Created");
  res.redirect(`/listings/${id}`);
});

//REVIEW DELETE

app.delete("/listings/:id/reviews/:reviewId", async (req, res) => {
  let { id, reviewId } = req.params;
  let review = await Review.findById(reviewId);

  if (!review) {
    req.flash("error", "Review not found");
    return res.redirect(`/listings/${id}`);
  }

  if (!req.user || !review.author.equals(req.user._id)) {
    req.flash("error", "You don't have permission to delete this review");
    return res.redirect(`/listings/${id}`);
  }

  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  await Review.findByIdAndDelete(reviewId);

  req.flash("success", "Review Deleted");
  res.redirect(`/listings/${id}`);
});

app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong" } = err;
  res.status(statusCode).send(message);
});

app.get("/logout", (req, res, next) => {
  req.logOut((err) => {
    if (err) {
      next(err);
    }
    req.flash("success", "You are Logged out");
    res.redirect("/listings");
  });
});

// USER PROFILE PAGE
app.get("/profile", (req, res) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "You must be logged in first");
    return res.redirect("/login");
  }

  res.render("users/profile.ejs");
});



//Booking

app.post("/listings/:id/book", isUser, async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      req.flash("error", "Login first");
      return res.redirect("/login");
    }

    let { id } = req.params;
    let { checkIn, checkOut, adults, children } = req.body;

    adults = parseInt(adults);
    children = parseInt(children) || 0;

    if (!adults || adults < 1) {
      req.flash("error", "At least 1 adult required");
      return res.redirect(`/listings/${id}`);
    }

    let listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    checkIn = new Date(checkIn);
    checkOut = new Date(checkOut);

    if (checkIn >= checkOut) {
      req.flash("error", "Check-out must be after Check-in");
      return res.redirect(`/listings/${id}`);
    }

    let today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) {
      req.flash("error", "Cannot book past dates");
      return res.redirect(`/listings/${id}`);
    }

    // Calculate days
    let days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    if (days <= 0) days = 1;

    // 💰 New Pricing Logic
    let basePrice = listing.price;

    let adultPricePerDay = adults * basePrice;
    let childPricePerDay = children * (basePrice / 2);

    let totalPerDay = adultPricePerDay + childPricePerDay;
    let totalPrice = totalPerDay * days;

    let booking = new Booking({
      listing: id,
      user: req.user._id,
      owner: listing.owner,
      checkIn,
      checkOut,
      totalDays: days,
      totalPrice,
      adults,
      children,
      paymentStatus: "Pending",
      status: "active"
    });

    await booking.save();

    req.flash("success", "✅ Booking successful!");
    res.redirect("/mybookings");

  } catch (err) {
    console.log("BOOKING ERROR:", err);
    req.flash("error", "Something went wrong");
    res.redirect(`/listings/${req.params.id}`);
  }
});




//My booking
app.get("/mybookings", async (req, res) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "Login first");
    return res.redirect("/login");
  }

  let bookings = await Booking.find({ user: req.user._id })
    .populate("listing");

  res.render("bookings/mybookings.ejs", { bookings });
});




app.get("/admin/bookings", isAdmin, async (req, res) => {
  const bookings = await Booking.find()
    .populate("user")
    .populate("listing")
    .populate("owner");

  res.render("admin/bookings.ejs", { bookings });
});


app.get("/admin/dashboard", isAdmin, async (req, res) => {
  const usersCount = await User.countDocuments();
  const listingsCount = await Listing.countDocuments();
  const bookingsCount = await Booking.countDocuments();

  res.render("admin/dashboard.ejs", {
    usersCount,
    listingsCount,
    bookingsCount,
  });
});





// ADMIN - View All Users Profiles
app.get("/admin/users", isAdmin, async (req, res) => {
  const users = await User.find(); // get all users
  res.render("admin/users.ejs", { users });
});   


// ADMIN - View Single User Profile
app.get("/admin/users/:id", isAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    req.flash("error", "User not found");
    return res.redirect("/admin/users");
  }

  res.render("admin/userProfile.ejs", { user });
});

// ADMIN - Create Booking Form
app.get("/admin/bookings/new", isAdmin, async (req, res) => {
  const users = await User.find({ role: "user" });
  const listings = await Listing.find();

  res.render("admin/createBooking.ejs", { users, listings });
});   


// ADMIN - Create Booking for Any User
app.post("/admin/bookings", isAdmin, async (req, res) => {
  try {
    let { userId, listingId, checkIn, checkOut, adults, children } = req.body;

    adults = parseInt(adults);
    children = parseInt(children) || 0;

    let listing = await Listing.findById(listingId);

    checkIn = new Date(checkIn);
    checkOut = new Date(checkOut);

    if (checkIn >= checkOut) {
      req.flash("error", "Invalid dates");
      return res.redirect("/admin/bookings/new");
    }

    // Calculate days
    let days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    if (days <= 0) days = 1;

    // 💰 Adult Full + Child Half Price
    let basePrice = listing.price;
    let adultPricePerDay = adults * basePrice;
    let childPricePerDay = children * (basePrice / 2);

    let totalPerDay = adultPricePerDay + childPricePerDay;
    let totalPrice = totalPerDay * days;

    let booking = new Booking({
      listing: listingId,
      user: userId,
      owner: listing.owner,
      checkIn,
      checkOut,
      totalDays: days,
      totalPrice,
      adults,
      children,
      paymentStatus: "Paid", // Admin booking default Paid
      status: "active",
    });

    await booking.save();

    req.flash("success", "✅ Admin Booking Created Successfully");
    res.redirect("/admin/bookings");

  } catch (err) {
    console.log("ADMIN BOOKING ERROR:", err);
    req.flash("error", "Something went wrong");
    res.redirect("/admin/bookings/new");
  }
});




// OWNER - View bookings of own properties
app.get("/owner/bookings", isOwner, async (req, res) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "Login first");
    return res.redirect("/login");
  }

  const bookings = await Booking.find({ owner: req.user._id })
    .populate("user")
    .populate("listing");

  res.render("owner/bookings.ejs", { bookings });
});




app.delete("/bookings/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "Login first");
    return res.redirect("/login");
  }

  let booking = await Booking.findById(req.params.id);
  if (!booking) {
    req.flash("error", "Booking not found");
    return res.redirect("back");
  }

  // ✅ User can delete own booking
  if (req.user.role === "user" && !booking.user.equals(req.user._id)) {
    req.flash("error", "You don't have permission");
    return res.redirect("/mybookings");
  }

  // ✅ Owner can delete booking of his property
  if (req.user.role === "owner" && !booking.owner.equals(req.user._id)) {
    req.flash("error", "You are not owner of this property");
    return res.redirect("/owner/bookings");
  }

  // ✅ Admin can delete any booking
  await Booking.findByIdAndDelete(req.params.id);

  req.flash("success", "Booking Cancelled Successfully");

  if (req.user.role === "admin") return res.redirect("/admin/bookings");
  if (req.user.role === "owner") return res.redirect("/owner/bookings");
  return res.redirect("/mybookings");
});  



// OWNER - My Properties Page
app.get("/owner/properties", isOwner, async (req, res) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "Login first");
    return res.redirect("/login");
  }

  const properties = await Listing.find({ owner: req.user._id });

  res.render("owner/properties.ejs", { properties });
});


